import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

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
      if (leagueId || leagueName) {
        let query = supabase
          .from('league_data')
          .select('id, league_id, league_name, status, description, data, created_at, updated_at')
          .eq('club_id', clubId);
        
        if (leagueId) {
          query = query.eq('league_id', leagueId);
        } else if (leagueName) {
          query = query.eq('league_name', leagueName);
        }
        
        const { data, error } = await query.single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'League not found' });
          }
          throw error;
        }

        return res.status(200).json({ 
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
      
      // Otherwise, return list of all leagues (metadata only)
      const { data, error } = await supabase
        .from('league_data')
        .select('id, league_id, league_name, status, description, created_at, updated_at')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Extract basic stats from data for each league
      const leagues = (data || []).map(league => {
        const leagueData = league.data || {};
        const players = leagueData.registeredPlayers || [];
        const eventDays = leagueData.eventDays || [];
        
        return {
          id: league.id,
          leagueId: league.league_id,
          leagueName: league.league_name,
          status: league.status,
          description: league.description,
          playerCount: players.length,
          eventDaysCount: eventDays.length,
          createdAt: league.created_at,
          updatedAt: league.updated_at
        };
      });

      return res.status(200).json({ leagues });
    }

    // POST: Create new league
    if (req.method === 'POST') {
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
    if (req.method === 'PUT') {
      const { leagueId: bodyLeagueId, leagueName: bodyLeagueName, data: leagueData, leagueName: newLeagueName, description, status } = req.body;

      // Determine which league to update
      const targetLeagueId = leagueId || bodyLeagueId;
      const targetLeagueName = leagueName || bodyLeagueName;

      if (!targetLeagueId && !targetLeagueName) {
        return res.status(400).json({ error: 'leagueId or leagueName is required' });
      }

      // Find the league to update
      let findQuery = supabase
        .from('league_data')
        .select('id, league_id, league_name')
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
        updates.data = leagueData;
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

      return res.status(200).json({ 
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

    // DELETE: Delete league
    if (req.method === 'DELETE') {
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
