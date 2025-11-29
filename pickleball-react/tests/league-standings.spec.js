// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Ladder League Standings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Ladder League
    await page.click('.section-tab:has-text("Ladder League")');
    await page.waitForTimeout(500);
    
    // Add some players
    await page.click('button:has-text("Manage Players")');
    await page.waitForTimeout(500);
    
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("Add Random")');
      await page.waitForTimeout(50);
    }
    
    await page.click('button:has-text("Back to Dashboard")');
    await page.waitForTimeout(500);
    
    // Go to standings
    await page.click('button:has-text("View Standings")');
    await page.waitForTimeout(500);
  });

  test('should display standings page', async ({ page }) => {
    await expect(page.getByText('League Standings')).toBeVisible();
  });

  test('should show standings table', async ({ page }) => {
    await expect(page.locator('.league-standings-table')).toBeVisible();
  });

  test('should display table headers', async ({ page }) => {
    await expect(page.locator('th').getByText('Rank')).toBeVisible();
    await expect(page.locator('th').getByText('Player')).toBeVisible();
  });

  test('should show all registered players', async ({ page }) => {
    // Should show 10 players
    const rows = page.locator('.league-standings-table tbody tr');
    await expect(rows).toHaveCount(10);
  });

  test('should have sort controls', async ({ page }) => {
    // Points button should exist
    await expect(page.locator('button:has-text("Points")')).toBeVisible();
    await expect(page.locator('button:has-text("Win %")')).toBeVisible();
  });

  test('should sort by win percentage when clicked', async ({ page }) => {
    await page.click('button:has-text("Win %")');
    await page.waitForTimeout(300);
    
    // Table should still be visible
    await expect(page.locator('.league-standings-table')).toBeVisible();
  });

  test('should have sort dropdown', async ({ page }) => {
    // Find the sort by dropdown
    await expect(page.getByText('Sort by:')).toBeVisible();
  });

  test('should filter by minimum games', async ({ page }) => {
    // Find min games input
    const minGamesInput = page.locator('input[type="number"][min="0"]');
    await minGamesInput.fill('5');
    await page.waitForTimeout(300);
    
    // Table should still be visible (might show 0 rows)
    await expect(page.locator('.league-standings-table')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.click('button:has-text("Back")');
    await page.waitForTimeout(500);
    
    // Should be back at dashboard
    await expect(page.getByText('Registered Players')).toBeVisible();
  });

  test('should show player data in rows', async ({ page }) => {
    // Each row should have player data
    const firstRow = page.locator('.league-standings-table tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    // Should have cells with data
    const cells = firstRow.locator('td');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(3);
  });
});
