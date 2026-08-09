import { afterEach, describe, expect, it, vi } from "vitest";

import { Timing, readDelay } from "@/lib/timing";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readDelay", () => {
  it("when the variable is unset, Then it falls back to the default", () => {
    expect(readDelay(undefined, 450)).toBe(450);
  });

  it("when the variable is blank, Then it falls back to the default", () => {
    expect(readDelay("", 450)).toBe(450);
  });

  it("when the variable is not a number, Then it falls back to the default", () => {
    expect(readDelay("soon", 450)).toBe(450);
  });

  it("when the variable is negative, Then it falls back to the default", () => {
    expect(readDelay("-1", 450)).toBe(450);
  });

  it("when the variable is a duration, Then it is used", () => {
    expect(readDelay("120", 450)).toBe(120);
  });

  it("when the variable is zero, Then the delay is removed rather than defaulted", () => {
    expect(readDelay("0", 450)).toBe(0);
  });
});

describe("Timing", () => {
  describe("when the environment overrides a delay", () => {
    it("Then the completion re-sort hold uses the override", () => {
      vi.stubEnv("VITE_COMPLETION_RESORT_MS", "7");

      expect(Timing.completionResortMs).toBe(7);
    });

    it("Then the confetti lifetime uses the override", () => {
      vi.stubEnv("VITE_CONFETTI_VISIBLE_MS", "9");

      expect(Timing.confettiVisibleMs).toBe(9);
    });
  });

  describe("when the environment says nothing", () => {
    it("Then the product defaults apply", () => {
      vi.stubEnv("VITE_COMPLETION_RESORT_MS", "");
      vi.stubEnv("VITE_CONFETTI_VISIBLE_MS", "");

      expect(Timing.completionResortMs).toBe(450);
      expect(Timing.confettiVisibleMs).toBe(1400);
    });
  });
});
