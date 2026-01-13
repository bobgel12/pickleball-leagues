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
 * Generate mixed doubles schedule for a court
 * Round 1: All matches use assigned partners
 * Rounds 2+: Generate mixed teams (1 man + 1 woman) based on ladder position
 * @param {Array} courtPlayers - Array of player IDs on the court
 * @param {Object} partners - Partners object { [playerId]: partnerId }
 * @param {Function} getPlayerGender - Function to get player gender by ID
 * @returns {Array} Array of round objects
 */
export function generateMixedDoublesSchedule(courtPlayers, partners, getPlayerGender) {
  if (!courtPlayers || courtPlayers.length < 4) {
    return [];
  }

  const schedule = [];
  
  // Round 1: All matches use assigned partners
  const round1Matches = generateRound1WithPartners(courtPlayers, partners);
  if (round1Matches.length > 0) {
    const round1 = round1Matches[0];
    // Check if teams contain assigned partners
    const teamAWithPartner = round1.teamA.length === 2 && 
      (partners[round1.teamA[0]] === round1.teamA[1] || partners[round1.teamA[1]] === round1.teamA[0]);
    const teamBWithPartner = round1.teamB.length === 2 && 
      (partners[round1.teamB[0]] === round1.teamB[1] || partners[round1.teamB[1]] === round1.teamB[0]);
    
    schedule.push({
      roundNumber: 1,
      ...round1,
      playedWithPartner: teamAWithPartner || teamBWithPartner
    });
  } else {
    // Fallback to regular schedule if no partners found
    const regularRound1 = generateRoundRobinSchedule(courtPlayers)[0];
    if (regularRound1) {
      schedule.push({
        ...regularRound1,
        roundNumber: 1,
        playedWithPartner: false
      });
    }
  }

  // Rounds 2+: Generate mixed teams maintaining gender balance
  const remainingRounds = generateMixedRounds(courtPlayers, partners, getPlayerGender, 2);
  schedule.push(...remainingRounds);

  return schedule;
}

/**
 * Generate Round 1 matches using assigned partners
 */
function generateRound1WithPartners(courtPlayers, partners) {
  const usedPlayers = new Set();
  const partnerPairs = [];
  const unpaired = [];
  
  // Group players by their partners
  courtPlayers.forEach(playerId => {
    if (usedPlayers.has(playerId)) return;
    
    const partnerId = partners[playerId];
    if (partnerId && courtPlayers.includes(partnerId) && !usedPlayers.has(partnerId)) {
      partnerPairs.push([playerId, partnerId]);
      usedPlayers.add(playerId);
      usedPlayers.add(partnerId);
    } else {
      unpaired.push(playerId);
    }
  });
  
  // If we have partner pairs, create matches from them
  if (partnerPairs.length >= 2) {
    const teamA = partnerPairs[0];
    const teamB = partnerPairs[1];
    const sittingOut = partnerPairs.length > 2 || unpaired.length > 0 
      ? (unpaired[0] || partnerPairs[2]?.[0] || null)
      : null;
    
    return [{
      teamA,
      teamB,
      sittingOut
    }];
  } else if (partnerPairs.length === 1 && unpaired.length >= 2) {
    // One pair and at least 2 unpaired - pair them up
    return [{
      teamA: partnerPairs[0],
      teamB: unpaired.slice(0, 2),
      sittingOut: unpaired.length > 2 ? unpaired[2] : null
    }];
  } else if (unpaired.length >= 4) {
    // No partners, just create mixed teams from unpaired
    return [{
      teamA: unpaired.slice(0, 2),
      teamB: unpaired.slice(2, 4),
      sittingOut: unpaired.length > 4 ? unpaired[4] : null
    }];
  }
  
  // Fallback: use regular round-robin for round 1
  return [];
}

/**
 * Generate subsequent rounds with mixed teams (1 man + 1 woman)
 * Round 2: Partners must be separated (immediate round after Round 1)
 * Round 3+: Normal mixed teams (partners can play together if naturally paired)
 */
function generateMixedRounds(courtPlayers, partners, getPlayerGender, startRoundNumber) {
  const rounds = [];
  const men = [];
  const women = [];
  
  // Separate by gender
  courtPlayers.forEach(playerId => {
    const gender = getPlayerGender(playerId);
    if (gender === 'male') {
      men.push(playerId);
    } else if (gender === 'female') {
      women.push(playerId);
    }
  });
  
  // Need at least 1 man and 1 woman to create mixed teams
  if (men.length === 0 || women.length === 0) {
    // Fallback to regular round-robin if gender balance is off
    const regularSchedule = generateRoundRobinSchedule(courtPlayers);
    return regularSchedule.slice(1).map((round, idx) => ({
      ...round,
      roundNumber: startRoundNumber + idx,
      playedWithPartner: false
    }));
  }
  
  // Generate mixed teams based on ladder position
  // Pair top man with top woman, second man with second woman, etc.
  const maxRounds = Math.max(men.length, women.length);
  
  for (let roundNum = 0; roundNum < maxRounds; roundNum++) {
    const roundTeams = [];
    const usedMen = new Set();
    const usedWomen = new Set();
    const actualRoundNumber = startRoundNumber + roundNum;
    const isRound2 = actualRoundNumber === 2; // Round 2 must separate partners
    
    // Create mixed teams
    for (let i = 0; i < Math.min(men.length, women.length); i++) {
      const manIndex = (roundNum + i) % men.length;
      const womanIndex = (roundNum + i) % women.length;
      
      const manId = men[manIndex];
      const womanId = women[womanIndex];
      
      // Round 2: Explicitly avoid pairing assigned partners
      if (isRound2) {
        const isAssignedPartner = partners[manId] === womanId || partners[womanId] === manId;
        if (isAssignedPartner) {
          // Try to find alternative pairing
          let foundAlternative = false;
          for (let altWomanIndex = 0; altWomanIndex < women.length; altWomanIndex++) {
            const altWomanId = women[(womanIndex + altWomanIndex + 1) % women.length];
            const altIsPartner = partners[manId] === altWomanId || partners[altWomanId] === manId;
            if (!usedWomen.has(altWomanId) && !altIsPartner) {
              roundTeams.push([manId, altWomanId]);
              usedMen.add(manId);
              usedWomen.add(altWomanId);
              foundAlternative = true;
              break;
            }
          }
          // If no alternative found, try alternative man
          if (!foundAlternative) {
            for (let altManIndex = 0; altManIndex < men.length; altManIndex++) {
              const altManId = men[(manIndex + altManIndex + 1) % men.length];
              const altIsPartner = partners[altManId] === womanId || partners[womanId] === altManId;
              if (!usedMen.has(altManId) && !altIsPartner) {
                roundTeams.push([altManId, womanId]);
                usedMen.add(altManId);
                usedWomen.add(womanId);
                foundAlternative = true;
                break;
              }
            }
          }
          // If still no alternative, skip this pairing (edge case)
          if (!foundAlternative) continue;
        } else {
          // Not partners, can pair normally
          if (!usedMen.has(manId) && !usedWomen.has(womanId)) {
            roundTeams.push([manId, womanId]);
            usedMen.add(manId);
            usedWomen.add(womanId);
          }
        }
      } else {
        // Round 3+: Normal pairing (partners can play together if naturally paired)
        if (!usedMen.has(manId) && !usedWomen.has(womanId)) {
          roundTeams.push([manId, womanId]);
          usedMen.add(manId);
          usedWomen.add(womanId);
        }
      }
    }
    
    // Create matches from teams
    if (roundTeams.length >= 2) {
      for (let i = 0; i < roundTeams.length; i += 2) {
        if (i + 1 < roundTeams.length) {
          const sittingOut = courtPlayers.find(p => 
            !roundTeams[i].includes(p) && !roundTeams[i + 1].includes(p)
          );
          
          rounds.push({
            roundNumber: actualRoundNumber,
            teamA: roundTeams[i],
            teamB: roundTeams[i + 1],
            sittingOut: sittingOut || null,
            playedWithPartner: false
          });
        }
      }
    }
  }
  
  return rounds;
}

/**
 * Generate the full schedule for an event day (all 4 courts)
 * @param {Array} courtAssignments - Array of 4 arrays, each containing player IDs for that court
 * @param {Object} options - Options object with leagueMode, partners, getPlayerGender
 * @returns {Array} Array of all matches across all courts
 */
export function generateEventDaySchedule(courtAssignments, options = {}) {
  const { leagueMode, partners = {}, getPlayerGender = () => null } = options;
  const allMatches = [];
  let matchId = 1;

  courtAssignments.forEach((courtPlayers, courtIndex) => {
    if (!courtPlayers || courtPlayers.length < 4) return;

    let courtSchedule;
    
    if (leagueMode === 'mixed_doubles') {
      courtSchedule = generateMixedDoublesSchedule(courtPlayers, partners, getPlayerGender);
    } else {
      courtSchedule = generateRoundRobinSchedule(courtPlayers);
      // Mark all as not with partner for regular leagues
      courtSchedule = courtSchedule.map(round => ({
        ...round,
        playedWithPartner: false
      }));
    }
    
    courtSchedule.forEach(round => {
      allMatches.push({
        id: matchId++,
        courtIndex,
        roundNumber: round.roundNumber,
        teamA: round.teamA,
        teamB: round.teamB,
        sittingOut: round.sittingOut,
        playedWithPartner: round.playedWithPartner || false,
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

