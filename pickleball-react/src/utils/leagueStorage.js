/**
 * League Storage - Persistence and Export/Import for Ladder League
 */

import { LEAGUE_STORAGE_KEY, CLUB_STORAGE_KEY, LEAGUE_DEFAULTS, LEAGUE_STATUS, EVENT_DAY_STATUS, EVENT_DAY_PHASE, MONEY_ROUND_DEFAULTS, LEAGUE_MODE } from './constants.js';

/**
 * Create a default league state
 */
/**
 * Create a default club information object
 */
export function createDefaultClub(overrides = {}) {
  return {
    id: Date.now(),
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  };
}

export function createDefaultLeague(overrides = {}) {
  return {
    id: Date.now(),
    name: 'Ladder League',
    leagueId: null, // UUID for league identification in database
    leagueName: 'Ladder League', // Unique name within club
    clubId: null, // Reference to club information
    description: null, // Optional description for the league
    status: 'active', // 'active', 'archived', 'completed'
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
    leagueStatus: LEAGUE_STATUS.SETUP, // League setup status (different from active/archived status)
    createdAt: Date.now(),
    // Partner assignments for mixed doubles: { [playerId]: partnerId }
    partners: {},
    // Partner pair matchup tracking: { pair1: [id1, id2], pair2: [id3, id4], eventDayId, courtIndex, createdAt }
    partnerMatchups: [],
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
    // Mixed doubles round tracking
    currentActiveRound: 1, // Track which round is currently active (1-6)
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
 * Save club information to localStorage (cache only - database is primary)
 * Note: This is now a cache layer. Use clubApi functions for database operations.
 */
export function saveClubToLocalStorage(club) {
  try {
    const clubToSave = {
      ...club,
      updatedAt: Date.now()
    };
    const serialized = JSON.stringify(clubToSave);
    // Cache by club ID
    if (club.id) {
      localStorage.setItem(`pb_club_${club.id}`, serialized);
    }
    // Also save as default club if no clubId specified
    localStorage.setItem(CLUB_STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.error('Failed to cache club in localStorage:', error);
    return false;
  }
}

/**
 * Load club information from localStorage (cache only - database is primary)
 * Note: This is now a cache layer. Use clubApi functions for database operations.
 */
export function loadClubFromLocalStorage(clubId = null) {
  try {
    let serialized = null;
    
    if (clubId) {
      // Try to load specific club by ID
      serialized = localStorage.getItem(`pb_club_${clubId}`);
    }
    
    // Fallback to default club
    if (!serialized) {
      serialized = localStorage.getItem(CLUB_STORAGE_KEY);
    }
    
    if (!serialized) {
      return null;
    }
    
    const club = JSON.parse(serialized);
    return normalizeClub(club);
  } catch (error) {
    console.error('Failed to load club from localStorage:', error);
    return null;
  }
}

/**
 * Save club information (legacy - kept for backward compatibility)
 * Now uses localStorage as cache, database should be primary
 */
export function saveClub(club) {
  return saveClubToLocalStorage(club);
}

/**
 * Load club information (legacy - kept for backward compatibility)
 * Now uses localStorage as cache, database should be primary
 */
export function loadClub(clubId = null) {
  return loadClubFromLocalStorage(clubId);
}

/**
 * Normalize club state to ensure all required fields exist
 */
export function normalizeClub(club) {
  if (!club) return null;

  const normalized = {
    ...createDefaultClub(),
    ...club
  };

  // Ensure updatedAt exists
  if (!normalized.updatedAt) {
    normalized.updatedAt = normalized.createdAt || Date.now();
  }

  return normalized;
}

/**
 * Clear club from localStorage
 */
export function clearClub() {
  try {
    localStorage.removeItem(CLUB_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear club:', error);
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
  normalized.registeredPlayers = (normalized.registeredPlayers || []).map(player => {
    const defaultPlayer = createLeaguePlayer(player.id, player.name, player.duprRating, player.gender);
    return {
      ...defaultPlayer,
      ...player, // This preserves all stats from database
      // Explicitly ensure stats fields exist (don't override if already set)
      cumulativePoints: player.cumulativePoints ?? defaultPlayer.cumulativePoints,
      totalWins: player.totalWins ?? defaultPlayer.totalWins,
      totalLosses: player.totalLosses ?? defaultPlayer.totalLosses,
      pointsScored: player.pointsScored ?? defaultPlayer.pointsScored,
      pointsAllowed: player.pointsAllowed ?? defaultPlayer.pointsAllowed,
      eventDaysAttended: player.eventDaysAttended ?? defaultPlayer.eventDaysAttended,
      courtHistory: player.courtHistory ?? defaultPlayer.courtHistory,
      ladderPositionHistory: player.ladderPositionHistory ?? defaultPlayer.ladderPositionHistory,
      // Ensure moneyRoundStats exists
      moneyRoundStats: {
        ...defaultPlayer.moneyRoundStats,
        ...(player.moneyRoundStats || {})
      }
    };
  });

  // Ensure leagueMode exists (default to regular for backward compatibility)
  if (!normalized.leagueMode) {
    normalized.leagueMode = LEAGUE_MODE.REGULAR;
  }

  // Ensure partners object exists
  if (!normalized.partners || typeof normalized.partners !== 'object') {
    normalized.partners = {};
  }

  // Ensure partnerMatchups array exists
  if (!Array.isArray(normalized.partnerMatchups)) {
    normalized.partnerMatchups = [];
  }

  // Ensure clubId exists (can be null)
  if (normalized.clubId === undefined) {
    normalized.clubId = null;
  }

  // Ensure leagueId exists (can be null, will be generated by database)
  if (normalized.leagueId === undefined) {
    normalized.leagueId = null;
  }

  // Ensure leagueName exists (default to name if not set)
  if (!normalized.leagueName && normalized.name) {
    normalized.leagueName = normalized.name;
  } else if (!normalized.leagueName) {
    normalized.leagueName = 'Ladder League';
  }

  // Ensure status exists (default to active)
  if (!normalized.status) {
    normalized.status = 'active';
  }

  // Ensure description exists (can be null)
  if (normalized.description === undefined) {
    normalized.description = null;
  }

  // Map old 'status' field to 'leagueStatus' if present for backward compatibility
  // The new 'status' field is for active/archived/completed
  if (normalized.leagueStatus === undefined && normalized.status !== undefined) {
    // Check if status looks like a league setup status (SETUP, ACTIVE, COMPLETED from LEAGUE_STATUS)
    if (Object.values(LEAGUE_STATUS).includes(normalized.status)) {
      normalized.leagueStatus = normalized.status;
      normalized.status = 'active'; // Default to active
    } else {
      normalized.leagueStatus = LEAGUE_STATUS.SETUP; // Default to setup
    }
  } else if (normalized.leagueStatus === undefined) {
    normalized.leagueStatus = LEAGUE_STATUS.SETUP;
  }

  // Ensure eventDays have all required fields; always set schedule/moneyRoundSchedule as arrays for match history
  normalized.eventDays = (normalized.eventDays || []).map((day, index) => ({
    ...createEventDay(day.id || index + 1, day.dayNumber || index + 1),
    ...day,
    schedule: Array.isArray(day.schedule) ? day.schedule : [],
    moneyRoundSchedule: Array.isArray(day.moneyRoundSchedule) ? day.moneyRoundSchedule : []
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

  // Preserve optional schedule and format from league data (for display on cards, etc.)
  if (league.schedule != null) normalized.schedule = league.schedule;
  if (league.format != null) normalized.format = league.format;

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
      clubId: league.clubId || null,
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
    partners: league.partners || {},
    // Partner pair matchup history
    partnerMatchups: league.partnerMatchups || [],
    // Club information (if clubId is set, include club data)
    club: null // Will be populated if clubId exists
  };

  // Include club information if clubId is set
  // Try database first, then fallback to localStorage cache
  if (league.clubId) {
    // Try to get from cache first (for immediate export)
    const cachedClub = loadClubFromLocalStorage(league.clubId);
    if (cachedClub && cachedClub.id === league.clubId) {
      exportData.club = cachedClub;
    } else {
      // Note: Database fetch would be async, so we export cached data
      // Full club data should be loaded from database separately if needed
    }
  }

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
 * Note: Club data will be saved to localStorage cache only.
 * Use clubApi functions to sync with database after import.
 */
export function importLeagueFromJSON(data) {
  const validation = validateLeagueImport(data);
  if (!validation.valid) {
    throw new Error(`Invalid import data: ${validation.errors.join(', ')}`);
  }

  // Import club information if present (cache to localStorage)
  if (data.club) {
    saveClubToLocalStorage(data.club);
    // Note: To sync with database, call clubApi.createClub() or clubApi.updateClub() separately
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
    partners: data.partners || {},
    // Import partner matchups if present
    partnerMatchups: data.partnerMatchups || []
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
/**
 * Auto-assign partners based on ladder position
 * Pairs top man with top woman, second man with second woman, etc.
 * @param {Object} league - League object
 * @returns {Object} { success: boolean, league: Object, message?: string }
 */
export function autoAssignPartners(league) {
  if (league.leagueMode !== LEAGUE_MODE.MIXED_DOUBLES) {
    return { 
      success: false, 
      league, 
      message: 'Auto-assignment is only available for Mixed Doubles leagues' 
    };
  }
  
  // Get standings sorted by cumulative points (or DUPR for new players)
  const standings = getLeagueStandings(league);
  
  // Separate by gender
  const men = standings.filter(p => p.gender === 'male');
  const women = standings.filter(p => p.gender === 'female');
  
  if (men.length === 0 || women.length === 0) {
    const message = men.length === 0 
      ? 'Cannot assign partners: No male players found. Please ensure players have gender assigned.'
      : 'Cannot assign partners: No female players found. Please ensure players have gender assigned.';
    return { 
      success: false, 
      league, 
      message 
    };
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
  
  const updatedLeague = {
    ...league,
    partners: newPartners
  };
  
  return { 
    success: true, 
    league: updatedLeague, 
    message: `Successfully assigned ${minPairs} partner pair${minPairs !== 1 ? 's' : ''}` 
  };
}

/**
 * Check if partners can be changed (locked for entire league once first event day exists)
 * @param {Object} league - League object
 * @returns {Object} { canChange: boolean, reason: string|null }
 */
export function canChangePartners(league) {
  // Partners locked once league starts (any event day exists)
  if (league.eventDays && league.eventDays.length > 0) {
    return {
      canChange: false,
      reason: 'Partners are locked for the entire league once the first event day is created.'
    };
  }
  
  return { canChange: true, reason: null };
}

/**
 * Normalize partner pair IDs (always sorted: [minId, maxId])
 * @param {number} id1 - First player ID
 * @param {number} id2 - Second player ID
 * @returns {Array} Normalized pair [minId, maxId]
 */
export function normalizePartnerPair(id1, id2) {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

/**
 * Check if two partner pairs have played each other
 * @param {Object} league - League object
 * @param {Array} pair1Ids - First pair [id1, id2]
 * @param {Array} pair2Ids - Second pair [id3, id4]
 * @returns {boolean} True if pairs have played
 */
export function havePartnersPlayed(league, pair1Ids, pair2Ids) {
  if (!league.partnerMatchups || league.partnerMatchups.length === 0) {
    return false;
  }

  const normalized1 = normalizePartnerPair(pair1Ids[0], pair1Ids[1]);
  const normalized2 = normalizePartnerPair(pair2Ids[0], pair2Ids[1]);
  
  return league.partnerMatchups.some(matchup => {
    const m1 = normalizePartnerPair(matchup.pair1[0], matchup.pair1[1]);
    const m2 = normalizePartnerPair(matchup.pair2[0], matchup.pair2[1]);
    
    return (
      (normalized1[0] === m1[0] && normalized1[1] === m1[1] &&
       normalized2[0] === m2[0] && normalized2[1] === m2[1]) ||
      (normalized1[0] === m2[0] && normalized1[1] === m2[1] &&
       normalized2[0] === m1[0] && normalized2[1] === m1[1])
    );
  });
}
