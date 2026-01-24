import React, { useEffect, useCallback, useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { useTournament } from './hooks/useTournament';
import { useStorage } from './hooks/useStorage';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useConfirmDialog } from './hooks/useConfirmDialog';
import { useLeagueState } from './hooks/useLeagueState';
import { useEventDay } from './hooks/useEventDay';
import { useClub } from './hooks/useClub';
import { useAdminAuth } from './hooks/useAdminAuth';
import ConfirmDialog from './components/ConfirmDialog';
import AdminLoginModal from './components/AdminLoginModal';
import ClubSelector from './components/ClubSelector';
import { parseScore, parseCSV } from './utils/csvParser';
import { calculateMatchAwards, applyAwards, recalculatePointsFromMatches } from './utils/scoring';
import {
  initialSeedCourts,
  gradualSeedCourts,
  classicSeedCourts,
  shufflePairsSameCourt,
  shuffle,
  arrangeCourtTeams
} from './utils/seeding';
import { generateTournamentName } from './utils/helpers';
import { MIN_DUPR_RATING, MAX_DUPR_RATING, DEFAULT_DUPR_RATING } from './utils/constants';
import Header from './components/Header';
import PlayerManagement from './components/PlayerManagement';
import PlayerList from './components/PlayerList';
import Courts from './components/Courts';
import Leaderboard from './components/Leaderboard';
import Summary from './components/Summary';
import MatchHistory from './components/MatchHistory';
import Statistics from './components/Statistics';
import Help from './components/Help';
import LegalDisclaimer from './components/LegalDisclaimer';
import ToastContainer from './components/ToastContainer';

// League Components
import {
  LeagueDashboard,
  LeaguesDashboard,
  LeagueSelector,
  LeagueManagementModal,
  LeagueSetup,
  EventDayManager,
  LeagueStandings,
  LeagueHelp,
  LeagueTemplateRulesHelp,
  PrizePoolDashboard
} from './components/league';

// Styles
import './styles/League.css';

function App() {
  const { clubSlug, isClubSelected, loading: clubLoading } = useClub();
  const adminAuth = useAdminAuth(clubSlug);
  const appState = useAppState();
  const tournament = useTournament(appState);
  const { exportState } = useStorage(appState.state);
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const confirmDialog = useConfirmDialog();

  // Section state: 'tournaments' or 'league'
  // Default to 'league' if not admin (viewer mode)
  const [activeSection, setActiveSection] = useState(() => {
    // Will be set properly after admin auth loads
    return 'league';
  });

  // Admin login modal state
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Update activeSection when admin status changes
  useEffect(() => {
    if (!adminAuth.isAdmin && activeSection === 'tournaments') {
      // If user is not admin and tries to access tournaments, switch to league
      setActiveSection('league');
    }
  }, [adminAuth.isAdmin, activeSection]);

  // League state
  const leagueState = useLeagueState();
  const eventDay = useEventDay(
    leagueState.league,
    leagueState.updateEventDay,
    leagueState.updatePlayerStats,
    leagueState.completeEventDay,
    leagueState.getPlayerById,
    leagueState.recordPartnerMatchup
  );

  // League navigation
  const [leagueView, setLeagueView] = useState('leagues'); // Start with leagues dashboard
  const [showLeagueModal, setShowLeagueModal] = useState(false);
  const [leagueModalMode, setLeagueModalMode] = useState('create'); // 'create' or 'edit'
  const [editingLeague, setEditingLeague] = useState(null);

  // Redirect from admin-only views when not in admin mode
  useEffect(() => {
    if (!adminAuth.isAdmin && (leagueView === 'setup' || leagueView === 'eventDay')) {
      setLeagueView('dashboard');
    }
  }, [adminAuth.isAdmin, leagueView]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'Enter': () => {
      // Submit round if all courts are ready (only in tournaments mode)
      if (activeSection === 'tournaments' && appState.currentTournament) {
        const allCourtsSubmitted = [0, 1, 2, 3].every(idx => {
          const court = appState.currentTournament.courts[idx] || [];
          const A = court.slice(0, 2);
          const B = court.slice(2, 4);
          if (A.length >= 2 && B.length >= 2) {
            return (appState.currentTournament.submittedCourts || []).includes(idx);
          }
          return true;
        });
        if (allCourtsSubmitted && appState.currentTournament.pendingScores) {
          handleSubmitRound(appState.currentTournament.pendingScores);
        }
      }
    },
  });

  // Recalculate points when tournament changes
  useEffect(() => {
    if (appState.currentTournament && appState.currentTournament.matches) {
      recalculatePointsFromMatches(
        appState.currentTournament,
        tournament.getPlayerById,
        tournament.setPlayerPoints
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.currentTournament?.matches?.length, appState.currentTournament?.scoringSystem]);

  const handleAddTournament = useCallback(() => {
    const defaultName = generateTournamentName(appState.tournaments);
    const providedName = window.prompt('Tournament name?', defaultName);
    const name = (providedName && providedName.trim()) ? providedName.trim() : defaultName;
    appState.addTournament(name);
    toast.success(`Tournament "${name}" created`);
  }, [appState, toast]);

  const handleRemoveTournament = useCallback(async () => {
    if (appState.tournaments.length <= 1) {
      toast.warning('At least one tournament must remain.');
      return;
    }
    const current = appState.currentTournament;
    if (!current) return;
    const confirmed = await confirmDialog.showConfirm({
      title: 'Remove Tournament',
      message: `Remove "${current.name}"? This cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (confirmed) {
      appState.removeTournament(current.id);
      toast.info(`Tournament "${current.name}" removed`);
    }
  }, [appState, toast, confirmDialog]);

  const handleImport = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid file');
        appState.importState(data);
        toast.success('Import successful!', { title: 'Data Imported' });
      } catch (err) {
        toast.error('Import failed: ' + err.message, { title: 'Import Error' });
      }
    };
    reader.readAsText(file);
  }, [appState, toast]);

  const handleImportCSV = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const playerNames = parseCSV(text);

        if (playerNames.length === 0) {
          toast.error('No players found in CSV file. Please check the file format.');
          return;
        }

        const defaultRating = window.prompt(
          `Found ${playerNames.length} players in CSV.\n\nEnter default DUPR rating (2.000-8.000) for all players:\n(Leave empty to use 4.500)`,
          '4.500'
        );

        let defaultSeed = DEFAULT_DUPR_RATING;
        if (defaultRating && defaultRating.trim()) {
          const rating = Number(defaultRating.trim());
          if (Number.isFinite(rating)) {
            defaultSeed = Math.max(MIN_DUPR_RATING, Math.min(MAX_DUPR_RATING, Math.round(rating * 1000) / 1000));
          }
        }

        const existingNames = new Set(appState.currentTournament?.players.map(p => p.name.toLowerCase()) || []);
        let added = 0;
        let skipped = 0;

        playerNames.forEach(name => {
          if (existingNames.has(name.toLowerCase())) {
            skipped++;
            return;
          }
          tournament.addPlayer(name, defaultSeed);
          existingNames.add(name.toLowerCase());
          added++;
        });

        if (added > 0) {
          toast.success(
            `Imported ${added} player${added !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : ''}`,
            { title: 'CSV Import' }
          );
        } else {
          toast.warning('All players from CSV already exist.');
        }
      } catch (err) {
        toast.error('CSV import failed: ' + err.message, { title: 'Import Error' });
      }
    };
    reader.readAsText(file);
  }, [appState, tournament]);

  const handleFairSeed = useCallback(() => {
    if (!appState.currentTournament) return;
    
    // Ensure all players have IDs before seeding
    let maxId = 0;
    appState.currentTournament.players.forEach(p => {
      if (p && p.id != null && Number.isFinite(Number(p.id))) {
        maxId = Math.max(maxId, Number(p.id));
      }
    });
    
    let nextId = maxId + 1;
    const playersWithIds = appState.currentTournament.players.map(p => {
      if (!p || p.id == null || !Number.isFinite(Number(p.id))) {
        console.warn(`Assigning ID ${nextId} to player without ID:`, p);
        return { ...p, id: nextId++ };
      }
      return p;
    });
    
    // Create a tournament object with updated players for seeding
    const tournamentForSeeding = {
      ...appState.currentTournament,
      players: playersWithIds
    };
    
    // Update tournament with players that have IDs (if needed)
    if (playersWithIds.length !== appState.currentTournament.players.length || 
        playersWithIds.some((p, i) => p.id !== appState.currentTournament.players[i]?.id)) {
      appState.updateTournament(appState.currentTournament.id, (t) => ({
        ...t,
        players: playersWithIds
      }));
    }
    
    const courts = initialSeedCourts(
      tournamentForSeeding,
      tournament.getPlayerById,
      tournament.setLastPartner,
      tournament.clearLastPartners,
      (courtIds) => arrangeCourtTeams(courtIds, tournament.getLastPartner)
    );
    
    // Final validation: ensure no duplicates in courts
    const allCourtPlayerIds = courts.flat();
    const uniqueIds = new Set(allCourtPlayerIds);
    if (allCourtPlayerIds.length !== uniqueIds.size) {
      console.error('CRITICAL: Duplicates found in seeded courts! Removing...', {
        total: allCourtPlayerIds.length,
        unique: uniqueIds.size
      });
      // Remove duplicates by keeping only first occurrence
      const seen = new Set();
      const cleanedCourts = courts.map(court => {
        return court.filter(id => {
          if (seen.has(id)) {
            console.warn(`Removing duplicate player ${id} from court`);
            return false;
          }
          seen.add(id);
          return true;
        });
      });
      tournament.setCourts(cleanedCourts);
    } else {
      tournament.setCourts(courts);
    }
    
    appState.updateTournament(appState.currentTournament.id, (t) => ({
      ...t,
      matchesPlayed: 0,
      matches: [],
      tournamentStarted: true,
      players: t.players.map(p => ({ ...p, points: 0 }))
    }));
    tournament.clearLastPartners();
  }, [appState, tournament]);

  const handleGradualSeed = useCallback(() => {
    if (!appState.currentTournament) return;
    const courts = gradualSeedCourts(
      appState.currentTournament,
      tournament.getPlayerById,
      tournament.setLastPartner,
      tournament.clearLastPartners,
      (courtIds) => arrangeCourtTeams(courtIds, tournament.getLastPartner)
    );
    tournament.setCourts(courts);
    appState.updateTournament(appState.currentTournament.id, (t) => ({
      ...t,
      matchesPlayed: 0,
      matches: [],
      tournamentStarted: true,
      players: t.players.map(p => ({ ...p, points: 0 }))
    }));
    tournament.clearLastPartners();
    const remaining = appState.currentTournament.players.length - 8;
    if (remaining > 0) {
      toast.info(`Gradual Start: Top 8 players on Courts 1-2. ${remaining} players will join as others are eliminated or after initial matches.`, { duration: 8000 });
    }
  }, [appState, tournament]);

  const handleClassicSeed = useCallback(() => {
    if (!appState.currentTournament) return;
    const courts = classicSeedCourts(
      appState.currentTournament,
      shuffle,
      (courtIds) => arrangeCourtTeams(courtIds, tournament.getLastPartner)
    );
    tournament.setCourts(courts);
    appState.updateTournament(appState.currentTournament.id, (t) => ({
      ...t,
      matchesPlayed: 0,
      matches: [],
      tournamentStarted: true,
      players: t.players.map(p => ({ ...p, points: 0 }))
    }));
    tournament.clearLastPartners();
  }, [appState, tournament]);

  const handleShufflePairs = useCallback(() => {
    if (!appState.currentTournament) return;
    const courts = shufflePairsSameCourt(
      appState.currentTournament,
      shuffle,
      (courtIds) => arrangeCourtTeams(courtIds, tournament.getLastPartner)
    );
    tournament.setCourts(courts);
  }, [appState, tournament]);

  const handleSubmitCourt = useCallback((courtIndex, score) => {
    if (!appState.currentTournament) return;
    const currentTournament = appState.currentTournament;
    if (currentTournament.matchLimit && currentTournament.matchesPlayed >= currentTournament.matchLimit) return;

    const court = currentTournament.courts[courtIndex] || [];
    const A = court.slice(0, 2);
    const B = court.slice(2, 4);

    if (A.length < 2 || B.length < 2) {
      toast.warning(`Court ${courtIndex + 1} does not have enough players (need 4 players).`);
      return;
    }

    // Just mark this court as submitted - don't process the match yet
    const submittedCourts = currentTournament.submittedCourts || [];
    if (!submittedCourts.includes(courtIndex)) {
      appState.updateTournament(currentTournament.id, (t) => ({
        ...t,
        submittedCourts: [...submittedCourts, courtIndex]
      }));
    }
  }, [appState]);

  const handleSubmitRound = useCallback((scores) => {
    if (!appState.currentTournament) return false;
    const currentTournament = appState.currentTournament;
    if (currentTournament.matchLimit && currentTournament.matchesPlayed >= currentTournament.matchLimit) return false;

    // Check if all courts have been submitted
    const submittedCourts = currentTournament.submittedCourts || [];
    const allCourtsSubmitted = [0, 1, 2, 3].every(idx => {
      const court = currentTournament.courts[idx] || [];
      const A = court.slice(0, 2);
      const B = court.slice(2, 4);
      // If court has 4 players, it must be submitted
      if (A.length >= 2 && B.length >= 2) {
        return submittedCourts.includes(idx);
      }
      // Empty courts don't need to be submitted
      return true;
    });

    if (!allCourtsSubmitted) {
      const missingCourts = [0, 1, 2, 3].filter(idx => {
        const court = currentTournament.courts[idx] || [];
        const A = court.slice(0, 2);
        const B = court.slice(2, 4);
        return A.length >= 2 && B.length >= 2 && !submittedCourts.includes(idx);
      });
      toast.warning(`Please submit scores for all courts before submitting the round. Missing: ${missingCourts.map(i => `Court ${i + 1}`).join(', ')}`);
      return false; // Return false to indicate failure
    }

    const roundResults = [];
    let hasValidScores = false;
    let hasInvalidScores = false;
    const errorMessages = [];

    for (let courtIndex = 0; courtIndex < 4; courtIndex++) {
      const court = currentTournament.courts[courtIndex] || [];
      const A = court.slice(0, 2);
      const B = court.slice(2, 4);

      if (A.length < 2 || B.length < 2) continue;

      const input = scores[courtIndex];
      if (!input || !input.trim()) {
        hasInvalidScores = true;
        errorMessages.push(`Court ${courtIndex + 1}: No score entered`);
        continue;
      }

      const parsed = parseScore(input);

      if (!parsed) {
        hasInvalidScores = true;
        errorMessages.push(`Court ${courtIndex + 1}: Invalid score format`);
        continue;
      }

      const scoreA = parsed.a;
      const scoreB = parsed.b;
      if (scoreA === scoreB) {
        hasInvalidScores = true;
        errorMessages.push(`Court ${courtIndex + 1}: Ties not supported`);
        continue;
      }

      const winner = (scoreA > scoreB) ? 'A' : 'B';
      roundResults.push({ courtIndex, winner, scoreA, scoreB, A, B });
      hasValidScores = true;
    }

    if (hasInvalidScores) {
      toast.error('Please fix these errors:\n' + errorMessages.join('\n'), { title: 'Validation Error', duration: 7000 });
      // Don't clear scores on error - return false to indicate failure
      return false;
    }

    if (!hasValidScores) {
      toast.warning('No valid matches to submit. Please enter scores for courts with 4 players.');
      // Don't clear scores on error - return false to indicate failure
      return false;
    }

    // Process all matches
    roundResults.forEach(result => {
      const court = currentTournament.courts[result.courtIndex] || [];
      const A = court.slice(0, 2);
      const B = court.slice(2, 4);
      const winners = (result.winner === 'A') ? A : B;
      const losers = (result.winner === 'A') ? B : A;

      if (winners.length === 2) {
        tournament.setLastPartner(winners[0], winners[1]);
        tournament.setLastPartner(winners[1], winners[0]);
      }
      if (losers.length === 2) {
        tournament.setLastPartner(losers[0], losers[1]);
        tournament.setLastPartner(losers[1], losers[0]);
      }

      const scoringSystem = appState.currentTournament.scoringSystem || 'simple';
      const scoringCourtIndex = 3 - result.courtIndex;
      const awards = calculateMatchAwards({
        system: scoringSystem,
        courtIndex: scoringCourtIndex,
        winner: result.winner,
        scoreA: result.scoreA,
        scoreB: result.scoreB,
        A,
        B
      }, tournament.getPlayerById);

      // Don't apply awards directly here - recalculatePointsFromMatches will handle it
      // This prevents double-counting since useEffect triggers recalculation after match is added

      // Add match
      tournament.addMatch({
        ts: Date.now(),
        court: result.courtIndex + 1,
        A: A.slice(),
        B: B.slice(),
        winner: result.winner,
        scoreA: result.scoreA,
        scoreB: result.scoreB,
        system: scoringSystem,
        awards
      });
    });

    // Build a local partner map so we can split teams immediately
    const localLastPartners = { ...(currentTournament.lastPartners || {}) };
    const setLocalPartners = (team) => {
      if (team.length === 2) {
        const [a, b] = team;
        localLastPartners[a] = b;
        localLastPartners[b] = a;
      }
    };
    roundResults.forEach(result => {
      const court = currentTournament.courts[result.courtIndex] || [];
      const A = court.slice(0, 2);
      const B = court.slice(2, 4);
      const winners = (result.winner === 'A') ? A : B;
      const losers = (result.winner === 'A') ? B : A;
      setLocalPartners(winners);
      setLocalPartners(losers);
    });

    // Process court movements
    const incomingWinners = [[], [], [], []];
    const incomingLosers = [[], [], [], []];
    const stayingPlayers = currentTournament.courts.map(c => c.slice());
    const resultsByCourt = new Map(roundResults.map(result => [result.courtIndex, result]));

    for (let courtIndex = 0; courtIndex < 4; courtIndex++) {
      const court = currentTournament.courts[courtIndex] || [];
      if (court.length < 4) continue;

      const recentResult = resultsByCourt.get(courtIndex);
      if (!recentResult) continue;

      const matchPlayers = [...recentResult.A, ...recentResult.B];
      stayingPlayers[courtIndex] = stayingPlayers[courtIndex].filter(id => !matchPlayers.includes(id));

      const winners = (recentResult.winner === 'A') ? recentResult.A.slice() : recentResult.B.slice();
      const losers = (recentResult.winner === 'A') ? recentResult.B.slice() : recentResult.A.slice();

      const upTarget = courtIndex > 0 ? courtIndex - 1 : courtIndex;
      const downTarget = courtIndex < 3 ? courtIndex + 1 : courtIndex;

      if (upTarget === courtIndex) {
        incomingWinners[courtIndex].push(...winners);
      } else {
        incomingWinners[upTarget].push(...winners);
      }

      if (downTarget === courtIndex) {
        incomingLosers[courtIndex].push(...losers);
      } else {
        incomingLosers[downTarget].push(...losers);
      }
    }

    const nextCourts = [[], [], [], []];
    for (let i = 0; i < 4; i++) {
      nextCourts[i] = [
        ...incomingWinners[i],
        ...stayingPlayers[i],
        ...incomingLosers[i]
      ];
    }

    const getLocalLastPartner = (playerId) => localLastPartners[playerId] ?? null;
    tournament.setCourts(
      nextCourts.map(court => arrangeCourtTeams(court, getLocalLastPartner))
    );

    // Only clear submitted courts and pending scores after successful processing
    // This ensures scores persist even if there was an error earlier
    appState.updateTournament(currentTournament.id, (t) => ({
      ...t,
      tournamentStarted: true,
      submittedCourts: [],
      pendingScores: ['', '', '', '']
    }));
    
    toast.success('Round submitted successfully!', { title: 'Round Complete' });
    return true; // Return true to indicate success
  }, [appState, tournament, toast]);

  const handleAdjustSeed = useCallback((playerId, delta) => {
    const player = tournament.getPlayerById(playerId);
    if (player) {
      const newSeed = Math.max(MIN_DUPR_RATING, Math.min(MAX_DUPR_RATING, player.seed + delta));
      tournament.setPlayerSeed(playerId, Math.round(newSeed * 1000) / 1000);
    }
  }, [tournament]);

  const handleResetLeague = useCallback(async () => {
    const confirmed = await confirmDialog.showConfirm({
      title: 'Reset League',
      message: 'Start a new league? This resets points and match count (players & seeding stay the same).',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      variant: 'warning'
    });
    if (confirmed) {
      tournament.resetLeague();
      toast.success('League reset successfully');
    }
  }, [tournament, confirmDialog, toast]);

  const handleResetApp = useCallback(async () => {
    const confirmed = await confirmDialog.showConfirm({
      title: 'Reset App',
      message: 'Reset the entire app? This clears saved data (players, courts, league, history).',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (confirmed) {
      appState.clearState();
      toast.success('App reset successfully');
    }
  }, [appState, confirmDialog, toast]);

  // League handlers
  const handleLeagueNavigate = useCallback((view) => {
    setLeagueView(view);
  }, []);

  const handleStartEventDay = useCallback(() => {
    const newDay = leagueState.startEventDay();
    if (newDay) {
      toast.success(`Event Day ${newDay.dayNumber} started!`);
      setLeagueView('eventDay');
    }
  }, [leagueState, toast]);

  const handleFinishAndContinue = useCallback(() => {
    // Close current event day
    const closed = eventDay.closeEventDay();
    if (closed) {
      // Start next event day
      const newDay = leagueState.startEventDay();
      if (newDay) {
        toast.success(`Event Day ${newDay.dayNumber - 1} completed! Event Day ${newDay.dayNumber} started!`);
        // Stay on eventDay view - it will show the new day
        setLeagueView('eventDay');
        return true;
      } else {
        toast.warning('Event day closed, but could not start next event day.');
        return false;
      }
    }
    return false;
  }, [eventDay, leagueState, toast]);

  // Multiple leagues handlers
  const handleSwitchLeague = useCallback(async (leagueId) => {
    try {
      const success = await leagueState.switchLeague(leagueId);
      if (success) {
        setLeagueView('dashboard'); // Switch to dashboard view after selecting league
        toast.success('Switched league');
      }
    } catch (error) {
      console.error('Error switching league:', error);
      toast.error('Failed to switch league');
    }
  }, [leagueState, toast]);

  const handleCreateLeague = useCallback(async (leagueName, description, template = null) => {
    try {
      await leagueState.createNewLeague(leagueName, description, template);
      setLeagueView('dashboard'); // Switch to dashboard view after creating
    } catch (error) {
      console.error('Error creating league:', error);
      throw error; // Let modal handle error display
    }
  }, [leagueState]);

  const handleDeleteLeague = useCallback(async (leagueId) => {
    try {
      await leagueState.deleteLeague(leagueId);
      // If no leagues left, show leagues dashboard
      if (leagueState.leagues.length === 0) {
        setLeagueView('leagues');
      }
    } catch (error) {
      console.error('Error deleting league:', error);
      throw error; // Let modal handle error display
    }
  }, [leagueState]);

  const handleEditLeague = useCallback(async (leagueId, newName, description) => {
    try {
      await leagueState.updateLeagueName(leagueId, newName, description);
    } catch (error) {
      console.error('Error updating league:', error);
      throw error; // Let modal handle error display
    }
  }, [leagueState]);

  const handleSelectLeagueForEdit = useCallback((league) => {
    setEditingLeague(league);
    setLeagueModalMode('edit');
    setShowLeagueModal(true);
  }, []);

  const handleShowCreateModal = useCallback(() => {
    setEditingLeague(null);
    setLeagueModalMode('create');
    setShowLeagueModal(true);
  }, []);

  const handleCloseLeagueModal = useCallback(() => {
    setShowLeagueModal(false);
    setEditingLeague(null);
  }, []);

  const handleSaveLeagueModal = useCallback(async (leagueName, description, template = null) => {
    if (leagueModalMode === 'create') {
      await handleCreateLeague(leagueName, description, template);
    } else if (leagueModalMode === 'edit' && editingLeague) {
      await handleEditLeague(editingLeague.leagueId, leagueName, description);
    }
    handleCloseLeagueModal();
  }, [leagueModalMode, editingLeague, handleCreateLeague, handleEditLeague, handleCloseLeagueModal]);

  const showLeaderboard = appState.currentTournament?.matchLimit &&
    appState.currentTournament.matchesPlayed >= appState.currentTournament.matchLimit;

  // Show club selector if no club is selected
  if (!isClubSelected) {
    return <ClubSelector />;
  }

  // Show loading state while club data is being fetched
  if (clubLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        color: 'var(--text-primary)'
      }}>
        Loading club data...
      </div>
    );
  }

  // For tournaments section, still check for tournament
  if (activeSection === 'tournaments' && (!appState.currentTournament || leagueState.isLoading)) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        color: 'var(--text-primary)'
      }}>
        Loading tournament data...
      </div>
    );
  }

  // Handle admin mode entry
  const handleEnterAdminMode = () => {
    setShowAdminLogin(true);
  };

  const handleExitAdminMode = () => {
    adminAuth.logoutAdmin();
    setActiveSection('league'); // Switch to league view when exiting admin
  };

  const handleAdminLogin = async (masterKey) => {
    return await adminAuth.loginAdmin(masterKey);
  };

  // Render League Section
  const renderLeagueSection = () => {
    switch (leagueView) {
      case 'leagues':
        return (
          <LeaguesDashboard
            leagues={leagueState.leagues || []}
            currentLeagueId={leagueState.currentLeagueId}
            isLoading={leagueState.isLoading}
            onLoadLeagues={leagueState.loadAllLeagues}
            onSelectLeague={handleSwitchLeague}
            onCreateLeague={handleCreateLeague}
            onDeleteLeague={handleDeleteLeague}
            onEditLeague={handleSelectLeagueForEdit}
            toast={toast}
            isAdmin={adminAuth.isAdmin}
          />
        );
      case 'setup':
        if (!adminAuth.isAdmin) return null;
        return (
          <LeagueSetup
            league={leagueState.league}
            canRegisterPlayers={leagueState.canRegisterPlayers}
            onUpdateConfig={leagueState.updateLeagueConfig}
            onUpdateMoneyRoundConfig={leagueState.updateMoneyRoundConfig}
            onRegisterPlayer={leagueState.registerPlayer}
            onRegisterPlayers={leagueState.registerPlayers}
            onRemovePlayer={leagueState.removePlayer}
            onSetStatus={leagueState.setLeagueStatus}
            onImportLeague={leagueState.importLeague}
            onResetLeague={leagueState.resetLeague}
            onNavigate={handleLeagueNavigate}
            toast={toast}
            onAssignPartner={leagueState.assignPartner}
            onRemovePartner={leagueState.removePartner}
            onAutoAssignPartners={leagueState.autoAssignPartnersToLeague}
            canModifyPartners={leagueState.canModifyPartners()}
            getPlayerPartner={leagueState.getPlayerPartner}
          />
        );
      case 'eventDay':
        if (!adminAuth.isAdmin) return null;
        return (
          <EventDayManager
            league={leagueState.league}
            currentEventDay={eventDay.currentEventDay}
            scheduleProgress={eventDay.scheduleProgress}
            allMatchesCompleted={eventDay.allMatchesCompleted}
            availableForCheckIn={eventDay.availableForCheckIn}
            checkedInPlayersDetails={eventDay.checkedInPlayersDetails}
            courtAssignmentsWithDetails={eventDay.courtAssignmentsWithDetails}
            onCheckIn={eventDay.checkInPlayer}
            onRemoveCheckIn={eventDay.removeCheckIn}
            onCloseCheckIn={eventDay.closeCheckInAndGenerateCourts}
            onRecordScore={eventDay.recordMatchScore}
            onClearScore={eventDay.clearMatchScore}
            onCloseEventDay={eventDay.closeEventDay}
            getLadderMovementPreview={eventDay.getLadderMovementPreview}
            getMatchesByCourt={eventDay.getMatchesByCourt}
            getPlayerById={leagueState.getPlayerById}
            onNavigate={handleLeagueNavigate}
            toast={toast}
            isCurrentRoundComplete={eventDay.isCurrentRoundComplete}
            onSubmitRound={eventDay.submitRound}
            onFinishAndContinue={handleFinishAndContinue}
          />
        );
      case 'standings':
        return (
          <LeagueStandings
            league={leagueState.league}
            standings={leagueState.standings}
            pointsLeader={leagueState.pointsLeader}
            winPercentageLeader={leagueState.winPercentageLeader}
            getPlayerBalance={leagueState.getPlayerBalance}
            onNavigate={handleLeagueNavigate}
            getPlayerById={leagueState.getPlayerById}
          />
        );
      case 'prizePool':
        return (
          <PrizePoolDashboard
            league={leagueState.league}
            getPrizePoolBalance={leagueState.getPrizePoolBalance}
            getTotalUnpaid={leagueState.getTotalUnpaid}
            getPlayerBalance={leagueState.getPlayerBalance}
            markContributionPaid={leagueState.markContributionPaid}
            markContributionUnpaid={leagueState.markContributionUnpaid}
            recordPayout={leagueState.recordPayout}
            getPlayerById={leagueState.getPlayerById}
            onNavigate={handleLeagueNavigate}
            toast={toast}
            isAdmin={adminAuth.isAdmin}
          />
        );
      case 'dashboard':
      default:
        return (
          <LeagueDashboard
            league={leagueState.league}
            currentEventDay={eventDay.currentEventDay}
            standings={leagueState.standings}
            pointsLeader={leagueState.pointsLeader}
            winPercentageLeader={leagueState.winPercentageLeader}
            prizePoolBalance={leagueState.getPrizePoolBalance()}
            totalUnpaid={leagueState.getTotalUnpaid()}
            onStartEventDay={handleStartEventDay}
            onNavigate={handleLeagueNavigate}
            onExport={leagueState.exportLeague}
            isAdmin={adminAuth.isAdmin}
          />
        );
    }
  };

  return (
    <>
      <Header
        tournaments={appState.tournaments}
        activeTournamentId={appState.activeTournamentId}
        onTournamentChange={appState.setActiveTournament}
        onAddTournament={handleAddTournament}
        onRemoveTournament={handleRemoveTournament}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isAdmin={adminAuth.isAdmin}
        onEnterAdminMode={handleEnterAdminMode}
        onExitAdminMode={handleExitAdminMode}
        leagues={leagueState.leagues || []}
        currentLeagueId={leagueState.currentLeagueId}
        currentLeague={leagueState.league}
        leagueView={leagueView}
        onSelectLeague={handleSwitchLeague}
        onCreateLeague={adminAuth.isAdmin ? handleShowCreateModal : null}
        onEditLeague={adminAuth.isAdmin ? handleSelectLeagueForEdit : null}
        onNavigateToLeagues={() => setLeagueView('leagues')}
      />
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <ConfirmDialog
        isOpen={confirmDialog.dialog.isOpen}
        title={confirmDialog.dialog.title}
        message={confirmDialog.dialog.message}
        confirmText={confirmDialog.dialog.confirmText}
        cancelText={confirmDialog.dialog.cancelText}
        variant={confirmDialog.dialog.variant}
        onConfirm={confirmDialog.dialog.onConfirm}
        onCancel={confirmDialog.dialog.onCancel}
      />
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => {
          setShowAdminLogin(false);
          adminAuth.clearError();
        }}
        onLogin={handleAdminLogin}
        isLoading={adminAuth.isLoading}
        error={adminAuth.error}
      />

      <LeagueManagementModal
        league={editingLeague}
        isOpen={showLeagueModal}
        mode={leagueModalMode}
        existingLeagues={leagueState.leagues || []}
        onClose={handleCloseLeagueModal}
        onSave={handleSaveLeagueModal}
        onDelete={handleDeleteLeague}
        toast={toast}
      />

      {/* Tournament Section - Only show in admin mode */}
      {adminAuth.isAdmin && activeSection === 'tournaments' && (
        <main>
          <PlayerManagement
            tournament={appState.currentTournament}
            onAddPlayer={tournament.addPlayer}
            onAddRandomPlayer={tournament.addRandomPlayer}
            onAddRandom16={() => {
              for (let i = 0; i < 16; i++) {
                tournament.addRandomPlayer();
              }
            }}
            onSetMatchLimit={tournament.setMatchLimit}
            onSetScoringSystem={tournament.setScoringSystem}
            onFairSeed={handleFairSeed}
            onGradualSeed={handleGradualSeed}
            onClassicSeed={handleClassicSeed}
            onShufflePairs={handleShufflePairs}
            onResetLeague={handleResetLeague}
            onResetApp={handleResetApp}
            onExport={exportState}
            onImport={handleImport}
            onImportCSV={handleImportCSV}
          />
          <Courts
            tournament={appState.currentTournament}
            getPlayerById={tournament.getPlayerById}
            onSubmitRound={handleSubmitRound}
            onSubmitCourt={handleSubmitCourt}
            updateTournament={appState.updateTournament}
            toast={toast}
          />
          <Leaderboard
            tournament={appState.currentTournament}
            show={showLeaderboard}
            getPlayerById={tournament.getPlayerById}
          />
          <Summary
            tournament={appState.currentTournament}
            getPlayerById={tournament.getPlayerById}
          />
          <Statistics
            tournament={appState.currentTournament}
            getPlayerById={tournament.getPlayerById}
          />
          <Help />
          <MatchHistory
            tournament={appState.currentTournament}
            getPlayerById={tournament.getPlayerById}
            onClearHistory={tournament.clearHistory}
          />
          <PlayerList
            tournament={appState.currentTournament}
            onRemovePlayer={tournament.removePlayer}
            onAdjustSeed={handleAdjustSeed}
            getPlayerById={tournament.getPlayerById}
          />
          <LegalDisclaimer />
        </main>
      )}

      {/* League Section */}
      {activeSection === 'league' && (
        <main className="league-main">
          {renderLeagueSection()}
          <LeagueHelp league={leagueState.league} />
          <LeagueTemplateRulesHelp />
          <LegalDisclaimer />
        </main>
      )}

    </>
  );
}

export default App;
