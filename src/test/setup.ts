import "@testing-library/jest-dom/vitest";

import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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
