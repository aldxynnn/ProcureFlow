import { test, expect } from '@playwright/test';
test('user can open login page', async ({ page }) => { await page.goto('/'); await expect(page.getByText('Open your workspace')).toBeVisible(); });
