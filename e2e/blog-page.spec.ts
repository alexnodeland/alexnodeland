import { test, expect } from '@playwright/test';

test.describe('Blog Page', () => {
  test('should load blog page successfully', async ({ page }) => {
    await page.goto('/blog');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/blog/i);
  });

  test('should display basic content', async ({ page }) => {
    await page.goto('/blog');
    
    // Check that basic blog content is visible
    await expect(page.getByText(/blog/i).first()).toBeVisible();
    
    // Check that navigation exists
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/blog');
    
    // Check meta description exists
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content');
  });

  test('should load without critical JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/blog');
    
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