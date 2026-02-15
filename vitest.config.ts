import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
    environment: "node",
  },
  resolve: {
    alias: {
      marklift: resolve(__dirname, "./src/index.ts"),
    },
  },
});
