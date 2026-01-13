/**
 * Ladder Movement Logic for Multi-Day League
 * 
 * Handles court rankings and player movement between event days.
 * - Top 2 performers from each court move UP one court level
 * - Bottom 2 performers from each court move DOWN one court level
 * - Middle performer(s) stay on the same court
 */

import { COURT_MULTIPLIERS, SMART_COURT_WEIGHTS } from './constants.js';

/**
 * Calculate player performance score for a single event day
 * @param {string|number} playerId - Player ID
 * @param {Array} matches - All matches from the event day
 * @param {string} scoringSystem - 'simple', 'court', or 'smart'
 * @param {Object} options - Options object with partners, leagueMode
 * @returns {Object} { points, wins, losses, pointsScored, pointsAllowed }
 */
export function calculatePlayerDayPerformance(playerId, matches, scoringSystem = 'simple', options = {}) {
  const { partners = {}, leagueMode = 'regular' } = options;
  const playerMatches = matches.filter(m => 
    m.status === 'completed' && 
    (m.teamA.includes(playerId) || m.teamB.includes(playerId))
  );

  let points = 0;
  let wins = 0;
  let losses = 0;
  let pointsScored = 0;
  let pointsAllowed = 0;

  playerMatches.forEach(match => {
    const isTeamA = match.teamA.includes(playerId);
    const playerTeam = isTeamA ? match.teamA : match.teamB;
    const playerScore = isTeamA ? match.scoreA : match.scoreB;
    const opponentScore = isTeamA ? match.scoreB : match.scoreA;
    const won = (isTeamA && match.winner === 'A') || (!isTeamA && match.winner === 'B');

    pointsScored += playerScore || 0;
    pointsAllowed += opponentScore || 0;

    // Check if playing with assigned partner (for mixed doubles)
    const playedWithPartner = leagueMode === 'mixed_doubles' && 
      (match.playedWithPartner || (playerTeam.length === 2 && partners[playerId] === playerTeam.find(p => p !== playerId)));

    // Partner bonus multiplier: 2x for wins/losses with partner, 1x without
    const partnerMultiplier = playedWithPartner ? 2 : 1;

    if (won) {
      wins++;
      if (scoringSystem === 'simple') {
        points += 1 * partnerMultiplier;
      } else if (scoringSystem === 'court') {
        points += (COURT_MULTIPLIERS[match.courtIndex] || 1) * partnerMultiplier;
      } else if (scoringSystem === 'smart') {
        const courtMultiplier = SMART_COURT_WEIGHTS[match.courtIndex] || 1;
        const marginBonus = Math.abs((match.scoreA || 0) - (match.scoreB || 0)) / 10;
        points += Math.round((10 + marginBonus) * courtMultiplier * partnerMultiplier);
      }
    } else {
      losses++;
      if (scoringSystem === 'simple') {
        points -= 1 * partnerMultiplier;
      } else if (scoringSystem === 'smart') {
        const courtMultiplier = SMART_COURT_WEIGHTS[match.courtIndex] || 1;
        points += Math.round(-2 * courtMultiplier * partnerMultiplier);
      }
      // 'court' scoring doesn't deduct for losses
    }
  });

  return {
    playerId,
    points: Math.max(0, points),
    wins,
    losses,
    pointsScored,
    pointsAllowed,
    matchesPlayed: playerMatches.length
  };
}

/**
 * Rank players on a court based on their day performance
 * @param {Array} courtPlayers - Array of player IDs on the court
 * @param {Array} matches - All matches from the event day
 * @param {string} scoringSystem - Scoring system to use
 * @param {Object} options - Options object with partners, leagueMode
 * @returns {Array} Sorted array of { playerId, rank, performance }
 */
export function calculateCourtRankings(courtPlayers, matches, scoringSystem = 'simple', options = {}) {
  // Calculate performance for each player
  const performances = courtPlayers.map(playerId => ({
    playerId,
    performance: calculatePlayerDayPerformance(playerId, matches, scoringSystem, options)
  }));

  // Sort by points (desc), then wins (desc), then point differential (desc)
  performances.sort((a, b) => {
    const perfA = a.performance;
    const perfB = b.performance;

    // Primary: points
    if (perfB.points !== perfA.points) {
      return perfB.points - perfA.points;
    }

    // Secondary: wins
    if (perfB.wins !== perfA.wins) {
      return perfB.wins - perfA.wins;
    }

    // Tertiary: point differential
    const diffA = perfA.pointsScored - perfA.pointsAllowed;
    const diffB = perfB.pointsScored - perfB.pointsAllowed;
    return diffB - diffA;
  });

  // Assign ranks
  return performances.map((p, index) => ({
    ...p,
    rank: index + 1
  }));
}

/**
 * Determine movement for players based on their court rankings
 * @param {number} courtIndex - Current court index (0-3)
 * @param {Array} rankedPlayers - Sorted array from calculateCourtRankings
 * @param {Object} options - Options object with partners, leagueMode, round1Matches
 * @returns {Array} Array of { playerId, currentCourt, nextCourt, movement }
 */
export function determineCourtMovement(courtIndex, rankedPlayers, options = {}) {
  const { partners = {}, leagueMode = 'regular', round1Matches = [] } = options;
  const movements = [];
  const numPlayers = rankedPlayers.length;

  // For mixed doubles, check Round 1 results for partner movement
  if (leagueMode === 'mixed_doubles' && round1Matches.length > 0) {
    const round1Match = round1Matches.find(m => m.courtIndex === courtIndex && m.roundNumber === 1);
    
    if (round1Match && round1Match.status === 'completed') {
      // Check which team won in Round 1
      const winningTeam = round1Match.winner === 'A' ? round1Match.teamA : round1Match.teamB;
      const losingTeam = round1Match.winner === 'A' ? round1Match.teamB : round1Match.teamA;
      
      // Check if winning/losing teams contain partners
      const winningPartners = [];
      const losingPartners = [];
      
      winningTeam.forEach(playerId => {
        const partnerId = partners[playerId];
        if (partnerId && winningTeam.includes(partnerId)) {
          if (!winningPartners.includes(playerId) && !winningPartners.includes(partnerId)) {
            winningPartners.push(playerId, partnerId);
          }
        }
      });
      
      losingTeam.forEach(playerId => {
        const partnerId = partners[playerId];
        if (partnerId && losingTeam.includes(partnerId)) {
          if (!losingPartners.includes(playerId) && !losingPartners.includes(partnerId)) {
            losingPartners.push(playerId, partnerId);
          }
        }
      });
      
      // Create movements for partners based on Round 1 result
      const partnerMovements = new Map();
      
      // Winning partners move up together
      if (winningPartners.length >= 2) {
        const canMoveUp = courtIndex < 3;
        winningPartners.forEach(playerId => {
          partnerMovements.set(playerId, {
            playerId,
            currentCourt: courtIndex,
            nextCourt: canMoveUp ? courtIndex + 1 : courtIndex,
            movement: canMoveUp ? 'up' : 'stay',
            rank: rankedPlayers.findIndex(r => r.playerId === playerId) + 1,
            performance: rankedPlayers.find(r => r.playerId === playerId)?.performance
          });
        });
      }
      
      // Losing partners move down together
      if (losingPartners.length >= 2) {
        const canMoveDown = courtIndex > 0;
        losingPartners.forEach(playerId => {
          partnerMovements.set(playerId, {
            playerId,
            currentCourt: courtIndex,
            nextCourt: canMoveDown ? courtIndex - 1 : courtIndex,
            movement: canMoveDown ? 'down' : 'stay',
            rank: rankedPlayers.findIndex(r => r.playerId === playerId) + 1,
            performance: rankedPlayers.find(r => r.playerId === playerId)?.performance
          });
        });
      }
      
      // For players not in partner pairs, use normal ranking logic
      rankedPlayers.forEach((player, index) => {
        if (!partnerMovements.has(player.playerId)) {
          let nextCourt = courtIndex;
          let movement = 'stay';

          if (numPlayers >= 5) {
            if (index < 2 && courtIndex < 3) {
              nextCourt = courtIndex + 1;
              movement = 'up';
            } else if (index >= numPlayers - 2 && courtIndex > 0) {
              nextCourt = courtIndex - 1;
              movement = 'down';
            }
          } else if (numPlayers === 4) {
            if (index < 2 && courtIndex < 3) {
              nextCourt = courtIndex + 1;
              movement = 'up';
            } else if (courtIndex > 0) {
              nextCourt = courtIndex - 1;
              movement = 'down';
            }
          }

          movements.push({
            playerId: player.playerId,
            currentCourt: courtIndex,
            nextCourt,
            movement,
            rank: player.rank,
            performance: player.performance
          });
        }
      });
      
      // Add partner movements
      partnerMovements.forEach(movement => {
        movements.push(movement);
      });
      
      return movements;
    }
  }

  // Regular movement logic (for non-mixed-doubles or if Round 1 not completed)
  rankedPlayers.forEach((player, index) => {
    let nextCourt = courtIndex;
    let movement = 'stay';

    if (numPlayers >= 5) {
      // Standard 5-player court rules
      if (index < 2) {
        // Top 2 move up (unless already at Court 4)
        if (courtIndex < 3) {
          nextCourt = courtIndex + 1;
          movement = 'up';
        }
      } else if (index >= numPlayers - 2) {
        // Bottom 2 move down (unless already at Court 1)
        if (courtIndex > 0) {
          nextCourt = courtIndex - 1;
          movement = 'down';
        }
      }
    } else if (numPlayers === 4) {
      // 4-player court: top 2 up, bottom 2 down
      if (index < 2) {
        if (courtIndex < 3) {
          nextCourt = courtIndex + 1;
          movement = 'up';
        }
      } else {
        if (courtIndex > 0) {
          nextCourt = courtIndex - 1;
          movement = 'down';
        }
      }
    }

    movements.push({
      playerId: player.playerId,
      currentCourt: courtIndex,
      nextCourt,
      movement,
      rank: player.rank,
      performance: player.performance
    });
  });

  return movements;
}

/**
 * Calculate ladder movement for all courts after an event day
 * @param {Array} courtAssignments - Array of 4 arrays with player IDs
 * @param {Array} matches - All completed matches from the event day
 * @param {string} scoringSystem - Scoring system used
 * @param {Object} options - Options object with partners, leagueMode
 * @returns {Object} { movements, courtRankings }
 */
export function calculateLadderMovement(courtAssignments, matches, scoringSystem = 'simple', options = {}) {
  const allMovements = [];
  const courtRankings = [];

  courtAssignments.forEach((courtPlayers, courtIndex) => {
    if (!courtPlayers || courtPlayers.length === 0) {
      courtRankings.push([]);
      return;
    }

    // Get court-specific matches
    const courtMatches = matches.filter(m => m.courtIndex === courtIndex);
    
    // Get Round 1 match for partner movement logic (mixed doubles)
    const round1Matches = options.leagueMode === 'mixed_doubles' 
      ? matches.filter(m => m.roundNumber === 1)
      : [];
    
    // Calculate rankings for this court
    const rankings = calculateCourtRankings(courtPlayers, courtMatches, scoringSystem, options);
    courtRankings.push(rankings);

    // Determine movement (pass Round 1 matches for partner movement logic)
    const movements = determineCourtMovement(courtIndex, rankings, {
      ...options,
      round1Matches
    });
    allMovements.push(...movements);
  });

  return {
    movements: allMovements,
    courtRankings
  };
}

/**
 * Apply ladder movement to generate next day's court assignments
 * @param {Array} movements - Movement data from calculateLadderMovement
 * @param {Array} checkedInPlayers - Player IDs who checked in for next day
 * @param {Array} allPlayers - All registered league players (for cumulative points)
 * @param {number} dayNumber - The day number (1 = use DUPR, 2+ = use points)
 * @returns {Array} New court assignments [court1Players, court2Players, court3Players, court4Players]
 */
export function applyMovementToNextDay(movements, checkedInPlayers, allPlayers, dayNumber) {
  // For Day 1, sort by DUPR rating
  if (dayNumber === 1) {
    return assignCourtsByDupr(checkedInPlayers, allPlayers);
  }

  // For Day 2+, use cumulative points with movement preferences
  return assignCourtsByPointsWithMovement(movements, checkedInPlayers, allPlayers);
}

/**
 * Assign courts based on DUPR rating (for Day 1)
 * @param {Array} checkedInPlayerIds - IDs of players who checked in
 * @param {Array} allPlayers - All registered players with DUPR ratings
 * @returns {Array} Court assignments
 */
export function assignCourtsByDupr(checkedInPlayerIds, allPlayers) {
  // Get checked-in players and sort by DUPR
  const checkedInPlayers = checkedInPlayerIds
    .map(id => allPlayers.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => b.duprRating - a.duprRating);

  return distributePlayersToCourts(checkedInPlayers.map(p => p.id));
}

/**
 * Assign courts based on cumulative points (for Day 2+)
 * @param {Array} checkedInPlayerIds - IDs of players who checked in
 * @param {Array} allPlayers - All registered players with cumulative points
 * @returns {Array} Court assignments
 */
export function assignCourtsByPoints(checkedInPlayerIds, allPlayers) {
  // Get checked-in players and sort by cumulative points
  const checkedInPlayers = checkedInPlayerIds
    .map(id => allPlayers.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => {
      // Primary: cumulative points
      if (b.cumulativePoints !== a.cumulativePoints) {
        return b.cumulativePoints - a.cumulativePoints;
      }
      // Secondary: win percentage
      const winPctA = a.totalWins + a.totalLosses > 0 
        ? a.totalWins / (a.totalWins + a.totalLosses) : 0;
      const winPctB = b.totalWins + b.totalLosses > 0 
        ? b.totalWins / (b.totalWins + b.totalLosses) : 0;
      return winPctB - winPctA;
    });

  return distributePlayersToCourts(checkedInPlayers.map(p => p.id));
}

/**
 * Assign courts considering both points and previous day movement
 */
function assignCourtsByPointsWithMovement(movements, checkedInPlayerIds, allPlayers) {
  // If no movement data, fall back to points-based assignment
  if (!movements || movements.length === 0) {
    return assignCourtsByPoints(checkedInPlayerIds, allPlayers);
  }

  // Create a map of player target courts from movement
  const targetCourts = new Map();
  movements.forEach(m => {
    if (checkedInPlayerIds.includes(m.playerId)) {
      targetCourts.set(m.playerId, m.nextCourt);
    }
  });

  // Players without movement data get assigned by points
  const playersWithoutMovement = checkedInPlayerIds.filter(id => !targetCourts.has(id));
  
  // Get their point-based court assignments
  const pointsBasedAssignments = assignCourtsByPoints(playersWithoutMovement, allPlayers);
  
  // Merge: prefer movement-based, fill remaining spots with points-based
  const courts = [[], [], [], []];
  const playersPerCourt = 5;
  const assignedPlayers = new Set();

  // First, place players with movement data
  targetCourts.forEach((courtIndex, playerId) => {
    if (courts[courtIndex].length < playersPerCourt) {
      courts[courtIndex].push(playerId);
      assignedPlayers.add(playerId);
    }
  });

  // Then, fill remaining spots from points-based
  pointsBasedAssignments.forEach((courtPlayers, courtIndex) => {
    courtPlayers.forEach(playerId => {
      if (!assignedPlayers.has(playerId) && courts[courtIndex].length < playersPerCourt) {
        courts[courtIndex].push(playerId);
        assignedPlayers.add(playerId);
      }
    });
  });

  // Handle overflow: if a court is full, push to adjacent court
  const remainingPlayers = checkedInPlayerIds.filter(id => !assignedPlayers.has(id));
  remainingPlayers.forEach(playerId => {
    for (let i = 3; i >= 0; i--) {
      if (courts[i].length < playersPerCourt) {
        courts[i].push(playerId);
        break;
      }
    }
  });

  return courts;
}

/**
 * Distribute players evenly across 4 courts
 * @param {Array} sortedPlayerIds - Player IDs sorted by skill/points (highest first)
 * @returns {Array} [court1, court2, court3, court4] (court4 = highest)
 */
function distributePlayersToCourts(sortedPlayerIds) {
  const courts = [[], [], [], []];
  const playersPerCourt = 5;
  
  sortedPlayerIds.forEach((playerId, index) => {
    // Court 4 (index 3) gets top players, Court 1 (index 0) gets lowest
    const courtIndex = 3 - Math.floor(index / playersPerCourt);
    const targetCourt = Math.max(0, Math.min(3, courtIndex));
    
    if (courts[targetCourt].length < playersPerCourt) {
      courts[targetCourt].push(playerId);
    } else {
      // Find next available court (prefer lower courts for overflow)
      for (let i = targetCourt - 1; i >= 0; i--) {
        if (courts[i].length < playersPerCourt) {
          courts[i].push(playerId);
          break;
        }
      }
    }
  });

  return courts;
}

/**
 * Generate a summary of ladder movement for display
 * @param {Array} movements - Movement data
 * @param {Function} getPlayerById - Function to get player by ID
 * @returns {Object} { movingUp, movingDown, staying }
 */
export function summarizeLadderMovement(movements, getPlayerById) {
  const movingUp = [];
  const movingDown = [];
  const staying = [];

  movements.forEach(m => {
    const player = getPlayerById(m.playerId);
    const entry = {
      ...m,
      playerName: player?.name || `Player ${m.playerId}`,
      fromCourt: m.currentCourt + 1,
      toCourt: m.nextCourt + 1
    };

    if (m.movement === 'up') {
      movingUp.push(entry);
    } else if (m.movement === 'down') {
      movingDown.push(entry);
    } else {
      staying.push(entry);
    }
  });

  return { movingUp, movingDown, staying };
}

/**
 * Update player cumulative stats after an event day
 * @param {Object} player - Player object to update
 * @param {Object} dayPerformance - Performance data from calculatePlayerDayPerformance
 * @param {number} courtIndex - Court player was on
 * @param {number} dayNumber - Event day number
 * @returns {Object} Updated player object
 */
export function updatePlayerCumulativeStats(player, dayPerformance, courtIndex, dayNumber) {
  return {
    ...player,
    cumulativePoints: (player.cumulativePoints || 0) + dayPerformance.points,
    totalWins: (player.totalWins || 0) + dayPerformance.wins,
    totalLosses: (player.totalLosses || 0) + dayPerformance.losses,
    pointsScored: (player.pointsScored || 0) + dayPerformance.pointsScored,
    pointsAllowed: (player.pointsAllowed || 0) + dayPerformance.pointsAllowed,
    eventDaysAttended: (player.eventDaysAttended || 0) + 1,
    courtHistory: [
      ...(player.courtHistory || []),
      { dayNumber, court: courtIndex + 1 }
    ],
    ladderPositionHistory: [
      ...(player.ladderPositionHistory || []),
      { dayNumber, position: calculateLadderPosition(player, dayPerformance) }
    ]
  };
}

/**
 * Calculate overall ladder position based on cumulative stats
 */
function calculateLadderPosition(player, latestPerformance) {
  // This would be calculated globally, but for now return a placeholder
  // The actual position is determined by sorting all players
  return null;
}

