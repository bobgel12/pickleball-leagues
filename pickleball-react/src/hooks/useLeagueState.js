/**
 * useLeagueState - State management hook for Ladder League
 */

import { useState, useEffect, useCallback } from 'react';
import {
  saveLeague,
  loadLeague,
  clearLeague,
  createDefaultLeague,
  createLeaguePlayer,
  createEventDay,
  normalizeLeagueState,
  getLeagueStandings,
  getCurrentEventDay,
  canStartNewEventDay,
  downloadLeagueExport,
  importLeagueFromJSON
} from '../utils/leagueStorage.js';
import { LEAGUE_STATUS, EVENT_DAY_STATUS, DEFAULT_DUPR_RATING } from '../utils/constants.js';

export function useLeagueState() {
  const [league, setLeague] = useState(() => {
    const loaded = loadLeague();
    return loaded || createDefaultLeague();
  });

  const [playerIdCounter, setPlayerIdCounter] = useState(() => {
    const loaded = loadLeague();
    if (loaded && loaded.registeredPlayers.length > 0) {
      const maxId = Math.max(...loaded.registeredPlayers.map(p => p.id));
      return maxId + 1;
    }
    return 1;
  });

  const [eventDayIdCounter, setEventDayIdCounter] = useState(() => {
    const loaded = loadLeague();
    if (loaded && loaded.eventDays.length > 0) {
      const maxId = Math.max(...loaded.eventDays.map(d => d.id));
      return maxId + 1;
    }
    return 1;
  });

  // Auto-save on league changes
  useEffect(() => {
    saveLeague(league);
  }, [league]);

  // Generate unique player ID
  const generatePlayerId = useCallback(() => {
    const id = playerIdCounter;
    setPlayerIdCounter(prev => prev + 1);
    return id;
  }, [playerIdCounter]);

  // Generate unique event day ID
  const generateEventDayId = useCallback(() => {
    const id = eventDayIdCounter;
    setEventDayIdCounter(prev => prev + 1);
    return id;
  }, [eventDayIdCounter]);

  // Create a new league
  const createLeague = useCallback((config = {}) => {
    const newLeague = createDefaultLeague({
      ...config,
      id: Date.now(),
      createdAt: Date.now()
    });
    setLeague(newLeague);
    setPlayerIdCounter(1);
    setEventDayIdCounter(1);
    return newLeague;
  }, []);

  // Update league configuration
  const updateLeagueConfig = useCallback((updates) => {
    setLeague(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Set league status
  const setLeagueStatus = useCallback((status) => {
    setLeague(prev => ({
      ...prev,
      status
    }));
  }, []);

  // Register a new player
  const registerPlayer = useCallback((name, duprRating = DEFAULT_DUPR_RATING) => {
    const id = generatePlayerId();
    const player = createLeaguePlayer(id, name, duprRating);
    
    setLeague(prev => {
      if (prev.registeredPlayers.length >= prev.maxPlayers) {
        console.warn('Maximum players reached');
        return prev;
      }
      return {
        ...prev,
        registeredPlayers: [...prev.registeredPlayers, player]
      };
    });

    return player;
  }, [generatePlayerId]);

  // Register multiple players at once
  const registerPlayers = useCallback((players) => {
    setLeague(prev => {
      const availableSlots = prev.maxPlayers - prev.registeredPlayers.length;
      const newPlayers = players.slice(0, availableSlots).map((p, index) => {
        const id = playerIdCounter + index;
        return createLeaguePlayer(id, p.name, p.duprRating || DEFAULT_DUPR_RATING);
      });
      
      setPlayerIdCounter(prev => prev + newPlayers.length);
      
      return {
        ...prev,
        registeredPlayers: [...prev.registeredPlayers, ...newPlayers]
      };
    });
  }, [playerIdCounter]);

  // Remove a player
  const removePlayer = useCallback((playerId) => {
    setLeague(prev => ({
      ...prev,
      registeredPlayers: prev.registeredPlayers.filter(p => p.id !== playerId)
    }));
  }, []);

  // Update a player
  const updatePlayer = useCallback((playerId, updates) => {
    setLeague(prev => ({
      ...prev,
      registeredPlayers: prev.registeredPlayers.map(p =>
        p.id === playerId ? { ...p, ...updates } : p
      )
    }));
  }, []);

  // Get player by ID
  const getPlayerById = useCallback((playerId) => {
    return league.registeredPlayers.find(p => p.id === playerId);
  }, [league.registeredPlayers]);

  // Start a new event day
  const startEventDay = useCallback(() => {
    if (!canStartNewEventDay(league)) {
      console.warn('Cannot start new event day');
      return null;
    }

    const id = generateEventDayId();
    const dayNumber = league.eventDays.length + 1;
    const newDay = createEventDay(id, dayNumber);
    newDay.status = EVENT_DAY_STATUS.CHECKIN;
    newDay.date = Date.now();

    setLeague(prev => ({
      ...prev,
      eventDays: [...prev.eventDays, newDay],
      currentEventDayIndex: prev.eventDays.length,
      status: LEAGUE_STATUS.ACTIVE
    }));

    return newDay;
  }, [league, generateEventDayId]);

  // Update an event day
  const updateEventDay = useCallback((dayId, updates) => {
    setLeague(prev => ({
      ...prev,
      eventDays: prev.eventDays.map(d =>
        d.id === dayId ? { ...d, ...updates } : d
      )
    }));
  }, []);

  // Get current event day
  const currentEventDay = getCurrentEventDay(league);

  // Complete an event day
  const completeEventDay = useCallback((dayId, ladderMovement) => {
    setLeague(prev => {
      const updatedEventDays = prev.eventDays.map(d =>
        d.id === dayId
          ? {
              ...d,
              status: EVENT_DAY_STATUS.COMPLETED,
              completedAt: Date.now(),
              ladderMovement
            }
          : d
      );

      // Check if league is completed
      const completedDays = updatedEventDays.filter(d => d.status === EVENT_DAY_STATUS.COMPLETED).length;
      const newStatus = completedDays >= prev.totalEventDays
        ? LEAGUE_STATUS.COMPLETED
        : prev.status;

      return {
        ...prev,
        eventDays: updatedEventDays,
        status: newStatus
      };
    });
  }, []);

  // Update player stats after an event day
  const updatePlayerStats = useCallback((playerId, stats) => {
    setLeague(prev => ({
      ...prev,
      registeredPlayers: prev.registeredPlayers.map(p =>
        p.id === playerId
          ? {
              ...p,
              cumulativePoints: (p.cumulativePoints || 0) + (stats.points || 0),
              totalWins: (p.totalWins || 0) + (stats.wins || 0),
              totalLosses: (p.totalLosses || 0) + (stats.losses || 0),
              pointsScored: (p.pointsScored || 0) + (stats.pointsScored || 0),
              pointsAllowed: (p.pointsAllowed || 0) + (stats.pointsAllowed || 0),
              eventDaysAttended: (p.eventDaysAttended || 0) + 1,
              courtHistory: [
                ...(p.courtHistory || []),
                ...(stats.courtHistory || [])
              ],
              ladderPositionHistory: [
                ...(p.ladderPositionHistory || []),
                ...(stats.ladderPositionHistory || [])
              ]
            }
          : p
      )
    }));
  }, []);

  // Get league standings
  const standings = getLeagueStandings(league);

  // Export league
  const exportLeague = useCallback(() => {
    return downloadLeagueExport(league);
  }, [league]);

  // Import league
  const importLeague = useCallback((data) => {
    try {
      const imported = importLeagueFromJSON(data);
      setLeague(imported);
      
      // Update counters
      if (imported.registeredPlayers.length > 0) {
        const maxPlayerId = Math.max(...imported.registeredPlayers.map(p => p.id));
        setPlayerIdCounter(maxPlayerId + 1);
      }
      if (imported.eventDays.length > 0) {
        const maxDayId = Math.max(...imported.eventDays.map(d => d.id));
        setEventDayIdCounter(maxDayId + 1);
      }
      
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }, []);

  // Reset league
  const resetLeague = useCallback(() => {
    clearLeague();
    const newLeague = createDefaultLeague();
    setLeague(newLeague);
    setPlayerIdCounter(1);
    setEventDayIdCounter(1);
  }, []);

  // Check if can register more players
  const canRegisterPlayers = league.registeredPlayers.length < league.maxPlayers;

  // Get points leader
  const pointsLeader = standings.length > 0 ? standings[0] : null;

  // Get win percentage leader
  const winPercentageLeader = [...standings]
    .filter(p => p.totalWins + p.totalLosses >= 5) // Minimum games requirement
    .sort((a, b) => b.winPercentage - a.winPercentage)[0] || null;

  return {
    league,
    currentEventDay,
    standings,
    pointsLeader,
    winPercentageLeader,
    canRegisterPlayers,

    // League actions
    createLeague,
    updateLeagueConfig,
    setLeagueStatus,
    resetLeague,

    // Player actions
    registerPlayer,
    registerPlayers,
    removePlayer,
    updatePlayer,
    getPlayerById,
    updatePlayerStats,

    // Event day actions
    startEventDay,
    updateEventDay,
    completeEventDay,

    // Export/Import
    exportLeague,
    importLeague
  };
}

