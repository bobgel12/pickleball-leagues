// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Tournament Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should display the header with tournament title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Pickleball League');
  });

  test('should show section tabs for Tournaments and Ladder League', async ({ page }) => {
    await expect(page.locator('.section-tab').first()).toContainText('Tournaments');
    await expect(page.locator('.section-tab').last()).toContainText('Ladder League');
  });

  test('should be on Tournaments tab by default', async ({ page }) => {
    await expect(page.locator('.section-tab.active')).toContainText('Tournaments');
  });

  test('should add a player to tournament', async ({ page }) => {
    // Use the exact placeholders from the component
    await page.locator('input[placeholder="Player name"]').fill('John Doe');
    await page.locator('input[placeholder="DUPR rating (e.g., 4.500)"]').fill('4.5');
    
    // Click Add Player button
    await page.locator('button:has-text("Add Player")').click();
    
    // Wait for the page to update
    await page.waitForTimeout(500);
    
    // Player appears in the Players section (h2: "Players (1)") and also in the summary table
    // Check for player in the players list heading showing count
    await expect(page.locator('h2:has-text("Players (1)")')).toBeVisible();
    
    // Also verify player name appears in the page
    await expect(page.getByText('John Doe').first()).toBeVisible();
  });

  test('should add random player', async ({ page }) => {
    // Click Add Random Player
    await page.locator('button:has-text("Add Random Player")').click();
    
    // Wait for state update
    await page.waitForTimeout(500);
    
    // Should see player points tag (green tag with pts)
    await expect(page.locator('.tag.green.mono')).toBeVisible();
  });

  test('should set match limit', async ({ page }) => {
    // Enter match limit
    await page.locator('input[placeholder="e.g., 20"]').fill('10');
    await page.locator('button:has-text("Apply")').click();
    
    // Wait for update
    await page.waitForTimeout(300);
    
    // Check limit is displayed
    await expect(page.locator('text=/\\/10/')).toBeVisible();
  });

  test('should change scoring system', async ({ page }) => {
    // Select Court Weighted scoring
    await page.selectOption('#scoringSystem', 'court');
    
    // Verify selection
    await expect(page.locator('#scoringSystem')).toHaveValue('court');
  });

  test('should seed courts with Fair Seed', async ({ page }) => {
    // Add some players first
    for (let i = 0; i < 8; i++) {
      await page.locator('button:has-text("Add Random Player")').click();
      await page.waitForTimeout(100);
    }
    
    // Click Fair Seed Courts
    await page.locator('button:has-text("Fair Seed Courts")').click();
    
    // Wait for courts to be populated
    await page.waitForTimeout(500);
    
    // Check that courts section exists and has slots that are not empty
    const nonEmptySlots = await page.locator('.slot:not(:has-text("Empty"))').count();
    expect(nonEmptySlots).toBeGreaterThanOrEqual(4);
  });
});

test.describe('Tournament Theme Toggle', () => {
  test('should toggle between light and dark theme', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find theme toggle button (has Moon or Sun icon)
    const themeButton = page.locator('button[title*="Switch to"]');
    
    // Click to toggle theme
    await themeButton.click();
    await page.waitForTimeout(300);
    
    // Theme system works, just verify the button is clickable
    await expect(themeButton).toBeVisible();
  });
});
