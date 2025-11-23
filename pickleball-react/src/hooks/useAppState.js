import { useState, useEffect, useCallback } from 'react';
import { Storage } from '../utils/storage.js';
import { createDefaultState, normalizeStateStructure, generateTournamentName, createDefaultTournament } from '../utils/helpers.js';

export function useAppState() {
  const [state, setState] = useState(() => {
    const loaded = Storage.load();
    if (loaded) {
      return normalizeStateStructure(loaded);
    }
    const defaultState = createDefaultState();
    if (defaultState.tournaments.length === 0) {
      const firstTournament = createDefaultTournament({ id: 1, name: "Tournament 1" });
      defaultState.tournaments.push(firstTournament);
      defaultState.activeTournamentId = firstTournament.id;
    }
    return defaultState;
  });

  // Auto-save on state changes
  useEffect(() => {
    Storage.save(state);
  }, [state]);

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
      if (!prev.tournaments.some(t => t.id === prev.activeTournamentId)) {
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
      const filtered = prev.tournaments.filter(t => t.id !== tournamentId);
      let newActiveId = prev.activeTournamentId;
      if (newActiveId === tournamentId) {
        newActiveId = filtered[0]?.id || null;
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
      if (prev.activeTournamentId === id) {
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

