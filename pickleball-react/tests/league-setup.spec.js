// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Ladder League Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Ladder League
    await page.locator('.section-tab:has-text("Ladder League")').click();
    await page.waitForTimeout(500);
    
    // Go to Setup
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
  });

  test('should display league settings form', async ({ page }) => {
    await expect(page.getByText('League Settings')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter league name"]')).toBeVisible();
  });

  test('should update league name', async ({ page }) => {
    const nameInput = page.locator('input[placeholder="Enter league name"]');
    await nameInput.clear();
    await nameInput.fill('My Test League');
    
    await page.locator('button:has-text("Save Settings")').click();
    await page.waitForTimeout(500);
    
    // Name should be saved
    await expect(nameInput).toHaveValue('My Test League');
  });

  test('should change scoring system', async ({ page }) => {
    // Select Smart Points
    const select = page.locator('select').first();
    await select.selectOption('smart');
    await page.locator('button:has-text("Save Settings")').click();
    
    await page.waitForTimeout(500);
    
    // Should be saved
    await expect(select).toHaveValue('smart');
  });

  test('should add a player', async ({ page }) => {
    // Fill in player details
    await page.locator('input[placeholder="Enter player name"]').fill('Alice Smith');
    await page.locator('input[placeholder="4.500"]').fill('5.5');
    
    // Click the Add button - use getByRole with exact name
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(500);
    
    // Player should appear in list
    await expect(page.locator('.registered-player-item').filter({ hasText: 'Alice Smith' })).toBeVisible();
  });

  test('should add random player', async ({ page }) => {
    const initialCount = await page.locator('.registered-player-item').count();
    
    await page.locator('button:has-text("Add Random")').click();
    await page.waitForTimeout(500);
    
    const newCount = await page.locator('.registered-player-item').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should show player count', async ({ page }) => {
    // Add a few players
    for (let i = 0; i < 3; i++) {
      await page.locator('button:has-text("Add Random")').click();
      await page.waitForTimeout(200);
    }
    
    // Should show count in header
    await expect(page.getByText(/Players \(3\//)).toBeVisible();
  });

  test('should remove a player', async ({ page }) => {
    // Add a player first
    await page.locator('input[placeholder="Enter player name"]').fill('Bob Jones');
    await page.locator('input[placeholder="4.500"]').fill('4.0');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(500);
    
    // Verify player exists
    await expect(page.locator('.registered-player-item').filter({ hasText: 'Bob Jones' })).toBeVisible();
    
    // Set up dialog handler before clicking
    page.on('dialog', dialog => dialog.accept());
    
    // Click remove button for this player
    await page.locator('.registered-player-item').filter({ hasText: 'Bob Jones' }).locator('button').click();
    await page.waitForTimeout(500);
    
    // Player should be gone
    const count = await page.locator('.registered-player-item').filter({ hasText: 'Bob Jones' }).count();
    expect(count).toBe(0);
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.locator('button:has-text("Back to Dashboard")').click();
    await page.waitForTimeout(500);
    
    // Should be back at dashboard - check for dashboard-specific elements
    await expect(page.getByText('Registered Players')).toBeVisible();
  });

  test('should persist players after navigation', async ({ page }) => {
    // Add a player
    await page.locator('input[placeholder="Enter player name"]').fill('Persistent Player');
    await page.locator('input[placeholder="4.500"]').fill('6.0');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(500);
    
    // Verify player exists
    await expect(page.locator('.registered-player-item').filter({ hasText: 'Persistent Player' })).toBeVisible();
    
    // Navigate away
    await page.locator('button:has-text("Back to Dashboard")').click();
    await page.waitForTimeout(500);
    
    // Navigate back
    await page.locator('button:has-text("Manage Players")').click();
    await page.waitForTimeout(500);
    
    // Player should still be there
    await expect(page.locator('.registered-player-item').filter({ hasText: 'Persistent Player' })).toBeVisible();
  });
});
