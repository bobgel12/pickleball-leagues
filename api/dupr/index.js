import { createClient } from '@supabase/supabase-js';
import { signState, verifyState, getBaseUrl, getRequiredEnv } from './utils.js';
import { createMatch, updateMatch, deleteMatch, getPlayerRating } from './apiClient.js';

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

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const match = cookies.find(c => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

async function handleLogin(req, res) {
  const { clubSlug, playerId, returnTo } = req.query || {};
  if (!clubSlug || !playerId) {
    return res.status(400).json({ error: 'clubSlug and playerId are required' });
  }

  const clientId = getRequiredEnv('DUPR_CLIENT_ID');
  const authorizeUrl = getRequiredEnv('DUPR_OAUTH_AUTHORIZE_URL');
  const stateSecret = getRequiredEnv('DUPR_STATE_SECRET');

  const redirectUri = process.env.DUPR_REDIRECT_URI || `${getBaseUrl(req)}/api/dupr?action=callback`;
  const scope = process.env.DUPR_OAUTH_SCOPE;

  const state = signState({
    clubSlug,
    playerId,
    returnTo: returnTo || '/',
    ts: Date.now()
  }, stateSecret);

  const url = new URL(authorizeUrl);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  if (scope) {
    url.searchParams.set('scope', scope);
  }

  return res.redirect(302, url.toString());
}

async function handleCallback(req, res) {
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

  const redirectUri = process.env.DUPR_REDIRECT_URI || `${getBaseUrl(req)}/api/dupr?action=callback`;

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
}

async function handleClubMembership(req, res) {
  const { duprClubId } = req.query || {};
  if (!duprClubId) {
    return res.status(400).json({ error: 'duprClubId is required' });
  }

  const accessToken = getCookieValue(req.headers.cookie, 'dupr_access_token');
  if (!accessToken) {
    return res.status(401).json({ error: 'DUPR access token missing. Please sign in with DUPR.' });
  }

  const template = getRequiredEnv('DUPR_CLUB_MEMBERSHIP_URL');
  const url = template.replace(/\{duprClubId\}/g, encodeURIComponent(String(duprClubId)));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    return res.status(500).json({ error: `Failed to verify club membership: ${detail}` });
  }

  const data = await response.json();
  return res.status(200).json({ data });
}

async function handlePlayerRating(req, res) {
  const { duprId } = req.query || {};
  if (!duprId) {
    return res.status(400).json({ error: 'duprId is required' });
  }
  const data = await getPlayerRating(String(duprId));
  return res.status(200).json({ data });
}

async function handleMatch(req, res) {
  if (req.method === 'POST') {
    const payload = req.body || {};
    const data = await createMatch(payload);
    return res.status(200).json({ data });
  }
  if (req.method === 'PUT') {
    const { matchId, ...payload } = req.body || {};
    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }
    const data = await updateMatch(matchId, payload);
    return res.status(200).json({ data });
  }
  if (req.method === 'DELETE') {
    const { matchId } = req.body || {};
    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }
    const data = await deleteMatch(matchId);
    return res.status(200).json({ data });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  try {
    const action = req.query?.action;
    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    if (action === 'login' && req.method === 'GET') {
      return await handleLogin(req, res);
    }
    if (action === 'callback' && req.method === 'GET') {
      return await handleCallback(req, res);
    }
    if (action === 'clubMembership' && req.method === 'GET') {
      return await handleClubMembership(req, res);
    }
    if (action === 'playerRating' && req.method === 'GET') {
      return await handlePlayerRating(req, res);
    }
    if (action === 'match') {
      return await handleMatch(req, res);
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (error) {
    console.error('DUPR handler error:', error);
    return res.status(500).json({ error: 'Failed to process DUPR request' });
  }
}
