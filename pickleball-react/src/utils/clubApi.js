/**
 * Club API - Database integration for club management
 * Uses backend API with localStorage as cache/fallback
 */

const API_BASE_URL = '/api';

/**
 * Get API endpoint URL
 */
function getApiUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`;
}

/**
 * Fetch club by ID from database
 */
export async function fetchClubById(clubId) {
  try {
    const response = await fetch(getApiUrl(`/clubs/${clubId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch club: ${response.statusText}`);
    }

    const club = await response.json();
    return club;
  } catch (error) {
    console.error('Error fetching club from database:', error);
    // Fallback to localStorage
    const localStorageClub = localStorage.getItem(`pb_club_${clubId}`);
    if (localStorageClub) {
      try {
        return JSON.parse(localStorageClub);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Fetch all clubs from database
 */
export async function fetchAllClubs() {
  try {
    const response = await fetch(getApiUrl('/clubs'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch clubs: ${response.statusText}`);
    }

    const clubs = await response.json();
    return clubs;
  } catch (error) {
    console.error('Error fetching clubs from database:', error);
    return [];
  }
}

/**
 * Create a new club in the database
 */
export async function createClub(clubData) {
  try {
    const response = await fetch(getApiUrl('/clubs'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clubData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create club: ${response.statusText}`);
    }

    const club = await response.json();
    
    // Cache in localStorage
    if (club && club.id) {
      localStorage.setItem(`pb_club_${club.id}`, JSON.stringify(club));
    }
    
    return club;
  } catch (error) {
    console.error('Error creating club in database:', error);
    throw error;
  }
}

/**
 * Update club in the database
 */
export async function updateClub(clubId, clubData) {
  try {
    const response = await fetch(getApiUrl(`/clubs/${clubId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...clubData,
        updatedAt: Date.now()
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update club: ${response.statusText}`);
    }

    const club = await response.json();
    
    // Update cache in localStorage
    if (club && club.id) {
      localStorage.setItem(`pb_club_${club.id}`, JSON.stringify(club));
    }
    
    return club;
  } catch (error) {
    console.error('Error updating club in database:', error);
    throw error;
  }
}

/**
 * Delete club from database
 */
export async function deleteClub(clubId) {
  try {
    const response = await fetch(getApiUrl(`/clubs/${clubId}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete club: ${response.statusText}`);
    }

    // Remove from localStorage cache
    localStorage.removeItem(`pb_club_${clubId}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting club from database:', error);
    throw error;
  }
}

/**
 * Search clubs by name or location
 */
export async function searchClubs(query) {
  try {
    const response = await fetch(getApiUrl(`/clubs/search?q=${encodeURIComponent(query)}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to search clubs: ${response.statusText}`);
    }

    const clubs = await response.json();
    return clubs;
  } catch (error) {
    console.error('Error searching clubs:', error);
    return [];
  }
}
