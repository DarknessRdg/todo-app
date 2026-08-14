/// <reference types="vitest/config" />
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    // `vi.stubEnv` must not leak between specs — timing.test.ts stubs the delays.
    unstubEnvs: true,
    // A spec that needs more than a second is not a unit test. Failures also
    // surface in a second instead of hanging on the 5s default.
    testTimeout: 1000,
    hookTimeout: 1000,
    // Threads boot far faster than the default forked processes.
    pool: "threads",
    // The app's deliberate animation pauses (see `src/lib/timing.ts`) are real
    // wall-clock sleeps. Zeroed here, the same code path runs instantly.
    env: {
      VITE_COMPLETION_RESORT_MS: "0",
      VITE_CONFETTI_VISIBLE_MS: "0",
      VITE_SAVED_VISIBLE_MS: "0",
    },
  },
});
