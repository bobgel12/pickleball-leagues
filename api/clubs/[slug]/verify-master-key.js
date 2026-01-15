import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const { slug, masterKey } = req.body;

  if (!slug || !masterKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: club, error } = await supabase
      .from('clubs')
      .select('master_key_hash')
      .eq('slug', slug)
      .single();

    if (error || !club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    const isValid = await bcrypt.compare(masterKey, club.master_key_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid master key' });
    }

    return res.status(200).json({ success: true, verified: true });
  } catch (error) {
    console.error('Master key verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify master key',
      message: error.message 
    });
  }
}
