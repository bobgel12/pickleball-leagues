import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// CORS headers helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const clubId = await getClubId(supabase, slug);
    if (!clubId) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('tournament_data')
        .select('data')
        .eq('club_id', clubId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data exists yet, return empty state
          return res.status(200).json({ data: null });
        }
        throw error;
      }

      const tournamentData = data?.data || null;
      
      // Debug logging to help diagnose player retrieval issues
      if (tournamentData) {
        const tournaments = Array.isArray(tournamentData.tournaments) 
          ? tournamentData.tournaments 
          : (tournamentData.players ? [tournamentData] : []);
        
        tournaments.forEach((t, idx) => {
          const playerCount = Array.isArray(t.players) ? t.players.length : 0;
          console.log(`[Tournament API] Tournament ${idx}: ${playerCount} players found`);
          if (playerCount > 0 && playerCount < 16) {
            console.log(`[Tournament API] WARNING: Expected 16 players but found ${playerCount}`);
            console.log(`[Tournament API] Sample players:`, t.players.slice(0, 3).map(p => ({ 
              id: p?.id, 
              playerId: p?.playerId, 
              name: p?.name 
            })));
          }
        });
      }

      return res.status(200).json({ data: tournamentData });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { data: tournamentData } = req.body;

      if (!tournamentData || typeof tournamentData !== 'object') {
        return res.status(400).json({ error: 'Invalid tournament data' });
      }

      // Debug logging to see what's being saved
      const tournaments = Array.isArray(tournamentData.tournaments) 
        ? tournamentData.tournaments 
        : (tournamentData.players ? [tournamentData] : []);
      
      tournaments.forEach((t, idx) => {
        const playerCount = Array.isArray(t.players) ? t.players.length : 0;
        console.log(`[Tournament API] Saving tournament ${idx}: ${playerCount} players`);
        if (playerCount > 0) {
          console.log(`[Tournament API] Sample players being saved:`, t.players.slice(0, 3).map(p => ({ 
            id: p?.id, 
            playerId: p?.playerId, 
            name: p?.name 
          })));
        }
      });

      // Upsert tournament data
      const { data, error } = await supabase
        .from('tournament_data')
        .upsert({
          club_id: clubId,
          data: tournamentData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'club_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Verify what was actually saved
      const savedTournaments = Array.isArray(data.data?.tournaments) 
        ? data.data.tournaments 
        : (data.data?.players ? [data.data] : []);
      
      savedTournaments.forEach((t, idx) => {
        const playerCount = Array.isArray(t.players) ? t.players.length : 0;
        console.log(`[Tournament API] Verified saved tournament ${idx}: ${playerCount} players in database`);
      });

      return res.status(200).json({ 
        success: true,
        data: data.data 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tournament data error:', error);
    return res.status(500).json({ 
      error: 'Failed to process tournament data',
      message: error.message 
    });
  }
}
