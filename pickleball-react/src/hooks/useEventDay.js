/**
 * useEventDay - Hook for managing event day operations
 * 
 * Supports two-phase event structure:
 * - Phase 1: League Round (determines ladder movement)
 * - Phase 2: Money Round (determines prize pool contributions)
 */

import { useCallback, useMemo } from 'react';
import { EVENT_DAY_STATUS, EVENT_DAY_PHASE } from '../utils/constants.js';
import { generateEventDaySchedule, calculateScheduleProgress, generateMixedRounds } from '../utils/roundRobin.js';
import {
  calculateLadderMovement,
  assignCourtsByDupr,
  assignCourtsByPoints,
  calculatePlayerDayPerformance
} from '../utils/ladderMovement.js';
import {
  applyMovementForMoneyRound,
  generateMoneyRoundSchedule,
  calculateMoneyRoundCourtRankings,
  calculateContributions,
  getMoneyRoundProgress,
  isMoneyRoundComplete
} from '../utils/moneyRound.js';

export function useEventDay(league, updateEventDay, updatePlayerStats, completeEventDay, getPlayerById, recordPartnerMatchup) {
  const currentEventDay = useMemo(() => {
    if (league.currentEventDayIndex < 0 || league.currentEventDayIndex >= league.eventDays.length) {
      return null;
    }
    return league.eventDays[league.currentEventDayIndex];
  }, [league.eventDays, league.currentEventDayIndex]);

  // Check in a player
  const checkInPlayer = useCallback((playerId) => {
    if (!currentEventDay) return false;
    if (currentEventDay.status !== EVENT_DAY_STATUS.CHECKIN) return false;
    if (currentEventDay.checkedInPlayers.length >= league.maxPlayersPerDay) return false;
    if (currentEventDay.checkedInPlayers.includes(playerId)) return false;

    updateEventDay(currentEventDay.id, {
      checkedInPlayers: [...currentEventDay.checkedInPlayers, playerId]
    });

    return true;
  }, [currentEventDay, league.maxPlayersPerDay, updateEventDay]);

  // Remove check-in
  const removeCheckIn = useCallback((playerId) => {
    if (!currentEventDay) return false;
    if (currentEventDay.status !== EVENT_DAY_STATUS.CHECKIN) return false;

    updateEventDay(currentEventDay.id, {
      checkedInPlayers: currentEventDay.checkedInPlayers.filter(id => id !== playerId)
    });

    return true;
  }, [currentEventDay, updateEventDay]);

  // Close check-in and generate courts
  const closeCheckInAndGenerateCourts = useCallback((enableMoneyRound = false) => {
    if (!currentEventDay) return false;
    if (currentEventDay.checkedInPlayers.length < 4) return false;

    // Determine court assignments based on day number
    let courtAssignments;
    if (currentEventDay.dayNumber === 1) {
      // Day 1: Assign by DUPR
      courtAssignments = assignCourtsByDupr(
        currentEventDay.checkedInPlayers,
        league.registeredPlayers
      );
    } else {
      // Day 2+: Assign by cumulative points
      courtAssignments = assignCourtsByPoints(
        currentEventDay.checkedInPlayers,
        league.registeredPlayers
      );
    }

    // Generate round-robin schedule for all courts
    // For mixed doubles, pass partners and getPlayerGender function
    const getPlayerGender = (playerId) => {
      const player = league.registeredPlayers.find(p => p.id === playerId);
      return player?.gender || null;
    };
    
    const schedule = generateEventDaySchedule(courtAssignments, {
      leagueMode: league.leagueMode || 'regular',
      partners: league.partners || {},
      getPlayerGender,
      partnerMatchups: league.partnerMatchups || []
    });

    updateEventDay(currentEventDay.id, {
      status: EVENT_DAY_STATUS.ACTIVE,
      phase: EVENT_DAY_PHASE.LEAGUE_ROUND,
      courtAssignments,
      schedule,
      // Money Round will be enabled if league has it enabled or if explicitly enabled for this day
      moneyRoundEnabled: enableMoneyRound || league.moneyRoundEnabled
    });

    return true;
  }, [currentEventDay, league.registeredPlayers, league.moneyRoundEnabled, updateEventDay]);

  // Check if all Round 1 matches are completed (for mixed doubles)
  const checkRound1Completion = useCallback(() => {
    if (!currentEventDay || league.leagueMode !== 'mixed_doubles') return false;
    
    const round1Matches = currentEventDay.schedule.filter(m => m.roundNumber === 1);
    if (round1Matches.length === 0) return false;
    
    return round1Matches.every(m => m.status === 'completed');
  }, [currentEventDay, league.leagueMode]);

  // Record a match score
  const recordMatchScore = useCallback((matchId, scoreA, scoreB) => {
    if (!currentEventDay) return false;
    if (currentEventDay.status !== EVENT_DAY_STATUS.ACTIVE) return false;

    const match = currentEventDay.schedule.find(m => m.id === matchId);
    if (!match) return false;

    const winner = scoreA > scoreB ? 'A' : 'B';

    // Record partner pair matchup for Round 1 matches in mixed doubles
    if (league.leagueMode === 'mixed_doubles' && 
        match.roundNumber === 1 && 
        match.playedWithPartner &&
        recordPartnerMatchup &&
        match.teamA.length === 2 && 
        match.teamB.length === 2) {
      recordPartnerMatchup(
        currentEventDay.id,
        match.courtIndex,
        match.teamA,
        match.teamB
      );
    }

    // Update the match
    const updatedSchedule = currentEventDay.schedule.map(m =>
      m.id === matchId
        ? { ...m, scoreA, scoreB, winner, status: 'completed' }
        : m
    );

    updateEventDay(currentEventDay.id, {
      schedule: updatedSchedule
    });

    // For mixed doubles, check if Round 1 is complete after this score
    if (league.leagueMode === 'mixed_doubles' && match.roundNumber === 1 && !currentEventDay.round1Completed) {
      const round1Matches = updatedSchedule.filter(m => m.roundNumber === 1);
      const round1Complete = round1Matches.length > 0 && round1Matches.every(m => m.status === 'completed');
      
      if (round1Complete) {
        // Calculate ladder movement for Round 1
        const round1OnlyMatches = round1Matches;
        const { movements } = calculateLadderMovement(
          currentEventDay.courtAssignments,
          round1OnlyMatches,
          league.scoringSystem,
          {
            leagueMode: league.leagueMode || 'mixed_doubles',
            partners: league.partners || {}
          }
        );

        // Apply movement using nextCourt from movements
        // Create map of player to new court
        const playerNewCourt = {};
        currentEventDay.courtAssignments.forEach((court, courtIndex) => {
          court.forEach(playerId => {
            playerNewCourt[playerId] = courtIndex;
          });
        });
        
        // Apply movements using nextCourt
        movements.forEach(move => {
          if (move.nextCourt !== undefined) {
            playerNewCourt[move.playerId] = move.nextCourt;
          }
        });
        
        // Build new court assignments
        let newCourtAssignments = [[], [], [], []];
        Object.entries(playerNewCourt).forEach(([playerId, courtIndex]) => {
          newCourtAssignments[courtIndex].push(parseInt(playerId));
        });
        
        // Sort each court
        newCourtAssignments.forEach(court => {
          court.sort((a, b) => a - b);
        });

        // Ensure partners are split (not on same court) after Round 1
        const partners = league.partners || {};
        const partnerConflicts = [];
        
        // Find all partner conflicts
        newCourtAssignments.forEach((court, courtIndex) => {
          court.forEach(playerId => {
            const partnerId = partners[playerId];
            if (partnerId && court.includes(partnerId) && playerId < partnerId) {
              // Found a conflict (only count once per pair)
              partnerConflicts.push({ courtIndex, playerId, partnerId });
            }
          });
        });

        // Resolve conflicts by moving one partner to an adjacent court
        partnerConflicts.forEach(({ courtIndex, playerId, partnerId }) => {
          const court = newCourtAssignments[courtIndex];
          const partnerIndex = court.indexOf(partnerId);
          
          if (partnerIndex !== -1) {
            // Remove partner from current court
            court.splice(partnerIndex, 1);
            
            // Try to move to adjacent court (prefer moving down to lower court)
            let targetCourtIndex = courtIndex > 0 ? courtIndex - 1 : courtIndex + 1;
            
            // If target is full (4 players) or at bounds, try other direction
            if (targetCourtIndex >= 4 || 
                (targetCourtIndex < 4 && newCourtAssignments[targetCourtIndex].length >= 4 && courtIndex < 3)) {
              targetCourtIndex = courtIndex < 3 ? courtIndex + 1 : courtIndex - 1;
            }
            
            // Ensure target court index is valid
            if (targetCourtIndex >= 0 && targetCourtIndex < 4) {
              newCourtAssignments[targetCourtIndex].push(partnerId);
            } else {
              // Fallback: add back to original court if no valid target
              court.push(partnerId);
            }
          }
        });

        // Generate rounds 2-6 with new court assignments
        const getPlayerGender = (playerId) => {
          const player = league.registeredPlayers.find(p => p.id === playerId);
          return player?.gender || null;
        };

        const rounds2to6 = [];
        let matchId = Math.max(...updatedSchedule.map(m => m.id)) + 1;
        
        newCourtAssignments.forEach((courtPlayers, courtIndex) => {
          if (!courtPlayers || courtPlayers.length < 4) return;

          // Generate rounds 2-6 for this court with partners split
          const remainingRounds = generateMixedRounds(
            courtPlayers,
            partners,
            getPlayerGender,
            2,
            6
          );
          
          remainingRounds.forEach(round => {
            rounds2to6.push({
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

        // Update event day with Round 1 completed flag, new courts, and rounds 2-6
        updateEventDay(currentEventDay.id, {
          round1Completed: true,
          postRound1CourtAssignments: newCourtAssignments,
          schedule: [...updatedSchedule, ...rounds2to6]
        });
      }
    }

    return true;
  }, [currentEventDay, updateEventDay, league, recordPartnerMatchup, calculateLadderMovement, applyMovementForMoneyRound]);

  // Clear a match score
  const clearMatchScore = useCallback((matchId) => {
    if (!currentEventDay) return false;
    if (currentEventDay.status !== EVENT_DAY_STATUS.ACTIVE) return false;

    updateEventDay(currentEventDay.id, {
      schedule: currentEventDay.schedule.map(match =>
        match.id === matchId
          ? { ...match, scoreA: null, scoreB: null, winner: null, status: 'pending' }
          : match
      )
    });

    return true;
  }, [currentEventDay, updateEventDay]);

  // Get schedule progress
  const scheduleProgress = useMemo(() => {
    if (!currentEventDay) return { completed: 0, total: 0, percentage: 0 };
    return calculateScheduleProgress(currentEventDay.schedule);
  }, [currentEventDay]);

  // Get matches by court
  const getMatchesByCourt = useCallback((courtIndex) => {
    if (!currentEventDay) return [];
    return currentEventDay.schedule.filter(m => m.courtIndex === courtIndex);
  }, [currentEventDay]);

  // Get matches by round
  const getMatchesByRound = useCallback((roundNumber) => {
    if (!currentEventDay) return [];
    return currentEventDay.schedule.filter(m => m.roundNumber === roundNumber);
  }, [currentEventDay]);

  // Check if all matches are completed
  const allMatchesCompleted = useMemo(() => {
    if (!currentEventDay) return false;
    return currentEventDay.schedule.length > 0 &&
      currentEventDay.schedule.every(m => m.status === 'completed');
  }, [currentEventDay]);

  // Complete League Round (Phase 1) - calculates movement and optionally starts Money Round
  const completeLeagueRound = useCallback(() => {
    if (!currentEventDay) return false;
    if (!allMatchesCompleted) return false;
    if (currentEventDay.phase !== EVENT_DAY_PHASE.LEAGUE_ROUND) return false;

    // Calculate ladder movement
    const { movements, courtRankings } = calculateLadderMovement(
      currentEventDay.courtAssignments,
      currentEventDay.schedule,
      league.scoringSystem,
      {
        leagueMode: league.leagueMode || 'regular',
        partners: league.partners || {}
      }
    );

    // Update player stats from League Round
    currentEventDay.courtAssignments.forEach((courtPlayers, courtIndex) => {
      courtPlayers.forEach(playerId => {
        const performance = calculatePlayerDayPerformance(
          playerId,
          currentEventDay.schedule,
          league.scoringSystem,
          {
            leagueMode: league.leagueMode || 'regular',
            partners: league.partners || {}
          }
        );

        updatePlayerStats(playerId, {
          points: performance.points,
          wins: performance.wins,
          losses: performance.losses,
          pointsScored: performance.pointsScored,
          pointsAllowed: performance.pointsAllowed,
          courtHistory: [{ dayNumber: currentEventDay.dayNumber, court: courtIndex + 1 }]
        });
      });
    });

    // Move to ladder movement phase and store the movements
    updateEventDay(currentEventDay.id, {
      phase: EVENT_DAY_PHASE.LADDER_MOVEMENT,
      ladderMovement: movements
    });

    return { movements, courtRankings };
  }, [
    currentEventDay,
    allMatchesCompleted,
    league.scoringSystem,
    league.leagueMode,
    league.partners,
    updatePlayerStats,
    updateEventDay
  ]);

  // Start Money Round (Phase 2) - applies movement and generates new schedule
  const startMoneyRound = useCallback(() => {
    if (!currentEventDay) return false;
    if (currentEventDay.phase !== EVENT_DAY_PHASE.LADDER_MOVEMENT) return false;
    if (!currentEventDay.moneyRoundEnabled) return false;

    // Apply ladder movement to get new court assignments
    const moneyRoundCourts = applyMovementForMoneyRound(
      currentEventDay.courtAssignments,
      currentEventDay.ladderMovement
    );

    // Generate Money Round schedule on the new courts
    const moneyRoundSchedule = generateMoneyRoundSchedule(moneyRoundCourts, currentEventDay.id);

    updateEventDay(currentEventDay.id, {
      phase: EVENT_DAY_PHASE.MONEY_ROUND,
      moneyRoundCourts,
      moneyRoundSchedule
    });

    return true;
  }, [currentEventDay, updateEventDay]);

  // Skip Money Round and complete event day
  const skipMoneyRound = useCallback(() => {
    if (!currentEventDay) return false;
    if (currentEventDay.phase !== EVENT_DAY_PHASE.LADDER_MOVEMENT) return false;

    // Complete the event day without Money Round
    completeEventDay(currentEventDay.id, currentEventDay.ladderMovement);

    return true;
  }, [currentEventDay, completeEventDay]);

  // Record a Money Round match score
  const recordMoneyRoundScore = useCallback((matchId, scoreA, scoreB) => {
    if (!currentEventDay) return false;
    if (currentEventDay.phase !== EVENT_DAY_PHASE.MONEY_ROUND) return false;

    const winner = scoreA > scoreB ? 'A' : 'B';

    updateEventDay(currentEventDay.id, {
      moneyRoundSchedule: currentEventDay.moneyRoundSchedule.map(match =>
        match.id === matchId
          ? { ...match, scoreA, scoreB, winner, status: 'completed' }
          : match
      )
    });

    return true;
  }, [currentEventDay, updateEventDay]);

  // Clear a Money Round match score
  const clearMoneyRoundScore = useCallback((matchId) => {
    if (!currentEventDay) return false;
    if (currentEventDay.phase !== EVENT_DAY_PHASE.MONEY_ROUND) return false;

    updateEventDay(currentEventDay.id, {
      moneyRoundSchedule: currentEventDay.moneyRoundSchedule.map(match =>
        match.id === matchId
          ? { ...match, scoreA: null, scoreB: null, winner: null, status: 'pending' }
          : match
      )
    });

    return true;
  }, [currentEventDay, updateEventDay]);

  // Complete Money Round and calculate contributions
  const completeMoneyRound = useCallback((contributionScale) => {
    if (!currentEventDay) return false;
    if (currentEventDay.phase !== EVENT_DAY_PHASE.MONEY_ROUND) return false;
    if (!isMoneyRoundComplete(currentEventDay.moneyRoundSchedule)) return false;

    // Calculate rankings and contributions for each court
    const moneyRoundResults = currentEventDay.moneyRoundCourts.map((players, courtIndex) => {
      const courtMatches = currentEventDay.moneyRoundSchedule.filter(m => m.courtIndex === courtIndex);
      const rankings = calculateMoneyRoundCourtRankings(players, courtMatches);
      const contributions = calculateContributions(rankings, contributionScale);

      return {
        courtIndex,
        rankings: contributions
      };
    });

    updateEventDay(currentEventDay.id, {
      moneyRoundResults
    });

    // Complete the event day
    completeEventDay(currentEventDay.id, currentEventDay.ladderMovement);

    return moneyRoundResults;
  }, [currentEventDay, updateEventDay, completeEventDay]);

  // Close event day (legacy - now routes to appropriate phase completion)
  const closeEventDay = useCallback(() => {
    if (!currentEventDay) return false;
    if (!allMatchesCompleted) return false;

    // If we're in League Round phase, complete the league round
    if (currentEventDay.phase === EVENT_DAY_PHASE.LEAGUE_ROUND || 
        !currentEventDay.phase) {
      const result = completeLeagueRound();
      
      // If Money Round is not enabled, complete the event day
      if (!currentEventDay.moneyRoundEnabled) {
        completeEventDay(currentEventDay.id, currentEventDay.ladderMovement || []);
      }
      
      return result !== false;
    }

    return false;
  }, [
    currentEventDay,
    allMatchesCompleted,
    completeLeagueRound,
    completeEventDay
  ]);

  // Get players available for check-in
  const availableForCheckIn = useMemo(() => {
    if (!currentEventDay) return [];
    return league.registeredPlayers.filter(
      p => !currentEventDay.checkedInPlayers.includes(p.id)
    );
  }, [currentEventDay, league.registeredPlayers]);

  // Get checked-in players with details
  const checkedInPlayersDetails = useMemo(() => {
    if (!currentEventDay) return [];
    return currentEventDay.checkedInPlayers
      .map((id, index) => {
        const player = getPlayerById(id);
        return player ? { ...player, checkInOrder: index + 1 } : null;
      })
      .filter(Boolean);
  }, [currentEventDay, getPlayerById]);

  // Get court assignments with player details
  const courtAssignmentsWithDetails = useMemo(() => {
    if (!currentEventDay) return [[], [], [], []];
    return currentEventDay.courtAssignments.map(courtPlayers =>
      courtPlayers
        .map(id => getPlayerById(id))
        .filter(Boolean)
    );
  }, [currentEventDay, getPlayerById]);

  // Get a preview of ladder movement (before closing)
  const getLadderMovementPreview = useCallback(() => {
    if (!currentEventDay) return null;
    if (!allMatchesCompleted) return null;

    const { movements, courtRankings } = calculateLadderMovement(
      currentEventDay.courtAssignments,
      currentEventDay.schedule,
      league.scoringSystem,
      {
        leagueMode: league.leagueMode || 'regular',
        partners: league.partners || {}
      }
    );

    return {
      movements: movements.map(m => ({
        ...m,
        player: getPlayerById(m.playerId)
      })),
      courtRankings: courtRankings.map(rankings =>
        rankings.map(r => ({
          ...r,
          player: getPlayerById(r.playerId)
        }))
      )
    };
  }, [currentEventDay, allMatchesCompleted, league.scoringSystem, league.leagueMode, league.partners, getPlayerById]);

  // Get unique rounds in schedule
  const rounds = useMemo(() => {
    if (!currentEventDay) return [];
    const roundNumbers = [...new Set(currentEventDay.schedule.map(m => m.roundNumber))];
    return roundNumbers.sort((a, b) => a - b);
  }, [currentEventDay]);

  // Money Round specific computed values
  const moneyRoundProgress = useMemo(() => {
    if (!currentEventDay || !currentEventDay.moneyRoundSchedule) {
      return { total: 0, completed: 0, percentage: 0 };
    }
    return getMoneyRoundProgress(currentEventDay.moneyRoundSchedule);
  }, [currentEventDay]);

  const allMoneyRoundMatchesCompleted = useMemo(() => {
    if (!currentEventDay || !currentEventDay.moneyRoundSchedule) return false;
    return isMoneyRoundComplete(currentEventDay.moneyRoundSchedule);
  }, [currentEventDay]);

  const moneyRoundCourtsWithDetails = useMemo(() => {
    if (!currentEventDay || !currentEventDay.moneyRoundCourts) return [[], [], [], []];
    return currentEventDay.moneyRoundCourts.map(courtPlayers =>
      courtPlayers
        .map(id => getPlayerById(id))
        .filter(Boolean)
    );
  }, [currentEventDay, getPlayerById]);

  // Get Money Round matches by court
  const getMoneyRoundMatchesByCourt = useCallback((courtIndex) => {
    if (!currentEventDay || !currentEventDay.moneyRoundSchedule) return [];
    return currentEventDay.moneyRoundSchedule.filter(m => m.courtIndex === courtIndex);
  }, [currentEventDay]);

  // Get current phase display name
  const currentPhase = useMemo(() => {
    if (!currentEventDay) return null;
    return currentEventDay.phase || EVENT_DAY_PHASE.CHECKIN;
  }, [currentEventDay]);

  // Is Money Round enabled for this event day
  const isMoneyRoundEnabledForDay = useMemo(() => {
    if (!currentEventDay) return false;
    return currentEventDay.moneyRoundEnabled || false;
  }, [currentEventDay]);

  return {
    currentEventDay,
    currentPhase,
    scheduleProgress,
    allMatchesCompleted,
    availableForCheckIn,
    checkedInPlayersDetails,
    courtAssignmentsWithDetails,
    rounds,

    // Money Round
    isMoneyRoundEnabledForDay,
    moneyRoundProgress,
    allMoneyRoundMatchesCompleted,
    moneyRoundCourtsWithDetails,

    // Actions
    checkInPlayer,
    removeCheckIn,
    closeCheckInAndGenerateCourts,
    recordMatchScore,
    clearMatchScore,
    closeEventDay,

    // Two-phase flow actions
    completeLeagueRound,
    startMoneyRound,
    skipMoneyRound,
    recordMoneyRoundScore,
    clearMoneyRoundScore,
    completeMoneyRound,

    // Queries
    getMatchesByCourt,
    getMatchesByRound,
    getMoneyRoundMatchesByCourt,
    getLadderMovementPreview
  };
}

