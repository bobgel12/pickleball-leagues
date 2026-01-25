function buildMatchPayload({ match, teamAIds, teamBIds, context }) {
  return {
    matchId: String(match.id ?? ''),
    eventDayId: context.eventDayId != null ? String(context.eventDayId) : null,
    leagueId: context.leagueId || null,
    tournamentId: context.tournamentId || null,
    playedAt: match.completedAt || new Date().toISOString(),
    teamA: teamAIds,
    teamB: teamBIds,
    scoreA: match.scoreA ?? null,
    scoreB: match.scoreB ?? null,
    winner: match.winner || null,
    source: context.source || null
  };
}

export async function syncMatchesToDupr({ matches, getPlayerById, context }) {
  const results = [];

  for (const match of matches) {
    if (match?.status !== 'completed') continue;
    const teamA = Array.isArray(match.teamA) ? match.teamA : match.A;
    const teamB = Array.isArray(match.teamB) ? match.teamB : match.B;
    const teamAIds = (teamA || []).map(id => getPlayerById(id)?.duprId).filter(Boolean);
    const teamBIds = (teamB || []).map(id => getPlayerById(id)?.duprId).filter(Boolean);

    if (teamAIds.length !== 2 || teamBIds.length !== 2) {
      results.push({
        matchId: match.id,
        skipped: true,
        reason: 'Missing DUPR id for one or more players'
      });
      continue;
    }

    const payload = buildMatchPayload({ match, teamAIds, teamBIds, context });

    try {
      const response = await fetch('/api/dupr/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const detail = await response.text();
        results.push({ matchId: match.id, skipped: true, reason: detail });
        continue;
      }

      const data = await response.json();
      const duprMatchId = data?.data?.id || data?.data?.matchId || null;
      results.push({
        matchId: match.id,
        duprMatchId,
        syncedAt: Date.now()
      });
    } catch (error) {
      results.push({ matchId: match.id, skipped: true, reason: error.message });
    }
  }

  return results;
}
