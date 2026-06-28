import { test, expect } from '@playwright/test';

test('should load the app and redirect to dashboard', async ({ page }) => {
  // Navigate to root which should redirect to dashboard
  await page.goto('/');

  // Expect URL to change to dashboard
  await expect(page).toHaveURL(/.*dashboard/);
});
