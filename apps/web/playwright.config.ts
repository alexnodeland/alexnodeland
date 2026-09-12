import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* One worker on CI. Two was tried and cost more than it bought: the suite
     went from 1 flaky test to 5, with fourteen timeouts across four spec
     files including a plain homepage load. Both projects drive a single
     Gatsby dev server, and the dev server compiles on demand on one thread,
     so a second worker mostly queues behind the first. Real parallelism here
     means serving a static build instead, not raising this number. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. Overridable so
       a suite can run against an already-running server on another port —
       locally 8000 is often taken by unrelated services. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests — unless the suite
     was pointed at a server that already exists. */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run develop',
        url: 'http://localhost:8000',
        reuseExistingServer: !process.env.CI,
        // `npm run develop` builds the web worker with webpack before Gatsby's
        // own first compile even starts, and the two together run past two
        // minutes from cold — the suite used to fail on the server timeout
        // rather than on anything it was meant to test.
        timeout: 5 * 60 * 1000,
      },
});
