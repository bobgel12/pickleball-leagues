import { getRequiredEnv } from './utils.js';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getServiceToken() {
  const tokenUrl = process.env.DUPR_API_TOKEN_URL;
  if (!tokenUrl) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const clientId = process.env.DUPR_CLIENT_ID;
  const clientSecret = process.env.DUPR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing DUPR client credentials for token exchange');
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    }).toString()
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch DUPR service token: ${detail}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  const expiresIn = Number(data.expires_in) || 3600;
  cachedTokenExpiresAt = now + expiresIn * 1000;
  return cachedToken;
}

async function buildAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getServiceToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const clientKey = process.env.DUPR_CLIENT_KEY;
  const clientSecret = process.env.DUPR_CLIENT_SECRET;
  if (clientKey) {
    headers['x-client-key'] = clientKey;
  }
  if (clientSecret) {
    headers['x-client-secret'] = clientSecret;
  }
  return headers;
}

function interpolateUrl(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] != null ? String(params[key]) : '';
  });
}

export async function getPlayerRating(duprId) {
  const template = getRequiredEnv('DUPR_PLAYER_RATING_URL');
  const url = interpolateUrl(template, { duprId });
  const headers = await buildAuthHeaders();

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch DUPR player rating: ${detail}`);
  }
  return response.json();
}

export async function createMatch(payload) {
  const url = getRequiredEnv('DUPR_MATCHES_URL');
  const headers = await buildAuthHeaders();

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to create DUPR match: ${detail}`);
  }
  return response.json();
}

export async function updateMatch(matchId, payload) {
  const baseUrl = getRequiredEnv('DUPR_MATCHES_URL');
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(matchId)}`;
  const headers = await buildAuthHeaders();
  const method = process.env.DUPR_MATCH_UPDATE_METHOD || 'PUT';

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to update DUPR match: ${detail}`);
  }
  return response.json();
}

export async function deleteMatch(matchId) {
  const baseUrl = getRequiredEnv('DUPR_MATCHES_URL');
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(matchId)}`;
  const headers = await buildAuthHeaders();

  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to delete DUPR match: ${detail}`);
  }
  return response.json();
}
