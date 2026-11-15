import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` throws outside a React Server build; tests run server code directly.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    // `.claude/worktrees/` holds parallel agent checkouts; their tests are not ours.
    exclude: ["**/node_modules/**", ".next/**", "e2e/**", ".claude/**"],
    // Tests must never reach a paid model (AGENTS.md §7).
    env: { AI_MODE: "mock", MOCK_FAIL_RATE: "0" },
  },
});
