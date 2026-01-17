import { useState, useEffect, useCallback, useRef } from 'react';
import { verifyMasterKey } from '../utils/apiStorage.js';

const ADMIN_AUTH_PREFIX = 'pickleball_admin_auth_';

/**
 * Get admin auth key for a specific club
 */
function getAdminAuthKey(clubSlug) {
  return `${ADMIN_AUTH_PREFIX}${clubSlug}`;
}

/**
 * Check if admin is authenticated for a club
 */
function isAdminAuthenticated(clubSlug) {
  if (!clubSlug || typeof window === 'undefined') return false;
  const key = getAdminAuthKey(clubSlug);
  const authData = sessionStorage.getItem(key);
  if (!authData) return false;
  
  try {
    const parsed = JSON.parse(authData);
    return parsed.authenticated === true;
  } catch {
    return false;
  }
}

/**
 * Store admin authentication for a club
 * @param {string} clubSlug - Club slug
 * @param {boolean} authenticated - Whether admin is authenticated
 * @param {string} masterKey - Optional master key to store (for API calls)
 */
function setAdminAuth(clubSlug, authenticated, masterKey = null) {
  if (!clubSlug || typeof window === 'undefined') return;
  const key = getAdminAuthKey(clubSlug);
  
  if (authenticated) {
    const authData = {
      authenticated: true,
      timestamp: Date.now()
    };
    // Store master key temporarily for API calls (session only)
    if (masterKey) {
      authData.masterKey = masterKey;
    }
    sessionStorage.setItem(key, JSON.stringify(authData));
  } else {
    sessionStorage.removeItem(key);
  }
}

/**
 * Get stored master key for admin operations
 */
function getStoredMasterKey(clubSlug) {
  if (!clubSlug || typeof window === 'undefined') return null;
  const key = getAdminAuthKey(clubSlug);
  const authData = sessionStorage.getItem(key);
  if (!authData) return null;
  
  try {
    const parsed = JSON.parse(authData);
    return parsed.masterKey || null;
  } catch {
    return null;
  }
}

/**
 * Clear admin authentication for a club
 */
function clearAdminAuth(clubSlug) {
  if (!clubSlug || typeof window === 'undefined') return;
  const key = getAdminAuthKey(clubSlug);
  sessionStorage.removeItem(key);
}

/**
 * Hook to manage admin authentication state per club
 */
export function useAdminAuth(clubSlug) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return clubSlug ? isAdminAuthenticated(clubSlug) : false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track previous club slug to clear auth when switching clubs
  const prevClubSlugRef = useRef(clubSlug);

  // Update admin state when club slug changes
  useEffect(() => {
    // Clear admin auth for previous club when switching
    if (prevClubSlugRef.current && prevClubSlugRef.current !== clubSlug) {
      clearAdminAuth(prevClubSlugRef.current);
    }
    prevClubSlugRef.current = clubSlug;

    if (clubSlug) {
      const authenticated = isAdminAuthenticated(clubSlug);
      setIsAdmin(authenticated);
      setError(null);
    } else {
      setIsAdmin(false);
      setError(null);
    }
  }, [clubSlug]);

  /**
   * Login as admin using master key
   */
  const loginAdmin = useCallback(async (masterKey) => {
    if (!clubSlug) {
      setError('No club selected');
      return false;
    }

    if (!masterKey || !masterKey.trim()) {
      setError('Master key is required');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const verified = await verifyMasterKey(clubSlug, masterKey.trim());
      
      if (verified) {
        // Store master key temporarily for API calls
        setAdminAuth(clubSlug, true, masterKey.trim());
        setIsAdmin(true);
        setError(null);
        return true;
      } else {
        setError('Invalid master key');
        return false;
      }
    } catch (err) {
      console.error('Error verifying master key:', err);
      setError(err.message || 'Failed to verify master key');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [clubSlug]);

  /**
   * Logout from admin mode
   */
  const logoutAdmin = useCallback(() => {
    if (clubSlug) {
      clearAdminAuth(clubSlug);
    }
    setIsAdmin(false);
    setError(null);
  }, [clubSlug]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAdmin,
    isLoading,
    error,
    loginAdmin,
    logoutAdmin,
    clearError,
    getMasterKey: () => clubSlug ? getStoredMasterKey(clubSlug) : null
  };
}
