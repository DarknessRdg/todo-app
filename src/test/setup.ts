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

// ProseMirror (under the rich text editor) measures the caret after every
// transaction. jsdom has no layout, so Range geometry is missing entirely and
// it throws asynchronously — specs still pass, but the run fills with uncaught
// exceptions. Zero-sized answers are fine: nothing under test reads them.
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}

// Same reason: a mousedown inside the editor asks which node is at the click.
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

// Radix's Select drives itself off pointer capture and scrolls the active item
// into view. jsdom implements neither, so opening one throws without these.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
