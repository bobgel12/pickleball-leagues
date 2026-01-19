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
  canChangePartners,
  normalizePartnerPair,
  saveClubToLocalStorage,
  loadClubFromLocalStorage,
  clearClub,
  createDefaultClub,
  normalizeClub
} from '../utils/leagueStorage.js';
import { loadLeagueData, saveLeagueData, loadAllLeagues, createLeague as createLeagueApi, deleteLeague as deleteLeagueApi } from '../utils/apiStorage.js';
import {
  fetchClubById,
  fetchAllClubs,
  createClub as createClubApi,
  updateClub as updateClubApi,
  deleteClub as deleteClubApi,
  searchClubs
} from '../utils/clubApi.js';
import { LEAGUE_STATUS, EVENT_DAY_STATUS, DEFAULT_DUPR_RATING } from '../utils/constants.js';

export function useLeagueState() {
  const [league, setLeague] = useState(() => {
    // Start with default, will load from API if club is selected
    return createDefaultLeague();
  });

  // Multiple leagues support
  const [leagues, setLeagues] = useState([]); // Array of league metadata
  const [currentLeagueId, setCurrentLeagueId] = useState(null); // Currently selected league ID

  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef(null);

  const [club, setClub] = useState(() => {
    // Try to load from localStorage cache first (for immediate UI render)
    const loadedLeague = loadLeague();
    if (loadedLeague && loadedLeague.clubId) {
      const cachedClub = loadClubFromLocalStorage(loadedLeague.clubId);
      if (cachedClub) {
        return cachedClub;
      }
    }
    // Fallback to default club cache
    const defaultClub = loadClubFromLocalStorage();
    return defaultClub || null;
  });

  // Load club from database on mount if clubId exists
  useEffect(() => {
    if (league.clubId && (!club || club.id !== league.clubId)) {
      // Load from database asynchronously
      fetchClubById(league.clubId)
        .then((dbClub) => {
          if (dbClub) {
            setClub(dbClub);
            // Cache in localStorage
            saveClubToLocalStorage(dbClub);
          }
        })
        .catch((error) => {
          console.warn('Failed to load club from database, using cache:', error);
        });
    }
  }, [league.clubId]); // Only run when clubId changes

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

  // Load all leagues and current league from API on mount and when club slug changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // First, load all leagues metadata for the club
        const allLeagues = await loadAllLeagues();
        setLeagues(allLeagues || []);

        // Only load a specific league if we have a currentLeagueId set
        // Otherwise, show leagues dashboard first (user selects league)
        if (currentLeagueId && allLeagues && allLeagues.some(l => l.leagueId === currentLeagueId)) {
          const loaded = await loadLeagueData(currentLeagueId);
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
          }
        } else if (allLeagues && allLeagues.length === 0) {
          // No leagues exist yet, use default (but don't set currentLeagueId)
          const defaultLeague = createDefaultLeague();
          setLeague(defaultLeague);
          setCurrentLeagueId(null);
        } else {
          // Leagues exist but no currentLeagueId - keep league state but don't load specific league
          // User will select from dashboard
          // Use default league state for now
          const defaultLeague = createDefaultLeague();
          setLeague(defaultLeague);
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

    if (clubSlug) {
      loadData();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug]); // Only reload when club slug changes, not when currentLeagueId changes

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
        await saveLeagueData(league, league.leagueId || currentLeagueId);
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

  // Cache club in localStorage when it changes (database is primary)
  useEffect(() => {
    if (club) {
      saveClubToLocalStorage(club);
    }
  }, [club]);

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

  // Get player by ID (supports both UUID and numeric IDs for DB vs legacy leagues)
  const getPlayerById = useCallback((playerId) => {
    if (playerId == null) return null;
    const str = String(playerId);
    // UUID-style: contains hyphen; use string comparison
    if (str.includes('-')) {
      return league.registeredPlayers.find(p => p != null && p.id != null && String(p.id) === str) || null;
    }
    // Numeric: parseInt for consistent lookup
    const num = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;
    if (isNaN(num)) return null;
    return league.registeredPlayers.find(p => {
      if (p == null || p.id == null) return false;
      const pn = typeof p.id === 'string' && !String(p.id).includes('-') ? parseInt(p.id, 10) : p.id;
      return pn === num;
    }) || null;
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
      return { success: false, message: changeCheck.reason };
    }

    const result = autoAssignPartners(league);
    if (result.success) {
      setLeague(result.league);
    }
    return { success: result.success, message: result.message };
  }, [league]);

  // Check if partners can be changed
  const canModifyPartners = useCallback(() => {
    return canChangePartners(league);
  }, [league]);

  // ==========================================
  // CLUB MANAGEMENT (Database Integration)
  // ==========================================

  // Load club from database by ID
  const loadClubById = useCallback(async (clubId) => {
    try {
      const dbClub = await fetchClubById(clubId);
      if (dbClub) {
        setClub(dbClub);
        saveClubToLocalStorage(dbClub);
        return dbClub;
      }
      return null;
    } catch (error) {
      console.error('Error loading club from database:', error);
      // Fallback to cache
      const cached = loadClubFromLocalStorage(clubId);
      if (cached) {
        setClub(cached);
        return cached;
      }
      return null;
    }
  }, []);

  // Fetch all clubs from database
  const fetchClubs = useCallback(async () => {
    try {
      const clubs = await fetchAllClubs();
      return clubs;
    } catch (error) {
      console.error('Error fetching clubs from database:', error);
      return [];
    }
  }, []);

  // Create new club in database
  const createClub = useCallback(async (clubData) => {
    try {
      const newClub = await createClubApi(clubData);
      setClub(newClub);
      
      // Link club to league
      if (!league.clubId && newClub.id) {
        setLeague(prev => ({
          ...prev,
          clubId: newClub.id
        }));
      }
      
      return newClub;
    } catch (error) {
      console.error('Error creating club in database:', error);
      throw error;
    }
  }, [league.clubId]);

  // Update club in database
  const updateClub = useCallback(async (clubId, clubData) => {
    try {
      const updatedClub = await updateClubApi(clubId, clubData);
      setClub(updatedClub);
      saveClubToLocalStorage(updatedClub);
      
      // Ensure club is linked to league
      if (!league.clubId && updatedClub.id) {
        setLeague(prev => ({
          ...prev,
          clubId: updatedClub.id
        }));
      }
      
      return updatedClub;
    } catch (error) {
      console.error('Error updating club in database:', error);
      // Fallback: update local state and cache
      const updatedClub = { ...club, ...clubData, updatedAt: Date.now() };
      setClub(updatedClub);
      saveClubToLocalStorage(updatedClub);
      throw error;
    }
  }, [club, league.clubId]);

  // Update club information (convenience wrapper - creates if doesn't exist)
  const updateOrCreateClub = useCallback(async (clubData) => {
    if (club && club.id) {
      // Update existing club
      return await updateClub(club.id, clubData);
    } else {
      // Create new club
      return await createClub(clubData);
    }
  }, [club, updateClub, createClub]);

  // Set club for league (by ID - assumes club exists in database)
  const setLeagueClub = useCallback(async (clubId) => {
    setLeague(prev => ({
      ...prev,
      clubId
    }));
    
    // Load club from database
    if (clubId) {
      await loadClubById(clubId);
    } else {
      setClub(null);
    }
  }, [loadClubById]);

  // Get club information (returns current club state)
  const getClub = useCallback(() => {
    return club;
  }, [club]);

  // Search clubs in database
  const searchClubsInDatabase = useCallback(async (query) => {
    try {
      const clubs = await searchClubs(query);
      return clubs;
    } catch (error) {
      console.error('Error searching clubs:', error);
      return [];
    }
  }, []);

  // Clear club information
  const resetClub = useCallback(async () => {
    try {
      if (club && club.id) {
        await deleteClubApi(club.id);
      }
    } catch (error) {
      console.error('Error deleting club from database:', error);
    }
    
    clearClub();
    setClub(null);
    setLeague(prev => ({
      ...prev,
      clubId: null
    }));
  }, [club]);

  // Record a partner pair matchup (when Round 1 match is scored)
  const recordPartnerMatchup = useCallback((eventDayId, courtIndex, pair1Ids, pair2Ids) => {
    setLeague(prev => {
      const newMatchup = {
        pair1: normalizePartnerPair(pair1Ids[0], pair1Ids[1]),
        pair2: normalizePartnerPair(pair2Ids[0], pair2Ids[1]),
        eventDayId,
        courtIndex,
        createdAt: Date.now()
      };

      return {
        ...prev,
        partnerMatchups: [
          ...(prev.partnerMatchups || []),
          newMatchup
        ]
      };
    });

    return true;
  }, []);

  // ==========================================
  // MULTIPLE LEAGUES MANAGEMENT
  // ==========================================

  // Load all leagues for current club
  const loadAllLeaguesForClub = useCallback(async () => {
    try {
      const allLeagues = await loadAllLeagues(); // Uses clubSlug from getClubSlug internally
      setLeagues(allLeagues || []);
      return allLeagues || [];
    } catch (error) {
      console.error('Error loading all leagues:', error);
      setLeagues([]);
      return [];
    }
  }, []);

  // Switch to a different league
  const switchLeague = useCallback(async (leagueId) => {
    if (!leagueId) {
      console.warn('Cannot switch to league: leagueId is required');
      return false;
    }

    setIsLoading(true);
    try {
      const loaded = await loadLeagueData(leagueId);
      if (loaded) {
        const normalized = normalizeLeagueState(loaded);
        setLeague(normalized);
        setCurrentLeagueId(leagueId);
        
        // Update counters
        if (normalized.registeredPlayers.length > 0) {
          const maxPlayerId = Math.max(...normalized.registeredPlayers.map(p => p.id));
          setPlayerIdCounter(maxPlayerId + 1);
        }
        if (normalized.eventDays.length > 0) {
          const maxDayId = Math.max(...normalized.eventDays.map(d => d.id));
          setEventDayIdCounter(maxDayId + 1);
        }

        // Refresh leagues list
        await loadAllLeaguesForClub();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error switching league:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadAllLeaguesForClub]);

  // Create a new league
  const createNewLeague = useCallback(async (leagueName, description = null, template = null) => {
    if (!leagueName || typeof leagueName !== 'string' || leagueName.trim() === '') {
      throw new Error('League name is required');
    }

    try {
      const overrides = {
        clubId: club?.id || league.clubId,
        leagueName: leagueName.trim(),
        description: description || null,
        name: leagueName.trim(),
      };
      if (template) {
        if (template.schedule) overrides.schedule = template.schedule;
        if (template.format) overrides.format = template.format;
        if (template.leagueMode) overrides.leagueMode = template.leagueMode;
        if (template.moneyRoundEnabled !== undefined) overrides.moneyRoundEnabled = template.moneyRoundEnabled;
        if (template.totalEventDays !== undefined) overrides.totalEventDays = template.totalEventDays;
        if (template.maxPlayersPerDay !== undefined) overrides.maxPlayersPerDay = template.maxPlayersPerDay;
      }
      const defaultLeagueData = createDefaultLeague(overrides);

      // Create league in database
      const newLeague = await createLeagueApi(leagueName.trim(), description, defaultLeagueData);
      
      // Update local state
      const normalized = normalizeLeagueState({
        ...defaultLeagueData,
        leagueId: newLeague.leagueId || newLeague.league_id,
        leagueName: newLeague.leagueName || newLeague.league_name
      });
      
      setLeague(normalized);
      setCurrentLeagueId(newLeague.leagueId || newLeague.league_id);
      
      // Refresh leagues list
      const allLeagues = await loadAllLeaguesForClub();
      
      return {
        success: true,
        league: newLeague
      };
    } catch (error) {
      console.error('Error creating league:', error);
      throw error;
    }
  }, [club, league.clubId, loadAllLeaguesForClub]);

  // Delete a league
  const deleteLeague = useCallback(async (leagueId) => {
    if (!leagueId) {
      throw new Error('leagueId is required');
    }

    try {
      await deleteLeagueApi(leagueId);
      
      // Refresh leagues list
      const allLeagues = await loadAllLeaguesForClub();
      
      // If we deleted the current league, switch to first available or reset
      if (currentLeagueId === leagueId) {
        if (allLeagues && allLeagues.length > 0) {
          await switchLeague(allLeagues[0].leagueId);
        } else {
          // No leagues left, reset to default
          const defaultLeague = createDefaultLeague({
            clubId: club?.id || league.clubId
          });
          setLeague(defaultLeague);
          setCurrentLeagueId(null);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting league:', error);
      throw error;
    }
  }, [currentLeagueId, club, league.clubId, loadAllLeaguesForClub, switchLeague]);

  // Update league name
  const updateLeagueName = useCallback(async (leagueId, newName, description = null) => {
    if (!leagueId) {
      throw new Error('leagueId is required');
    }
    if (!newName || typeof newName !== 'string' || newName.trim() === '') {
      throw new Error('League name is required');
    }

    // Get master key from sessionStorage (admin must be logged in)
    const getStoredMasterKey = () => {
      if (typeof window === 'undefined' || !clubSlug) return null;
      try {
        const key = `pickleball_admin_auth_${clubSlug}`;
        const authData = sessionStorage.getItem(key);
        if (!authData) return null;
        const parsed = JSON.parse(authData);
        return parsed.masterKey || null;
      } catch {
        return null;
      }
    };

    const masterKey = getStoredMasterKey();
    if (!masterKey) {
      throw new Error('Admin access required. Please enter admin mode.');
    }

    try {
      // Update league name via API
      const response = await fetch(`${getApiBase()}/${clubSlug}/league`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId,
          leagueName: newName.trim(),
          description: description !== undefined ? description : null,
          masterKey: masterKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update league name: ${response.statusText}`);
      }

      // Update local state
      setLeague(prev => ({
        ...prev,
        leagueName: newName.trim(),
        description: description !== undefined ? description : prev.description
      }));

      // Refresh leagues list
      await loadAllLeaguesForClub();
      
      return { success: true };
    } catch (error) {
      console.error('Error updating league name:', error);
      throw error;
    }
  }, [clubSlug, loadAllLeaguesForClub]);

  // Helper function to get API base URL
  const getApiBase = useCallback(() => {
    // Use the same logic as apiStorage
    if (typeof window !== 'undefined') {
      const stagingApiUrl = import.meta.env.VITE_STAGING_API_URL;
      if (stagingApiUrl) {
        return stagingApiUrl.endsWith('/api/clubs') 
          ? stagingApiUrl 
          : `${stagingApiUrl.replace(/\/$/, '')}/api/clubs`;
      }
      const prodApiUrl = import.meta.env.VITE_API_BASE_URL;
      if (prodApiUrl) {
        return prodApiUrl.endsWith('/api/clubs') 
          ? prodApiUrl 
          : `${prodApiUrl.replace(/\/$/, '')}/api/clubs`;
      }
      return `${window.location.origin}/api/clubs`;
    }
    return '/api/clubs';
  }, []);

  return {
    league,
    currentEventDay,
    standings,
    pointsLeader,
    winPercentageLeader,
    canRegisterPlayers,

    // Multiple leagues support
    leagues,
    currentLeagueId,
    loadAllLeagues: loadAllLeaguesForClub,
    switchLeague,
    createNewLeague,
    deleteLeague,
    updateLeagueName,

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
    canModifyPartners,
    recordPartnerMatchup,

    // Club Management (Database Integration)
    club,
    getClub,
    createClub,
    updateClub,
    updateOrCreateClub,
    loadClubById,
    setLeagueClub,
    resetClub,
    fetchClubs,
    searchClubsInDatabase
  };
}

