/**
 * useEventDay - Hook for managing event day operations
 * 
 * Supports two-phase event structure:
 * - Phase 1: League Round (determines ladder movement)
 * - Phase 2: Money Round (determines prize pool contributions)
 */

import { useCallback, useMemo } from 'react';
import { EVENT_DAY_STATUS, EVENT_DAY_PHASE, EVENT_DAY_RULES } from '../utils/constants.js';
import { generateEventDaySchedule, calculateScheduleProgress, generateSingleRound, generateNextRoundForRegularLeague, getPreviousRoundPartners } from '../utils/roundRobin.js';
import {
  calculateLadderMovement,
  assignCourtsByDupr,
  assignCourtsByPoints,
  assignCourtsByRandom,
  calculatePlayerDayPerformance,
  consolidateCourtsToHighest
} from '../utils/ladderMovement.js';
import {
  applyMovementForMoneyRound,
  generateMoneyRoundSchedule,
  calculateMoneyRoundCourtRankings,
  calculateContributions,
  getMoneyRoundProgress,
  isMoneyRoundComplete
} from '../utils/moneyRound.js';

const idsEqual = (a, b) => a != null && b != null && String(a) === String(b);

export function useEventDay(league, updateEventDay, updatePlayerStats, completeEventDay, getPlayerById, recordPartnerMatchup) {
  const defaultEventDayRules = {
    initialAssignment: EVENT_DAY_RULES.initialAssignment.DUPR_BASED,
    ladderMovement: EVENT_DAY_RULES.ladderMovement.STANDARD_LADDER,
    poolFormat: EVENT_DAY_RULES.poolFormat.POOLS_OF_5,
    startingMethod: EVENT_DAY_RULES.startingMethod.LADDER_POSITION,
    divisibilityRequirement: EVENT_DAY_RULES.divisibilityRequirement.DIVISIBLE_BY_4,
    roundRobinType: EVENT_DAY_RULES.roundRobinType.FULL_ROUND_ROBIN
  };
  const resolvedEventDayRules = useMemo(() => ({
    ...defaultEventDayRules,
    ...(league.eventDayRules || {})
  }), [league.eventDayRules]);

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
    const list = currentEventDay.checkedInPlayers || [];
    if (list.length >= league.maxPlayersPerDay) return false;
    if (list.some(id => idsEqual(id, playerId))) return false;

    updateEventDay(currentEventDay.id, {
      checkedInPlayers: [...list, playerId]
    });

    return true;
  }, [currentEventDay, league.maxPlayersPerDay, updateEventDay]);

  // Remove check-in
  const removeCheckIn = useCallback((playerId) => {
    if (!currentEventDay) return false;
    if (currentEventDay.status !== EVENT_DAY_STATUS.CHECKIN) return false;

    updateEventDay(currentEventDay.id, {
      checkedInPlayers: (currentEventDay.checkedInPlayers || []).filter(id => !idsEqual(id, playerId))
    });

    return true;
  }, [currentEventDay, updateEventDay]);

  // Close check-in and generate courts
  const closeCheckInAndGenerateCourts = useCallback((enableMoneyRound = false) => {
    if (!currentEventDay) {
      console.error('closeCheckInAndGenerateCourts: No current event day');
      return false;
    }

    // Use only resolvable players (matches what the UI shows via checkedInPlayersDetails).
    // This avoids failing when checkedInPlayers contains orphan/stale IDs that don't resolve.
    const effectiveCheckedIn = (currentEventDay.checkedInPlayers || [])
      .filter(id => getPlayerById(id));

    if (effectiveCheckedIn.length < 4) {
      console.error('closeCheckInAndGenerateCourts: Need at least 4 players', effectiveCheckedIn.length);
      return false;
    }

    const rules = resolvedEventDayRules;

    const getPlayersPerCourt = (count, poolFormat) => {
      if (poolFormat === EVENT_DAY_RULES.poolFormat.POOLS_OF_4) return 4;
      if (poolFormat === EVENT_DAY_RULES.poolFormat.POOLS_OF_5) return 5;
      if (poolFormat === EVENT_DAY_RULES.poolFormat.POOLS_OF_4_OR_5) {
        if (count % 5 === 0) return 5;
        return 4;
      }
      return 4;
    };

    let playersPerCourt = getPlayersPerCourt(effectiveCheckedIn.length, rules.poolFormat);
    if (rules.poolFormat === EVENT_DAY_RULES.poolFormat.POOLS_OF_5 &&
        effectiveCheckedIn.length % 4 === 0 &&
        effectiveCheckedIn.length % 5 !== 0) {
      console.warn('closeCheckInAndGenerateCourts: Falling back to 4-player courts for this event day', {
        count: effectiveCheckedIn.length,
        poolFormat: rules.poolFormat
      });
      playersPerCourt = 4;
    }

    const validateDivisibility = (count, requirement) => {
      if (requirement === EVENT_DAY_RULES.divisibilityRequirement.DIVISIBLE_BY_4) return count % 4 === 0;
      if (requirement === EVENT_DAY_RULES.divisibilityRequirement.DIVISIBLE_BY_5) return count % 5 === 0;
      return true;
    };

    if (!validateDivisibility(effectiveCheckedIn.length, rules.divisibilityRequirement)) {
      console.error('closeCheckInAndGenerateCourts: Player count does not meet divisibility requirement', {
        count: effectiveCheckedIn.length,
        requirement: rules.divisibilityRequirement
      });
      return false;
    }

    const shuffle = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const getSortedByDupr = (checkedInIds) => {
      const players = checkedInIds
        .map(id => league.registeredPlayers.find(p => p.id === id))
        .filter(Boolean);
      if (players.length === 0) return checkedInIds;
      return players.sort((a, b) => b.duprRating - a.duprRating).map(p => p.id);
    };

    const getSortedByPoints = (checkedInIds) => {
      const players = checkedInIds
        .map(id => league.registeredPlayers.find(p => p.id === id))
        .filter(Boolean);
      if (players.length === 0) return checkedInIds;
      return players.sort((a, b) => {
        if (b.cumulativePoints !== a.cumulativePoints) {
          return b.cumulativePoints - a.cumulativePoints;
        }
        const winPctA = a.totalWins + a.totalLosses > 0 ? a.totalWins / (a.totalWins + a.totalLosses) : 0;
        const winPctB = b.totalWins + b.totalLosses > 0 ? b.totalWins / (b.totalWins + b.totalLosses) : 0;
        return winPctB - winPctA;
      }).map(p => p.id);
    };

    const distributePlayersToCourtsWithSize = (playerIds, perCourt) => {
      const courts = [[], [], [], []];
      playerIds.forEach((playerId, index) => {
        const courtIndex = 3 - Math.floor(index / perCourt);
        if (courtIndex >= 0) {
          courts[courtIndex].push(playerId);
        }
      });
      return courts;
    };

    const distributePlayersToCourts = (playerIds) => {
      return distributePlayersToCourtsWithSize(playerIds, playersPerCourt);
    };

    // Determine court assignments based on league mode (use effective list)
    let courtAssignments;
    try {
      const isDayOne = currentEventDay.dayNumber === 1;
      const assignmentRule = isDayOne ? rules.initialAssignment : rules.startingMethod;
      let orderedPlayers = null;

      if (assignmentRule === EVENT_DAY_RULES.initialAssignment.DUPR_BASED) {
        orderedPlayers = getSortedByDupr(effectiveCheckedIn);
      } else if (
        assignmentRule === EVENT_DAY_RULES.initialAssignment.POINTS_BASED ||
        assignmentRule === EVENT_DAY_RULES.startingMethod.LADDER_POSITION
      ) {
        orderedPlayers = getSortedByPoints(effectiveCheckedIn);
      } else if (assignmentRule === EVENT_DAY_RULES.initialAssignment.BLIND_DRAW || assignmentRule === EVENT_DAY_RULES.initialAssignment.RANDOM || assignmentRule === EVENT_DAY_RULES.startingMethod.BLIND_DRAW || assignmentRule === EVENT_DAY_RULES.startingMethod.RANDOM_START) {
        orderedPlayers = shuffle(effectiveCheckedIn);
      } else {
        orderedPlayers = shuffle(effectiveCheckedIn);
      }

      courtAssignments = distributePlayersToCourts(orderedPlayers);

      // Validate court assignments
      if (!courtAssignments || !Array.isArray(courtAssignments) || courtAssignments.length !== 4) {
        console.error('closeCheckInAndGenerateCourts: Invalid court assignments', courtAssignments);
        return false;
      }

      const totalPlayers = courtAssignments.flat().length;
      if (totalPlayers === 0) {
        console.error('closeCheckInAndGenerateCourts: No players in court assignments', {
          effectiveCheckedIn,
          courtAssignments
        });
        return false;
      }

      const hasEmptyCourt = courtAssignments.some(court => court.length === 0);
      if (hasEmptyCourt && effectiveCheckedIn.length >= 16) {
        const fallbackAssignments = distributePlayersToCourtsWithSize(orderedPlayers, 4);
        const fallbackHasEmptyCourt = fallbackAssignments.some(court => court.length === 0);
        if (!fallbackHasEmptyCourt) {
          courtAssignments = fallbackAssignments;
          playersPerCourt = 4;
        }
      }
    } catch (error) {
      console.error('closeCheckInAndGenerateCourts: Error generating court assignments', error);
      return false;
    }

    const getPlayerGender = (playerId) => {
      const player = league.registeredPlayers.find(p => p.id === playerId);
      return player?.gender || null;
    };

    const schedule = generateEventDaySchedule(courtAssignments, {
      leagueMode: league.leagueMode || 'regular',
      partners: league.partners || {},
      getPlayerGender,
      partnerMatchups: league.partnerMatchups || [],
      roundRobinType: rules.roundRobinType,
      poolFormat: rules.poolFormat,
      playersPerCourt
    });

    // Persist cleaned checkedInPlayers so it stays in sync with effective list
    updateEventDay(currentEventDay.id, {
      status: EVENT_DAY_STATUS.ACTIVE,
      phase: EVENT_DAY_PHASE.LEAGUE_ROUND,
      checkedInPlayers: effectiveCheckedIn,
      courtAssignments,
      schedule,
      currentActiveRound: 1,
      moneyRoundEnabled: enableMoneyRound || league.moneyRoundEnabled
    });

    return true;
  }, [currentEventDay, league.registeredPlayers, league.leagueMode, league.moneyRoundEnabled, league.eventDayRules, updateEventDay, getPlayerById]);

  // Check if a specific round is complete (for mixed doubles and regular league)
  const checkRoundCompletion = useCallback((roundNumber) => {
    if (!currentEventDay) return false;
    
    const roundMatches = currentEventDay.schedule.filter(m => m.roundNumber === roundNumber);
    if (roundMatches.length === 0) return false;
    
    return roundMatches.every(m => m.status === 'completed');
  }, [currentEventDay]);

  // Check if current active round is complete (for regular league submit button)
  const isCurrentRoundComplete = useMemo(() => {
    if (!currentEventDay || league.leagueMode !== 'regular') return false;
    
    const currentActiveRound = currentEventDay.currentActiveRound || 1;
    const currentRoundMatches = currentEventDay.schedule.filter(
      m => m.roundNumber === currentActiveRound
    );
    
    if (currentRoundMatches.length === 0) return false;
    
    return currentRoundMatches.every(m => m.status === 'completed');
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

    // For mixed doubles, check if current active round is complete after this score
    // For regular league, movement will be triggered manually via submitRound()
    const currentActiveRound = currentEventDay.currentActiveRound || 1;
    
    // Check if the scored match is in the current active round
    if (match.roundNumber === currentActiveRound) {
      const currentRoundMatches = updatedSchedule.filter(m => m.roundNumber === currentActiveRound);
      const roundComplete = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.status === 'completed');
      
      // Regular league: don't auto-trigger movement, wait for manual submitRound() call
      // Mixed doubles: keep automatic behavior
      if (league.leagueMode === 'mixed_doubles' && roundComplete && currentActiveRound < 6) {
        // Round 1: derive court assignments from matches (each match's 4 players were on that court).
        // Round 2+: use postRound1CourtAssignments from the previous round's movement.
        let currentCourtAssignments;
        if (currentActiveRound === 1) {
          const round1ByCourt = [[], [], [], []];
          currentRoundMatches.forEach((m) => {
            const players = [...(m.teamA || []), ...(m.teamB || [])].filter(Boolean);
            if (m.courtIndex >= 0 && m.courtIndex < 4 && players.length === 4) {
              round1ByCourt[m.courtIndex] = players;
            }
          });
          currentCourtAssignments = round1ByCourt;
          // Place any sitting-out players (e.g. 7 pairs): add to lowest courts with room
          const assignedIds = new Set(currentCourtAssignments.flat().map((id) => String(id)));
          const checkedIn = currentEventDay.checkedInPlayers || [];
          const missing = checkedIn.filter((id) => !assignedIds.has(String(id)));
          missing.forEach((playerId) => {
            for (let i = 0; i < 4; i++) {
              if (currentCourtAssignments[i].length < 4) {
                currentCourtAssignments[i].push(playerId);
                break;
              }
            }
          });
        } else {
          currentCourtAssignments = currentEventDay.postRound1CourtAssignments ||
            currentEventDay.courtAssignments;
        }

        // Calculate ladder movement for this round
        const { movements } = calculateLadderMovement(
          currentCourtAssignments,
          currentRoundMatches,
          league.scoringSystem,
          {
            leagueMode: league.leagueMode || 'mixed_doubles',
            partners: league.partners || {},
            ladderMovement: resolvedEventDayRules.ladderMovement
          }
        );

        // Apply movement using nextCourt from movements
        const playerNewCourt = {};
        currentCourtAssignments.forEach((court, courtIndex) => {
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
          const id = /^\d+$/.test(String(playerId)) ? parseInt(playerId, 10) : playerId;
          newCourtAssignments[courtIndex].push(id);
        });

        // Sort each court (numeric ids by value, otherwise by string)
        newCourtAssignments.forEach(court => {
          court.sort((a, b) => {
            const na = Number(a), nb = Number(b);
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
            return String(a).localeCompare(String(b), undefined, { numeric: true });
          });
        });

        // Consolidate to highest courts if less than 16 players
        const totalPlayers = newCourtAssignments.flat().length;
        if (totalPlayers < 16) {
          newCourtAssignments = consolidateCourtsToHighest(newCourtAssignments);
        }

        // Ensure partners are split (not on same court) after movement
        const partners = league.partners || {};
        const partnerConflicts = [];
        
        // Find all partner conflicts
        newCourtAssignments.forEach((court, courtIndex) => {
          court.forEach(playerId => {
            const partnerId = partners[playerId];
            if (partnerId && court.includes(partnerId) && playerId < partnerId) {
              partnerConflicts.push({ courtIndex, playerId, partnerId });
            }
          });
        });

        // Resolve conflicts by moving one partner to an adjacent court
        partnerConflicts.forEach(({ courtIndex, playerId, partnerId }) => {
          const court = newCourtAssignments[courtIndex];
          const partnerIndex = court.indexOf(partnerId);
          
          if (partnerIndex !== -1) {
            court.splice(partnerIndex, 1);
            
            // Try to move to adjacent court
            let targetCourtIndex = courtIndex > 0 ? courtIndex - 1 : courtIndex + 1;
            
            // If target is full or at bounds, try other direction
            if (targetCourtIndex >= 4 || 
                (targetCourtIndex < 4 && newCourtAssignments[targetCourtIndex].length >= 4 && courtIndex < 3)) {
              targetCourtIndex = courtIndex < 3 ? courtIndex + 1 : courtIndex - 1;
            }
            
            if (targetCourtIndex >= 0 && targetCourtIndex < 4) {
              newCourtAssignments[targetCourtIndex].push(partnerId);
            } else {
              court.push(partnerId);
            }
          }
        });

        // Generate ONLY the next round with new court assignments
        const nextRoundNumber = currentActiveRound + 1;
        const getPlayerGender = (playerId) => {
          const player = league.registeredPlayers.find(p => p.id === playerId);
          return player?.gender || null;
        };

        const nextRoundMatches = [];
        let matchId = Math.max(...updatedSchedule.map(m => m.id)) + 1;
        
        newCourtAssignments.forEach((courtPlayers, courtIndex) => {
          if (!courtPlayers || courtPlayers.length < 4) return;

          // Generate only the next round for this court
          const nextRound = generateSingleRound(
            courtPlayers,
            partners,
            getPlayerGender,
            nextRoundNumber
          );
          
          nextRound.forEach(round => {
            nextRoundMatches.push({
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

        // Update event day with next active round, new courts, and next round matches
        updateEventDay(currentEventDay.id, {
          currentActiveRound: nextRoundNumber,
          postRound1CourtAssignments: newCourtAssignments, // Keep using this field to track current courts
          schedule: [...updatedSchedule, ...nextRoundMatches],
          ladderMovement: movements
        });
      }
    }

    return true;
  }, [currentEventDay, updateEventDay, league, recordPartnerMatchup, calculateLadderMovement]);

  // Submit round for regular league (triggers movement and generates next round)
  const submitRound = useCallback(() => {
    if (!currentEventDay || league.leagueMode !== 'regular') return false;
    if (currentEventDay.status !== EVENT_DAY_STATUS.ACTIVE) return false;

    const currentActiveRound = currentEventDay.currentActiveRound || 1;
    const currentRoundMatches = currentEventDay.schedule.filter(
      m => m.roundNumber === currentActiveRound
    );

    // Check if all matches in current round are completed
    if (currentRoundMatches.length === 0 || !currentRoundMatches.every(m => m.status === 'completed')) {
      return false;
    }

    // Get current court assignments (may have changed from previous rounds)
    const currentCourtAssignments = currentEventDay.postRound1CourtAssignments || 
                                   currentEventDay.courtAssignments;
    
    // Calculate ladder movement based on ONLY this round's matches
    const { movements } = calculateLadderMovement(
      currentCourtAssignments,
      currentRoundMatches,
      league.scoringSystem,
      {
        leagueMode: 'regular',
        partners: {},
        ladderMovement: resolvedEventDayRules.ladderMovement
      }
    );

    // Apply movement: use assignments array to support UUID and numeric IDs
    const assignments = [];
    (currentCourtAssignments || []).forEach((court, courtIndex) => {
      (court || []).forEach(playerId => {
        if (playerId != null) assignments.push({ playerId, courtIndex });
      });
    });
    movements.forEach(move => {
      const a = assignments.find(x => idsEqual(x.playerId, move.playerId));
      if (a && move.nextCourt !== undefined) a.courtIndex = move.nextCourt;
    });

    let newCourtAssignments = [[], [], [], []];
    assignments.forEach(({ playerId, courtIndex }) => {
      newCourtAssignments[courtIndex].push(playerId);
    });
    newCourtAssignments.forEach(court => {
      court.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    });

    // Consolidate to highest courts if less than 16 players
    const totalPlayers = newCourtAssignments.flat().length;
    if (totalPlayers < 16) {
      newCourtAssignments = consolidateCourtsToHighest(newCourtAssignments);
    }

    // Update player stats for the completed round
    currentCourtAssignments.forEach((courtPlayers, courtIndex) => {
      courtPlayers.forEach(playerId => {
        const performance = calculatePlayerDayPerformance(
          playerId,
          currentRoundMatches, // Only matches from this round
          league.scoringSystem,
          {
            leagueMode: 'regular',
            partners: {}
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

    // Generate next round with partner splitting
    const nextRoundNumber = currentActiveRound + 1;
    const nextRoundMatches = [];
    const numIds = (currentEventDay.schedule || []).map(m => m.id).filter(id => typeof id === 'number' && !isNaN(id));
    let nextMatchId = (numIds.length > 0 ? Math.max(...numIds) : 0) + 1;
    
    newCourtAssignments.forEach((courtPlayers, courtIndex) => {
      if (!courtPlayers || courtPlayers.length < 4) return;

      // Get previous round partners for this court
      const previousPartners = getPreviousRoundPartners(
        currentEventDay.schedule,
        courtIndex,
        currentActiveRound
      );

      // Generate next round with partner splitting
      const nextRound = generateNextRoundForRegularLeague(
        courtPlayers,
        previousPartners,
        nextRoundNumber
      );
      
      nextRound.forEach(round => {
        nextRoundMatches.push({
          id: nextMatchId++,
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

    // Update event day with next active round, new courts, and next round matches
    updateEventDay(currentEventDay.id, {
      currentActiveRound: nextRoundNumber,
      postRound1CourtAssignments: newCourtAssignments,
      schedule: [...currentEventDay.schedule, ...nextRoundMatches],
      ladderMovement: movements
    });

    return true;
  }, [currentEventDay, league, updateEventDay, updatePlayerStats]);

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

  // Complete League Round (Phase 1) - uses latest round movement and optionally starts Money Round
  const completeLeagueRound = useCallback(() => {
    if (!currentEventDay) return false;
    if (!allMatchesCompleted) return false;
    if (currentEventDay.phase !== EVENT_DAY_PHASE.LEAGUE_ROUND) return false;

    // Use postRound1CourtAssignments if available (for round-by-round modes)
    const courtAssignments = currentEventDay.postRound1CourtAssignments || currentEventDay.courtAssignments;

    let movements = currentEventDay.ladderMovement || [];
    let courtRankings = [];
    if (!movements.length) {
      const maxRound = Math.max(...currentEventDay.schedule.map(m => m.roundNumber || 1));
      const lastRoundMatches = currentEventDay.schedule.filter(m => m.roundNumber === maxRound);
      const result = calculateLadderMovement(
        courtAssignments,
        lastRoundMatches,
        league.scoringSystem,
        {
          leagueMode: league.leagueMode || 'regular',
          partners: league.partners || {},
          ladderMovement: resolvedEventDayRules.ladderMovement
        }
      );
      movements = result.movements;
      courtRankings = result.courtRankings;
    }

    // Update player stats from League Round
    courtAssignments.forEach((courtPlayers, courtIndex) => {
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
    resolvedEventDayRules.ladderMovement,
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

  // Get players available for check-in (type-safe: UUID or numeric IDs)
  const availableForCheckIn = useMemo(() => {
    if (!currentEventDay) return [];
    const checked = currentEventDay.checkedInPlayers || [];
    return (league.registeredPlayers || []).filter(
      p => p != null && p.id != null && !checked.some(id => idsEqual(id, p.id))
    );
  }, [currentEventDay, league.registeredPlayers]);

  // Get checked-in players with details (getPlayerById supports UUID and numeric)
  const checkedInPlayersDetails = useMemo(() => {
    if (!currentEventDay) return [];
    return (currentEventDay.checkedInPlayers || [])
      .map((id, index) => {
        const player = getPlayerById(id);
        return player ? { ...player, checkInOrder: index + 1 } : null;
      })
      .filter(Boolean);
  }, [currentEventDay, getPlayerById]);

  // Get court assignments with player details
  // For round-by-round modes, use postRound1CourtAssignments if available
  const courtAssignmentsWithDetails = useMemo(() => {
    if (!currentEventDay) return [[], [], [], []];
    const assignments = currentEventDay.postRound1CourtAssignments || currentEventDay.courtAssignments;
    return assignments.map(courtPlayers =>
      courtPlayers
        .map(id => getPlayerById(id))
        .filter(Boolean)
    );
  }, [currentEventDay, getPlayerById]);

  // Get a preview of ladder movement (before closing)
  const getLadderMovementPreview = useCallback(() => {
    if (!currentEventDay) return null;
    if (!allMatchesCompleted) return null;

    // Use postRound1CourtAssignments if available (for round-by-round modes)
    const courtAssignments = currentEventDay.postRound1CourtAssignments || currentEventDay.courtAssignments;

    const { movements, courtRankings } = calculateLadderMovement(
      courtAssignments,
      currentEventDay.schedule,
      league.scoringSystem,
      {
        leagueMode: league.leagueMode || 'regular',
        partners: league.partners || {},
        ladderMovement: resolvedEventDayRules.ladderMovement
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
  }, [currentEventDay, allMatchesCompleted, league.scoringSystem, league.leagueMode, league.partners, resolvedEventDayRules.ladderMovement, getPlayerById]);

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

    // Regular League Round Submission
    isCurrentRoundComplete,
    submitRound,

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

