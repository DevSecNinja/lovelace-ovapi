import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist/**", "coverage/**", ".ha-e2e/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/*.mjs", "tests/tooling/*.mjs"],
    languageOptions: { globals: {
      console: "readonly", process: "readonly", URL: "readonly",
      localStorage: "readonly", document: "readonly", setTimeout: "readonly", clearTimeout: "readonly",
      requestAnimationFrame: "readonly", innerWidth: "readonly",
      structuredClone: "readonly",
    } },
  },
];
