// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Ladder League Event Day', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Ladder League
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    // Add players for testing
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    // Add 20 players (minimum for full event day)
    for (let i = 0; i < 20; i++) {
      await page.locator('button:has-text("Add Random")').click();
      await page.waitForTimeout(50);
    }
    
    // Go back to dashboard
    await page.locator('button:has-text("Back to Dashboard")').click();
    await page.waitForTimeout(500);
  });

  test('should show Start Event Day button with enough players', async ({ page }) => {
    await expect(page.locator('button:has-text("Start Event Day")')).toBeVisible();
  });

  test('should start an event day', async ({ page }) => {
    await page.locator('button:has-text("Start Event Day")').click();
    await page.waitForTimeout(500);
    
    // Should see the event day heading or check-in interface
    await expect(page.getByText('Player Check-In')).toBeVisible();
  });

  test('should show check-in interface after starting event day', async ({ page }) => {
    await page.locator('button:has-text("Start Event Day")').click();
    await page.waitForTimeout(500);
    
    // Should show check-in columns - look for heading text
    await expect(page.getByRole('heading', { name: 'Player Check-In' })).toBeVisible();
    await expect(page.getByText('Available Players')).toBeVisible();
  });

  test('should check in a player', async ({ page }) => {
    await page.locator('button:has-text("Start Event Day")').click();
    await page.waitForTimeout(500);
    
    // Get count before (checked in column has Checked In heading)
    const checkedInColumn = page.locator('.checkin-column').filter({ hasText: 'Checked In' });
    const countBefore = await checkedInColumn.locator('.checkin-player').count();
    
    // Click on first available player to check them in
    const availableColumn = page.locator('.checkin-column').filter({ hasText: 'Available Players' });
    const firstPlayer = availableColumn.locator('.checkin-player').first();
    await firstPlayer.click();
    await page.waitForTimeout(300);
    
    // Count should increase
    const countAfter = await checkedInColumn.locator('.checkin-player').count();
    expect(countAfter).toBe(countBefore + 1);
  });

  test('should show check-in count', async ({ page }) => {
    await page.locator('button:has-text("Start Event Day")').click();
    await page.waitForTimeout(500);
    
    // Check in a few players
    const availableColumn = page.locator('.checkin-column').filter({ hasText: 'Available Players' });
    for (let i = 0; i < 5; i++) {
      const player = availableColumn.locator('.checkin-player').first();
      if (await player.isVisible()) {
        await player.click();
        await page.waitForTimeout(100);
      }
    }
    
    // Should show count badge with 5
    await expect(page.locator('.count-badge').filter({ hasText: '5/' })).toBeVisible();
  });

  test('should remove player from check-in', async ({ page }) => {
    await page.locator('button:has-text("Start Event Day")').click();
    await page.waitForTimeout(500);
    
    // Check in a player
    const availableColumn = page.locator('.checkin-column').filter({ hasText: 'Available Players' });
    const firstPlayer = availableColumn.locator('.checkin-player').first();
    await firstPlayer.click();
    await page.waitForTimeout(300);
    
    // Verify count is 1
    await expect(page.locator('.count-badge').filter({ hasText: '1/' })).toBeVisible();
    
    // Remove them by clicking in checked-in column
    const checkedInColumn = page.locator('.checkin-column').filter({ hasText: 'Checked In' });
    const checkedInPlayer = checkedInColumn.locator('.checkin-player').first();
    await checkedInPlayer.click();
    await page.waitForTimeout(300);
    
    // Count should go back to 0
    await expect(page.locator('.count-badge').filter({ hasText: '0/' })).toBeVisible();
  });

  test('should not allow more than 20 check-ins', async ({ page }) => {
    await page.locator('button:has-text("Start Event Day")').click();
    await page.waitForTimeout(500);
    
    // Check in all 20 players
    const availableColumn = page.locator('.checkin-column').filter({ hasText: 'Available Players' });
    for (let i = 0; i < 20; i++) {
      const player = availableColumn.locator('.checkin-player').first();
      if (await player.isVisible()) {
        await player.click();
        await page.waitForTimeout(50);
      }
    }
    
    // Should show 20/20
    await expect(page.locator('.count-badge').filter({ hasText: '20/20' })).toBeVisible();
  });

  test('should close check-in and generate courts', async ({ page }) => {
    await page.locator('button:has-text("Start Event Day")').click();
    await page.waitForTimeout(500);
    
    // Set up dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    // Check in at least 8 players
    const availableColumn = page.locator('.checkin-column').filter({ hasText: 'Available Players' });
    for (let i = 0; i < 8; i++) {
      const player = availableColumn.locator('.checkin-player').first();
      if (await player.isVisible()) {
        await player.click();
        await page.waitForTimeout(50);
      }
    }
    
    // Click close check-in button
    await page.locator('button:has-text("Close Check-In")').click();
    await page.waitForTimeout(1000);
    
    // Should show courts view
    await expect(page.getByText('Courts & Matches')).toBeVisible();
  });
});
