import "@testing-library/jest-dom/vitest";

import { faker } from "@faker-js/faker";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Random fixtures are only acceptable if a failure can be replayed exactly.
// Seed once per file and print it: `FAKER_SEED=<n> npx vitest run` reproduces.
const seed = Number(process.env.FAKER_SEED ?? Date.now() % 2 ** 31);
faker.seed(seed);
if (!process.env.FAKER_SEED) {
  console.info(`[faker] seed=${seed} (replay: FAKER_SEED=${seed})`);
}

// Elements are tagged `data-test-id`, not RTL's default `data-testid`.
configure({ testIdAttribute: "data-test-id" });

// RTL does not auto-cleanup when globals are disabled, so unmount between tests.
afterEach(() => {
  cleanup();
});

// jsdom implements neither of these, and both are reached by components under
// test (Radix primitives and the theme toggle) — without them tests throw.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
