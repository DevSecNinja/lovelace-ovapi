import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    reducedMotion: "reduce",
  },
  projects: [
    { name: "phone-light", use: { viewport: { width: 390, height: 844 } } },
    { name: "phone-dark", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet-light", use: { viewport: { width: 1024, height: 768 } } },
    { name: "tablet-dark", use: { viewport: { width: 1024, height: 768 } } },
  ],
  webServer: {
    command: "npm run harness",
    url: "http://127.0.0.1:4173/tests/harness/",
    reuseExistingServer: false,
  },
});
