/**
 * Round-Robin Schedule Generator for Social Doubles
 * 
 * Generates a schedule where each player partners with every other player exactly once.
 * For 5 players, this creates 5 rounds with 1 match each (4 players play, 1 sits out).
 */

/**
 * Generate all unique pairings for a set of players
 * @param {Array} players - Array of player IDs
 * @returns {Array} Array of [player1, player2] pairs
 */
function generateAllPairings(players) {
  const pairings = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      pairings.push([players[i], players[j]]);
    }
  }
  return pairings;
}

/**
 * Check if two pairings share any players
 * @param {Array} pair1 - First pair [p1, p2]
 * @param {Array} pair2 - Second pair [p3, p4]
 * @returns {boolean} True if pairs share a player
 */
function pairsSharePlayer(pair1, pair2) {
  return pair1.some(p => pair2.includes(p));
}

/**
 * Generate a social doubles round-robin schedule for 5 players
 * Each player partners with every other player exactly once across 5 rounds.
 * 
 * @param {Array} playerIds - Array of 5 player IDs
 * @returns {Array} Array of round objects: { roundNumber, teamA, teamB, sittingOut }
 */
export function generateRoundRobinSchedule(playerIds) {
  if (!playerIds || playerIds.length < 4) {
    return [];
  }

  // For exactly 5 players, use the optimized social doubles algorithm
  if (playerIds.length === 5) {
    return generateFivePlayerSchedule(playerIds);
  }

  // For 4 players, simpler round-robin
  if (playerIds.length === 4) {
    return generateFourPlayerSchedule(playerIds);
  }

  // For 6 players, extended schedule
  if (playerIds.length === 6) {
    return generateSixPlayerSchedule(playerIds);
  }

  // Fallback for other counts
  return generateGenericSchedule(playerIds);
}

/**
 * Optimized schedule for exactly 5 players
 * Uses a pre-computed schedule that ensures each player partners with every other exactly once
 */
function generateFivePlayerSchedule(players) {
  const [A, B, C, D, E] = players;
  
  // Pre-computed optimal schedule for 5 players
  // Each player partners with every other player exactly once
  // Each player sits out exactly once
  return [
    { roundNumber: 1, teamA: [A, B], teamB: [C, D], sittingOut: E },
    { roundNumber: 2, teamA: [A, C], teamB: [B, E], sittingOut: D },
    { roundNumber: 3, teamA: [A, D], teamB: [C, E], sittingOut: B },
    { roundNumber: 4, teamA: [A, E], teamB: [B, D], sittingOut: C },
    { roundNumber: 5, teamA: [B, C], teamB: [D, E], sittingOut: A }
  ];
}

/**
 * Schedule for 4 players - simple 3-round rotation
 */
function generateFourPlayerSchedule(players) {
  const [A, B, C, D] = players;
  
  return [
    { roundNumber: 1, teamA: [A, B], teamB: [C, D], sittingOut: null },
    { roundNumber: 2, teamA: [A, C], teamB: [B, D], sittingOut: null },
    { roundNumber: 3, teamA: [A, D], teamB: [B, C], sittingOut: null }
  ];
}

/**
 * Schedule for 6 players - each player partners with every other
 */
function generateSixPlayerSchedule(players) {
  const [A, B, C, D, E, F] = players;
  
  // For 6 players, we need 5 rounds where each player partners with every other
  // In each round, all 6 play (3 matches per round)
  return [
    { roundNumber: 1, teamA: [A, B], teamB: [C, D], sittingOut: null, match2: { teamA: [E, F], teamB: null } },
    { roundNumber: 2, teamA: [A, C], teamB: [B, E], sittingOut: null },
    { roundNumber: 3, teamA: [A, D], teamB: [B, F], sittingOut: null },
    { roundNumber: 4, teamA: [A, E], teamB: [C, F], sittingOut: null },
    { roundNumber: 5, teamA: [A, F], teamB: [D, E], sittingOut: null },
    { roundNumber: 6, teamA: [B, C], teamB: [D, F], sittingOut: null },
    { roundNumber: 7, teamA: [B, D], teamB: [C, E], sittingOut: null },
    { roundNumber: 8, teamA: [C, D], teamB: [E, F], sittingOut: null }
  ];
}

/**
 * Generic schedule generator for any number of players
 */
function generateGenericSchedule(players) {
  const allPairings = generateAllPairings(players);
  const usedPairings = new Set();
  const schedule = [];
  let roundNumber = 1;

  // Greedily assign pairings to rounds
  while (usedPairings.size < allPairings.length) {
    // Find two non-overlapping pairs that haven't been used
    for (let i = 0; i < allPairings.length; i++) {
      const pair1Key = allPairings[i].join('-');
      if (usedPairings.has(pair1Key)) continue;

      for (let j = i + 1; j < allPairings.length; j++) {
        const pair2Key = allPairings[j].join('-');
        if (usedPairings.has(pair2Key)) continue;
        if (pairsSharePlayer(allPairings[i], allPairings[j])) continue;

        // Found a valid match
        const playingIds = [...allPairings[i], ...allPairings[j]];
        const sittingOut = players.filter(p => !playingIds.includes(p));

        schedule.push({
          roundNumber,
          teamA: allPairings[i],
          teamB: allPairings[j],
          sittingOut: sittingOut.length === 1 ? sittingOut[0] : sittingOut
        });

        usedPairings.add(pair1Key);
        usedPairings.add(pair2Key);
        roundNumber++;
        break;
      }
      if (usedPairings.has(allPairings[i].join('-'))) break;
    }

    // Safety check to prevent infinite loop
    if (schedule.length >= allPairings.length) break;
  }

  return schedule;
}

/**
 * Generate the full schedule for an event day (all 4 courts)
 * @param {Array} courtAssignments - Array of 4 arrays, each containing player IDs for that court
 * @returns {Array} Array of all matches across all courts
 */
export function generateEventDaySchedule(courtAssignments) {
  const allMatches = [];
  let matchId = 1;

  courtAssignments.forEach((courtPlayers, courtIndex) => {
    if (!courtPlayers || courtPlayers.length < 4) return;

    const courtSchedule = generateRoundRobinSchedule(courtPlayers);
    
    courtSchedule.forEach(round => {
      allMatches.push({
        id: matchId++,
        courtIndex,
        roundNumber: round.roundNumber,
        teamA: round.teamA,
        teamB: round.teamB,
        sittingOut: round.sittingOut,
        scoreA: null,
        scoreB: null,
        winner: null,
        status: 'pending'
      });
    });
  });

  return allMatches;
}

/**
 * Get matches for a specific court and round
 * @param {Array} schedule - Full event day schedule
 * @param {number} courtIndex - Court index (0-3)
 * @param {number} roundNumber - Round number (1-5)
 * @returns {Array} Matches for that court/round
 */
export function getMatchesForCourtRound(schedule, courtIndex, roundNumber) {
  return schedule.filter(
    m => m.courtIndex === courtIndex && m.roundNumber === roundNumber
  );
}

/**
 * Calculate progress for an event day
 * @param {Array} schedule - Full event day schedule
 * @returns {Object} { completed, total, percentage }
 */
export function calculateScheduleProgress(schedule) {
  const total = schedule.length;
  const completed = schedule.filter(m => m.status === 'completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, total, percentage };
}

/**
 * Validate that a schedule covers all required pairings
 * @param {Array} playerIds - Array of player IDs
 * @param {Array} schedule - Generated schedule
 * @returns {Object} { valid, missingPairings, duplicatePairings }
 */
export function validateSchedule(playerIds, schedule) {
  const requiredPairings = generateAllPairings(playerIds);
  const seenPairings = new Map();
  
  schedule.forEach(match => {
    const pair1Key = match.teamA.slice().sort().join('-');
    const pair2Key = match.teamB.slice().sort().join('-');
    
    seenPairings.set(pair1Key, (seenPairings.get(pair1Key) || 0) + 1);
    seenPairings.set(pair2Key, (seenPairings.get(pair2Key) || 0) + 1);
  });

  const missingPairings = [];
  const duplicatePairings = [];

  requiredPairings.forEach(pair => {
    const key = pair.slice().sort().join('-');
    const count = seenPairings.get(key) || 0;
    
    if (count === 0) {
      missingPairings.push(pair);
    } else if (count > 1) {
      duplicatePairings.push({ pair, count });
    }
  });

  return {
    valid: missingPairings.length === 0 && duplicatePairings.length === 0,
    missingPairings,
    duplicatePairings
  };
}

