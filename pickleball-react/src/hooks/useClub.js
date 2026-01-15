import { useState, useEffect, useCallback } from 'react';
import { getApiBase } from '../utils/apiStorage.js';

const CLUB_SLUG_KEY = 'pickleball_club_slug';

export function useClub() {
  const [clubSlug, setClubSlugState] = useState(() => {
    // Try to get from sessionStorage first, then localStorage as fallback
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(CLUB_SLUG_KEY) || 
             localStorage.getItem(CLUB_SLUG_KEY) || 
             null;
    }
    return null;
  });

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load club data when slug changes
  useEffect(() => {
    if (!clubSlug) {
      setClub(null);
      return;
    }

    const fetchClub = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = `${getApiBase()}/${clubSlug}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Club not found');
            setClubSlug(null);
            return;
          }
          throw new Error('Failed to fetch club');
        }
        const { club: clubData } = await response.json();
        setClub(clubData);
      } catch (err) {
        console.error('Error fetching club:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [clubSlug]);

  const setClubSlug = useCallback((slug) => {
    if (typeof window !== 'undefined') {
      if (slug) {
        sessionStorage.setItem(CLUB_SLUG_KEY, slug);
        localStorage.setItem(CLUB_SLUG_KEY, slug);
      } else {
        sessionStorage.removeItem(CLUB_SLUG_KEY);
        localStorage.removeItem(CLUB_SLUG_KEY);
      }
    }
    setClubSlugState(slug);
    setClub(null);
    setError(null);
  }, []);

  const clearClub = useCallback(() => {
    setClubSlug(null);
  }, []);

  return {
    clubSlug,
    club,
    loading,
    error,
    setClubSlug,
    clearClub,
    isClubSelected: !!clubSlug
  };
}
