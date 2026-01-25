import { createClient } from '@supabase/supabase-js';
import { verifyState, getBaseUrl, getRequiredEnv } from './utils.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error: oauthError } = req.query || {};
    if (oauthError) {
      return res.status(400).send(`DUPR login error: ${oauthError}`);
    }
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const stateSecret = getRequiredEnv('DUPR_STATE_SECRET');
    const statePayload = verifyState(state, stateSecret);
    if (!statePayload) {
      return res.status(400).json({ error: 'Invalid state' });
    }

    const clientId = getRequiredEnv('DUPR_CLIENT_ID');
    const clientSecret = getRequiredEnv('DUPR_CLIENT_SECRET');
    const tokenUrl = getRequiredEnv('DUPR_OAUTH_TOKEN_URL');
    const userInfoUrl = getRequiredEnv('DUPR_OAUTH_USERINFO_URL');

    const redirectUri = process.env.DUPR_REDIRECT_URI || `${getBaseUrl(req)}/api/dupr/callback`;

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: String(code)
      }).toString()
    });

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text();
      console.error('DUPR token error:', detail);
      return res.status(500).send('Failed to exchange DUPR code');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.status(500).send('Missing DUPR access token');
    }

    const profileResponse = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!profileResponse.ok) {
      const detail = await profileResponse.text();
      console.error('DUPR profile error:', detail);
      return res.status(500).send('Failed to load DUPR profile');
    }

    const profile = await profileResponse.json();
    const duprId = profile.duprId || profile.playerId || profile.id;
    if (!duprId) {
      return res.status(500).send('DUPR profile missing id');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const clubId = await getClubId(supabase, statePayload.clubSlug);
    if (!clubId) {
      return res.status(404).send('Club not found');
    }

    // Ensure DUPR id is not already linked to another player in the same club
    const { data: existing, error: existingError } = await supabase
      .from('players')
      .select('id')
      .eq('club_id', clubId)
      .eq('dupr_id', duprId)
      .maybeSingle();

    if (existingError) {
      console.error('DUPR link lookup error:', existingError);
      return res.status(500).send('Failed to verify DUPR link');
    }

    if (existing && String(existing.id) !== String(statePayload.playerId)) {
      return res.status(409).send('DUPR account already linked to another player');
    }

    const updates = {
      dupr_id: duprId,
      updated_at: new Date().toISOString()
    };

    if (profile.duprRating || profile.rating) {
      const rating = Number(profile.duprRating || profile.rating);
      if (Number.isFinite(rating)) {
        updates.dupr_rating = rating;
        updates.dupr_rating_updated_at = new Date().toISOString();
      }
    }

    const { error: updateError } = await supabase
      .from('players')
      .update(updates)
      .eq('id', statePayload.playerId)
      .eq('club_id', clubId);

    if (updateError) {
      console.error('DUPR link update error:', updateError);
      return res.status(500).send('Failed to link DUPR account');
    }

    const cookieOptions = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax'
    ];
    const forwardedProto = req.headers['x-forwarded-proto'];
    const isSecure = forwardedProto ? String(forwardedProto).includes('https') : false;
    if (isSecure) {
      cookieOptions.push('Secure');
    }
    if (tokenData.expires_in) {
      cookieOptions.push(`Max-Age=${Number(tokenData.expires_in)}`);
    }

    const cookies = [
      `dupr_access_token=${accessToken}; ${cookieOptions.join('; ')}`
    ];
    if (tokenData.refresh_token) {
      cookies.push(`dupr_refresh_token=${tokenData.refresh_token}; ${cookieOptions.join('; ')}`);
    }
    res.setHeader('Set-Cookie', cookies);

    const returnTo = statePayload.returnTo || '/';
    const url = new URL(returnTo, getBaseUrl(req));
    url.searchParams.set('duprLinked', '1');
    url.searchParams.set('playerId', String(statePayload.playerId));
    return res.redirect(302, url.toString());
  } catch (error) {
    console.error('DUPR callback error:', error);
    return res.status(500).send('DUPR login failed');
  }
}
