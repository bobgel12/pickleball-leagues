import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// CORS headers helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function getClubId(supabase, slug) {
  const { data: club, error } = await supabase
    .from('clubs')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !club) {
    return null;
  }
  return club.id;
}

/**
 * Sync players from leagueData to normalized tables
 */
async function syncPlayersToDatabase(supabase, leagueDataId, leagueId, clubId, registeredPlayers) {
  console.log(`syncPlayersToDatabase: Called with leagueDataId=${leagueDataId}, leagueId=${leagueId}, clubId=${clubId}, playerCount=${registeredPlayers?.length || 0}`);
  
  if (!registeredPlayers || !Array.isArray(registeredPlayers)) {
    console.log('syncPlayersToDatabase: No registeredPlayers array provided');
    return;
  }

  console.log(`syncPlayersToDatabase: Starting sync for league ${leagueId} (league_data.id: ${leagueDataId}), ${registeredPlayers.length} players`);

  try {
    // Get current players for this league
    const { data: currentLeaguePlayers } = await supabase
      .from('league_players')
      .select('player_id')
      .eq('league_id', leagueDataId);

    const currentPlayerIds = new Set((currentLeaguePlayers || []).map(lp => lp.player_id));
    const incomingPlayerIds = new Set();

    // Process each player
    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const playerData of registeredPlayers) {
      if (!playerData.name || !playerData.name.trim()) {
        console.warn('syncPlayersToDatabase: Skipping player with no name:', playerData);
        continue;
      }
      
      processedCount++;
      console.log(`syncPlayersToDatabase: Processing player ${processedCount}/${registeredPlayers.length}: ${playerData.name} (id: ${playerData.id})`);

      let playerId = null;

      // If player has an id that looks like a UUID, try to find existing player
      if (playerData.id && typeof playerData.id === 'string' && playerData.id.includes('-')) {
        const { data: existingPlayer, error: uuidError } = await supabase
          .from('players')
          .select('id')
          .eq('id', playerData.id)
          .eq('club_id', clubId)
          .maybeSingle();

        if (uuidError) {
          console.warn(`syncPlayersToDatabase: Error looking up player by UUID ${playerData.id}:`, uuidError);
        } else if (existingPlayer) {
          playerId = existingPlayer.id;
          console.log(`syncPlayersToDatabase: Found existing player by UUID: ${playerId}`);
        }
      }

      // If no existing player found by UUID, try to find by name
      if (!playerId) {
        const { data: existingPlayer, error: nameError } = await supabase
          .from('players')
          .select('id')
          .eq('club_id', clubId)
          .eq('name', playerData.name.trim())
          .maybeSingle();

        if (nameError) {
          console.warn(`syncPlayersToDatabase: Error looking up player by name "${playerData.name}":`, nameError);
        } else if (existingPlayer) {
          playerId = existingPlayer.id;
          console.log(`syncPlayersToDatabase: Found existing player by name: ${playerId}`);
        }
      }

      // Create player if doesn't exist
      if (!playerId) {
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            club_id: clubId,
            name: playerData.name.trim(),
            dupr_rating: playerData.duprRating || 4.50,
            gender: playerData.gender || null
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating player:', createError);
          continue;
        }

        playerId = newPlayer.id;
        createdCount++;
        console.log(`syncPlayersToDatabase: Created new player ${playerId} for ${playerData.name}`);
      } else {
        // Update existing player if needed
        const { error: updateError } = await supabase
          .from('players')
          .update({
            dupr_rating: playerData.duprRating || 4.50,
            gender: playerData.gender || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', playerId);
        
        if (!updateError) {
          updatedCount++;
        } else {
          console.error(`syncPlayersToDatabase: Error updating player ${playerId}:`, updateError);
        }
      }

      incomingPlayerIds.add(playerId);

      // Create or update league_players relationship
      const registeredAt = playerData.registeredAt 
        ? new Date(playerData.registeredAt).toISOString()
        : new Date().toISOString();

      const { error: leaguePlayerError } = await supabase
        .from('league_players')
        .upsert({
          league_id: leagueDataId,
          player_id: playerId,
          registered_at: registeredAt
        }, {
          onConflict: 'league_id,player_id'
        });

      if (leaguePlayerError) {
        console.error(`syncPlayersToDatabase: Error upserting league_players for player ${playerId}:`, leaguePlayerError);
      }

      // Create or update player_stats
      const { error: statsError } = await supabase
        .from('player_stats')
        .upsert({
          league_id: leagueDataId,
          player_id: playerId,
          cumulative_points: playerData.cumulativePoints || 0,
          total_wins: playerData.totalWins || 0,
          total_losses: playerData.totalLosses || 0,
          points_scored: playerData.pointsScored || 0,
          points_allowed: playerData.pointsAllowed || 0,
          event_days_attended: playerData.eventDaysAttended || 0,
          court_history: playerData.courtHistory || [],
          ladder_position_history: playerData.ladderPositionHistory || [],
          money_round_stats: playerData.moneyRoundStats || {
            totalWins: 0,
            totalLosses: 0,
            totalContributions: 0,
            totalPaid: 0,
            contributionHistory: []
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'league_id,player_id'
        });

      if (statsError) {
        console.error(`syncPlayersToDatabase: Error upserting player_stats for player ${playerId}:`, statsError);
      }
    }
    
    console.log(`syncPlayersToDatabase: Completed for league ${leagueId} (league_data.id: ${leagueDataId}). Processed: ${processedCount}, Created: ${createdCount}, Updated: ${updatedCount}`);

    // Remove players that are no longer in the league
    // BUT: Only remove if we actually have incoming players (don't remove all if incoming is empty)
    // This prevents accidental deletion when sync is called with empty/missing data
    if (incomingPlayerIds.size > 0) {
      const playersToRemove = Array.from(currentPlayerIds).filter(id => !incomingPlayerIds.has(id));
      if (playersToRemove.length > 0) {
        console.log(`syncPlayersToDatabase: Removing ${playersToRemove.length} players that are no longer in the league`);
        await supabase
          .from('league_players')
          .delete()
          .eq('league_id', leagueDataId)
          .in('player_id', playersToRemove);

        await supabase
          .from('player_stats')
          .delete()
          .eq('league_id', leagueDataId)
          .in('player_id', playersToRemove);
      }
    } else {
      console.log(`syncPlayersToDatabase: Skipping player removal - incoming players list is empty (preserving existing players)`);
    }
  } catch (error) {
    console.error('Error syncing players to database:', error);
    console.error('Error details:', {
      leagueDataId,
      leagueId,
      clubId,
      playerCount: registeredPlayers?.length || 0,
      errorMessage: error.message,
      errorStack: error.stack
    });
    // Don't throw - allow league update to continue even if player sync fails
    // But re-throw in development to help debug
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }
}

/**
 * Verify master key for admin operations
 */
async function verifyAdminAccess(slug, masterKey) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return false;
  }

  if (!masterKey) {
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: club, error } = await supabase
      .from('clubs')
      .select('master_key_hash')
      .eq('slug', slug)
      .single();

    if (error || !club) {
      return false;
    }

    const isValid = await bcrypt.compare(masterKey, club.master_key_hash);
    return isValid;
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  setCorsHeaders(res);

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const { slug } = req.query;
  const { leagueId, leagueName } = req.query; // For GET/DELETE operations
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const clubId = await getClubId(supabase, slug);
    if (!clubId) {
      return res.status(404).json({ error: 'Club not found' });
    }

    // GET: List all leagues or get specific league
    if (req.method === 'GET') {
      // If leagueId or leagueName provided, return specific league with full data
      const lid = (leagueId != null) ? (Array.isArray(leagueId) ? leagueId[0] : leagueId) : null;
      const lname = (leagueName != null) ? (Array.isArray(leagueName) ? leagueName[0] : leagueName) : null;
      if (lid || lname) {
        let query = supabase
          .from('league_data')
          .select('id, league_id, league_name, status, description, data, created_at, updated_at')
          .eq('club_id', clubId);
        
        if (lid) {
          query = query.eq('league_id', lid);
        } else if (lname) {
          query = query.eq('league_name', lname);
        }
        
        const { data: leagueRecord, error } = await query.single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'League not found' });
          }
          throw error;
        }

        // Load players from normalized tables
        console.log(`GET: Loading players for league ${leagueRecord.league_id}, using league_data.id: ${leagueRecord.id}`);
        const { data: leaguePlayers, error: playersError } = await supabase
          .from('league_players')
          .select(`
            registered_at,
            player_id,
            player:player_id (
              id,
              name,
              dupr_rating,
              gender,
              created_at
            )
          `)
          .eq('league_id', leagueRecord.id);

        console.log(`GET: league_players query result:`, {
          count: leaguePlayers?.length || 0,
          hasError: !!playersError,
          error: playersError?.message,
          sampleData: leaguePlayers?.[0]
        });

        if (playersError) {
          console.error('GET: Error loading league players:', playersError);
        }

        // Load player stats separately (more reliable than foreign key relationship)
        const playerIds = (leaguePlayers || []).map(lp => lp.player_id).filter(Boolean);
        console.log(`GET: Extracted ${playerIds.length} player IDs from league_players`);
        let playerStatsMap = new Map();
        
        if (playerIds.length > 0) {
          const { data: allStats, error: statsError } = await supabase
            .from('player_stats')
            .select('*')
            .eq('league_id', leagueRecord.id)
            .in('player_id', playerIds);

          if (statsError) {
            console.error('GET: Error loading player stats:', statsError);
          } else {
            console.log(`GET: Loaded ${allStats?.length || 0} stats records from player_stats table`);
            (allStats || []).forEach(stat => {
              playerStatsMap.set(stat.player_id, stat);
            });
          }
        } else {
          console.log(`GET: No player IDs found, skipping stats query`);
        }

        // If player relationship didn't work, load players directly
        let playersMap = new Map();
        if (playerIds.length > 0) {
          const missingPlayerIds = playerIds.filter(id => {
            const lp = leaguePlayers?.find(l => l.player_id === id);
            return !lp?.player;
          });
          
          if (missingPlayerIds.length > 0) {
            const { data: directPlayers, error: directError } = await supabase
              .from('players')
              .select('id, name, dupr_rating, gender, created_at')
              .in('id', missingPlayerIds);
            
            if (directError) {
              console.error('Error loading players directly:', directError);
            } else {
              (directPlayers || []).forEach(p => {
                playersMap.set(p.id, p);
              });
            }
          }
        }

        // Build registeredPlayers array from normalized data
        const registeredPlayers = (leaguePlayers || []).map(lp => {
          // Try relationship first, then fallback to direct load
          const player = lp.player || playersMap.get(lp.player_id);
          const stats = playerStatsMap.get(lp.player_id) || null;
          
          if (!player) {
            console.warn(`Player ${lp.player_id} not found in database`);
            return null; // Skip players that don't exist
          }
          
          return {
            id: player.id || null,
            name: player.name || '',
            duprRating: player.dupr_rating ? parseFloat(player.dupr_rating) : 4.5,
            gender: player.gender || null,
            registeredAt: lp.registered_at ? new Date(lp.registered_at).getTime() : Date.now(),
            cumulativePoints: stats?.cumulative_points || 0,
            totalWins: stats?.total_wins || 0,
            totalLosses: stats?.total_losses || 0,
            pointsScored: stats?.points_scored || 0,
            pointsAllowed: stats?.points_allowed || 0,
            eventDaysAttended: stats?.event_days_attended || 0,
            courtHistory: stats?.court_history || [],
            ladderPositionHistory: stats?.ladder_position_history || [],
            moneyRoundStats: stats?.money_round_stats || {
              totalWins: 0,
              totalLosses: 0,
              totalContributions: 0,
              totalPaid: 0,
              contributionHistory: []
            }
          };
        }).filter(Boolean); // Remove null entries

        // Merge players into league data (for backward compatibility)
        // Parse JSONB if it comes back as string (some drivers return raw)
        let leagueData = leagueRecord.data;
        if (typeof leagueData === 'string') {
          try { leagueData = JSON.parse(leagueData || '{}'); } catch (e) { leagueData = {}; }
        }
        leagueData = leagueData || {};
        
        // AUTO-SYNC: If normalized tables are empty but JSONB has players, sync them
        let finalRegisteredPlayers = registeredPlayers;
        
        // RECOVERY: If both normalized tables AND JSONB registeredPlayers are empty,
        // but eventDays have matches/checkedInPlayers with player IDs, recover players from matches
        if (registeredPlayers.length === 0 && (!leagueData.registeredPlayers || leagueData.registeredPlayers.length === 0)) {
          // Extract player IDs from eventDays (checkedInPlayers, matches)
          const recoveredPlayerIds = new Set();
          
          if (leagueData.eventDays && Array.isArray(leagueData.eventDays)) {
            leagueData.eventDays.forEach(eventDay => {
              // Get IDs from checkedInPlayers
              if (eventDay.checkedInPlayers && Array.isArray(eventDay.checkedInPlayers)) {
                eventDay.checkedInPlayers.forEach(id => {
                  if (id != null) recoveredPlayerIds.add(id);
                });
              }
              
              // Get IDs from matches (teamA, teamB)
              if (eventDay.schedule && Array.isArray(eventDay.schedule)) {
                eventDay.schedule.forEach(match => {
                  if (match.teamA && Array.isArray(match.teamA)) {
                    match.teamA.forEach(id => { if (id != null) recoveredPlayerIds.add(id); });
                  }
                  if (match.teamB && Array.isArray(match.teamB)) {
                    match.teamB.forEach(id => { if (id != null) recoveredPlayerIds.add(id); });
                  }
                });
              }
              
              // Get IDs from courtAssignments
              if (eventDay.courtAssignments && Array.isArray(eventDay.courtAssignments)) {
                eventDay.courtAssignments.forEach(court => {
                  if (Array.isArray(court)) {
                    court.forEach(id => { if (id != null) recoveredPlayerIds.add(id); });
                  }
                });
              }
            });
          }
          
          if (recoveredPlayerIds.size > 0) {
            console.log(`GET: RECOVERY triggered - found ${recoveredPlayerIds.size} player IDs in eventDays for league ${leagueRecord.league_id}`);
            console.log(`GET: Recovered player IDs:`, Array.from(recoveredPlayerIds));
            
            try {
              // Recovered IDs might be numeric (frontend IDs) or UUIDs (database IDs)
              // Create placeholder players with numeric IDs for frontend compatibility
              // The syncPlayersToDatabase will map these to UUIDs in the database
              const recoveredIds = Array.from(recoveredPlayerIds);
              
              // Try to load players from database first (in case they're UUIDs or match by name somehow)
              // But since matches use numeric IDs, this likely won't find anything
              // We'll create placeholder players instead
              
              console.log(`GET: Creating placeholder players for ${recoveredIds.length} numeric IDs (frontend format)`);
              
              // Create placeholder registeredPlayers with numeric IDs
              // These will be synced to database where UUIDs will be assigned/generated
              const recoveredRegisteredPlayers = recoveredIds.map(playerId => {
                // Use numeric ID as-is for frontend compatibility
                // syncPlayersToDatabase will handle UUID mapping when syncing
                return {
                  id: playerId, // Keep numeric ID for frontend
                  name: `Player ${playerId}`, // Placeholder name - will need to be updated
                  duprRating: 4.5,
                  gender: null,
                  registeredAt: Date.now(),
                  cumulativePoints: 0,
                  totalWins: 0,
                  totalLosses: 0,
                  pointsScored: 0,
                  pointsAllowed: 0,
                  eventDaysAttended: 0,
                  courtHistory: [],
                  ladderPositionHistory: [],
                  moneyRoundStats: {
                    totalWins: 0,
                    totalLosses: 0,
                    totalContributions: 0,
                    totalPaid: 0,
                    contributionHistory: []
                  }
                };
              });
              
              // Use recovered players directly (with numeric IDs) for frontend
              // Don't sync to database because that would create UUIDs and break ID mapping
              // Frontend matches use numeric IDs, so players must have numeric IDs too
              finalRegisteredPlayers = recoveredRegisteredPlayers;
              
              console.log(`GET: RECOVERY completed - ${finalRegisteredPlayers.length} placeholder players created with numeric IDs`);
              console.log(`GET: Note: These players have numeric IDs to match match data. Names are placeholders and should be updated.`);
            } catch (recoveryErr) {
              console.error(`GET: Error during RECOVERY for league ${leagueRecord.league_id}:`, recoveryErr);
            }
          }
        }
        
        // AUTO-SYNC: If normalized tables are empty but JSONB has players, sync them
        if (registeredPlayers.length === 0 && finalRegisteredPlayers.length === 0 && leagueData.registeredPlayers && Array.isArray(leagueData.registeredPlayers) && leagueData.registeredPlayers.length > 0) {
          console.log(`GET: Auto-sync triggered - normalized tables empty but JSONB has ${leagueData.registeredPlayers.length} players for league ${leagueRecord.league_id}`);
          console.log(`GET: Syncing players from JSONB to normalized tables using league_data.id: ${leagueRecord.id}`);
          
          try {
            // Sync players from JSONB to normalized tables
            await syncPlayersToDatabase(supabase, leagueRecord.id, leagueRecord.league_id, clubId, leagueData.registeredPlayers);
            console.log(`GET: Auto-sync completed for league ${leagueRecord.league_id}`);
            
            // Reload players from normalized tables after sync
            const { data: syncedLeaguePlayers, error: syncedError } = await supabase
              .from('league_players')
              .select(`
                registered_at,
                player_id,
                player:player_id (
                  id,
                  name,
                  dupr_rating,
                  gender,
                  created_at
                )
              `)
              .eq('league_id', leagueRecord.id);
            
            if (!syncedError && syncedLeaguePlayers && syncedLeaguePlayers.length > 0) {
              // Reload stats for synced players
              const syncedPlayerIds = syncedLeaguePlayers.map(lp => lp.player_id).filter(Boolean);
              let syncedPlayerStatsMap = new Map();
              
              if (syncedPlayerIds.length > 0) {
                const { data: syncedStats } = await supabase
                  .from('player_stats')
                  .select('*')
                  .eq('league_id', leagueRecord.id)
                  .in('player_id', syncedPlayerIds);
                
                (syncedStats || []).forEach(stat => {
                  syncedPlayerStatsMap.set(stat.player_id, stat);
                });
              }
              
              // Load players directly as fallback
              let syncedPlayersMap = new Map();
              if (syncedPlayerIds.length > 0) {
                const { data: directSyncedPlayers } = await supabase
                  .from('players')
                  .select('id, name, dupr_rating, gender, created_at')
                  .in('id', syncedPlayerIds);
                
                (directSyncedPlayers || []).forEach(p => {
                  syncedPlayersMap.set(p.id, p);
                });
              }
              
              // Build registeredPlayers from synced data
              finalRegisteredPlayers = syncedLeaguePlayers.map(lp => {
                const player = lp.player || syncedPlayersMap.get(lp.player_id);
                const stats = syncedPlayerStatsMap.get(lp.player_id) || null;
                
                if (!player) {
                  return null;
                }
                
                return {
                  id: player.id || null,
                  name: player.name || '',
                  duprRating: player.dupr_rating ? parseFloat(player.dupr_rating) : 4.5,
                  gender: player.gender || null,
                  registeredAt: lp.registered_at ? new Date(lp.registered_at).getTime() : Date.now(),
                  cumulativePoints: stats?.cumulative_points || 0,
                  totalWins: stats?.total_wins || 0,
                  totalLosses: stats?.total_losses || 0,
                  pointsScored: stats?.points_scored || 0,
                  pointsAllowed: stats?.points_allowed || 0,
                  eventDaysAttended: stats?.event_days_attended || 0,
                  courtHistory: stats?.court_history || [],
                  ladderPositionHistory: stats?.ladder_position_history || [],
                  moneyRoundStats: stats?.money_round_stats || {
                    totalWins: 0,
                    totalLosses: 0,
                    totalContributions: 0,
                    totalPaid: 0,
                    contributionHistory: []
                  }
                };
              }).filter(Boolean);
              
              console.log(`GET: Reloaded ${finalRegisteredPlayers.length} players from normalized tables after sync`);
            } else {
              // If sync didn't populate normalized tables, fall back to JSONB
              console.warn(`GET: Auto-sync didn't populate normalized tables, using JSONB fallback`);
              finalRegisteredPlayers = leagueData.registeredPlayers;
            }
          } catch (syncErr) {
            console.error(`GET: Error during auto-sync for league ${leagueRecord.league_id}:`, syncErr);
            // Fall back to JSONB on error
            finalRegisteredPlayers = leagueData.registeredPlayers;
          }
        }
        
        const mergedLeagueData = {
          ...leagueData,
          registeredPlayers: finalRegisteredPlayers
        };
        // Ensure eventDays is an array and each day has schedule/moneyRoundSchedule for match history
        mergedLeagueData.eventDays = Array.isArray(mergedLeagueData.eventDays) ? mergedLeagueData.eventDays : [];
        mergedLeagueData.eventDays = mergedLeagueData.eventDays.map(d => ({
          ...d,
          schedule: Array.isArray(d.schedule) ? d.schedule : [],
          moneyRoundSchedule: Array.isArray(d.moneyRoundSchedule) ? d.moneyRoundSchedule : []
        }));
        
        // Log eventDays info from JSONB
        console.log(`GET: Final registeredPlayers count: ${finalRegisteredPlayers.length} for league ${leagueRecord.league_id}`);
        console.log(`GET: Loaded ${finalRegisteredPlayers.length} players for league ${leagueRecord.league_id} (${registeredPlayers.length} from normalized tables, ${leagueData.registeredPlayers?.length || 0} from JSONB)`);
        if (finalRegisteredPlayers.length > 0) {
          console.log(`GET: Sample player IDs:`, finalRegisteredPlayers.slice(0, 3).map(p => p.id));
        }
        console.log(`GET: eventDays from JSONB:`, {
          hasEventDays: !!leagueData.eventDays,
          eventDaysCount: leagueData.eventDays?.length || 0,
          eventDaysWithSchedule: leagueData.eventDays?.filter(day => day.schedule && day.schedule.length > 0).length || 0,
          totalMatches: leagueData.eventDays?.reduce((sum, day) => sum + (day.schedule?.length || 0), 0) || 0,
          completedMatches: leagueData.eventDays?.reduce((sum, day) => {
            const completed = day.schedule?.filter(m => m.status === 'completed').length || 0;
            return sum + completed;
          }, 0) || 0
        });

        return res.status(200).json({ 
          league: {
            id: leagueRecord.id,
            leagueId: leagueRecord.league_id,
            leagueName: leagueRecord.league_name,
            status: leagueRecord.status,
            description: leagueRecord.description,
            data: mergedLeagueData,
            createdAt: leagueRecord.created_at,
            updatedAt: leagueRecord.updated_at
          }
        });
      }
      
      // Otherwise, return list of all leagues (metadata only; include data for schedule/format)
      const { data, error } = await supabase
        .from('league_data')
        .select('id, league_id, league_name, status, description, data, created_at, updated_at')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Get player counts from normalized tables for each league
      const leagueIds = (data || []).map(l => l.id);
      const { data: playerCounts } = leagueIds.length > 0 
        ? await supabase
            .from('league_players')
            .select('league_id')
            .in('league_id', leagueIds)
        : { data: [] };

      const playerCountMap = new Map();
      (playerCounts || []).forEach(pc => {
        playerCountMap.set(pc.league_id, (playerCountMap.get(pc.league_id) || 0) + 1);
      });

      // Extract basic stats from data for each league (do not expose full data in list)
      const leagues = (data || []).map(league => {
        const leagueData = league.data || {};
        const eventDays = leagueData.eventDays || [];
        const playerCount = playerCountMap.get(league.id) || 0;
        
        return {
          id: league.id,
          leagueId: league.league_id,
          leagueName: league.league_name,
          status: league.status,
          description: league.description,
          schedule: leagueData.schedule ?? null,
          format: leagueData.format ?? null,
          playerCount: playerCount,
          eventDaysCount: eventDays.length,
          createdAt: league.created_at,
          updatedAt: league.updated_at
        };
      });

      return res.status(200).json({ leagues });
    }

    // POST: Create new league (Admin only)
    if (req.method === 'POST') {
      // Verify admin access
      const { masterKey } = req.body;
      const isAdmin = await verifyAdminAccess(slug, masterKey);
      
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required to create leagues' });
      }

      const { leagueName, description, data: leagueData } = req.body;

      if (!leagueName || typeof leagueName !== 'string' || leagueName.trim() === '') {
        return res.status(400).json({ error: 'League name is required' });
      }

      // Check if league name already exists for this club
      const { data: existing, error: checkError } = await supabase
        .from('league_data')
        .select('league_id')
        .eq('club_id', clubId)
        .eq('league_name', leagueName.trim())
        .single();

      if (existing) {
        return res.status(409).json({ error: 'League name already exists for this club' });
      }

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // Create new league
      const newLeague = {
        club_id: clubId,
        league_name: leagueName.trim(),
        league_id: req.body.leagueId || undefined, // Allow custom ID, otherwise auto-generate
        status: req.body.status || 'active',
        description: description || null,
        data: leagueData || {},
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('league_data')
        .insert(newLeague)
        .select('id, league_id, league_name, status, description, data, created_at, updated_at')
        .single();

      if (error) {
        throw error;
      }

      // Sync players to normalized tables if registeredPlayers exists in leagueData
      if (leagueData && leagueData.registeredPlayers && Array.isArray(leagueData.registeredPlayers)) {
        console.log(`POST: Syncing ${leagueData.registeredPlayers.length} players for new league ${data.league_id} (league_data.id: ${data.id})`);
        try {
          await syncPlayersToDatabase(supabase, data.id, data.league_id, clubId, leagueData.registeredPlayers);
          console.log(`POST: Successfully synced players for league ${data.league_id}`);
        } catch (syncError) {
          console.error('POST: Error syncing players during league creation:', syncError);
          console.error('POST: Sync error details:', {
            leagueDataId: data.id,
            leagueId: data.league_id,
            clubId,
            playerCount: leagueData.registeredPlayers.length,
            errorMessage: syncError.message,
            errorStack: syncError.stack
          });
          // Don't fail league creation if player sync fails, but log the error
        }
      } else {
        console.log('POST: No registeredPlayers found in leagueData', {
          hasLeagueData: !!leagueData,
          registeredPlayersType: leagueData?.registeredPlayers ? typeof leagueData.registeredPlayers : 'undefined',
          isArray: Array.isArray(leagueData?.registeredPlayers)
        });
      }

      return res.status(201).json({ 
        success: true,
        league: {
          id: data.id,
          leagueId: data.league_id,
          leagueName: data.league_name,
          status: data.status,
          description: data.description,
          data: data.data,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      });
    }

    // PUT: Update existing league
    // Admin required for metadata changes (name, description, status)
    // Admin NOT required for data-only updates (players, matches, etc.)
    if (req.method === 'PUT') {
      const { leagueId: bodyLeagueId, leagueName: bodyLeagueName, data: leagueData, leagueName: newLeagueName, description, status, masterKey } = req.body;
      
      // Check if this is a metadata update (requires admin)
      const isMetadataUpdate = newLeagueName !== undefined || description !== undefined || status !== undefined;
      
      if (isMetadataUpdate) {
        // Verify admin access for metadata updates
        const isAdmin = await verifyAdminAccess(slug, masterKey);
        if (!isAdmin) {
          return res.status(403).json({ error: 'Admin access required to update league metadata (name, description, status)' });
        }
      }

      // Determine which league to update
      const targetLeagueId = leagueId || bodyLeagueId;
      const targetLeagueName = leagueName || bodyLeagueName;

      if (!targetLeagueId && !targetLeagueName) {
        return res.status(400).json({ error: 'leagueId or leagueName is required' });
      }

      // Find the league to update (also get existing data to merge)
      let findQuery = supabase
        .from('league_data')
        .select('id, league_id, league_name, data')
        .eq('club_id', clubId);
      
      if (targetLeagueId) {
        findQuery = findQuery.eq('league_id', targetLeagueId);
      } else {
        findQuery = findQuery.eq('league_name', targetLeagueName);
      }

      const { data: existingLeague, error: findError } = await findQuery.single();

      if (findError || !existingLeague) {
        return res.status(404).json({ error: 'League not found' });
      }

      // If renaming, check new name doesn't conflict
      if (newLeagueName && newLeagueName !== existingLeague.league_name) {
        const { data: nameConflict, error: checkError } = await supabase
          .from('league_data')
          .select('league_id')
          .eq('club_id', clubId)
          .eq('league_name', newLeagueName.trim())
          .single();

        if (nameConflict) {
          return res.status(409).json({ error: 'League name already exists for this club' });
        }

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }
      }

      // Build update object
      const updates = {
        updated_at: new Date().toISOString()
      };

      if (leagueData !== undefined) {
        // Parse if body.data was double-encoded as string
        if (typeof leagueData === 'string') {
          try { leagueData = JSON.parse(leagueData || '{}'); } catch (e) { leagueData = {}; }
        }
        leagueData = leagueData || {};
        // Merge incoming leagueData with existing JSONB data to preserve fields not being updated
        // This prevents losing registeredPlayers, eventDays, etc. if they're missing in the update
        const existingData = typeof existingLeague.data === 'string'
          ? (() => { try { return JSON.parse(existingLeague.data || '{}'); } catch (e) { return {}; } })()
          : (existingLeague.data || {});
        
        // Special handling for registeredPlayers: Don't overwrite with empty array
        // If incoming registeredPlayers is empty but existing has data, preserve existing
        const shouldPreservePlayers = 
          Array.isArray(existingData.registeredPlayers) && existingData.registeredPlayers.length > 0 &&
          Array.isArray(leagueData.registeredPlayers) && leagueData.registeredPlayers.length === 0;
        
        const mergedLeagueData = {
          ...existingData, // Preserve existing JSONB data (registeredPlayers, eventDays, etc.)
          ...leagueData,   // Overwrite with incoming updates
          // Override registeredPlayers if we should preserve existing
          ...(shouldPreservePlayers && { registeredPlayers: existingData.registeredPlayers })
        };
        // Never wipe eventDays: prefer incoming if non-empty; if incoming empty/missing and existing has data, preserve (match history in eventDays[].schedule)
        const hasIncoming = Array.isArray(leagueData.eventDays) && leagueData.eventDays.length > 0;
        const hasExisting = Array.isArray(existingData.eventDays) && existingData.eventDays.length > 0;
        mergedLeagueData.eventDays = hasIncoming ? leagueData.eventDays : (hasExisting ? existingData.eventDays : (Array.isArray(leagueData.eventDays) ? leagueData.eventDays : []));
        mergedLeagueData.eventDays = mergedLeagueData.eventDays.map(d => ({
          ...d,
          schedule: Array.isArray(d && d.schedule) ? d.schedule : [],
          moneyRoundSchedule: Array.isArray(d && d.moneyRoundSchedule) ? d.moneyRoundSchedule : []
        }));
        
        // Log what's being saved to verify eventDays and registeredPlayers are included
        console.log(`PUT: Saving league data for league ${existingLeague.league_id}`, {
          hasEventDays: !!mergedLeagueData.eventDays,
          eventDaysCount: mergedLeagueData.eventDays?.length || 0,
          eventDaysWithSchedule: mergedLeagueData.eventDays?.filter(day => day.schedule && day.schedule.length > 0).length || 0,
          totalMatches: mergedLeagueData.eventDays?.reduce((sum, day) => sum + (day.schedule?.length || 0), 0) || 0,
          completedMatches: mergedLeagueData.eventDays?.reduce((sum, day) => {
            const completed = day.schedule?.filter(m => m.status === 'completed').length || 0;
            return sum + completed;
          }, 0) || 0,
          hasRegisteredPlayers: !!mergedLeagueData.registeredPlayers,
          registeredPlayersCount: mergedLeagueData.registeredPlayers?.length || 0,
          incomingPlayersCount: leagueData.registeredPlayers?.length || 0,
          existingPlayersCount: existingData.registeredPlayers?.length || 0
        });
        
        updates.data = mergedLeagueData;
        
        // Sync players to normalized tables if registeredPlayers exists in mergedLeagueData
        // Use mergedLeagueData instead of leagueData to ensure we sync all players (not just incoming)
        if (mergedLeagueData.registeredPlayers && Array.isArray(mergedLeagueData.registeredPlayers)) {
          console.log(`PUT: Syncing ${mergedLeagueData.registeredPlayers.length} players for league ${existingLeague.league_id} (league_data.id: ${existingLeague.id})`);
          try {
            await syncPlayersToDatabase(supabase, existingLeague.id, existingLeague.league_id, clubId, mergedLeagueData.registeredPlayers);
            console.log(`PUT: Successfully synced players for league ${existingLeague.league_id}`);
          } catch (syncError) {
            console.error('PUT: Error syncing players during league update:', syncError);
            console.error('PUT: Sync error details:', {
              leagueDataId: existingLeague.id,
              leagueId: existingLeague.league_id,
              clubId,
              playerCount: mergedLeagueData.registeredPlayers.length,
              errorMessage: syncError.message,
              errorStack: syncError.stack
            });
            // Don't fail league update if player sync fails, but log the error
          }
        } else {
          console.log('PUT: No registeredPlayers found in mergedLeagueData', {
            hasMergedLeagueData: !!mergedLeagueData,
            mergedPlayersCount: mergedLeagueData.registeredPlayers?.length || 0,
            hasIncomingLeagueData: !!leagueData,
            incomingPlayersCount: leagueData.registeredPlayers?.length || 0,
            hasExistingData: !!existingData,
            existingPlayersCount: existingData.registeredPlayers?.length || 0,
            registeredPlayersType: mergedLeagueData?.registeredPlayers ? typeof mergedLeagueData.registeredPlayers : 'undefined',
            isArray: Array.isArray(mergedLeagueData?.registeredPlayers)
          });
        }
      }
      if (newLeagueName !== undefined) {
        updates.league_name = newLeagueName.trim();
      }
      if (description !== undefined) {
        updates.description = description;
      }
      if (status !== undefined) {
        updates.status = status;
      }

      const { data, error } = await supabase
        .from('league_data')
        .update(updates)
        .eq('id', existingLeague.id)
        .select('id, league_id, league_name, status, description, data, created_at, updated_at')
        .single();

      if (error) {
        throw error;
      }

      // Reload players from normalized tables for response
      const { data: leaguePlayers } = await supabase
        .from('league_players')
        .select(`
          registered_at,
          player:player_id (
            id,
            name,
            dupr_rating,
            gender
          ),
          stats:player_stats!player_stats_league_id_player_id_fkey (
            cumulative_points,
            total_wins,
            total_losses,
            points_scored,
            points_allowed,
            event_days_attended,
            court_history,
            ladder_position_history,
            money_round_stats
          )
        `)
        .eq('league_id', existingLeague.id);

      const registeredPlayers = (leaguePlayers || []).map(lp => {
        const player = lp.player;
        const stats = lp.stats && lp.stats.length > 0 ? lp.stats[0] : null;
        
        return {
          id: player?.id || null,
          name: player?.name || '',
          duprRating: player?.dupr_rating ? parseFloat(player.dupr_rating) : 4.5,
          gender: player?.gender || null,
          registeredAt: lp.registered_at ? new Date(lp.registered_at).getTime() : Date.now(),
          cumulativePoints: stats?.cumulative_points || 0,
          totalWins: stats?.total_wins || 0,
          totalLosses: stats?.total_losses || 0,
          pointsScored: stats?.points_scored || 0,
          pointsAllowed: stats?.points_allowed || 0,
          eventDaysAttended: stats?.event_days_attended || 0,
          courtHistory: stats?.court_history || [],
          ladderPositionHistory: stats?.ladder_position_history || [],
          moneyRoundStats: stats?.money_round_stats || {
            totalWins: 0,
            totalLosses: 0,
            totalContributions: 0,
            totalPaid: 0,
            contributionHistory: []
          }
        };
      });

      const mergedLeagueData = {
        ...(data.data || {}),
        registeredPlayers: registeredPlayers
      };

      return res.status(200).json({ 
        success: true,
        league: {
          id: data.id,
          leagueId: data.league_id,
          leagueName: data.league_name,
          status: data.status,
          description: data.description,
          data: mergedLeagueData,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      });
    }

    // DELETE: Delete league (Admin only)
    if (req.method === 'DELETE') {
      // Verify admin access
      const { masterKey } = req.query.masterKey ? { masterKey: req.query.masterKey } : req.body || {};
      const isAdmin = await verifyAdminAccess(slug, masterKey);
      
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required to delete leagues' });
      }

      const targetLeagueId = leagueId || req.body?.leagueId;
      const targetLeagueName = leagueName || req.body?.leagueName;

      if (!targetLeagueId && !targetLeagueName) {
        return res.status(400).json({ error: 'leagueId or leagueName is required' });
      }

      // Find the league to delete
      let findQuery = supabase
        .from('league_data')
        .select('id')
        .eq('club_id', clubId);
      
      if (targetLeagueId) {
        findQuery = findQuery.eq('league_id', targetLeagueId);
      } else {
        findQuery = findQuery.eq('league_name', targetLeagueName);
      }

      const { data: existingLeague, error: findError } = await findQuery.single();

      if (findError || !existingLeague) {
        return res.status(404).json({ error: 'League not found' });
      }

      const { error } = await supabase
        .from('league_data')
        .delete()
        .eq('id', existingLeague.id);

      if (error) {
        throw error;
      }

      return res.status(200).json({ 
        success: true,
        message: 'League deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('League data error:', error);
    return res.status(500).json({ 
      error: 'Failed to process league data',
      message: error.message 
    });
  }
}
