import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One local retry. CI already retried twice, so locally-visible flakes were
  // invisible there — which is part of why the suite was left broken for so long.
  // Two tests remain genuinely timing-sensitive under `fullyParallel` (draft
  // switching remounts the editor; the backup test waits on a real download).
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  // The dev server compiles on demand, so the first assertion in a worker can be
  // waiting on a chunk build, not on the app. 5s default was marginal under load.
  expect: { timeout: 10_000 },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
