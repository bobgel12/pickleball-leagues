import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// CORS headers helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  setCorsHeaders(res);

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const { slug } = req.query;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const clubId = await getClubId(supabase, slug);
    if (!clubId) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (req.method === 'POST') {
      const { leagueId, eventDayId, match, isMoneyRound } = req.body || {};
      if (!leagueId || !match || eventDayId == null) {
        return res.status(400).json({ error: 'leagueId, eventDayId, and match are required' });
      }

      const { data: leagueRow, error: leagueError } = await supabase
        .from('league_data')
        .select('id, league_id')
        .eq('club_id', clubId)
        .eq('league_id', leagueId)
        .single();

      if (leagueError || !leagueRow) {
        if (leagueError?.code === 'PGRST116') {
          return res.status(404).json({ error: 'League not found' });
        }
        throw leagueError;
      }

      const status = match.status || 'pending';
      const payload = {
        league_id: leagueRow.id,
        event_day_id: String(eventDayId),
        match_id: String(match.id ?? ''),
        court_index: Number.isFinite(match.courtIndex) ? match.courtIndex : null,
        round_number: Number.isFinite(match.roundNumber) ? match.roundNumber : null,
        team_a: Array.isArray(match.teamA) ? match.teamA : [],
        team_b: Array.isArray(match.teamB) ? match.teamB : [],
        score_a: Number.isFinite(match.scoreA) ? match.scoreA : null,
        score_b: Number.isFinite(match.scoreB) ? match.scoreB : null,
        winner: match.winner === 'A' || match.winner === 'B' ? match.winner : null,
        status,
        is_money_round: Boolean(isMoneyRound),
        sitting_out: match.sittingOut ?? null,
        played_with_partner: Boolean(match.playedWithPartner),
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('matches')
        .upsert(payload, {
          onConflict: 'league_id,event_day_id,match_id'
        });

      if (upsertError) {
        throw upsertError;
      }

      return res.status(200).json({ success: true });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { leagueId, eventDayId, status, isMoneyRound } = req.query;

    if (!leagueId) {
      return res.status(400).json({ error: 'leagueId is required' });
    }

    const { data: leagueRow, error: leagueError } = await supabase
      .from('league_data')
      .select('id, league_id, data')
      .eq('club_id', clubId)
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !leagueRow) {
      if (leagueError?.code === 'PGRST116') {
        return res.status(404).json({ error: 'League not found' });
      }
      throw leagueError;
    }

    let query = supabase
      .from('matches')
      .select('*')
      .eq('league_id', leagueRow.id)
      .order('completed_at', { ascending: false, nullsFirst: false });

    if (eventDayId !== undefined) {
      query = query.eq('event_day_id', String(eventDayId));
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (isMoneyRound !== undefined) {
      query = query.eq('is_money_round', String(isMoneyRound) === 'true');
    }

    const { data: matches, error: matchesError } = await query;
    if (matchesError) {
      throw matchesError;
    }

    // Resolve player names from league data when available
    const playerMap = {};
    const leagueData = typeof leagueRow.data === 'string'
      ? (() => { try { return JSON.parse(leagueRow.data || '{}'); } catch { return {}; } })()
      : (leagueRow.data || {});
    const registeredPlayers = Array.isArray(leagueData.registeredPlayers) ? leagueData.registeredPlayers : [];
    registeredPlayers.forEach(player => {
      if (player?.id != null) {
        playerMap[String(player.id)] = {
          id: player.id,
          name: player.name || ''
        };
      }
    });

    return res.status(200).json({
      matches: matches || [],
      playerMap
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
}
