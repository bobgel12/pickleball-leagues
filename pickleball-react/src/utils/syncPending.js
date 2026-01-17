/**
 * Utility to sync pending changes when coming back online
 */

import { saveTournamentData, saveLeagueData } from './apiStorage.js';

/**
 * Sync pending changes to the server
 */
export async function syncPendingChanges() {
  if (typeof window === 'undefined') return;

  try {
    const pending = JSON.parse(localStorage.getItem('pickleball_pending_sync') || '[]');
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} pending changes...`);

    const results = [];
    for (const item of pending) {
      try {
        if (item.type === 'tournament') {
          const result = await saveTournamentData(item.data);
          if (result.success && !result.offline) {
            results.push({ ...item, synced: true });
          }
        } else if (item.type === 'league') {
          const result = await saveLeagueData(item.data);
          if (result.success && !result.offline) {
            results.push({ ...item, synced: true });
          }
        }
      } catch (error) {
        console.error('Error syncing pending change:', error);
        // Keep item in pending list if sync failed
      }
    }

    // Remove successfully synced items
    const remaining = pending.filter(p => 
      !results.some(r => r.timestamp === p.timestamp && r.type === p.type)
    );
    localStorage.setItem('pickleball_pending_sync', JSON.stringify(remaining));

    if (results.length > 0) {
      console.log(`Successfully synced ${results.length} pending changes`);
    }
  } catch (error) {
    console.error('Error syncing pending changes:', error);
  }
}

/**
 * Initialize sync on online event
 */
export function initSync() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('Connection restored - syncing pending changes...');
    syncPendingChanges();
  });

  // Also try to sync on page load if online
  if (navigator.onLine) {
    setTimeout(() => {
      syncPendingChanges();
    }, 2000); // Wait 2 seconds after page load
  }
}
