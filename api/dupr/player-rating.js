import { getPlayerRating } from './apiClient.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { duprId } = req.query || {};
    if (!duprId) {
      return res.status(400).json({ error: 'duprId is required' });
    }

    const data = await getPlayerRating(String(duprId));
    return res.status(200).json({ data });
  } catch (error) {
    console.error('DUPR player rating error:', error);
    return res.status(500).json({ error: 'Failed to fetch DUPR rating' });
  }
}
