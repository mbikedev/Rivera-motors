import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Cloud sandboxes ship a pre-installed Chromium; elsewhere Playwright uses its own download.
const localChromium = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: existsSync(localChromium) && !process.env.CI ? { executablePath: localChromium } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Runs the production build on the fictional demo data (no Supabase variables).
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/de`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
