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
      return stagingApiUrl.endsWith('/api/clubs') 
        ? stagingApiUrl 
        : `${stagingApiUrl.replace(/\/$/, '')}/api/clubs`;
    }
    
    // Check if production/override API URL is configured
    const prodApiUrl = import.meta.env.VITE_API_BASE_URL;
    if (prodApiUrl) {
      // Ensure it ends with /api/clubs
      return prodApiUrl.endsWith('/api/clubs') 
        ? prodApiUrl 
        : `${prodApiUrl.replace(/\/$/, '')}/api/clubs`;
    }
    
    // Use absolute URL from origin to bypass Vite's base path
    return `${window.location.origin}/api/clubs`;
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
    // Fallback to localStorage for backward compatibility
    try {
      localStorage.setItem('pickleball_league_state', JSON.stringify(data));
      return { success: true, offline: true };
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return { success: false, error: e.message };
    }
  }

  // Extract leagueId from data if not provided
  const targetLeagueId = leagueId || data?.leagueId || data?.league_id;
  const leagueName = data?.leagueName || data?.league_name;

  // Check if offline
  if (!checkOnline()) {
    console.warn('Offline - saving to localStorage only');
    try {
      localStorage.setItem('pickleball_league_state', JSON.stringify(data));
      // Store pending sync
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      pending.push({ type: 'league', clubSlug, leagueId: targetLeagueId, data, timestamp: Date.now() });
      localStorage.setItem('pickleball_pending_sync', JSON.stringify(pending));
      return { success: true, offline: true };
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return { success: false, error: e.message };
    }
  }

  try {
    const response = await fetch(`${getApiBase()}/${clubSlug}/league`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data,
        leagueId: targetLeagueId,
        leagueName: leagueName
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
    // Fallback to localStorage
    try {
      localStorage.setItem('pickleball_league_state', JSON.stringify(data));
      // Store pending sync
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      pending.push({ type: 'league', clubSlug, leagueId: targetLeagueId, data, timestamp: Date.now() });
      localStorage.setItem('pickleball_pending_sync', JSON.stringify(pending));
      return { success: true, offline: true, error: error.message };
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
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
    // Fallback to localStorage for backward compatibility
    try {
      const stored = localStorage.getItem('pickleball_league_state');
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
      const stored = localStorage.getItem('pickleball_league_state');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
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
        // Try localStorage as fallback
        try {
          const stored = localStorage.getItem('pickleball_league_state');
          return stored ? JSON.parse(stored) : null;
        } catch (e) {
          return null;
        }
      }
      throw new Error(`Failed to load league data: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle different response formats (single league vs list)
    const league = result.league || result.data;
    
    if (league) {
      // Also save to localStorage as cache
      try {
        localStorage.setItem('pickleball_league_state', JSON.stringify(league));
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    return league || null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Request timeout - loading from localStorage');
    } else {
      console.error('Error loading league data:', error);
    }
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('pickleball_league_state');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
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
 * Create a new league
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
        data: initialData || {}
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
 * Delete a league
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
        leagueName: leagueName
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
