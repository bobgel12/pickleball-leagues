import { createClient } from '@supabase/supabase-js';

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
  const { playerId } = req.query; // For GET/DELETE operations
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const clubId = await getClubId(supabase, slug);
    if (!clubId) {
      return res.status(404).json({ error: 'Club not found' });
    }

    // GET: List all players for a club or get specific player
    if (req.method === 'GET') {
      // If playerId provided, return specific player with stats across all leagues
      if (playerId) {
        const { data: player, error } = await supabase
          .from('players')
          .select('id, club_id, name, dupr_id, dupr_rating, dupr_rating_updated_at, gender, created_at, updated_at')
          .eq('id', playerId)
          .eq('club_id', clubId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Player not found' });
          }
          throw error;
        }

        // Get player stats across all leagues
        const { data: stats, error: statsError } = await supabase
          .from('player_stats')
          .select(`
            *,
            league:league_id (
              id,
              league_id,
              league_name
            )
          `)
          .eq('player_id', playerId);

        if (statsError) {
          console.error('Error fetching player stats:', statsError);
        }

        return res.status(200).json({
          player: {
            id: player.id,
            clubId: player.club_id,
            name: player.name,
            duprId: player.dupr_id || null,
            duprRating: parseFloat(player.dupr_rating),
            duprRatingUpdatedAt: player.dupr_rating_updated_at,
            gender: player.gender,
            createdAt: player.created_at,
            updatedAt: player.updated_at,
            stats: (stats || []).map(s => ({
              leagueId: s.league_id,
              cumulativePoints: s.cumulative_points,
              totalWins: s.total_wins,
              totalLosses: s.total_losses,
              pointsScored: s.points_scored,
              pointsAllowed: s.points_allowed,
              eventDaysAttended: s.event_days_attended,
              courtHistory: s.court_history,
              ladderPositionHistory: s.ladder_position_history,
              moneyRoundStats: s.money_round_stats
            }))
          }
        });
      }

      // Otherwise, return list of all players for the club
      const { data: players, error } = await supabase
        .from('players')
        .select('id, club_id, name, dupr_id, dupr_rating, dupr_rating_updated_at, gender, created_at, updated_at')
        .eq('club_id', clubId)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return res.status(200).json({
        players: (players || []).map(p => ({
          id: p.id,
          clubId: p.club_id,
          name: p.name,
          duprId: p.dupr_id || null,
          duprRating: parseFloat(p.dupr_rating),
          duprRatingUpdatedAt: p.dupr_rating_updated_at,
          gender: p.gender,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }))
      });
    }

    // POST: Create a new player
    if (req.method === 'POST') {
      const { name, duprRating, gender } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Player name is required' });
      }

      // Check if player with same name already exists for this club
      const { data: existing, error: checkError } = await supabase
        .from('players')
        .select('id')
        .eq('club_id', clubId)
        .eq('name', name.trim())
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Player with this name already exists for this club' });
      }

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // Create new player
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          club_id: clubId,
          name: name.trim(),
          dupr_rating: duprRating || 4.50,
          gender: gender || null
        })
        .select('id, club_id, name, dupr_id, dupr_rating, dupr_rating_updated_at, gender, created_at, updated_at')
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        player: {
          id: player.id,
          clubId: player.club_id,
          name: player.name,
          duprId: player.dupr_id || null,
          duprRating: parseFloat(player.dupr_rating),
          duprRatingUpdatedAt: player.dupr_rating_updated_at,
          gender: player.gender,
          createdAt: player.created_at,
          updatedAt: player.updated_at
        }
      });
    }

    // PUT: Update an existing player
    if (req.method === 'PUT') {
      const { playerId: bodyPlayerId, name, duprRating, gender } = req.body;
      const targetPlayerId = playerId || bodyPlayerId;

      if (!targetPlayerId) {
        return res.status(400).json({ error: 'playerId is required' });
      }

      // Find the player to update
      const { data: existingPlayer, error: findError } = await supabase
        .from('players')
        .select('id, name')
        .eq('id', targetPlayerId)
        .eq('club_id', clubId)
        .single();

      if (findError || !existingPlayer) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // If renaming, check new name doesn't conflict
      if (name && name.trim() !== existingPlayer.name) {
        const { data: nameConflict, error: checkError } = await supabase
          .from('players')
          .select('id')
          .eq('club_id', clubId)
          .eq('name', name.trim())
          .single();

        if (nameConflict) {
          return res.status(409).json({ error: 'Player with this name already exists for this club' });
        }

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }
      }

      // Build update object
      const updates = {
        updated_at: new Date().toISOString()
      };

      if (name !== undefined) {
        updates.name = name.trim();
      }
      if (duprRating !== undefined) {
        updates.dupr_rating = duprRating;
      }
      if (gender !== undefined) {
        updates.gender = gender || null;
      }

      const { data: player, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', targetPlayerId)
        .select('id, club_id, name, dupr_id, dupr_rating, dupr_rating_updated_at, gender, created_at, updated_at')
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        player: {
          id: player.id,
          clubId: player.club_id,
          name: player.name,
          duprId: player.dupr_id || null,
          duprRating: parseFloat(player.dupr_rating),
          duprRatingUpdatedAt: player.dupr_rating_updated_at,
          gender: player.gender,
          createdAt: player.created_at,
          updatedAt: player.updated_at
        }
      });
    }

    // DELETE: Delete a player
    if (req.method === 'DELETE') {
      const targetPlayerId = playerId || req.body?.playerId;

      if (!targetPlayerId) {
        return res.status(400).json({ error: 'playerId is required' });
      }

      // Check if player exists and belongs to this club
      const { data: existingPlayer, error: findError } = await supabase
        .from('players')
        .select('id')
        .eq('id', targetPlayerId)
        .eq('club_id', clubId)
        .single();

      if (findError || !existingPlayer) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Delete player (cascade will delete league_players and player_stats)
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', targetPlayerId);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Player deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Player data error:', error);
    return res.status(500).json({
      error: 'Failed to process player data',
      message: error.message
    });
  }
}
