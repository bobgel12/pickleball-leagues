import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const { name, address, masterKey, slug } = req.body;

  // Validation
  if (!name || !address || !masterKey || !slug) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate slug format (alphanumeric and hyphens only)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ 
      error: 'Slug must contain only lowercase letters, numbers, and hyphens' 
    });
  }

  if (slug.length < 3 || slug.length > 50) {
    return res.status(400).json({ 
      error: 'Slug must be between 3 and 50 characters' 
    });
  }

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if slug already exists
    const { data: existingClub, error: checkError } = await supabase
      .from('clubs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      throw checkError;
    }

    if (existingClub) {
      return res.status(409).json({ error: 'Club slug already exists' });
    }

    // Hash the master key
    const masterKeyHash = await bcrypt.hash(masterKey, 10);

    // Create club
    const { data: club, error: insertError } = await supabase
      .from('clubs')
      .insert({
        name,
        address,
        slug,
        master_key_hash: masterKeyHash
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Initialize empty tournament and league data
    const { error: tournamentError } = await supabase
      .from('tournament_data')
      .insert({
        club_id: club.id,
        data: {}
      });

    if (tournamentError) {
      console.error('Error creating tournament data:', tournamentError);
      // Continue anyway - can be created later
    }

    const { error: leagueError } = await supabase
      .from('league_data')
      .insert({
        club_id: club.id,
        data: {}
      });

    if (leagueError) {
      console.error('Error creating league data:', leagueError);
      // Continue anyway - can be created later
    }

    return res.status(201).json({
      success: true,
      club: {
        id: club.id,
        slug: club.slug,
        name: club.name,
        address: club.address
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Failed to register club',
      message: error.message 
    });
  }
}
