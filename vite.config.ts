/// <reference types="vitest/config" />
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Where the built app is served from: a GitHub Pages *project* site lives under
 * the repository name, not at the root of the origin, so every asset url in the
 * build needs the prefix. Dev keeps `/`, because the dev server is the root of
 * its own origin and prefixing it would only make local urls disagree with the
 * address bar.
 */
const ProjectPageBase = "/todo-app/";

/**
 * Ships a copy of the app as `404.html`.
 *
 * GitHub Pages serves static files and knows nothing about client-side routes:
 * asking for `/todo-app/settings` looks for a file that was never built. What
 * Pages does do is serve `404.html` for anything it cannot find — so a copy of
 * the app under that name hands the url to the router instead of showing a
 * dead end, and every deep link the app hands out (a todo's own page, a
 * settings group) survives being opened cold or shared.
 *
 * A copy rather than a second entry point: it must stay byte-identical to
 * `index.html`, and anything else would be a second thing to keep in step.
 */
function githubPagesSpaFallback(): Plugin {
  return {
    name: "github-pages-spa-fallback",
    apply: "build",
    closeBundle() {
      const index = path.resolve(__dirname, "dist/index.html");
      if (!fs.existsSync(index)) return;

      fs.copyFileSync(index, path.resolve(__dirname, "dist/404.html"));
    },
  };
}

/**
 * The commit the bundle was built from, which is the app's version.
 *
 * `package.json` is never bumped — a client-only app that ships on every green
 * push to main has no release number to bump — so the short sha is the only
 * thing that tells two builds apart. Failing softly matters: a checkout without
 * git history (a tarball, some CI runners) must still build, it just cannot say
 * which commit it is, and `src/lib/version.ts` falls back for it.
 */
function buildVersion(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? ProjectPageBase : "/",
  // Stamped rather than read at runtime: there is no server to ask, and the
  // sha has to survive into the static bundle. Only the build carries one —
  // the dev server reports itself as a dev build.
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      command === "build" ? buildVersion() : ""
    ),
  },
  plugins: [react(), tailwindcss(), githubPagesSpaFallback()],
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
}));
