import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      // The House is shown on a tablet in landscape (TESTING.md: 1194 × 834).
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1194, height: 834 },
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // E2E never spends live credits (AGENTS.md §7).
    env: { AI_MODE: "mock", MOCK_FAIL_RATE: "0", STUDIO_MOCK_STORE: "true" },
  },
});
