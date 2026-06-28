import { test, expect } from '@playwright/test';

test.describe('Core Flow E2E Smoke Tests', () => {
  
  test('should load ArborDesk (Home) page successfully', async ({ page }) => {
    await page.goto('/arbor-desk');
    // Assert heading "ArborDesk" is visible (renders as h1)
    await expect(page.getByRole('heading', { name: 'ArborDesk', exact: true })).toBeVisible();
  });

  test('should load Legacy Dashboard page successfully', async ({ page }) => {
    await page.goto('/dashboard');
    // Ensure the page loads without showing a fatal error heading
    await expect(page.getByRole('heading', { name: 'Failed to load dashboard' })).not.toBeVisible();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should load Projects list page successfully', async ({ page }) => {
    await page.goto('/projects');
    // Assert page title "Projects" is visible (PageHeader title is a div with .font-display)
    await expect(page.locator('.font-display').filter({ hasText: 'Projects' })).toBeVisible();
  });

  // Note: This test is local-data-dependent and relies on seed/existing database record.
  test('should load Project Detail page successfully (local-data-dependent)', async ({ page }) => {
    const slug = 'green-fineness-learning-content-sprint-l5e';
    await page.goto(`/projects/${slug}`);
    
    // 1. Verify URL is correct
    await expect(page).toHaveURL(new RegExp(`.*projects/${slug}`));
    
    // 2. Verify the role-specific header "Projects" is visible (resolves to the Topbar h1)
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
    
    // 3. Verify the project title contains the expected text
    await expect(page.locator('.font-display')).toContainText('Green Fineness');
  });

  test('should load Planner (Tasks) page successfully', async ({ page }) => {
    await page.goto('/planner');
    // Assert page title "Planner" is visible (PageHeader title is a div with .font-display)
    await expect(page.locator('.font-display').filter({ hasText: 'Planner' })).toBeVisible();
  });

});
