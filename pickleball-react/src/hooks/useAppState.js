import { useState, useEffect, useCallback, useRef } from 'react';
import { Storage } from '../utils/storage.js';
import { loadTournamentData, saveTournamentData } from '../utils/apiStorage.js';
import { createDefaultState, normalizeStateStructure, generateTournamentName, createDefaultTournament } from '../utils/helpers.js';

export function useAppState() {
  const [state, setState] = useState(() => {
    // Start with default state, will load from API if club is selected
    const defaultState = createDefaultState();
    if (defaultState.tournaments.length === 0) {
      const firstTournament = createDefaultTournament({ id: 1, name: "Tournament 1" });
      defaultState.tournaments.push(firstTournament);
      defaultState.activeTournamentId = firstTournament.id;
    }
    return defaultState;
  });

  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef(null);
  
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
        const loaded = await loadTournamentData();
        if (loaded) {
          const normalized = normalizeStateStructure(loaded);
          setState(normalized);
        } else {
          // Fallback to localStorage if no API data
          const localData = Storage.load();
          if (localData) {
            const normalized = normalizeStateStructure(localData);
            setState(normalized);
          }
        }
      } catch (error) {
        console.error('Error loading tournament data:', error);
        // Fallback to localStorage
        const localData = Storage.load();
        if (localData) {
          const normalized = normalizeStateStructure(localData);
          setState(normalized);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [clubSlug]);

  // Auto-save on state changes (debounced)
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save to localStorage immediately (fallback)
    Storage.save(state);

    // Debounce API save to avoid too many requests
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveTournamentData(state);
      } catch (error) {
        console.error('Error saving tournament data to API:', error);
        // localStorage already saved as fallback
      }
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, isLoading]);

  const ensureActiveTournament = useCallback(() => {
    setState(prev => {
      if (!Array.isArray(prev.tournaments) || prev.tournaments.length === 0) {
        const firstTournament = createDefaultTournament({ id: 1, name: "Tournament 1" });
        return {
          ...prev,
          tournaments: [firstTournament],
          activeTournamentId: firstTournament.id
        };
      }
      const currentActiveId = Number(prev.activeTournamentId);
      if (!prev.tournaments.some(t => t.id === currentActiveId)) {
        return {
          ...prev,
          activeTournamentId: prev.tournaments[0].id
        };
      }
      return prev;
    });
  }, []);

  const generateTournamentId = useCallback(() => {
    let newId;
    setState(prev => {
      if (!Number.isFinite(prev.tournamentCounter) || prev.tournamentCounter <= 0) {
        newId = 1;
        return { ...prev, tournamentCounter: 2 };
      }
      newId = prev.tournamentCounter;
      return { ...prev, tournamentCounter: prev.tournamentCounter + 1 };
    });
    return newId;
  }, []);

  const generatePlayerId = useCallback(() => {
    let newId;
    setState(prev => {
      if (!Number.isFinite(prev.playerCounter) || prev.playerCounter <= 0) {
        newId = 1;
        return { ...prev, playerCounter: 2 };
      }
      newId = prev.playerCounter;
      return { ...prev, playerCounter: prev.playerCounter + 1 };
    });
    return newId;
  }, []);

  const addTournament = useCallback((name) => {
    setState(prev => {
      const newId = generateTournamentId();
      const tournamentName = name || generateTournamentName(prev.tournaments);
      const reference = prev.tournaments.find(t => t.id === prev.activeTournamentId);
      const newTournament = createDefaultTournament({
        id: newId,
        name: tournamentName,
        scoringSystem: reference?.scoringSystem || "court"
      });
      return {
        ...prev,
        tournaments: [...prev.tournaments, newTournament],
        activeTournamentId: newId
      };
    });
  }, [generateTournamentId]);

  const removeTournament = useCallback((tournamentId) => {
    setState(prev => {
      if (prev.tournaments.length <= 1) {
        return prev; // Don't allow removing the last tournament
      }
      const removedId = Number(tournamentId);
      const filtered = prev.tournaments.filter(t => t.id !== removedId);
      let newActiveId = Number(prev.activeTournamentId);
      if (!Number.isFinite(newActiveId)) {
        newActiveId = null;
      }
      if (newActiveId === removedId) {
        newActiveId = filtered[0]?.id ?? null;
      }
      return {
        ...prev,
        tournaments: filtered,
        activeTournamentId: newActiveId
      };
    });
  }, []);

  const setActiveTournament = useCallback((tournamentId) => {
    const id = Number(tournamentId);
    console.log('[useAppState] setActiveTournament called with:', tournamentId, 'converted to:', id);
    if (!Number.isFinite(id) || id <= 0) {
      console.warn('[useAppState] Invalid tournament ID:', tournamentId);
      return;
    }
    setState(prev => {
      console.log('[useAppState] Current state - activeTournamentId:', prev.activeTournamentId, 'tournaments:', prev.tournaments.map(t => ({ id: t.id, name: t.name })));
      // Verify the tournament exists
      const tournamentExists = prev.tournaments.some(t => t.id === id);
      if (!tournamentExists) {
        console.warn('[useAppState] Tournament not found:', id, 'Available tournaments:', prev.tournaments.map(t => ({ id: t.id, name: t.name })));
        return prev;
      }
      const prevActiveId = Number(prev.activeTournamentId);
      if (Number.isFinite(prevActiveId) && prevActiveId === id) {
        // Already active, no need to update
        console.log('[useAppState] Tournament already active:', id);
        return prev;
      }
      console.log('[useAppState] Setting active tournament to:', id, 'from:', prev.activeTournamentId);
      const newState = {
        ...prev,
        activeTournamentId: id
      };
      console.log('[useAppState] New state will have activeTournamentId:', newState.activeTournamentId);
      return newState;
    });
  }, []);

  const updateTournament = useCallback((tournamentId, updater) => {
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(t =>
        t.id === tournamentId ? updater(t) : t
      )
    }));
  }, []);

  const importState = useCallback((data) => {
    const normalized = normalizeStateStructure(data);
    setState(normalized);
    ensureActiveTournament();
  }, [ensureActiveTournament]);

  const clearState = useCallback(() => {
    Storage.clear();
    const defaultState = createDefaultState();
    const firstTournament = createDefaultTournament({ id: 1, name: "Tournament 1" });
    defaultState.tournaments.push(firstTournament);
    defaultState.activeTournamentId = firstTournament.id;
    setState(defaultState);
  }, []);

  // Compute currentTournament reactively based on state
  const currentTournament = state.tournaments.find(t => t.id === state.activeTournamentId) ||
    (state.tournaments.length > 0 ? state.tournaments[0] : null);

  useEffect(() => {
    ensureActiveTournament();
  }, [ensureActiveTournament]);

  // Ensure activeTournamentId is valid when tournaments change
  useEffect(() => {
    if (state.tournaments.length > 0) {
      const activeExists = state.tournaments.some(t => t.id === state.activeTournamentId);
      if (!activeExists && state.activeTournamentId != null) {
        console.log('[useAppState] Active tournament not found, switching to first tournament');
        setState(prev => ({
          ...prev,
          activeTournamentId: prev.tournaments[0]?.id || null
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tournaments.length, state.activeTournamentId]); // Only check when tournaments count or active ID changes

  return {
    state,
    currentTournament,
    tournaments: state.tournaments,
    activeTournamentId: state.activeTournamentId,
    generateTournamentId,
    generatePlayerId,
    addTournament,
    removeTournament,
    setActiveTournament,
    updateTournament,
    importState,
    clearState,
    ensureActiveTournament
  };
}

