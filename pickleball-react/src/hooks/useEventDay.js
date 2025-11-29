/**
 * useEventDay - Hook for managing event day operations
 */

import { useCallback, useMemo } from 'react';
import { EVENT_DAY_STATUS } from '../utils/constants.js';
import { generateEventDaySchedule, calculateScheduleProgress } from '../utils/roundRobin.js';
import {
  calculateLadderMovement,
  assignCourtsByDupr,
  assignCourtsByPoints,
  calculatePlayerDayPerformance
} from '../utils/ladderMovement.js';

export function useEventDay(league, updateEventDay, updatePlayerStats, completeEventDay, getPlayerById) {
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
  const closeCheckInAndGenerateCourts = useCallback(() => {
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
    const schedule = generateEventDaySchedule(courtAssignments);

    updateEventDay(currentEventDay.id, {
      status: EVENT_DAY_STATUS.ACTIVE,
      courtAssignments,
      schedule
    });

    return true;
  }, [currentEventDay, league.registeredPlayers, updateEventDay]);

  // Record a match score
  const recordMatchScore = useCallback((matchId, scoreA, scoreB) => {
    if (!currentEventDay) return false;
    if (currentEventDay.status !== EVENT_DAY_STATUS.ACTIVE) return false;

    const winner = scoreA > scoreB ? 'A' : 'B';

    updateEventDay(currentEventDay.id, {
      schedule: currentEventDay.schedule.map(match =>
        match.id === matchId
          ? { ...match, scoreA, scoreB, winner, status: 'completed' }
          : match
      )
    });

    return true;
  }, [currentEventDay, updateEventDay]);

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

  // Close event day and calculate movement
  const closeEventDay = useCallback(() => {
    if (!currentEventDay) return false;
    if (!allMatchesCompleted) return false;

    // Calculate ladder movement
    const { movements, courtRankings } = calculateLadderMovement(
      currentEventDay.courtAssignments,
      currentEventDay.schedule,
      league.scoringSystem
    );

    // Update player stats
    currentEventDay.courtAssignments.forEach((courtPlayers, courtIndex) => {
      courtPlayers.forEach(playerId => {
        const performance = calculatePlayerDayPerformance(
          playerId,
          currentEventDay.schedule,
          league.scoringSystem
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

    // Complete the event day
    completeEventDay(currentEventDay.id, movements);

    return true;
  }, [
    currentEventDay,
    allMatchesCompleted,
    league.scoringSystem,
    updatePlayerStats,
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
      league.scoringSystem
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
  }, [currentEventDay, allMatchesCompleted, league.scoringSystem, getPlayerById]);

  // Get unique rounds in schedule
  const rounds = useMemo(() => {
    if (!currentEventDay) return [];
    const roundNumbers = [...new Set(currentEventDay.schedule.map(m => m.roundNumber))];
    return roundNumbers.sort((a, b) => a - b);
  }, [currentEventDay]);

  return {
    currentEventDay,
    scheduleProgress,
    allMatchesCompleted,
    availableForCheckIn,
    checkedInPlayersDetails,
    courtAssignmentsWithDetails,
    rounds,

    // Actions
    checkInPlayer,
    removeCheckIn,
    closeCheckInAndGenerateCourts,
    recordMatchScore,
    clearMatchScore,
    closeEventDay,

    // Queries
    getMatchesByCourt,
    getMatchesByRound,
    getLadderMovementPreview
  };
}

