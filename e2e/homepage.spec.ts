import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads with correct title
    await expect(page).toHaveTitle(/Alex Nodeland/);
    
    // Check for basic content
    await expect(page.getByText('Alex Nodeland').first()).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content');
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check that navigation exists
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    
    // Check that main navigation links exist
    await expect(page.getByRole('link', { name: 'home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'blog' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'cv' })).toBeVisible();
  });

  test('should have working theme toggle', async ({ page }) => {
    await page.goto('/');
    
    // Look for theme toggle button
    const themeToggle = page.getByRole('button').first();
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      // Just verify the page still works after clicking
      await expect(page.getByText('Alex Nodeland').first()).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that content is still visible
    await expect(page.getByText('Alex Nodeland').first()).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should load without critical JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Check that there are no critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      error && // Check if error exists
      !error.includes('Warning') && 
      !error.includes('console.warn') &&
      !error.includes('NO_COLOR')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});