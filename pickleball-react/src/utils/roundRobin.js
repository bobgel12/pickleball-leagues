/**
 * Round-Robin Schedule Generator for Social Doubles
 * 
 * Generates a schedule where each player partners with every other player exactly once.
 * For 5 players, this creates 5 rounds with 1 match each (4 players play, 1 sits out).
 */

// Import partner matchup helpers (if needed)
// Note: We'll import normalizePartnerPair and havePartnersPlayed from leagueStorage when generating Round 1

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
 * Generate Round 1 matches: Partner pair vs partner pair across all checked-in players
 * @param {Array} allCheckedInPlayers - All player IDs who checked in for the event day
 * @param {Object} partners - Partners object { [playerId]: partnerId }
 * @param {Array} partnerMatchups - Array of previous matchups to avoid duplicates
 * @returns {Array} Array of matches to distribute across courts: { teamA: [id1, id2], teamB: [id3, id4], courtIndex: number }
 */
function generateRound1PartnerPairMatchups(allCheckedInPlayers, partners, partnerMatchups = []) {
  if (!allCheckedInPlayers || allCheckedInPlayers.length < 4) {
    return [];
  }

  // Helper to normalize partner pair (always sorted)
  const normalizePair = (id1, id2) => id1 < id2 ? [id1, id2] : [id2, id1];

  // Helper to check if two pairs have played
  const havePlayed = (pair1Ids, pair2Ids) => {
    const norm1 = normalizePair(pair1Ids[0], pair1Ids[1]);
    const norm2 = normalizePair(pair2Ids[0], pair2Ids[1]);
    
    return partnerMatchups.some(matchup => {
      const m1 = normalizePair(matchup.pair1[0], matchup.pair1[1]);
      const m2 = normalizePair(matchup.pair2[0], matchup.pair2[1]);
      
      return (
        (norm1[0] === m1[0] && norm1[1] === m1[1] && norm2[0] === m2[0] && norm2[1] === m2[1]) ||
        (norm1[0] === m2[0] && norm1[1] === m2[1] && norm2[0] === m1[0] && norm2[1] === m1[1])
      );
    });
  };

  // Extract all partner pairs from checked-in players
  const usedPlayers = new Set();
  const partnerPairs = [];
  
  allCheckedInPlayers.forEach(playerId => {
    if (usedPlayers.has(playerId)) return;
    
    const partnerId = partners[playerId];
    if (partnerId && allCheckedInPlayers.includes(partnerId) && !usedPlayers.has(partnerId)) {
      partnerPairs.push(normalizePair(playerId, partnerId));
      usedPlayers.add(playerId);
      usedPlayers.add(partnerId);
    }
  });

  // Check if all pairs have played each other
  if (partnerPairs.length < 2) {
    // Not enough pairs, skip Round 1
    return [];
  }

  // Check if all pairs have played each other
  const allPairsPlayed = partnerPairs.every(pair1 => {
    const hasUnplayedOpponent = partnerPairs.some(pair2 => {
      if (pair1[0] === pair2[0] && pair1[1] === pair2[1]) return false; // Same pair
      return !havePlayed(pair1, pair2);
    });
    return !hasUnplayedOpponent;
  });

  // If all pairs have played each other, skip Round 1
  if (allPairsPlayed && partnerMatchups.length > 0) {
    return [];
  }

  // Match each pair with an unplayed pair
  const matches = [];
  const usedPairs = new Set();
  
  // Handle odd number of pairs - last one sits out Round 1
  const sittingOutPairIndex = partnerPairs.length % 2 === 1 ? partnerPairs.length - 1 : -1;

  // Process pairs in order, matching with unplayed opponents
  for (let i = 0; i < partnerPairs.length; i++) {
    if (usedPairs.has(i)) continue;
    if (i === sittingOutPairIndex) continue; // Skip sitting out pair

    const pair1 = partnerPairs[i];
    let matched = false;

    // Try to find an unplayed pair first
    for (let j = i + 1; j < partnerPairs.length; j++) {
      if (usedPairs.has(j)) continue;
      if (j === sittingOutPairIndex) continue; // Skip sitting out pair

      const pair2 = partnerPairs[j];
      if (!havePlayed(pair1, pair2)) {
        matches.push({
          teamA: pair1,
          teamB: pair2,
          sittingOut: null
        });
        usedPairs.add(i);
        usedPairs.add(j);
        matched = true;
        break;
      }
    }

    // If no unplayed pair found, use first available pair (least recently played)
    if (!matched) {
      for (let j = i + 1; j < partnerPairs.length; j++) {
        if (usedPairs.has(j)) continue;
        if (j === sittingOutPairIndex) continue; // Skip sitting out pair

        const pair2 = partnerPairs[j];
        matches.push({
          teamA: pair1,
          teamB: pair2,
          sittingOut: null
        });
        usedPairs.add(i);
        usedPairs.add(j);
        matched = true;
        break;
      }
    }
  }

  // Note: If odd number of pairs, one pair sits out Round 1
  // They will join rounds 2-6 when partners split

  return matches;
}

/**
 * Generate Round 1 matches using assigned partners (per court - legacy support)
 * This is now primarily used as a fallback, but Round 1 is generated at event day level
 */
function generateRound1WithPartners(courtPlayers, partners) {
  // This function is kept for backward compatibility but Round 1 is now generated
  // at the event day level for mixed doubles
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
  }
  
  // Fallback: use regular round-robin for round 1
  return [];
}

/**
 * Generate a single round with mixed teams (1 man + 1 woman) with partners split
 * @param {Array} courtPlayers - Array of player IDs on the court
 * @param {Object} partners - Partners object { [playerId]: partnerId }
 * @param {Function} getPlayerGender - Function to get player gender by ID
 * @param {number} roundNumber - The round number to generate
 * @returns {Array} Array of round objects (usually 1 round for 4-5 players)
 */
export function generateSingleRound(courtPlayers, partners, getPlayerGender, roundNumber) {
  const rounds = generateMixedRounds(courtPlayers, partners, getPlayerGender, roundNumber, roundNumber);
  return rounds;
}

/**
 * Generate subsequent rounds with mixed teams (1 man + 1 woman)
 * Generates exactly 5 rounds (rounds 2-6) with partners split
 * All rounds must separate assigned partners and maintain mixed teams
 */
export function generateMixedRounds(courtPlayers, partners, getPlayerGender, startRoundNumber, maxRoundNumber = 6) {
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
    const numRounds = maxRoundNumber - startRoundNumber + 1;
    return regularSchedule.slice(1, numRounds + 1).map((round, idx) => ({
      ...round,
      roundNumber: startRoundNumber + idx,
      playedWithPartner: false
    }));
  }
  
  // Generate exactly 5 rounds (rounds 2-6)
  const numRounds = maxRoundNumber - startRoundNumber + 1; // Should be 5 rounds (2-6)
  
  for (let roundNum = 0; roundNum < numRounds; roundNum++) {
    const roundTeams = [];
    const usedMen = new Set();
    const usedWomen = new Set();
    const actualRoundNumber = startRoundNumber + roundNum;
    
    // All rounds (2-6) must separate assigned partners
    // Create mixed teams with partners split
    // For 4 players per court, ensure all players are used (no sitting out after Round 1)
    for (let i = 0; i < Math.min(men.length, women.length); i++) {
      const manIndex = (roundNum + i) % men.length;
      const womanIndex = (roundNum + i) % women.length;
      
      const manId = men[manIndex];
      const womanId = women[womanIndex];
      
      // Always avoid pairing assigned partners in rounds 2-6
      const isAssignedPartner = partners[manId] === womanId || partners[womanId] === manId;
      if (isAssignedPartner) {
        // Try to find alternative pairing (different woman)
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
        // If no alternative woman found, try alternative man
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
        // If still no alternative, use partner pair to ensure all players are used (especially for 4 players per court)
        if (!foundAlternative) {
          // Use partner pair rather than skipping to avoid having someone sit out
          if (!usedMen.has(manId) && !usedWomen.has(womanId)) {
            roundTeams.push([manId, womanId]);
            usedMen.add(manId);
            usedWomen.add(womanId);
          }
        }
      } else {
        // Not partners, can pair normally
        if (!usedMen.has(manId) && !usedWomen.has(womanId)) {
          roundTeams.push([manId, womanId]);
          usedMen.add(manId);
          usedWomen.add(womanId);
        }
      }
    }
    
    // Create matches from teams
    // For 4 players per court, ensure no one sits out after Round 1
    if (roundTeams.length >= 2) {
      for (let i = 0; i < roundTeams.length; i += 2) {
        if (i + 1 < roundTeams.length) {
          // For 4 players per court, all should be playing (no sitting out after Round 1)
          const allPlayersInMatch = [...roundTeams[i], ...roundTeams[i + 1]];
          const sittingOut = courtPlayers.length === 4 && allPlayersInMatch.length === 4
            ? null  // All 4 players are used, no one sits out
            : courtPlayers.find(p => !roundTeams[i].includes(p) && !roundTeams[i + 1].includes(p));
          
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
 * @param {Object} options - Options object with leagueMode, partners, getPlayerGender, partnerMatchups
 * @returns {Array} Array of all matches across all courts
 */
export function generateEventDaySchedule(courtAssignments, options = {}) {
  const { leagueMode, partners = {}, getPlayerGender = () => null, partnerMatchups = [] } = options;
  const allMatches = [];
  let matchId = 1;

  // For mixed doubles, generate Round 1 at event day level (partner pair vs partner pair)
  if (leagueMode === 'mixed_doubles') {
    // Extract all checked-in players from court assignments
    const allCheckedInPlayers = courtAssignments.flat().filter(Boolean);
    
    // Generate Round 1 partner pair matchups across all players
    const round1Matches = generateRound1PartnerPairMatchups(allCheckedInPlayers, partners, partnerMatchups);
    
    // Distribute Round 1 matches to courts
    const round1ByCourt = [[], [], [], []]; // Matches per court
    round1Matches.forEach((match, index) => {
      const courtIndex = index % 4;
      round1ByCourt[courtIndex].push(match);
    });

    // Add Round 1 matches to schedule
    round1ByCourt.forEach((matches, courtIndex) => {
      matches.forEach(match => {
        allMatches.push({
          id: matchId++,
          courtIndex,
          roundNumber: 1,
          teamA: match.teamA,
          teamB: match.teamB,
          sittingOut: match.sittingOut,
          playedWithPartner: true, // Round 1 is always with partner
          scoreA: null,
          scoreB: null,
          winner: null,
          status: 'pending'
        });
      });
    });

    // Generate rounds 2-6 per court (partners split, mixed teams)
    courtAssignments.forEach((courtPlayers, courtIndex) => {
      if (!courtPlayers || courtPlayers.length < 4) return;

      // Generate rounds 2-6 for this court
      const remainingRounds = generateMixedRounds(courtPlayers, partners, getPlayerGender, 2, 6);
      
      remainingRounds.forEach(round => {
        allMatches.push({
          id: matchId++,
          courtIndex,
          roundNumber: round.roundNumber,
          teamA: round.teamA,
          teamB: round.teamB,
          sittingOut: round.sittingOut,
          playedWithPartner: false, // Rounds 2-6 are without assigned partner
          scoreA: null,
          scoreB: null,
          winner: null,
          status: 'pending'
        });
      });
    });
  } else {
    // Regular league: generate per court as before
    courtAssignments.forEach((courtPlayers, courtIndex) => {
      if (!courtPlayers || courtPlayers.length < 4) return;

      const courtSchedule = generateRoundRobinSchedule(courtPlayers);
      // Mark all as not with partner for regular leagues
      courtSchedule.forEach(round => {
        allMatches.push({
          id: matchId++,
          courtIndex,
          roundNumber: round.roundNumber,
          teamA: round.teamA,
          teamB: round.teamB,
          sittingOut: round.sittingOut,
          playedWithPartner: false,
          scoreA: null,
          scoreB: null,
          winner: null,
          status: 'pending'
        });
      });
    });
  }

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
