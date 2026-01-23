/**
 * API-based storage utilities for multi-club support
 * Replaces localStorage with API calls to Supabase
 */

/**
 * Get the API base URL - use absolute path to bypass /app/ base path
 * Priority: VITE_STAGING_API_URL > VITE_API_BASE_URL > current origin
 */
export function getApiBase() {
  if (typeof window !== 'undefined') {
    // Check if staging API URL is configured (highest priority)
    const stagingApiUrl = import.meta.env.VITE_STAGING_API_URL;
    if (stagingApiUrl) {
      // Ensure it ends with /api/clubs
      const url = stagingApiUrl.endsWith('/api/clubs') 
        ? stagingApiUrl 
        : `${stagingApiUrl.replace(/\/$/, '')}/api/clubs`;
      console.log('[API] Using staging API:', url);
      return url;
    }
    
    // Check if production/override API URL is configured
    const prodApiUrl = import.meta.env.VITE_API_BASE_URL;
    if (prodApiUrl) {
      // Ensure it ends with /api/clubs
      const url = prodApiUrl.endsWith('/api/clubs') 
        ? prodApiUrl 
        : `${prodApiUrl.replace(/\/$/, '')}/api/clubs`;
      console.log('[API] Using production API:', url);
      return url;
    }
    
    // Use absolute URL from origin to bypass Vite's base path
    const fallbackUrl = `${window.location.origin}/api/clubs`;
    console.warn('[API] Using fallback (localhost):', fallbackUrl, 'VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return fallbackUrl;
  }
  return '/api/clubs';
}

// Cache for offline detection
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let lastOnlineCheck = Date.now();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    lastOnlineCheck = Date.now();
  });
  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

/**
 * Check if we're online
 */
function checkOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
    isOnline = navigator.onLine;
    lastOnlineCheck = Date.now();
  }
  return isOnline;
}

/**
 * Get the current club slug from storage
 */
function getClubSlug() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('pickleball_club_slug') || 
         localStorage.getItem('pickleball_club_slug') || 
         null;
}

/**
 * Save tournament data to API
 */
export async function saveTournamentData(data) {
  const clubSlug = getClubSlug();
  if (!clubSlug) {
    console.warn('No club selected, cannot save tournament data');
    // Fallback to localStorage for backward compatibility
    try {
      localStorage.setItem('pickleball_tournament_state', JSON.stringify(data));
      return { success: true, offline: true };
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return { success: false, error: e.message };
    }
  }

  // Check if offline
  if (!checkOnline()) {
    console.warn('Offline - saving to localStorage only');
    try {
      localStorage.setItem('pickleball_tournament_state', JSON.stringify(data));
      // Store pending sync
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      pending.push({ type: 'tournament', clubSlug, data, timestamp: Date.now() });
      localStorage.setItem('pickleball_pending_sync', JSON.stringify(pending));
      return { success: true, offline: true };
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return { success: false, error: e.message };
    }
  }

  try {
    const response = await fetch(`${getApiBase()}/${clubSlug}/tournament`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save tournament data: ${response.statusText}`);
    }

    // Clear pending sync for this club
    try {
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      const filtered = pending.filter(p => !(p.type === 'tournament' && p.clubSlug === clubSlug));
      localStorage.setItem('pickleball_pending_sync', JSON.stringify(filtered));
    } catch (e) {
      // Ignore errors clearing pending sync
    }

    return { success: true, offline: false };
  } catch (error) {
    console.error('Error saving tournament data:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem('pickleball_tournament_state', JSON.stringify(data));
      // Store pending sync
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      pending.push({ type: 'tournament', clubSlug, data, timestamp: Date.now() });
      localStorage.setItem('pickleball_pending_sync', JSON.stringify(pending));
      return { success: true, offline: true, error: error.message };
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return { success: false, error: e.message };
    }
  }
}

/**
 * Load tournament data from API
 */
export async function loadTournamentData() {
  const clubSlug = getClubSlug();
  if (!clubSlug) {
    // Fallback to localStorage for backward compatibility
    try {
      const stored = localStorage.getItem('pickleball_tournament_state');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
  }

  // If offline, try localStorage first
  if (!checkOnline()) {
    console.warn('Offline - loading from localStorage');
    try {
      const stored = localStorage.getItem('pickleball_tournament_state');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${getApiBase()}/${clubSlug}/tournament`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        // Try localStorage as fallback
        try {
          const stored = localStorage.getItem('pickleball_tournament_state');
          return stored ? JSON.parse(stored) : null;
        } catch (e) {
          return null;
        }
      }
      throw new Error(`Failed to load tournament data: ${response.statusText}`);
    }

    const { data } = await response.json();
    
    // Also save to localStorage as cache
    try {
      localStorage.setItem('pickleball_tournament_state', JSON.stringify(data));
    } catch (e) {
      // Ignore localStorage errors
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Request timeout - loading from localStorage');
    } else {
      console.error('Error loading tournament data:', error);
    }
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('pickleball_tournament_state');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
  }
}

/**
 * Save league data to API
 * @param {Object} data - The league data object (should include leagueId or leagueName)
 * @param {string} leagueId - Optional league ID if not in data object
 */
export async function saveLeagueData(data, leagueId = null) {
  const clubSlug = getClubSlug();
  if (!clubSlug) {
    console.warn('No club selected, cannot save league data');
    return { success: false, error: 'No club selected' };
  }

  // Extract leagueId from data if not provided
  const targetLeagueId = leagueId || data?.leagueId || data?.league_id;
  const leagueName = data?.leagueName || data?.league_name;

  // Check if offline: queue for sync when back online (no league localStorage; DB is source of truth)
  if (!checkOnline()) {
    console.warn('Offline - queuing league for sync');
    try {
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      pending.push({ type: 'league', clubSlug, leagueId: targetLeagueId, data, timestamp: Date.now() });
      localStorage.setItem('pickleball_pending_sync', JSON.stringify(pending));
      return { success: true, offline: true };
    } catch (e) {
      console.error('Failed to queue for sync:', e);
      return { success: false, error: e.message };
    }
  }

  // Get master key from sessionStorage if available (for admin operations)
  const masterKey = getStoredMasterKey();
  
  // Log what's being saved to verify eventDays are included
  console.log('saveLeagueData: Saving league data', {
    leagueId: targetLeagueId,
    hasEventDays: !!data.eventDays,
    eventDaysCount: data.eventDays?.length || 0,
    eventDaysWithSchedule: data.eventDays?.filter(day => day.schedule && day.schedule.length > 0).length || 0,
    totalMatches: data.eventDays?.reduce((sum, day) => sum + (day.schedule?.length || 0), 0) || 0,
    completedMatches: data.eventDays?.reduce((sum, day) => {
      const completed = day.schedule?.filter(m => m.status === 'completed').length || 0;
      return sum + completed;
    }, 0) || 0
  });
  
  try {
    const response = await fetch(`${getApiBase()}/${clubSlug}/league`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data,
        leagueId: targetLeagueId,
        leagueName: leagueName,
        masterKey: masterKey // Include master key if available (for admin verification)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save league data: ${response.statusText}`);
    }

    // Clear pending sync for this club
    try {
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      const filtered = pending.filter(p => !(p.type === 'league' && p.clubSlug === clubSlug && p.leagueId === targetLeagueId));
      localStorage.setItem('pickleball_pending_sync', JSON.stringify(filtered));
    } catch (e) {
      // Ignore errors clearing pending sync
    }

    return { success: true, offline: false };
  } catch (error) {
    console.error('Error saving league data:', error);
    // Queue for sync on network error; DB remains source of truth
    try {
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      pending.push({ type: 'league', clubSlug, leagueId: targetLeagueId, data, timestamp: Date.now() });
      localStorage.setItem('pickleball_pending_sync', JSON.stringify(pending));
      return { success: true, offline: true, error: error.message };
    } catch (e) {
      console.error('Failed to queue for sync:', e);
      return { success: false, error: e.message };
    }
  }
}

/**
 * Load league data from API
 * @param {string} leagueId - Optional league ID to load specific league. If not provided, returns null (use loadAllLeagues for list)
 */
export async function loadLeagueData(leagueId = null) {
  const clubSlug = getClubSlug();
  if (!clubSlug) {
    // Cannot call API without a club; league data must come from API
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const url = leagueId 
      ? `${getApiBase()}/${clubSlug}/league?leagueId=${encodeURIComponent(leagueId)}`
      : `${getApiBase()}/${clubSlug}/league`;
    
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // League not in database
      }
      throw new Error(`Failed to load league data: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle different response formats (single league vs list)
    let league = null;
    
    if (result.league) {
      // When loading a specific league, the API returns:
      // { league: { id, leagueId, leagueName, status, description, data: {...}, createdAt, updatedAt } }
      // We need to merge the metadata with the actual league data
      const leagueMetadata = result.league;
      const leagueData = leagueMetadata.data || {};
      
      // Log what's being loaded to verify eventDays are included
      console.log('loadLeagueData: Loading league data from API', {
        hasEventDays: !!leagueData.eventDays,
        eventDaysCount: leagueData.eventDays?.length || 0,
        eventDaysWithSchedule: leagueData.eventDays?.filter(day => day.schedule && day.schedule.length > 0).length || 0,
        totalMatches: leagueData.eventDays?.reduce((sum, day) => sum + (day.schedule?.length || 0), 0) || 0,
        completedMatches: leagueData.eventDays?.reduce((sum, day) => {
          const completed = day.schedule?.filter(m => m.status === 'completed').length || 0;
          return sum + completed;
        }, 0) || 0
      });
      
      // Merge metadata fields with the actual league data
      league = {
        ...leagueData, // All league data including registeredPlayers, eventDays, etc.
        // Override with metadata fields if they exist (in case data has different values)
        id: leagueMetadata.id,
        leagueId: leagueMetadata.leagueId,
        leagueName: leagueMetadata.leagueName,
        status: leagueMetadata.status,
        description: leagueMetadata.description,
        createdAt: leagueMetadata.createdAt,
        updatedAt: leagueMetadata.updatedAt
      };
      // Ensure eventDays is an array (API may omit or return null); match history depends on eventDays[].schedule
      league.eventDays = Array.isArray(league.eventDays) ? league.eventDays : [];
    } else if (result.data) {
      // Fallback for other response formats
      league = result.data;
      league.eventDays = Array.isArray(league.eventDays) ? league.eventDays : [];
    }

    // League data comes from API/DB only; no localStorage cache
    return league || null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Request timeout loading league data');
    } else {
      console.error('Error loading league data:', error);
    }
    return null; // API/DB is source of truth; no localStorage fallback
  }
}

/**
 * Load all leagues for the current club (metadata only)
 * @returns {Array} Array of league metadata objects
 */
export async function loadAllLeagues(clubSlug = null) {
  const targetSlug = clubSlug || getClubSlug();
  if (!targetSlug) {
    console.warn('No club selected, cannot load leagues');
    return [];
  }

  // If offline, return empty array
  if (!checkOnline()) {
    console.warn('Offline - cannot load leagues list');
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${getApiBase()}/${targetSlug}/league`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No leagues exist yet
      }
      throw new Error(`Failed to load leagues: ${response.statusText}`);
    }

    const result = await response.json();
    return result.leagues || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Request timeout loading leagues');
    } else {
      console.error('Error loading leagues:', error);
    }
    return [];
  }
}

/**
 * Get stored master key from sessionStorage
 */
function getStoredMasterKey() {
  if (typeof window === 'undefined') return null;
  const clubSlug = getClubSlug();
  if (!clubSlug) return null;
  
  try {
    const key = `pickleball_admin_auth_${clubSlug}`;
    const authData = sessionStorage.getItem(key);
    if (!authData) return null;
    const parsed = JSON.parse(authData);
    return parsed.masterKey || null;
  } catch {
    return null;
  }
}

/**
 * Create a new league (Admin only)
 * @param {string} leagueName - Name of the league (must be unique within club)
 * @param {string} description - Optional description
 * @param {Object} initialData - Optional initial league data
 * @returns {Object} Created league object
 */
export async function createLeague(leagueName, description = null, initialData = null) {
  const clubSlug = getClubSlug();
  if (!clubSlug) {
    throw new Error('No club selected, cannot create league');
  }

  if (!leagueName || typeof leagueName !== 'string' || leagueName.trim() === '') {
    throw new Error('League name is required');
  }

  // Get master key from sessionStorage (admin must be logged in)
  const masterKey = getStoredMasterKey();
  if (!masterKey) {
    throw new Error('Admin access required. Please enter admin mode.');
  }

  // If offline, throw error
  if (!checkOnline()) {
    throw new Error('Cannot create league while offline');
  }

  try {
    const response = await fetch(`${getApiBase()}/${clubSlug}/league`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leagueName: leagueName.trim(),
        description: description || null,
        data: initialData || {},
        masterKey: masterKey
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create league: ${response.statusText}`);
    }

    const result = await response.json();
    return result.league;
  } catch (error) {
    console.error('Error creating league:', error);
    throw error;
  }
}

/**
 * Delete a league (Admin only)
 * @param {string} leagueId - ID of the league to delete
 * @param {string} leagueName - Alternative: name of the league to delete
 * @returns {boolean} True if successful
 */
export async function deleteLeague(leagueId = null, leagueName = null) {
  const clubSlug = getClubSlug();
  if (!clubSlug) {
    throw new Error('No club selected, cannot delete league');
  }

  if (!leagueId && !leagueName) {
    throw new Error('leagueId or leagueName is required');
  }

  // Get master key from sessionStorage (admin must be logged in)
  const masterKey = getStoredMasterKey();
  if (!masterKey) {
    throw new Error('Admin access required. Please enter admin mode.');
  }

  // If offline, throw error
  if (!checkOnline()) {
    throw new Error('Cannot delete league while offline');
  }

  try {
    const url = leagueId
      ? `${getApiBase()}/${clubSlug}/league?leagueId=${encodeURIComponent(leagueId)}`
      : `${getApiBase()}/${clubSlug}/league?leagueName=${encodeURIComponent(leagueName)}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leagueId: leagueId,
        leagueName: leagueName,
        masterKey: masterKey
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete league: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting league:', error);
    throw error;
  }
}

/**
 * Load all players for a club
 * @param {string} clubSlug - Club slug
 * @returns {Array} Array of player objects
 */
export async function loadPlayers(clubSlug = null) {
  const slug = clubSlug || getClubSlug();
  if (!slug) {
    console.warn('No club selected, cannot load players');
    return [];
  }

  // If offline, return empty array
  if (!checkOnline()) {
    console.warn('Offline - cannot load players');
    return [];
  }

  try {
    const response = await fetch(`${getApiBase()}/${slug}/players`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to load players: ${response.statusText}`);
    }

    const result = await response.json();
    return result.players || [];
  } catch (error) {
    console.error('Error loading players:', error);
    return [];
  }
}

/**
 * Create a new player
 * @param {string} clubSlug - Club slug
 * @param {Object} playerData - Player data (name, duprRating, gender)
 * @returns {Object} Created player object
 */
export async function createPlayer(clubSlug = null, playerData) {
  const slug = clubSlug || getClubSlug();
  if (!slug) {
    throw new Error('No club selected, cannot create player');
  }

  if (!playerData.name || typeof playerData.name !== 'string' || playerData.name.trim() === '') {
    throw new Error('Player name is required');
  }

  // If offline, throw error
  if (!checkOnline()) {
    throw new Error('Cannot create player while offline');
  }

  try {
    const response = await fetch(`${getApiBase()}/${slug}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playerData.name.trim(),
        duprRating: playerData.duprRating || 4.50,
        gender: playerData.gender || null
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create player: ${response.statusText}`);
    }

    const result = await response.json();
    return result.player;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
}

/**
 * Update a player
 * @param {string} clubSlug - Club slug
 * @param {string} playerId - Player ID
 * @param {Object} updates - Player updates (name, duprRating, gender)
 * @returns {Object} Updated player object
 */
export async function updatePlayer(clubSlug = null, playerId, updates) {
  const slug = clubSlug || getClubSlug();
  if (!slug) {
    throw new Error('No club selected, cannot update player');
  }

  if (!playerId) {
    throw new Error('playerId is required');
  }

  // If offline, throw error
  if (!checkOnline()) {
    throw new Error('Cannot update player while offline');
  }

  try {
    const response = await fetch(`${getApiBase()}/${slug}/players`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId: playerId,
        name: updates.name,
        duprRating: updates.duprRating,
        gender: updates.gender
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update player: ${response.statusText}`);
    }

    const result = await response.json();
    return result.player;
  } catch (error) {
    console.error('Error updating player:', error);
    throw error;
  }
}

/**
 * Delete a player
 * @param {string} clubSlug - Club slug
 * @param {string} playerId - Player ID
 * @returns {boolean} True if successful
 */
export async function deletePlayer(clubSlug = null, playerId) {
  const slug = clubSlug || getClubSlug();
  if (!slug) {
    throw new Error('No club selected, cannot delete player');
  }

  if (!playerId) {
    throw new Error('playerId is required');
  }

  // If offline, throw error
  if (!checkOnline()) {
    throw new Error('Cannot delete player while offline');
  }

  try {
    const response = await fetch(`${getApiBase()}/${slug}/players?playerId=${encodeURIComponent(playerId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete player: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting player:', error);
    throw error;
  }
}

/**
 * Register a new club
 */
export async function registerClub({ name, address, masterKey, slug }) {
  try {
    const response = await fetch(`${getApiBase()}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, address, masterKey, slug }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register club');
    }

    const result = await response.json();
    return result.club;
  } catch (error) {
    console.error('Error registering club:', error);
    throw error;
  }
}

/**
 * Verify master key for a club
 */
export async function verifyMasterKey(slug, masterKey) {
  try {
    const response = await fetch(`${getApiBase()}/${slug}/verify-master-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slug, masterKey }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify master key');
    }

    const result = await response.json();
    return result.verified === true;
  } catch (error) {
    console.error('Error verifying master key:', error);
    return false;
  }
}
