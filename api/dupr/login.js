import { signState, getBaseUrl, getRequiredEnv } from './utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clubSlug, playerId, returnTo } = req.query || {};
    if (!clubSlug || !playerId) {
      return res.status(400).json({ error: 'clubSlug and playerId are required' });
    }

    const clientId = getRequiredEnv('DUPR_CLIENT_ID');
    const authorizeUrl = getRequiredEnv('DUPR_OAUTH_AUTHORIZE_URL');
    const stateSecret = getRequiredEnv('DUPR_STATE_SECRET');

    const redirectUri = process.env.DUPR_REDIRECT_URI || `${getBaseUrl(req)}/api/dupr/callback`;
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
  } catch (error) {
    console.error('DUPR login error:', error);
    return res.status(500).json({ error: 'Failed to start DUPR login' });
  }
}
