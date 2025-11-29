/**
 * Money Round Utilities
 * 
 * Handles contribution calculations, court assignments after ladder movement,
 * and Money Round schedule generation.
 */

import { MONEY_ROUND_DEFAULTS } from './constants.js';
import { generateRoundRobinSchedule } from './roundRobin.js';

/**
 * Calculate contributions for players based on their court rankings
 * Tied players split the contribution amounts
 * 
 * @param {Array} rankings - Array of { playerId, points, wins, losses } sorted by performance
 * @param {Array} contributionScale - Array of contribution amounts [1st, 2nd, 3rd, 4th, 5th]
 * @returns {Array} - Array of { playerId, rank, contribution }
 */
export function calculateContributions(rankings, contributionScale = MONEY_ROUND_DEFAULTS.contributionScale) {
  if (!rankings || rankings.length === 0) {
    return [];
  }

  const results = [];
  let currentIndex = 0;

  while (currentIndex < rankings.length) {
    // Find all players tied at current position
    const tiedPlayers = [rankings[currentIndex]];
    let nextIndex = currentIndex + 1;

    while (nextIndex < rankings.length && 
           rankings[nextIndex].points === rankings[currentIndex].points &&
           rankings[nextIndex].wins === rankings[currentIndex].wins) {
      tiedPlayers.push(rankings[nextIndex]);
      nextIndex++;
    }

    // Calculate contribution for tied players (split the total)
    const startRank = currentIndex;
    const endRank = Math.min(nextIndex - 1, contributionScale.length - 1);
    
    // Sum contributions for the tied positions and split
    let totalContribution = 0;
    for (let i = startRank; i <= endRank && i < contributionScale.length; i++) {
      totalContribution += contributionScale[i];
    }
    
    // If there are more tied players than remaining ranks, use the last rank's contribution
    const extraPlayers = tiedPlayers.length - (endRank - startRank + 1);
    if (extraPlayers > 0 && endRank < contributionScale.length - 1) {
      totalContribution += contributionScale[contributionScale.length - 1] * extraPlayers;
    }

    const splitContribution = Math.round((totalContribution / tiedPlayers.length) * 100) / 100;

    // Assign the split contribution to all tied players
    tiedPlayers.forEach((player, tieIndex) => {
      results.push({
        playerId: player.playerId,
        rank: currentIndex + 1, // All tied players share the same rank
        contribution: splitContribution,
        tied: tiedPlayers.length > 1
      });
    });

    currentIndex = nextIndex;
  }

  return results;
}

/**
 * Calculate rankings for a court based on Money Round matches
 * 
 * @param {Array} players - Array of player IDs on the court
 * @param {Array} matches - Array of completed matches for this court
 * @param {string} scoringSystem - The scoring system used
 * @returns {Array} - Sorted array of { playerId, points, wins, losses, pointsScored, pointsAllowed }
 */
export function calculateMoneyRoundCourtRankings(players, matches, scoringSystem = 'simple') {
  const playerStats = {};

  // Initialize stats for all players
  players.forEach(playerId => {
    playerStats[playerId] = {
      playerId,
      points: 0,
      wins: 0,
      losses: 0,
      pointsScored: 0,
      pointsAllowed: 0
    };
  });

  // Process each match
  matches.forEach(match => {
    if (match.status !== 'completed' || match.scoreA === null || match.scoreB === null) {
      return;
    }

    const teamA = match.teamA;
    const teamB = match.teamB;
    const scoreA = match.scoreA;
    const scoreB = match.scoreB;
    const teamAWon = scoreA > scoreB;

    // Update stats for team A players
    teamA.forEach(playerId => {
      if (playerStats[playerId]) {
        playerStats[playerId].pointsScored += scoreA;
        playerStats[playerId].pointsAllowed += scoreB;
        if (teamAWon) {
          playerStats[playerId].wins += 1;
          playerStats[playerId].points += 1; // Simple scoring for Money Round
        } else {
          playerStats[playerId].losses += 1;
        }
      }
    });

    // Update stats for team B players
    teamB.forEach(playerId => {
      if (playerStats[playerId]) {
        playerStats[playerId].pointsScored += scoreB;
        playerStats[playerId].pointsAllowed += scoreA;
        if (!teamAWon) {
          playerStats[playerId].wins += 1;
          playerStats[playerId].points += 1;
        } else {
          playerStats[playerId].losses += 1;
        }
      }
    });
  });

  // Sort by points (wins), then by point differential
  return Object.values(playerStats).sort((a, b) => {
    // Primary: more wins = better (lower contribution)
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // Secondary: point differential
    const diffA = a.pointsScored - a.pointsAllowed;
    const diffB = b.pointsScored - b.pointsAllowed;
    return diffB - diffA;
  });
}

/**
 * Apply ladder movement and return new court assignments for Money Round
 * Players move to their NEW courts before playing Money Round
 * 
 * @param {Array} currentCourts - Current court assignments [court1, court2, court3, court4]
 * @param {Array} movement - Movement data from ladder calculation
 * @returns {Array} - New court assignments for Money Round
 */
export function applyMovementForMoneyRound(currentCourts, movement) {
  // Create a map of player to new court assignment
  const playerNewCourt = {};

  // Initialize with current positions
  currentCourts.forEach((court, courtIndex) => {
    court.forEach(playerId => {
      playerNewCourt[playerId] = courtIndex;
    });
  });

  // Apply movement
  movement.forEach(move => {
    if (move.direction === 'up' && playerNewCourt[move.playerId] < 3) {
      playerNewCourt[move.playerId] += 1;
    } else if (move.direction === 'down' && playerNewCourt[move.playerId] > 0) {
      playerNewCourt[move.playerId] -= 1;
    }
    // 'stay' means no change
  });

  // Build new court assignments
  const newCourts = [[], [], [], []];
  Object.entries(playerNewCourt).forEach(([playerId, courtIndex]) => {
    newCourts[courtIndex].push(parseInt(playerId));
  });

  // Sort each court by the order they would appear (maintain some consistency)
  newCourts.forEach(court => {
    court.sort((a, b) => a - b);
  });

  return newCourts;
}

/**
 * Generate Money Round schedule for all courts
 * Uses the same round-robin algorithm as League Round
 * 
 * @param {Array} courts - Court assignments for Money Round
 * @param {number} eventDayId - The event day ID for reference
 * @returns {Array} - Array of scheduled matches
 */
export function generateMoneyRoundSchedule(courts, eventDayId) {
  const allMatches = [];
  let matchId = 1;

  courts.forEach((players, courtIndex) => {
    if (players.length < 4) {
      return; // Skip courts with insufficient players
    }

    const courtSchedule = generateRoundRobinSchedule(players);
    
    courtSchedule.forEach(round => {
      round.matches.forEach(match => {
        allMatches.push({
          id: `mr-${eventDayId}-${matchId++}`,
          courtIndex,
          roundNumber: round.roundNumber,
          teamA: match.teamA,
          teamB: match.teamB,
          sittingOut: match.sittingOut,
          scoreA: null,
          scoreB: null,
          winner: null,
          status: 'pending',
          isMoneyRound: true
        });
      });
    });
  });

  return allMatches;
}

/**
 * Calculate total contributions for an event day
 * 
 * @param {Array} moneyRoundResults - Results from all courts
 * @returns {number} - Total contributions for the event day
 */
export function calculateEventDayContributions(moneyRoundResults) {
  if (!moneyRoundResults || moneyRoundResults.length === 0) {
    return 0;
  }

  return moneyRoundResults.reduce((total, courtResult) => {
    if (!courtResult.rankings) return total;
    return total + courtResult.rankings.reduce((courtTotal, ranking) => {
      return courtTotal + (ranking.contribution || 0);
    }, 0);
  }, 0);
}

/**
 * Get player's contribution for a specific event day
 * 
 * @param {Array} moneyRoundResults - Results from all courts
 * @param {number} playerId - The player ID to look up
 * @returns {object|null} - { courtIndex, rank, contribution } or null if not found
 */
export function getPlayerContribution(moneyRoundResults, playerId) {
  if (!moneyRoundResults) return null;

  for (const courtResult of moneyRoundResults) {
    if (!courtResult.rankings) continue;
    const playerRanking = courtResult.rankings.find(r => r.playerId === playerId);
    if (playerRanking) {
      return {
        courtIndex: courtResult.courtIndex,
        rank: playerRanking.rank,
        contribution: playerRanking.contribution,
        tied: playerRanking.tied
      };
    }
  }
  return null;
}

/**
 * Check if all Money Round matches for a court are completed
 * 
 * @param {Array} schedule - Money Round schedule
 * @param {number} courtIndex - The court index to check
 * @returns {boolean}
 */
export function isCourtMoneyRoundComplete(schedule, courtIndex) {
  const courtMatches = schedule.filter(m => m.courtIndex === courtIndex);
  return courtMatches.length > 0 && courtMatches.every(m => m.status === 'completed');
}

/**
 * Check if all Money Round matches are completed
 * 
 * @param {Array} schedule - Money Round schedule
 * @returns {boolean}
 */
export function isMoneyRoundComplete(schedule) {
  if (!schedule || schedule.length === 0) return false;
  return schedule.every(m => m.status === 'completed');
}

/**
 * Get Money Round progress statistics
 * 
 * @param {Array} schedule - Money Round schedule
 * @returns {object} - { total, completed, percentage }
 */
export function getMoneyRoundProgress(schedule) {
  if (!schedule || schedule.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  const total = schedule.length;
  const completed = schedule.filter(m => m.status === 'completed').length;
  const percentage = Math.round((completed / total) * 100);

  return { total, completed, percentage };
}

