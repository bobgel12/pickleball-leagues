/**
 * useLeagueState - State management hook for Ladder League
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  importLeagueFromJSON,
  getPartner,
  setPartner,
  validatePartnership,
  autoAssignPartners,
  canChangePartners
} from '../utils/leagueStorage.js';
import { loadLeagueData, saveLeagueData } from '../utils/apiStorage.js';
import { LEAGUE_STATUS, EVENT_DAY_STATUS, DEFAULT_DUPR_RATING } from '../utils/constants.js';

export function useLeagueState() {
  const [league, setLeague] = useState(() => {
    // Start with default, will load from API if club is selected
    return createDefaultLeague();
  });

  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef(null);

  const [playerIdCounter, setPlayerIdCounter] = useState(() => {
    return 1;
  });

  const [eventDayIdCounter, setEventDayIdCounter] = useState(() => {
    return 1;
  });

  // Track club slug to reload data when it changes
  const [clubSlug, setClubSlug] = useState(() => {
    return sessionStorage.getItem('pickleball_club_slug') ||
           localStorage.getItem('pickleball_club_slug') ||
           null;
  });

  // Watch for club slug changes in storage
  useEffect(() => {
    const checkClubSlug = () => {
      const currentSlug = sessionStorage.getItem('pickleball_club_slug') ||
                         localStorage.getItem('pickleball_club_slug') ||
                         null;
      if (currentSlug !== clubSlug) {
        setClubSlug(currentSlug);
      }
    };

    // Check immediately
    checkClubSlug();

    // Poll for changes (storage events don't work across tabs in all browsers)
    const interval = setInterval(checkClubSlug, 500);

    // Also listen to storage events
    const handleStorageChange = (e) => {
      if (e.key === 'pickleball_club_slug') {
        checkClubSlug();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clubSlug]);

  // Load from API on mount and when club slug changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const loaded = await loadLeagueData();
        if (loaded) {
          const normalized = normalizeLeagueState(loaded);
          setLeague(normalized);
          
          // Update counters
          if (normalized.registeredPlayers.length > 0) {
            const maxPlayerId = Math.max(...normalized.registeredPlayers.map(p => p.id));
            setPlayerIdCounter(maxPlayerId + 1);
          }
          if (normalized.eventDays.length > 0) {
            const maxDayId = Math.max(...normalized.eventDays.map(d => d.id));
            setEventDayIdCounter(maxDayId + 1);
          }
        } else {
          // Fallback to localStorage
          const localData = loadLeague();
          if (localData) {
            setLeague(localData);
            if (localData.registeredPlayers.length > 0) {
              const maxId = Math.max(...localData.registeredPlayers.map(p => p.id));
              setPlayerIdCounter(maxId + 1);
            }
            if (localData.eventDays.length > 0) {
              const maxId = Math.max(...localData.eventDays.map(d => d.id));
              setEventDayIdCounter(maxId + 1);
            }
          }
        }
      } catch (error) {
        console.error('Error loading league data:', error);
        // Fallback to localStorage
        const localData = loadLeague();
        if (localData) {
          setLeague(localData);
          if (localData.registeredPlayers.length > 0) {
            const maxId = Math.max(...localData.registeredPlayers.map(p => p.id));
            setPlayerIdCounter(maxId + 1);
          }
          if (localData.eventDays.length > 0) {
            const maxId = Math.max(...localData.eventDays.map(d => d.id));
            setEventDayIdCounter(maxId + 1);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [clubSlug]);

  // Auto-save on league changes (debounced)
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save to localStorage immediately (fallback)
    saveLeague(league);

    // Debounce API save to avoid too many requests
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveLeagueData(league);
      } catch (error) {
        console.error('Error saving league data to API:', error);
        // localStorage already saved as fallback
      }
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [league, isLoading]);

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
  const registerPlayer = useCallback((name, duprRating = DEFAULT_DUPR_RATING, gender = null) => {
    const id = generatePlayerId();
    const player = createLeaguePlayer(id, name, duprRating, gender);
    
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
        return createLeaguePlayer(id, p.name, p.duprRating || DEFAULT_DUPR_RATING, p.gender || null);
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

  // ==========================================
  // MONEY ROUND & PRIZE POOL MANAGEMENT
  // ==========================================

  // Update Money Round configuration
  const updateMoneyRoundConfig = useCallback((config) => {
    setLeague(prev => ({
      ...prev,
      moneyRoundEnabled: config.enabled !== undefined ? config.enabled : prev.moneyRoundEnabled,
      moneyRoundConfig: {
        ...prev.moneyRoundConfig,
        ...config
      }
    }));
  }, []);

  // Record a contribution to the prize pool
  const recordContribution = useCallback((eventDayId, playerId, amount) => {
    const contributionId = Date.now();
    
    setLeague(prev => {
      // Update prize pool
      const newContribution = {
        id: contributionId,
        eventDayId,
        playerId,
        amount,
        paid: false,
        paidAt: null,
        createdAt: Date.now()
      };

      const newPrizePool = {
        ...prev.prizePool,
        contributions: [...(prev.prizePool?.contributions || []), newContribution]
      };

      // Update player's money round stats
      const updatedPlayers = prev.registeredPlayers.map(p => {
        if (p.id !== playerId) return p;
        
        return {
          ...p,
          moneyRoundStats: {
            ...p.moneyRoundStats,
            totalContributions: (p.moneyRoundStats?.totalContributions || 0) + amount,
            contributionHistory: [
              ...(p.moneyRoundStats?.contributionHistory || []),
              { eventDayId, amount, date: Date.now() }
            ]
          }
        };
      });

      return {
        ...prev,
        prizePool: newPrizePool,
        registeredPlayers: updatedPlayers
      };
    });

    return contributionId;
  }, []);

  // Record multiple contributions at once (after Money Round completion)
  const recordContributions = useCallback((eventDayId, contributions) => {
    setLeague(prev => {
      const newContributions = contributions.map((c, index) => ({
        id: Date.now() + index,
        eventDayId,
        playerId: c.playerId,
        amount: c.contribution,
        courtIndex: c.courtIndex,
        rank: c.rank,
        paid: false,
        paidAt: null,
        createdAt: Date.now()
      }));

      // Update prize pool balance with unpaid amounts
      const totalUnpaid = newContributions.reduce((sum, c) => sum + c.amount, 0);

      const newPrizePool = {
        ...prev.prizePool,
        contributions: [...(prev.prizePool?.contributions || []), ...newContributions]
      };

      // Update each player's money round stats
      const updatedPlayers = prev.registeredPlayers.map(p => {
        const playerContribution = contributions.find(c => c.playerId === p.id);
        if (!playerContribution) return p;
        
        return {
          ...p,
          moneyRoundStats: {
            ...p.moneyRoundStats,
            totalContributions: (p.moneyRoundStats?.totalContributions || 0) + playerContribution.contribution,
            contributionHistory: [
              ...(p.moneyRoundStats?.contributionHistory || []),
              {
                eventDayId,
                courtIndex: playerContribution.courtIndex,
                rank: playerContribution.rank,
                amount: playerContribution.contribution,
                date: Date.now()
              }
            ]
          }
        };
      });

      return {
        ...prev,
        prizePool: newPrizePool,
        registeredPlayers: updatedPlayers
      };
    });
  }, []);

  // Mark a contribution as paid
  const markContributionPaid = useCallback((contributionId) => {
    setLeague(prev => {
      const contribution = prev.prizePool?.contributions?.find(c => c.id === contributionId);
      if (!contribution || contribution.paid) return prev;

      const newContributions = prev.prizePool.contributions.map(c =>
        c.id === contributionId
          ? { ...c, paid: true, paidAt: Date.now() }
          : c
      );

      // Update prize pool balance
      const newBalance = (prev.prizePool?.balance || 0) + contribution.amount;

      // Update player's paid total
      const updatedPlayers = prev.registeredPlayers.map(p => {
        if (p.id !== contribution.playerId) return p;
        return {
          ...p,
          moneyRoundStats: {
            ...p.moneyRoundStats,
            totalPaid: (p.moneyRoundStats?.totalPaid || 0) + contribution.amount
          }
        };
      });

      return {
        ...prev,
        prizePool: {
          ...prev.prizePool,
          balance: newBalance,
          contributions: newContributions
        },
        registeredPlayers: updatedPlayers
      };
    });
  }, []);

  // Mark a contribution as unpaid (undo payment)
  const markContributionUnpaid = useCallback((contributionId) => {
    setLeague(prev => {
      const contribution = prev.prizePool?.contributions?.find(c => c.id === contributionId);
      if (!contribution || !contribution.paid) return prev;

      const newContributions = prev.prizePool.contributions.map(c =>
        c.id === contributionId
          ? { ...c, paid: false, paidAt: null }
          : c
      );

      // Update prize pool balance
      const newBalance = Math.max(0, (prev.prizePool?.balance || 0) - contribution.amount);

      // Update player's paid total
      const updatedPlayers = prev.registeredPlayers.map(p => {
        if (p.id !== contribution.playerId) return p;
        return {
          ...p,
          moneyRoundStats: {
            ...p.moneyRoundStats,
            totalPaid: Math.max(0, (p.moneyRoundStats?.totalPaid || 0) - contribution.amount)
          }
        };
      });

      return {
        ...prev,
        prizePool: {
          ...prev.prizePool,
          balance: newBalance,
          contributions: newContributions
        },
        registeredPlayers: updatedPlayers
      };
    });
  }, []);

  // Record a payout from the prize pool
  const recordPayout = useCallback((playerId, amount, reason) => {
    const payoutId = Date.now();

    setLeague(prev => {
      const newBalance = Math.max(0, (prev.prizePool?.balance || 0) - amount);

      const newPayout = {
        id: payoutId,
        playerId,
        amount,
        reason,
        date: Date.now()
      };

      return {
        ...prev,
        prizePool: {
          ...prev.prizePool,
          balance: newBalance,
          payouts: [...(prev.prizePool?.payouts || []), newPayout]
        }
      };
    });

    return payoutId;
  }, []);

  // Get prize pool balance
  const getPrizePoolBalance = useCallback(() => {
    return league.prizePool?.balance || 0;
  }, [league.prizePool]);

  // Get total unpaid contributions
  const getTotalUnpaid = useCallback(() => {
    if (!league.prizePool?.contributions) return 0;
    return league.prizePool.contributions
      .filter(c => !c.paid)
      .reduce((sum, c) => sum + c.amount, 0);
  }, [league.prizePool]);

  // Get player's balance (what they owe)
  const getPlayerBalance = useCallback((playerId) => {
    if (!league.prizePool?.contributions) return { owed: 0, paid: 0 };
    
    const playerContributions = league.prizePool.contributions.filter(c => c.playerId === playerId);
    const owed = playerContributions.filter(c => !c.paid).reduce((sum, c) => sum + c.amount, 0);
    const paid = playerContributions.filter(c => c.paid).reduce((sum, c) => sum + c.amount, 0);
    
    return { owed, paid, total: owed + paid };
  }, [league.prizePool]);

  // Get all contributions for an event day
  const getEventDayContributions = useCallback((eventDayId) => {
    if (!league.prizePool?.contributions) return [];
    return league.prizePool.contributions.filter(c => c.eventDayId === eventDayId);
  }, [league.prizePool]);

  // Update player Money Round stats (wins/losses from Money Round matches)
  const updatePlayerMoneyRoundStats = useCallback((playerId, stats) => {
    setLeague(prev => ({
      ...prev,
      registeredPlayers: prev.registeredPlayers.map(p =>
        p.id === playerId
          ? {
              ...p,
              moneyRoundStats: {
                ...p.moneyRoundStats,
                totalWins: (p.moneyRoundStats?.totalWins || 0) + (stats.wins || 0),
                totalLosses: (p.moneyRoundStats?.totalLosses || 0) + (stats.losses || 0)
              }
            }
          : p
      )
    }));
  }, []);

  // ==========================================
  // PARTNER MANAGEMENT (Mixed Doubles)
  // ==========================================

  // Get partner for a player
  const getPlayerPartner = useCallback((playerId) => {
    return getPartner(league, playerId);
  }, [league]);

  // Set partner for two players
  const assignPartner = useCallback((playerId1, playerId2) => {
    const validation = validatePartnership(league, playerId1, playerId2);
    if (!validation.valid) {
      console.warn('Invalid partnership:', validation.error);
      return false;
    }

    const changeCheck = canChangePartners(league);
    if (!changeCheck.canChange) {
      console.warn('Cannot change partners:', changeCheck.reason);
      return false;
    }

    setLeague(prev => setPartner(prev, playerId1, playerId2));
    return true;
  }, [league]);

  // Remove partner for a player
  const removePartner = useCallback((playerId) => {
    const changeCheck = canChangePartners(league);
    if (!changeCheck.canChange) {
      console.warn('Cannot change partners:', changeCheck.reason);
      return false;
    }

    setLeague(prev => setPartner(prev, playerId, null));
    return true;
  }, [league]);

  // Auto-assign partners based on ladder position
  const autoAssignPartnersToLeague = useCallback(() => {
    const changeCheck = canChangePartners(league);
    if (!changeCheck.canChange) {
      console.warn('Cannot change partners:', changeCheck.reason);
      return false;
    }

    setLeague(prev => autoAssignPartners(prev));
    return true;
  }, [league]);

  // Check if partners can be changed
  const canModifyPartners = useCallback(() => {
    return canChangePartners(league);
  }, [league]);

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
    importLeague,

    // Money Round & Prize Pool
    updateMoneyRoundConfig,
    recordContribution,
    recordContributions,
    markContributionPaid,
    markContributionUnpaid,
    recordPayout,
    getPrizePoolBalance,
    getTotalUnpaid,
    getPlayerBalance,
    getEventDayContributions,
    updatePlayerMoneyRoundStats,

    // Partner Management (Mixed Doubles)
    getPlayerPartner,
    assignPartner,
    removePartner,
    autoAssignPartnersToLeague,
    canModifyPartners
  };
}

