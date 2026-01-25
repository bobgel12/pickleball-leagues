import { useCallback } from 'react';
import { MIN_DUPR_RATING, MAX_DUPR_RATING, DEFAULT_DUPR_RATING } from '../utils/constants.js';
import { recalculatePointsFromMatches } from '../utils/scoring.js';
import { randomName } from '../utils/seeding.js';

export function useTournament(appState) {
  const { currentTournament, updateTournament } = appState;
  const generatePlayerId = appState.generatePlayerId;

  const getPlayerById = useCallback((id) => {
    if (!currentTournament) return undefined;
    // Normalize ID to number for consistent comparison
    const normalizedId = Number(id);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      console.warn('getPlayerById: Invalid ID provided:', id, typeof id);
      return undefined;
    }
    const player = currentTournament.players.find(p => p.id === normalizedId);
    if (!player) {
      console.warn('getPlayerById: Player not found for ID:', normalizedId, 'Available IDs:', currentTournament.players.map(p => p.id));
    }
    return player;
  }, [currentTournament]);

  const setPlayerPoints = useCallback((playerId, points) => {
    updateTournament(currentTournament.id, (tournament) => ({
      ...tournament,
      players: tournament.players.map(p =>
        p.id === playerId ? { ...p, points } : p
      )
    }));
  }, [currentTournament, updateTournament]);

  const setPlayerSeed = useCallback((playerId, seed) => {
    updateTournament(currentTournament.id, (tournament) => ({
      ...tournament,
      players: tournament.players.map(p =>
        p.id === playerId ? { ...p, seed } : p
      )
    }));
  }, [currentTournament, updateTournament]);

  const addPlayer = useCallback((name, seed, options = {}) => {
    if (!name || !name.trim()) return null;
    const s = Number(seed);
    const duprScore = Number.isFinite(s)
      ? Math.max(MIN_DUPR_RATING, Math.min(MAX_DUPR_RATING, Math.round(s * 1000) / 1000))
      : DEFAULT_DUPR_RATING;
    const newId = generatePlayerId();
    const newPlayer = {
      id: newId,
      name: name.trim(),
      seed: duprScore,
      points: 0,
      duprId: options.duprId || null
    };

    updateTournament(currentTournament.id, (tournament) => ({
      ...tournament,
      players: [...tournament.players, newPlayer]
    }));

    return newPlayer;
  }, [currentTournament, updateTournament, generatePlayerId]);

  const addRandomPlayer = useCallback(() => {
    const name = randomName();
    const rand = Math.random();
    let seed;
    if (rand < 0.05) {
      seed = 6.000 + Math.random() * 2.000;
    } else if (rand < 0.25) {
      seed = 4.500 + Math.random() * 1.500;
    } else if (rand < 0.70) {
      seed = 3.000 + Math.random() * 1.500;
    } else {
      seed = 2.000 + Math.random() * 1.000;
    }
    seed = Math.round(seed * 1000) / 1000;
    return addPlayer(name, seed);
  }, [addPlayer]);

  const removePlayer = useCallback((playerId) => {
    updateTournament(currentTournament.id, (tournament) => {
      const newPlayers = tournament.players.filter(p => p.id !== playerId);
      const newCourts = tournament.courts.map(c => c.filter(id => id !== playerId));
      const newLastPartners = { ...tournament.lastPartners };
      delete newLastPartners[playerId];
      Object.keys(newLastPartners).forEach(pid => {
        if (newLastPartners[pid] === playerId) {
          newLastPartners[pid] = null;
        }
      });
      return {
        ...tournament,
        players: newPlayers,
        courts: newCourts,
        lastPartners: newLastPartners
      };
    });
  }, [currentTournament, updateTournament]);

  const setMatchLimit = useCallback((limit) => {
    const v = Number(limit);
    updateTournament(currentTournament.id, (tournament) => ({
      ...tournament,
      matchLimit: Number.isFinite(v) && v > 0 ? Math.round(v) : null
    }));
  }, [currentTournament, updateTournament]);

  const setScoringSystem = useCallback((system) => {
    updateTournament(currentTournament.id, (tournament) => ({
      ...tournament,
      scoringSystem: system
    }));
    // Recalculate points with new system
    updateTournament(currentTournament.id, (tournament) => {
      recalculatePointsFromMatches(tournament, getPlayerById, setPlayerPoints);
      return tournament;
    });
  }, [currentTournament, updateTournament, getPlayerById, setPlayerPoints]);

  const setCourts = useCallback((courts) => {
    updateTournament(currentTournament.id, (tournament) => ({
      ...tournament,
      courts: courts
    }));
  }, [currentTournament, updateTournament]);

  const addMatch = useCallback((match) => {
    updateTournament(currentTournament.id, (tournament) => {
      const newMatches = [...tournament.matches, match];
      return {
        ...tournament,
        matches: newMatches,
        matchesPlayed: newMatches.length
      };
    });
  }, [currentTournament, updateTournament]);

  const setLastPartner = useCallback((playerId, partnerId) => {
    updateTournament(currentTournament.id, (tournament) => {
      const newPartners = { ...tournament.lastPartners };
      if (playerId != null) {
        newPartners[playerId] = partnerId ?? null;
      }
      return {
        ...tournament,
        lastPartners: newPartners
      };
    });
  }, [currentTournament, updateTournament]);

  const getLastPartner = useCallback((playerId) => {
    return currentTournament?.lastPartners?.[playerId] ?? null;
  }, [currentTournament]);

  const clearLastPartners = useCallback((playerIds) => {
    updateTournament(currentTournament.id, (tournament) => {
      const newPartners = { ...tournament.lastPartners };
      if (Array.isArray(playerIds)) {
        playerIds.forEach(id => {
          newPartners[id] = null;
        });
      } else {
        Object.keys(newPartners).forEach(id => {
          newPartners[id] = null;
        });
      }
      return {
        ...tournament,
        lastPartners: newPartners
      };
    });
  }, [currentTournament, updateTournament]);

  const resetLeague = useCallback(() => {
    updateTournament(currentTournament.id, (tournament) => ({
      ...tournament,
      players: tournament.players.map(p => ({ ...p, points: 0 })),
      matchesPlayed: 0,
      matches: [],
      tournamentStarted: false,
      lastPartners: {}
    }));
  }, [currentTournament, updateTournament]);

  const clearHistory = useCallback(() => {
    updateTournament(currentTournament.id, (tournament) => ({
      ...tournament,
      matches: [],
      matchesPlayed: 0
    }));
  }, [currentTournament, updateTournament]);

  const recalculatePoints = useCallback(() => {
    if (!currentTournament) return;
    updateTournament(currentTournament.id, (tournament) => {
      recalculatePointsFromMatches(tournament, getPlayerById, setPlayerPoints);
      return tournament;
    });
  }, [currentTournament, updateTournament, getPlayerById, setPlayerPoints]);

  return {
    tournament: currentTournament,
    getPlayerById,
    setPlayerPoints,
    setPlayerSeed,
    addPlayer,
    addRandomPlayer,
    removePlayer,
    setMatchLimit,
    setScoringSystem,
    setCourts,
    addMatch,
    setLastPartner,
    getLastPartner,
    clearLastPartners,
    resetLeague,
    clearHistory,
    recalculatePoints
  };
}

