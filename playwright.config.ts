import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the flows where being wrong costs money.
 *
 * The unit tests prove the arithmetic; these prove the screens actually do
 * what they say. Every defect covered here is one that shipped and had to be
 * reported by a human — a payment that took one tap, a start code printed on
 * the worker's own screen, a job that began before anyone paid. They are here
 * so none of them can come back quietly.
 *
 * Run: npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // they share one server and seed localStorage
  workers: 1,
  reporter: process.env.CI ? "list" : [["list"]],
  timeout: 45_000,
  use: {
    baseURL: "http://localhost:3111",
    // A phone, because that is what KAAM is.
    ...devices["Pixel 7"],
    trace: "retain-on-failure",
    // This machine ships Chromium already; Playwright must not try to fetch
    // its own build (downloads are blocked here). Pointing at the installed
    // binary also means the tests run the browser the container actually has.
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" },
  },
  webServer: {
    command: "PORT=3111 npm start",
    url: "http://localhost:3111/app",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
