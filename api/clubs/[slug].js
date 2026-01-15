import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// CORS headers helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  setCorsHeaders(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Club slug is required' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data: club, error } = await supabase
      .from('clubs')
      .select('id, slug, name, address, created_at')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Club not found' });
      }
      throw error;
    }

    return res.status(200).json({ club });
  } catch (error) {
    console.error('Error fetching club:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch club',
      message: error.message 
    });
  }
}
