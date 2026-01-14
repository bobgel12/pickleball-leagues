/**
 * API-based storage utilities for multi-club support
 * Replaces localStorage with API calls to Supabase
 */

/**
 * Get the API base URL - use absolute path to bypass /app/ base path
 */
function getApiBase() {
  if (typeof window !== 'undefined') {
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
 */
export async function saveLeagueData(data) {
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

  // Check if offline
  if (!checkOnline()) {
    console.warn('Offline - saving to localStorage only');
    try {
      localStorage.setItem('pickleball_league_state', JSON.stringify(data));
      // Store pending sync
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      pending.push({ type: 'league', clubSlug, data, timestamp: Date.now() });
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
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save league data: ${response.statusText}`);
    }

    // Clear pending sync for this club
    try {
      const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
      const filtered = pending.filter(p => !(p.type === 'league' && p.clubSlug === clubSlug));
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
      pending.push({ type: 'league', clubSlug, data, timestamp: Date.now() });
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
 */
export async function loadLeagueData() {
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

    const response = await fetch(`${getApiBase()}/${clubSlug}/league`, {
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

    const { data } = await response.json();
    
    // Also save to localStorage as cache
    try {
      localStorage.setItem('pickleball_league_state', JSON.stringify(data));
    } catch (e) {
      // Ignore localStorage errors
    }

    return data;
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
