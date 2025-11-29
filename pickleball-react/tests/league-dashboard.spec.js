// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Ladder League Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Ladder League
    await page.click('.section-tab:has-text("Ladder League")');
    await page.waitForTimeout(500);
  });

  test('should switch to Ladder League section', async ({ page }) => {
    await expect(page.locator('.section-tab.active')).toContainText('Ladder League');
    await expect(page.locator('h1')).toContainText('Ladder League');
  });

  test('should display league dashboard', async ({ page }) => {
    // Dashboard should show league name in h2
    await expect(page.locator('h2').first()).toBeVisible();
  });

  test('should show empty state when no players', async ({ page }) => {
    await expect(page.getByText('No Players Registered')).toBeVisible();
  });

  test('should display league stats', async ({ page }) => {
    // Should show stat labels
    await expect(page.getByText('Registered Players')).toBeVisible();
    await expect(page.getByText('Event Days')).toBeVisible();
  });

  test('should have View Standings button', async ({ page }) => {
    await expect(page.locator('button:has-text("View Standings")')).toBeVisible();
  });

  test('should have Manage Players button', async ({ page }) => {
    await expect(page.locator('button:has-text("Manage Players")')).toBeVisible();
  });

  test('should navigate to setup when clicking Add Players', async ({ page }) => {
    await page.click('button:has-text("Add Players")');
    await page.waitForTimeout(500);
    
    // Should see player registration form
    await expect(page.locator('input[placeholder="Enter player name"]')).toBeVisible();
  });

  test('should navigate to setup when clicking Manage Players', async ({ page }) => {
    await page.click('button:has-text("Manage Players")');
    await page.waitForTimeout(500);
    
    // Should see setup page with back button
    await expect(page.locator('button:has-text("Back to Dashboard")')).toBeVisible();
  });

  test('should navigate to standings', async ({ page }) => {
    await page.click('button:has-text("View Standings")');
    await page.waitForTimeout(500);
    
    // Should see standings page
    await expect(page.getByText('League Standings')).toBeVisible();
  });
});
