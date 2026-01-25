import { createMatch, updateMatch, deleteMatch } from './apiClient.js';

export default async function handler(req, res) {
  try {
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
  } catch (error) {
    console.error('DUPR match API error:', error);
    return res.status(500).json({ error: 'Failed to process DUPR match request' });
  }
}
