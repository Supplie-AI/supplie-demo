import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const host = "localhost";
const useDevServer = process.env.PLAYWRIGHT_USE_DEV_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 45_000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: `http://${host}:${port}`,
    testIdAttribute: "data-testid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: useDevServer
      ? `npm run dev -- --hostname ${host} --port ${port}`
      : [
          "npm run build",
          "rm -rf .next/standalone/.next/static .next/standalone/public",
          "mkdir -p .next/standalone/.next",
          "cp -R .next/static .next/standalone/.next/static",
          "cp -R public .next/standalone/public",
          `HOSTNAME=${host} PORT=${port} node .next/standalone/server.js`,
        ].join(" && "),
    url: `http://${host}:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DEMO_PASSWORD: "test_password",
      PLAYWRIGHT_TEST_MODE: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
