import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/{unit,components}/**/*.test.ts"],
    // CI also writes JUnit XML for the test-report step; local runs are unchanged.
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: { junit: "test-results.xml" },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/styles.ts"],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        perFile: true,
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 90,
      },
    },
  },
});
