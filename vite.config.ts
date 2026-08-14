/// <reference types="vitest/config" />
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

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? ProjectPageBase : "/",
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
  },
}));
