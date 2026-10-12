import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "lovelace-ovapi.js",
    },
    target: "es2022",
    rollupOptions: {
      output: {
        banner: `/*!\n${readFileSync("node_modules/lit/LICENSE", "utf8")}\n*/`,
      },
    },
  },
  server: { fs: { strict: true } },
});
