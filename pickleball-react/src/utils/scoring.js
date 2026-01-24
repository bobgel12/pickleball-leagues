import { COURT_MULTIPLIERS, SMART_COURT_WEIGHTS } from './constants.js';

export function computeSummary(tournament, getPlayerById) {
  // Always refresh player names from current tournament state via getPlayerById
  const summary = tournament.players.map(p => {
    // Double-check player exists and get current name
    const currentPlayer = getPlayerById(p.id);
    const playerName = currentPlayer?.name || p.name || `Player ${p.id}`;
    return {
      id: p.id,
      name: playerName,
      points: p.points || 0,
      wins: 0,
      losses: 0,
      pointsScored: 0,
      pointsAllowed: 0,
      weightedPoints: 0,
      totalWeight: 0
    };
  });
  const byId = Object.fromEntries(summary.map(s => [s.id, s]));
  const scoringSystem = tournament.scoringSystem || "simple";

  for (const m of tournament.matches) {
    if (m.A.length === 2 && m.B.length === 2) {
      const winA = (m.winner === "A");
      const scoreA = m.scoreA || 0;
      const scoreB = m.scoreB || 0;
      const totalPoints = scoreA + scoreB;
      const courtIndex = m.court - 1;

      // Update wins/losses - normalize IDs to numbers
      for (const id of m.A) {
        const normalizedId = Number(id);
        if (byId[normalizedId]) {
          if (winA) byId[normalizedId].wins++;
          else byId[normalizedId].losses++;
        }
      }
      for (const id of m.B) {
        const normalizedId = Number(id);
        if (byId[normalizedId]) {
          if (winA) byId[normalizedId].losses++;
          else byId[normalizedId].wins++;
        }
      }

      // Update points scored/allowed - normalize IDs to numbers
      for (const id of m.A) {
        const normalizedId = Number(id);
        if (byId[normalizedId]) {
          byId[normalizedId].pointsScored += scoreA;
          byId[normalizedId].pointsAllowed += scoreB;
        }
      }
      for (const id of m.B) {
        const normalizedId = Number(id);
        if (byId[normalizedId]) {
          byId[normalizedId].pointsScored += scoreB;
          byId[normalizedId].pointsAllowed += scoreA;
        }
      }

      // Calculate weighted points based on scoring system
      if (scoringSystem === "smart") {
        const courtWeight = SMART_COURT_WEIGHTS[courtIndex];
        // Normalize IDs to numbers for consistent lookup
        const teamA = m.A.map(id => getPlayerById(Number(id))).filter(Boolean);
        const teamB = m.B.map(id => getPlayerById(Number(id))).filter(Boolean);
        const avgSeedA = teamA.reduce((sum, p) => sum + p.seed, 0) / teamA.length;
        const avgSeedB = teamB.reduce((sum, p) => sum + p.seed, 0) / teamB.length;

        for (const id of m.A) {
          const normalizedId = Number(id);
          if (byId[normalizedId]) {
            const opponentStrength = (avgSeedB - 2.000) / 6.000 + 0.2;
            byId[normalizedId].weightedPoints += scoreA * courtWeight * opponentStrength;
            byId[normalizedId].totalWeight += totalPoints * courtWeight * opponentStrength;
          }
        }
        for (const id of m.B) {
          const normalizedId = Number(id);
          if (byId[normalizedId]) {
            const opponentStrength = (avgSeedA - 2.000) / 6.000 + 0.2;
            byId[normalizedId].weightedPoints += scoreB * courtWeight * opponentStrength;
            byId[normalizedId].totalWeight += totalPoints * courtWeight * opponentStrength;
          }
        }
      } else {
        for (const id of m.A) {
          const normalizedId = Number(id);
          if (byId[normalizedId]) {
            byId[normalizedId].weightedPoints += scoreA;
            byId[normalizedId].totalWeight += totalPoints;
          }
        }
        for (const id of m.B) {
          const normalizedId = Number(id);
          if (byId[normalizedId]) {
            byId[normalizedId].weightedPoints += scoreB;
            byId[normalizedId].totalWeight += totalPoints;
          }
        }
      }
    }
  }

  // Refresh names one more time before returning to ensure we have the latest
  summary.forEach(s => {
    const currentPlayer = getPlayerById(s.id);
    if (currentPlayer && currentPlayer.name !== s.name) {
      s.name = currentPlayer.name;
    }
    s.total = s.wins + s.losses;
    s.totalPoints = s.pointsScored + s.pointsAllowed;
    s.winPct = s.totalWeight > 0 ? Math.round(1000 * s.weightedPoints / s.totalWeight) / 10 : 0;
  });
  summary.sort((a, b) => b.points - a.points || b.winPct - a.winPct || a.name.localeCompare(b.name));
  return summary;
}

export function calculateSmartBonuses({ courtIndex, scoreA, scoreB, winner, A, B }, getPlayerById) {
  const courtMultiplier = SMART_COURT_WEIGHTS[courtIndex];
  const marginBonus = Math.abs(scoreA - scoreB) / 10;
  const basePoints = 10;

  const opponentSeeds = (winner === "A") ? B : A;
  const playerSeeds = (winner === "A") ? A : B;
  const avgOpponentSeed = opponentSeeds.reduce((sum, id) => {
    const p = getPlayerById(Number(id));
    return sum + (p ? p.seed : 4.500);
  }, 0) / opponentSeeds.length;
  const avgPlayerSeed = playerSeeds.reduce((sum, id) => {
    const p = getPlayerById(Number(id));
    return sum + (p ? p.seed : 4.500);
  }, 0) / playerSeeds.length;
  const strengthDiff = (avgOpponentSeed - avgPlayerSeed) / 6.000;
  const strengthBonus = Math.max(0, strengthDiff * 3);

  return {
    courtMultiplier,
    basePoints,
    marginBonus,
    strengthBonus
  };
}

export function calculateMatchAwards({ system, courtIndex, winner, scoreA, scoreB, A, B }, getPlayerById) {
  const awards = {};
  if (!A || !B) return awards;
  const winners = (winner === "A") ? A : B;
  const losers = (winner === "A") ? B : A;

  let winPoints = 0;
  let lossPoints = 0;
  if (system === "simple") {
    winPoints = 1;
    lossPoints = -1;
  } else if (system === "court") {
    winPoints = COURT_MULTIPLIERS[courtIndex] ?? 1;
    lossPoints = 0;
  } else if (system === "smart") {
    const { courtMultiplier, basePoints, marginBonus, strengthBonus } = calculateSmartBonuses(
      { courtIndex, scoreA, scoreB, winner, A, B },
      getPlayerById
    );
    winPoints = Math.round((basePoints + marginBonus + strengthBonus) * courtMultiplier);
    lossPoints = Math.round(-2 * courtMultiplier);
  } else {
    winPoints = 1;
    lossPoints = -1;
  }

  winners.forEach(id => {
    awards[id] = (awards[id] ?? 0) + winPoints;
  });
  losers.forEach(id => {
    awards[id] = (awards[id] ?? 0) + lossPoints;
  });
  return awards;
}

export function applyAwards(awards, getPlayerById, setPlayerPoints) {
  if (!awards) return;
  Object.entries(awards).forEach(([idStr, delta]) => {
    const id = Number(idStr);
    const p = getPlayerById(id); // getPlayerById now handles normalization internally
    if (!p) {
      console.warn('applyAwards: Player not found for ID:', id);
      return;
    }
    const next = (p.points ?? 0) + delta;
    setPlayerPoints(id, Math.max(0, Math.round(next * 1000) / 1000));
  });
}

export function recalculatePointsFromMatches(tournament, getPlayerById, setPlayerPoints) {
  if (!Array.isArray(tournament.matches)) return;

  const totals = {};
  tournament.players.forEach(p => {
    totals[p.id] = 0;
  });

  const ordered = tournament.matches.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  ordered.forEach(match => {
    if (!Array.isArray(match.A) || !Array.isArray(match.B) || match.A.length < 2 || match.B.length < 2) {
      return;
    }
    const system = match.system || tournament.scoringSystem || "simple";
    const courtIndex = (match.court || 1) - 1;
    let awards = match.awards;
    if (!awards || typeof awards !== "object") {
      awards = calculateMatchAwards({
        system,
        courtIndex,
        winner: match.winner,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        A: match.A,
        B: match.B
      }, getPlayerById);
      // Note: We're mutating match.awards here, but this is okay since matches are stored in state
      // and will be updated when the tournament state changes
      match.awards = awards;
    }
    Object.entries(awards).forEach(([idStr, delta]) => {
      const id = Number(idStr);
      if (!Number.isFinite(id)) return;
      totals[id] = (totals[id] ?? 0) + delta;
    });
  });

  Object.entries(totals).forEach(([idStr, total]) => {
    const id = Number(idStr);
    if (!Number.isFinite(id)) return;
    setPlayerPoints(id, Math.max(0, Math.round(total * 1000) / 1000));
  });
  // Note: matchesPlayed is updated through addMatch, so we don't need to set it here
}

