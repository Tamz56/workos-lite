import { test, expect } from '@playwright/test';

test.describe('Data-Safe Interaction Tests', () => {

  test('should navigate via sidebar links', async ({ page }) => {
    // Start on ArborDesk Home
    await page.goto('/arbor-desk');
    await expect(page.getByRole('heading', { name: 'ArborDesk', exact: true })).toBeVisible();

    // Click "Projects" link in the sidebar
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(page).toHaveURL(/.*projects/);
    await expect(page.locator('.font-display').filter({ hasText: 'Projects' })).toBeVisible();

    // Click "Tasks" link in the sidebar (which is the Planner page)
    await page.getByRole('link', { name: 'Tasks', exact: true }).click();
    await expect(page).toHaveURL(/.*planner/);
    await expect(page.locator('.font-display').filter({ hasText: 'Planner' })).toBeVisible();

    // Click "Home" link in the sidebar
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(/.*arbor-desk/);
    await expect(page.getByRole('heading', { name: 'ArborDesk', exact: true })).toBeVisible();
  });

  test('should navigate between Projects list and detail page', async ({ page }) => {
    await page.goto('/projects');
    
    // Find the project heading on the card and click it
    await page.getByRole('heading', { name: 'Green Fineness — Learning Content Sprint' }).click();
    
    // Check we navigated to the detail page
    await expect(page).toHaveURL(/.*projects\/green-fineness-learning-content-sprint-l5e/);
    await expect(page.locator('.font-display')).toContainText('Green Fineness');

    // Click the back button to return to projects list
    // Target back button by its class and content to prevent ambiguity
    await page.locator('div.group.w-fit', { hasText: 'Projects' }).click();

    // Check we returned to /projects
    await expect(page).toHaveURL(/.*projects/);
    await expect(page.locator('.font-display').filter({ hasText: 'Projects' })).toBeVisible();
  });

  test('should search and filter on Planner page without crashing', async ({ page }) => {
    await page.goto('/planner');
    
    // 1. Fill the search input with a dummy query
    const searchInput = page.getByPlaceholder('ค้นหา title / workspace / id');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test query');

    // 2. Select 'personal' workspace in the dropdown
    const selectDropdown = page.locator('select').first();
    await expect(selectDropdown).toBeVisible();
    await selectDropdown.selectOption('personal');

    // 3. Assert the URL is correct and no crash has happened
    await expect(page).toHaveURL(/.*planner/);
    await expect(page.locator('.font-display').filter({ hasText: 'Planner' })).toBeVisible();
  });

});
