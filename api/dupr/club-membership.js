import { getRequiredEnv } from './utils.js';

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const match = cookies.find(c => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
  } catch (error) {
    console.error('DUPR club membership error:', error);
    return res.status(500).json({ error: 'Failed to verify DUPR club membership' });
  }
}
