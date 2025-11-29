// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Ladder League Export/Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Ladder League
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
  });

  test('should have export button on dashboard', async ({ page }) => {
    // Export button should be visible (Download icon)
    await expect(page.locator('button[title="Export League Data"]')).toBeVisible();
  });

  test('should trigger download on export', async ({ page }) => {
    // Add some players first
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    for (let i = 0; i < 5; i++) {
      await page.locator('button:has-text("Add Random")').click();
      await page.waitForTimeout(50);
    }
    
    await page.locator('button:has-text("Back to Dashboard")').click();
    await page.waitForTimeout(500);
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export
    await page.locator('button[title="Export League Data"]').click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename format
    expect(download.suggestedFilename()).toMatch(/ladder-league.*\.json/);
  });

  test('should have import button on setup page', async ({ page }) => {
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    // Import League button should be visible
    await expect(page.getByText('Import League')).toBeVisible();
  });

  test('should have CSV import button', async ({ page }) => {
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    // Import CSV button should be visible
    await expect(page.getByText('Import CSV')).toBeVisible();
  });
});

test.describe('Ladder League Data Persistence', () => {
  test('should persist league data across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Ladder League
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    // Add players
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    await page.locator('input[placeholder="Enter player name"]').fill('Persistent Player Test');
    await page.locator('input[placeholder="4.500"]').fill('5.0');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(500);
    
    // Verify player exists
    await expect(page.locator('.registered-player-item').filter({ hasText: 'Persistent Player Test' })).toBeVisible();
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Navigate back to League
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    // Player should still be there
    await expect(page.locator('.registered-player-item').filter({ hasText: 'Persistent Player Test' })).toBeVisible();
  });

  test('should persist league settings', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Ladder League
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    // Go to setup
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    // Change league name
    const nameInput = page.locator('input[placeholder="Enter league name"]');
    await nameInput.clear();
    await nameInput.fill('Test League Name');
    await page.locator('button:has-text("Save Settings")').click();
    await page.waitForTimeout(500);
    
    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Check name persisted
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('input[placeholder="Enter league name"]')).toHaveValue('Test League Name');
  });

  test('should have separate storage from tournaments', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Add player to tournament using correct placeholders
    await page.locator('input[placeholder="Player name"]').fill('Tournament Player');
    await page.locator('input[placeholder="DUPR rating (e.g., 4.500)"]').fill('4.5');
    await page.locator('button:has-text("Add Player")').click();
    await page.waitForTimeout(500);
    
    // Verify tournament player appears in Players heading (count should be 1)
    await expect(page.locator('h2:has-text("Players (1)")')).toBeVisible();
    
    // Switch to League
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    // Add player to league
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    await page.locator('input[placeholder="Enter player name"]').fill('League Player');
    await page.locator('input[placeholder="4.500"]').fill('5.0');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(500);
    
    // Verify league player
    await expect(page.locator('.registered-player-item').filter({ hasText: 'League Player' })).toBeVisible();
    
    // Tournament player should NOT be visible in league
    const tournamentPlayerInLeague = await page.locator('.registered-player-item').filter({ hasText: 'Tournament Player' }).count();
    expect(tournamentPlayerInLeague).toBe(0);
    
    // Switch back to tournament
    await page.locator('.section-tab:has-text("Tournaments")').click();
    await page.waitForTimeout(500);
    
    // Verify tournament player still exists (check for 1 player in heading)
    await expect(page.locator('h2:has-text("Players (1)")')).toBeVisible();
    await expect(page.getByText('Tournament Player').first()).toBeVisible();
  });
});

test.describe('League Reset', () => {
  test('should have reset button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('button:has-text("Reset League")')).toBeVisible();
  });

  test('should reset league on confirm', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    // Add a player
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    await page.locator('input[placeholder="Enter player name"]').fill('To Be Deleted');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(500);
    
    // Verify player exists
    await expect(page.locator('.registered-player-item').filter({ hasText: 'To Be Deleted' })).toBeVisible();
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Click reset
    await page.locator('button:has-text("Reset League")').click();
    await page.waitForTimeout(500);
    
    // Player should be gone
    const playerCount = await page.locator('.registered-player-item').filter({ hasText: 'To Be Deleted' }).count();
    expect(playerCount).toBe(0);
  });
});
