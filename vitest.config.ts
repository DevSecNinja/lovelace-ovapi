import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/{unit,components}/**/*.test.ts"],
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
