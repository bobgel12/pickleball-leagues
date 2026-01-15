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

      return res.status(200).json({ data: data?.data || null });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { data: tournamentData } = req.body;

      if (!tournamentData || typeof tournamentData !== 'object') {
        return res.status(400).json({ error: 'Invalid tournament data' });
      }

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
