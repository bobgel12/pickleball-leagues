import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const match = cookies.find(c => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
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

    return await bcrypt.compare(masterKey, club.master_key_hash);
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  setCorsHeaders(res);

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const { slug } = req.query;
  const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

  try {
    const clubId = await getClubId(supabase, slug);
    if (!clubId) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (req.method === 'GET') {
      const { data: club, error } = await supabase
        .from('clubs')
        .select('id, slug, name, dupr_club_id, support_email, updated_at')
        .eq('id', clubId)
        .single();

      if (error || !club) {
        return res.status(404).json({ error: 'Club not found' });
      }

      return res.status(200).json({ club });
    }

    if (req.method === 'PUT') {
      const { masterKey, duprClubId, supportEmail } = req.body || {};
      const isAdmin = await verifyAdminAccess(slug, masterKey);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      if (duprClubId) {
        const membershipUrlTemplate = process.env.DUPR_CLUB_MEMBERSHIP_URL;
        if (membershipUrlTemplate) {
          const accessToken = getCookieValue(req.headers.cookie, 'dupr_access_token');
          if (!accessToken) {
            return res.status(401).json({ error: 'DUPR access token missing. Please sign in with DUPR.' });
          }

          const membershipUrl = membershipUrlTemplate.replace(/\{duprClubId\}/g, encodeURIComponent(String(duprClubId)));
          const membershipResponse = await fetch(membershipUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });

          if (!membershipResponse.ok) {
            const detail = await membershipResponse.text();
            return res.status(403).json({ error: `Club membership verification failed: ${detail}` });
          }

          const membershipData = await membershipResponse.json();
          const roles = membershipData?.roles || membershipData?.permissions || [];
          const roleList = Array.isArray(roles) ? roles : [];
          const normalized = roleList.map(role => String(role).toUpperCase());
          const hasAccess = normalized.includes('DIRECTOR') || normalized.includes('ORGANIZER');

          if (!hasAccess) {
            return res.status(403).json({ error: 'DUPR role must be DIRECTOR or ORGANIZER for this club' });
          }
        }
      }

      const updates = {
        updated_at: new Date().toISOString()
      };
      if (duprClubId !== undefined) {
        updates.dupr_club_id = duprClubId ? String(duprClubId).trim() : null;
      }
      if (supportEmail !== undefined) {
        updates.support_email = supportEmail ? String(supportEmail).trim() : null;
      }

      const { data: club, error } = await supabase
        .from('clubs')
        .update(updates)
        .eq('id', clubId)
        .select('id, slug, name, dupr_club_id, support_email, updated_at')
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({ club });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Club DUPR settings error:', error);
    return res.status(500).json({ error: 'Failed to update DUPR club settings' });
  }
}
