// @ts-check
/**
 * Tests for Round Revert Functionality
 * 
 * This test suite covers the revert functionality for both tournaments and leagues:
 * - Tournament round revert (snapshot creation, state restoration, UI visibility)
 * - League round revert in regular mode
 * - League round revert in mixed doubles mode (auto-submission)
 * 
 * To run these tests:
 *   npm run test -- revert-round.spec.js
 * 
 * Or run all tests:
 *   npm run test
 */
import { test, expect } from '@playwright/test';

/**
 * Helper to set up a tournament with players and courts
 */
async function setupTournament(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Wait for page to load and check if we need to enter admin mode
  // Check if "Enter Admin Mode" button exists
  const enterAdminBtn = page.locator('button:has-text("Enter Admin Mode")');
  if (await enterAdminBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await enterAdminBtn.click();
    await page.waitForTimeout(500);
  }
  
  // Navigate to Tournaments tab if not already there
  const tournamentsTab = page.locator('.section-tab:has-text("Tournaments")');
  const activeTab = page.locator('.section-tab.active');
  
  // Check if tournaments tab exists and is not active
  if (await tournamentsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    const activeText = await activeTab.textContent().catch(() => '');
    if (!activeText?.includes('Tournaments')) {
      await tournamentsTab.click();
      await page.waitForTimeout(500);
    }
  }
  
  // Wait for the tournament interface to be ready
  // Try multiple selectors that might indicate tournament interface is ready
  await Promise.race([
    page.waitForSelector('button:has-text("Add Random Player")', { timeout: 10000 }),
    page.waitForSelector('input[placeholder="Player name"]', { timeout: 10000 }),
    page.waitForSelector('.section-tab.active:has-text("Tournaments")', { timeout: 10000 })
  ]).catch(() => {
    // If none found, continue anyway - might be a different UI state
  });
  
  // Add 8 players - check if button exists first
  const addRandomBtn = page.locator('button:has-text("Add Random Player")');
  if (await addRandomBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    for (let i = 0; i < 8; i++) {
      await addRandomBtn.click();
      await page.waitForTimeout(100);
    }
  }
  
  // Seed courts - check if button exists
  const seedBtn = page.locator('button:has-text("Fair Seed Courts")');
  if (await seedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await seedBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Helper to submit a round in tournament
 */
async function submitTournamentRound(page) {
  // Submit scores for all courts
  const courts = [0, 1, 2, 3];
  for (const courtIndex of courts) {
    const court = page.locator('.court').nth(courtIndex);
    const scoreInput = court.locator('input[type="text"]').first();
    
    if (await scoreInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scoreInput.fill('11-7');
      await page.waitForTimeout(200);
      
      // Submit court - try multiple button text variations
      const submitBtn = court.locator('button:has-text("Submit")').first();
      if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }
  
  // Submit round - wait for button to be available
  const submitRoundBtn = page.locator('button:has-text("Submit Round")');
  await submitRoundBtn.waitFor({ timeout: 5000 }).catch(() => {});
  if (await submitRoundBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await submitRoundBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Helper to set up a league with players and an active event day
 */
async function setupActiveEventDay(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Navigate to Ladder League (should be default, but ensure we're there)
  const leagueTab = page.locator('.section-tab:has-text("Ladder League")');
  const activeTab = page.locator('.section-tab.active');
  
  // Check if league tab exists
  if (await leagueTab.isVisible({ timeout: 10000 }).catch(() => false)) {
    const activeText = await activeTab.textContent().catch(() => '');
    if (!activeText?.includes('Ladder League')) {
      await leagueTab.click();
      await page.waitForTimeout(500);
    }
  } else {
    // If tab not found, might already be on league section (default)
    await page.waitForTimeout(500);
  }
  
  // Add players
  await page.click('button:has-text("Manage Players")');
  await page.waitForTimeout(500);
  
  for (let i = 0; i < 20; i++) {
    await page.click('button:has-text("Add Random")');
    await page.waitForTimeout(30);
  }
  
  // Go back to dashboard
  await page.click('button:has-text("Back to Dashboard")');
  await page.waitForTimeout(500);
  
  // Start event day
  await page.click('button:has-text("Start Event Day")');
  await page.waitForTimeout(500);
  
  // Set up dialog handler
  page.on('dialog', dialog => dialog.accept());
  
  // Check in 16 players (divisible by 4)
  for (let i = 0; i < 16; i++) {
    const player = page.locator('.checkin-column').first().locator('.checkin-player').first();
    if (await player.isVisible()) {
      await player.click();
      await page.waitForTimeout(30);
    }
  }
  
  // Close check-in
  await page.click('button:has-text("Close Check-In")');
  await page.waitForTimeout(1000);
}

/**
 * Helper to complete all matches in current round for league
 */
async function completeCurrentRound(page) {
  // Find all match score inputs
  const scoreInputs = page.locator('.match-score-input input');
  const count = await scoreInputs.count();
  
  for (let i = 0; i < count; i++) {
    const input = scoreInputs.nth(i);
    if (await input.isVisible()) {
      await input.fill('11-7');
      await page.waitForTimeout(200);
      
      // Click submit button
      const submitBtn = page.locator('.match-score-input button').nth(i);
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }
  
  await page.waitForTimeout(500);
}

test.describe('Tournament Round Revert', () => {
  test.beforeEach(async ({ page }) => {
    await setupTournament(page);
  });

  test('should create snapshot when round is submitted', async ({ page }) => {
    // Submit a round
    await submitTournamentRound(page);
    
    // Check that snapshot exists in localStorage
    const tournamentData = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return tournament?.lastRoundSnapshot;
    });
    
    expect(tournamentData).not.toBeNull();
    expect(tournamentData).toHaveProperty('courts');
    expect(tournamentData).toHaveProperty('matches');
    expect(tournamentData).toHaveProperty('timestamp');
  });

  test('should show revert button after round submission', async ({ page }) => {
    // Submit a round
    await submitTournamentRound(page);
    
    // Revert button should be visible
    await expect(page.locator('button:has-text("Revert Last Round")')).toBeVisible();
  });

  test('should not show revert button before any round submission', async ({ page }) => {
    // Revert button should not be visible
    await expect(page.locator('button:has-text("Revert Last Round")')).not.toBeVisible();
  });

  test('should revert round and restore previous state', async ({ page }) => {
    // Get initial match count
    const initialMatchCount = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return 0;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return tournament?.matches?.length || 0;
    });
    
    // Submit a round
    await submitTournamentRound(page);
    
    // Verify match count increased
    const afterSubmitCount = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return 0;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return tournament?.matches?.length || 0;
    });
    
    expect(afterSubmitCount).toBeGreaterThan(initialMatchCount);
    
    // Set up dialog handler for confirmation
    page.on('dialog', dialog => dialog.accept());
    
    // Revert the round
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(1000);
    
    // Verify match count is back to initial
    const afterRevertCount = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return 0;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return tournament?.matches?.length || 0;
    });
    
    expect(afterRevertCount).toBe(initialMatchCount);
  });

  test('should clear snapshot after revert', async ({ page }) => {
    // Submit a round
    await submitTournamentRound(page);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Revert the round
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(1000);
    
    // Snapshot should be cleared
    const snapshot = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return tournament?.lastRoundSnapshot;
    });
    
    expect(snapshot).toBeNull();
    
    // Revert button should no longer be visible
    await expect(page.locator('button:has-text("Revert Last Round")')).not.toBeVisible();
  });

  test('should restore court assignments after revert', async ({ page }) => {
    // Get initial court assignments
    const initialCourts = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return JSON.parse(JSON.stringify(tournament?.courts || []));
    });
    
    // Submit a round (this changes court assignments)
    await submitTournamentRound(page);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Revert the round
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(1000);
    
    // Verify courts are restored
    const revertedCourts = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return JSON.parse(JSON.stringify(tournament?.courts || []));
    });
    
    // Courts should match initial state
    expect(JSON.stringify(revertedCourts)).toBe(JSON.stringify(initialCourts));
  });

  test('should show confirmation dialog before reverting', async ({ page }) => {
    // Submit a round
    await submitTournamentRound(page);
    
    let dialogShown = false;
    page.on('dialog', dialog => {
      dialogShown = true;
      expect(dialog.message()).toContain('revert');
      dialog.accept();
    });
    
    // Click revert button
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(500);
    
    expect(dialogShown).toBe(true);
  });

  test('should cancel revert when dialog is dismissed', async ({ page }) => {
    // Submit a round
    await submitTournamentRound(page);
    
    const matchCountBefore = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return 0;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return tournament?.matches?.length || 0;
    });
    
    // Set up dialog handler to dismiss
    page.on('dialog', dialog => dialog.dismiss());
    
    // Click revert button
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(500);
    
    // Match count should remain the same
    const matchCountAfter = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return 0;
      const parsed = JSON.parse(state);
      const tournament = parsed.tournaments?.[0];
      return tournament?.matches?.length || 0;
    });
    
    expect(matchCountAfter).toBe(matchCountBefore);
  });
});

test.describe('League Round Revert - Regular Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupActiveEventDay(page);
  });

  test('should create snapshot when round is submitted', async ({ page }) => {
    // Complete all matches in current round
    await completeCurrentRound(page);
    
    // Submit the round
    await page.locator('button:has-text("Submit Round")').click();
    await page.waitForTimeout(1000);
    
    // Check that snapshot exists
    const snapshot = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.lastRoundSnapshot;
    });
    
    expect(snapshot).not.toBeNull();
    expect(snapshot).toHaveProperty('currentActiveRound');
    expect(snapshot).toHaveProperty('courtAssignments');
    expect(snapshot).toHaveProperty('schedule');
    expect(snapshot).toHaveProperty('playerStats');
  });

  test('should show revert button after round submission', async ({ page }) => {
    // Complete all matches in current round
    await completeCurrentRound(page);
    
    // Submit the round
    await page.locator('button:has-text("Submit Round")').click();
    await page.waitForTimeout(1000);
    
    // Revert button should be visible
    await expect(page.locator('button:has-text("Revert Last Round")')).toBeVisible();
  });

  test('should revert round and restore previous state', async ({ page }) => {
    // Get initial round number
    const initialRound = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.currentActiveRound || 1;
    });
    
    // Complete all matches in current round
    await completeCurrentRound(page);
    
    // Submit the round
    await page.locator('button:has-text("Submit Round")').click();
    await page.waitForTimeout(1000);
    
    // Verify round number increased
    const afterSubmitRound = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.currentActiveRound || 1;
    });
    
    expect(afterSubmitRound).toBe(initialRound + 1);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Revert the round
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(1000);
    
    // Verify round number is back to initial
    const afterRevertRound = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.currentActiveRound || 1;
    });
    
    expect(afterRevertRound).toBe(initialRound);
  });

  test('should restore schedule after revert', async ({ page }) => {
    // Get initial schedule length
    const initialScheduleLength = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return 0;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.schedule?.length || 0;
    });
    
    // Complete all matches in current round
    await completeCurrentRound(page);
    
    // Submit the round (this adds new matches)
    await page.locator('button:has-text("Submit Round")').click();
    await page.waitForTimeout(1000);
    
    // Verify schedule length increased
    const afterSubmitLength = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return 0;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.schedule?.length || 0;
    });
    
    expect(afterSubmitLength).toBeGreaterThan(initialScheduleLength);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Revert the round
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(1000);
    
    // Verify schedule is restored
    const afterRevertLength = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return 0;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.schedule?.length || 0;
    });
    
    expect(afterRevertLength).toBe(initialScheduleLength);
  });

  test('should restore player stats after revert', async ({ page }) => {
    // Complete all matches in current round
    await completeCurrentRound(page);
    
    // Get player stats before submit
    const statsBefore = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const firstPlayer = league?.registeredPlayers?.[0];
      return firstPlayer ? {
        points: firstPlayer.cumulativePoints || 0,
        wins: firstPlayer.totalWins || 0,
        losses: firstPlayer.totalLosses || 0
      } : null;
    });
    
    if (!statsBefore) {
      test.skip();
      return;
    }
    
    // Submit the round
    await page.locator('button:has-text("Submit Round")').click();
    await page.waitForTimeout(1000);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Revert the round
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(1000);
    
    // Verify stats are restored
    const statsAfter = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const firstPlayer = league?.registeredPlayers?.[0];
      return firstPlayer ? {
        points: firstPlayer.cumulativePoints || 0,
        wins: firstPlayer.totalWins || 0,
        losses: firstPlayer.totalLosses || 0
      } : null;
    });
    
    expect(statsAfter).toEqual(statsBefore);
  });

  test('should clear snapshot after revert', async ({ page }) => {
    // Complete all matches in current round
    await completeCurrentRound(page);
    
    // Submit the round
    await page.locator('button:has-text("Submit Round")').click();
    await page.waitForTimeout(1000);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Revert the round
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(1000);
    
    // Snapshot should be cleared
    const snapshot = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.lastRoundSnapshot;
    });
    
    expect(snapshot).toBeNull();
    
    // Revert button should no longer be visible
    await expect(page.locator('button:has-text("Revert Last Round")')).not.toBeVisible();
  });
});

test.describe('League Round Revert - Mixed Doubles Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Ladder League
    await page.click('.section-tab:has-text("Ladder League")');
    await page.waitForTimeout(500);
    
    // Create a new league with mixed doubles mode
    await page.click('button:has-text("Create League")');
    await page.waitForTimeout(500);
    
    // Fill in league name
    await page.locator('input[placeholder="Enter league name"]').fill('Mixed Doubles Test');
    await page.waitForTimeout(200);
    
    // Select Mixed Doubles mode
    await page.locator('select[name="leagueMode"]').selectOption('mixed_doubles');
    await page.waitForTimeout(200);
    
    // Create the league
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(500);
    
    // Add players (need pairs, so even number)
    await page.click('button:has-text("Manage Players")');
    await page.waitForTimeout(500);
    
    for (let i = 0; i < 16; i++) {
      await page.click('button:has-text("Add Random")');
      await page.waitForTimeout(30);
    }
    
    // Go back to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await page.waitForTimeout(500);
    
    // Start event day
    await page.click('button:has-text("Start Event Day")');
    await page.waitForTimeout(500);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Check in 16 players
    for (let i = 0; i < 16; i++) {
      const player = page.locator('.checkin-column').first().locator('.checkin-player').first();
      if (await player.isVisible()) {
        await player.click();
        await page.waitForTimeout(30);
      }
    }
    
    // Close check-in
    await page.click('button:has-text("Close Check-In")');
    await page.waitForTimeout(1000);
  });

  test('should create snapshot when round auto-submits in mixed doubles', async ({ page }) => {
    // Complete all matches in round 1 (mixed doubles auto-submits)
    await completeCurrentRound(page);
    
    // Wait for auto-submission
    await page.waitForTimeout(2000);
    
    // Check that snapshot exists
    const snapshot = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.lastRoundSnapshot;
    });
    
    expect(snapshot).not.toBeNull();
    expect(snapshot).toHaveProperty('currentActiveRound');
    expect(snapshot).toHaveProperty('courtAssignments');
  });

  test('should show revert button after auto-submission in mixed doubles', async ({ page }) => {
    // Complete all matches in round 1
    await completeCurrentRound(page);
    
    // Wait for auto-submission
    await page.waitForTimeout(2000);
    
    // Revert button should be visible
    await expect(page.locator('button:has-text("Revert Last Round")')).toBeVisible();
  });

  test('should revert auto-submitted round in mixed doubles', async ({ page }) => {
    // Get initial round number
    const initialRound = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.currentActiveRound || 1;
    });
    
    // Complete all matches in round 1 (auto-submits)
    await completeCurrentRound(page);
    
    // Wait for auto-submission
    await page.waitForTimeout(2000);
    
    // Verify round number increased
    const afterSubmitRound = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.currentActiveRound || 1;
    });
    
    expect(afterSubmitRound).toBeGreaterThan(initialRound);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Revert the round
    await page.locator('button:has-text("Revert Last Round")').click();
    await page.waitForTimeout(1000);
    
    // Verify round number is restored
    const afterRevertRound = await page.evaluate(() => {
      const state = localStorage.getItem('appState');
      if (!state) return null;
      const parsed = JSON.parse(state);
      const league = parsed.leagues?.[0];
      const eventDay = league?.eventDays?.[league.currentEventDayIndex];
      return eventDay?.currentActiveRound || 1;
    });
    
    expect(afterRevertRound).toBe(initialRound);
  });
});
