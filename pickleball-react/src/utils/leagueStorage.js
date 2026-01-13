/**
 * League Storage - Persistence and Export/Import for Ladder League
 */

import { LEAGUE_STORAGE_KEY, LEAGUE_DEFAULTS, LEAGUE_STATUS, EVENT_DAY_STATUS, EVENT_DAY_PHASE, MONEY_ROUND_DEFAULTS, LEAGUE_MODE } from './constants.js';

/**
 * Create a default league state
 */
export function createDefaultLeague(overrides = {}) {
  return {
    id: Date.now(),
    name: 'Ladder League',
    maxPlayers: LEAGUE_DEFAULTS.maxPlayers,
    maxPlayersPerDay: LEAGUE_DEFAULTS.maxPlayersPerDay,
    courtsCount: LEAGUE_DEFAULTS.courtsCount,
    playersPerCourt: LEAGUE_DEFAULTS.playersPerCourt,
    totalEventDays: LEAGUE_DEFAULTS.totalEventDays,
    scoringSystem: 'court',
    leagueMode: LEAGUE_MODE.REGULAR, // 'regular' or 'mixed_doubles'
    registeredPlayers: [],
    eventDays: [],
    currentEventDayIndex: -1,
    status: LEAGUE_STATUS.SETUP,
    createdAt: Date.now(),
    // Partner assignments for mixed doubles: { [playerId]: partnerId }
    partners: {},
    // Money Round Configuration
    moneyRoundEnabled: false,
    moneyRoundConfig: {
      contributionScale: [...MONEY_ROUND_DEFAULTS.contributionScale],
      distributionMode: MONEY_ROUND_DEFAULTS.distributionModes.END_OF_LEAGUE,
      perEventPayoutRules: null
    },
    // Prize Pool Tracking
    prizePool: {
      balance: 0,
      contributions: [], // { id, eventDayId, playerId, amount, paid: boolean, paidAt: null }
      payouts: [] // { id, playerId, amount, date, reason }
    },
    ...overrides
  };
}

/**
 * Create a default league player
 */
export function createLeaguePlayer(id, name, duprRating, gender = null) {
  return {
    id,
    name,
    duprRating: duprRating || 4.5,
    gender: gender || null, // 'male', 'female', or null
    cumulativePoints: 0,
    totalWins: 0,
    totalLosses: 0,
    pointsScored: 0,
    pointsAllowed: 0,
    eventDaysAttended: 0,
    courtHistory: [],
    ladderPositionHistory: [],
    registeredAt: Date.now(),
    // Money Round Stats (separate from league stats)
    moneyRoundStats: {
      totalWins: 0,
      totalLosses: 0,
      totalContributions: 0,
      totalPaid: 0,
      contributionHistory: [] // { eventDayId, courtIndex, rank, amount }
    }
  };
}

/**
 * Create a default event day
 */
export function createEventDay(id, dayNumber) {
  return {
    id,
    dayNumber,
    date: null,
    checkedInPlayers: [],
    courtAssignments: [[], [], [], []],
    schedule: [],
    status: EVENT_DAY_STATUS.PENDING,
    // Phase tracking for two-phase event structure
    phase: EVENT_DAY_PHASE.CHECKIN,
    ladderMovement: [],
    // Money Round fields
    moneyRoundEnabled: false,
    moneyRoundCourts: [[], [], [], []], // Court assignments after ladder movement
    moneyRoundSchedule: [], // Separate schedule for money round matches
    moneyRoundResults: [], // { courtIndex, rankings: [{playerId, rank, contribution}] }
    createdAt: Date.now(),
    completedAt: null
  };
}

/**
 * Save league state to localStorage
 */
export function saveLeague(league) {
  try {
    const serialized = JSON.stringify(league);
    localStorage.setItem(LEAGUE_STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.error('Failed to save league:', error);
    return false;
  }
}

/**
 * Load league state from localStorage
 */
export function loadLeague() {
  try {
    const serialized = localStorage.getItem(LEAGUE_STORAGE_KEY);
    if (!serialized) {
      return null;
    }
    const league = JSON.parse(serialized);
    return normalizeLeagueState(league);
  } catch (error) {
    console.error('Failed to load league:', error);
    return null;
  }
}

/**
 * Clear league from localStorage
 */
export function clearLeague() {
  try {
    localStorage.removeItem(LEAGUE_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear league:', error);
    return false;
  }
}

/**
 * Normalize league state to ensure all required fields exist
 */
export function normalizeLeagueState(league) {
  if (!league) return null;

  const normalized = {
    ...createDefaultLeague(),
    ...league
  };

  // Ensure registeredPlayers have all required fields
  normalized.registeredPlayers = (normalized.registeredPlayers || []).map(player => ({
    ...createLeaguePlayer(player.id, player.name, player.duprRating, player.gender),
    ...player,
    // Ensure moneyRoundStats exists
    moneyRoundStats: {
      totalWins: 0,
      totalLosses: 0,
      totalContributions: 0,
      totalPaid: 0,
      contributionHistory: [],
      ...(player.moneyRoundStats || {})
    }
  }));

  // Ensure leagueMode exists (default to regular for backward compatibility)
  if (!normalized.leagueMode) {
    normalized.leagueMode = LEAGUE_MODE.REGULAR;
  }

  // Ensure partners object exists
  if (!normalized.partners || typeof normalized.partners !== 'object') {
    normalized.partners = {};
  }

  // Ensure eventDays have all required fields
  normalized.eventDays = (normalized.eventDays || []).map((day, index) => ({
    ...createEventDay(day.id || index + 1, day.dayNumber || index + 1),
    ...day
  }));

  // Ensure prizePool exists
  if (!normalized.prizePool) {
    normalized.prizePool = {
      balance: 0,
      contributions: [],
      payouts: []
    };
  }

  // Ensure moneyRoundConfig exists
  if (!normalized.moneyRoundConfig) {
    normalized.moneyRoundConfig = {
      contributionScale: [...MONEY_ROUND_DEFAULTS.contributionScale],
      distributionMode: MONEY_ROUND_DEFAULTS.distributionModes.END_OF_LEAGUE,
      perEventPayoutRules: null
    };
  }

  return normalized;
}

/**
 * Export league to JSON for download
 */
export function exportLeagueToJSON(league) {
  const exportData = {
    version: '1.1', // Updated version for Money Round support
    exportDate: new Date().toISOString(),
    exportTimestamp: Date.now(),
    league: {
      id: league.id,
      name: league.name,
      maxPlayers: league.maxPlayers,
      maxPlayersPerDay: league.maxPlayersPerDay,
      courtsCount: league.courtsCount,
      playersPerCourt: league.playersPerCourt,
      totalEventDays: league.totalEventDays,
      scoringSystem: league.scoringSystem,
      leagueMode: league.leagueMode || LEAGUE_MODE.REGULAR,
      currentEventDayIndex: league.currentEventDayIndex,
      status: league.status,
      createdAt: league.createdAt,
      // Money Round Configuration
      moneyRoundEnabled: league.moneyRoundEnabled || false,
      moneyRoundConfig: league.moneyRoundConfig || null
    },
    players: league.registeredPlayers.map(player => ({
      id: player.id,
      name: player.name,
      duprRating: player.duprRating,
      gender: player.gender || null,
      cumulativePoints: player.cumulativePoints,
      totalWins: player.totalWins,
      totalLosses: player.totalLosses,
      pointsScored: player.pointsScored,
      pointsAllowed: player.pointsAllowed,
      eventDaysAttended: player.eventDaysAttended,
      courtHistory: player.courtHistory,
      ladderPositionHistory: player.ladderPositionHistory,
      registeredAt: player.registeredAt,
      // Money Round Stats
      moneyRoundStats: player.moneyRoundStats || null
    })),
    eventDays: league.eventDays.map(day => ({
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date,
      checkedInPlayers: day.checkedInPlayers,
      courtAssignments: day.courtAssignments,
      schedule: day.schedule,
      status: day.status,
      phase: day.phase,
      ladderMovement: day.ladderMovement,
      // Money Round Data
      moneyRoundEnabled: day.moneyRoundEnabled || false,
      moneyRoundCourts: day.moneyRoundCourts || [[], [], [], []],
      moneyRoundSchedule: day.moneyRoundSchedule || [],
      moneyRoundResults: day.moneyRoundResults || [],
      createdAt: day.createdAt,
      completedAt: day.completedAt
    })),
    // Prize Pool Data
    prizePool: league.prizePool || { balance: 0, contributions: [], payouts: [] },
    // Partner assignments for mixed doubles
    partners: league.partners || {}
  };

  return exportData;
}

/**
 * Validate imported league data
 */
export function validateLeagueImport(data) {
  const errors = [];

  if (!data) {
    errors.push('No data provided');
    return { valid: false, errors };
  }

  if (!data.version) {
    errors.push('Missing version field');
  }

  if (!data.league) {
    errors.push('Missing league data');
  } else {
    if (!data.league.name) {
      errors.push('Missing league name');
    }
  }

  if (!Array.isArray(data.players)) {
    errors.push('Missing or invalid players array');
  } else {
    data.players.forEach((player, index) => {
      if (!player.id) {
        errors.push(`Player at index ${index} missing ID`);
      }
      if (!player.name) {
        errors.push(`Player at index ${index} missing name`);
      }
    });
  }

  if (!Array.isArray(data.eventDays)) {
    errors.push('Missing or invalid eventDays array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Import league from JSON data
 */
export function importLeagueFromJSON(data) {
  const validation = validateLeagueImport(data);
  if (!validation.valid) {
    throw new Error(`Invalid import data: ${validation.errors.join(', ')}`);
  }

  // Reconstruct the league object
  const league = {
    ...createDefaultLeague(),
    ...data.league,
    registeredPlayers: data.players.map(player => ({
      ...createLeaguePlayer(player.id, player.name, player.duprRating, player.gender),
      ...player
    })),
    eventDays: data.eventDays.map((day, index) => ({
      ...createEventDay(day.id || index + 1, day.dayNumber || index + 1),
      ...day
    })),
    // Import prize pool if present
    prizePool: data.prizePool || { balance: 0, contributions: [], payouts: [] },
    // Import partners if present
    partners: data.partners || {}
  };

  return normalizeLeagueState(league);
}

/**
 * Trigger browser download of league export
 */
export function downloadLeagueExport(league) {
  const exportData = exportLeagueToJSON(league);
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `ladder-league-${league.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${date}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return filename;
}

/**
 * Calculate league statistics
 */
export function calculateLeagueStats(league) {
  const stats = {
    totalPlayers: league.registeredPlayers.length,
    totalEventDays: league.eventDays.length,
    completedEventDays: league.eventDays.filter(d => d.status === EVENT_DAY_STATUS.COMPLETED).length,
    totalMatches: 0,
    completedMatches: 0
  };

  league.eventDays.forEach(day => {
    stats.totalMatches += day.schedule.length;
    stats.completedMatches += day.schedule.filter(m => m.status === 'completed').length;
  });

  return stats;
}

/**
 * Get the current active event day
 */
export function getCurrentEventDay(league) {
  if (league.currentEventDayIndex < 0 || league.currentEventDayIndex >= league.eventDays.length) {
    return null;
  }
  return league.eventDays[league.currentEventDayIndex];
}

/**
 * Check if league can start a new event day
 */
export function canStartNewEventDay(league) {
  if (league.status === LEAGUE_STATUS.COMPLETED) {
    return false;
  }

  if (league.registeredPlayers.length < 4) {
    return false;
  }

  const currentDay = getCurrentEventDay(league);
  if (currentDay && currentDay.status !== EVENT_DAY_STATUS.COMPLETED) {
    return false;
  }

  const completedDays = league.eventDays.filter(d => d.status === EVENT_DAY_STATUS.COMPLETED).length;
  if (completedDays >= league.totalEventDays) {
    return false;
  }

  return true;
}

/**
 * Get player by ID from league
 */
export function getLeaguePlayerById(league, playerId) {
  return league.registeredPlayers.find(p => p.id === playerId);
}

/**
 * Get league standings sorted by cumulative points
 */
export function getLeagueStandings(league) {
  return [...league.registeredPlayers].sort((a, b) => {
    // Primary: cumulative points
    if (b.cumulativePoints !== a.cumulativePoints) {
      return b.cumulativePoints - a.cumulativePoints;
    }
    // Secondary: win percentage
    const totalA = a.totalWins + a.totalLosses;
    const totalB = b.totalWins + b.totalLosses;
    const winPctA = totalA > 0 ? a.totalWins / totalA : 0;
    const winPctB = totalB > 0 ? b.totalWins / totalB : 0;
    if (winPctB !== winPctA) {
      return winPctB - winPctA;
    }
    // Tertiary: point differential
    const diffA = a.pointsScored - a.pointsAllowed;
    const diffB = b.pointsScored - b.pointsAllowed;
    return diffB - diffA;
  }).map((player, index) => ({
    ...player,
    rank: index + 1,
    winPercentage: player.totalWins + player.totalLosses > 0
      ? Math.round((player.totalWins / (player.totalWins + player.totalLosses)) * 1000) / 10
      : 0
  }));
}

/**
 * Partner Management Functions for Mixed Doubles
 */

/**
 * Get partner ID for a player
 * @param {Object} league - League object
 * @param {number} playerId - Player ID
 * @returns {number|null} Partner ID or null
 */
export function getPartner(league, playerId) {
  return league.partners?.[playerId] || null;
}

/**
 * Set partner for a player (bidirectional)
 * @param {Object} league - League object
 * @param {number} playerId1 - First player ID
 * @param {number} playerId2 - Second player ID (null to remove partnership)
 * @returns {Object} Updated league object
 */
export function setPartner(league, playerId1, playerId2) {
  const newPartners = { ...(league.partners || {}) };
  
  // Remove existing partnerships for both players
  const oldPartner1 = newPartners[playerId1];
  const oldPartner2 = newPartners[playerId2];
  
  if (oldPartner1) {
    delete newPartners[oldPartner1];
  }
  if (oldPartner2) {
    delete newPartners[oldPartner2];
  }
  
  // Set new partnership (bidirectional)
  if (playerId2 !== null && playerId2 !== undefined) {
    newPartners[playerId1] = playerId2;
    newPartners[playerId2] = playerId1;
  } else {
    delete newPartners[playerId1];
  }
  
  return {
    ...league,
    partners: newPartners
  };
}

/**
 * Validate that a partnership is valid (1 man + 1 woman)
 * @param {Object} league - League object
 * @param {number} playerId1 - First player ID
 * @param {number} playerId2 - Second player ID
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validatePartnership(league, playerId1, playerId2) {
  const player1 = getLeaguePlayerById(league, playerId1);
  const player2 = getLeaguePlayerById(league, playerId2);
  
  if (!player1 || !player2) {
    return { valid: false, error: 'One or both players not found' };
  }
  
  if (league.leagueMode !== LEAGUE_MODE.MIXED_DOUBLES) {
    return { valid: true, error: null }; // No validation needed for regular leagues
  }
  
  if (!player1.gender || !player2.gender) {
    return { valid: false, error: 'Both players must have a gender assigned' };
  }
  
  if (player1.gender === player2.gender) {
    return { valid: false, error: 'Partners must be of different genders (1 man + 1 woman)' };
  }
  
  return { valid: true, error: null };
}

/**
 * Auto-assign partners based on ladder position
 * Pairs top man with top woman, second man with second woman, etc.
 * @param {Object} league - League object
 * @returns {Object} Updated league object with partners assigned
 */
export function autoAssignPartners(league) {
  if (league.leagueMode !== LEAGUE_MODE.MIXED_DOUBLES) {
    return league; // No auto-assignment for regular leagues
  }
  
  // Get standings sorted by cumulative points (or DUPR for new players)
  const standings = getLeagueStandings(league);
  
  // Separate by gender
  const men = standings.filter(p => p.gender === 'male');
  const women = standings.filter(p => p.gender === 'female');
  
  if (men.length === 0 || women.length === 0) {
    return league; // Can't assign partners without both genders
  }
  
  // Pair by position: top man with top woman, etc.
  const newPartners = {};
  const minPairs = Math.min(men.length, women.length);
  
  for (let i = 0; i < minPairs; i++) {
    const manId = men[i].id;
    const womanId = women[i].id;
    newPartners[manId] = womanId;
    newPartners[womanId] = manId;
  }
  
  return {
    ...league,
    partners: newPartners
  };
}

/**
 * Check if partners can be changed (only between event days)
 * @param {Object} league - League object
 * @returns {Object} { canChange: boolean, reason: string|null }
 */
export function canChangePartners(league) {
  const currentDay = getCurrentEventDay(league);
  
  if (currentDay && currentDay.status !== EVENT_DAY_STATUS.COMPLETED) {
    return {
      canChange: false,
      reason: 'Partners can only be changed between event days. Please complete the current event day first.'
    };
  }
  
  return { canChange: true, reason: null };
}
