import { afterEach, describe, expect, it, vi } from "vitest";

import { flagKey, readFlag, writeFlag } from "@/lib/persisted-flag";

afterEach(() => {
  // Unstub first: a spec that replaced storage with a throwing stub has no
  // `clear` to call.
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("persisted flag", () => {
  describe("when I write a flag", () => {
    it("Then reading it back gives what I wrote", () => {
      writeFlag("k", true);

      expect(readFlag("k")).toBe(true);
    });

    it("Then false survives the round trip as false, not as absent", () => {
      writeFlag("k", false);

      expect(readFlag("k")).toBe(false);
    });

    it("Then writing again replaces it", () => {
      writeFlag("k", true);
      writeFlag("k", false);

      expect(readFlag("k")).toBe(false);
    });
  });

  describe("when there is nothing stored under the key", () => {
    it("Then it reads as undefined, so a caller can tell it apart from false", () => {
      expect(readFlag("never-written")).toBeUndefined();
    });
  });

  describe("when the stored value is not one we wrote", () => {
    it("Then it is treated as absent rather than coerced", () => {
      window.localStorage.setItem("k", "yes please");

      expect(readFlag("k")).toBeUndefined();
    });
  });

  /**
   * `localStorage` throws outright in some private browsing modes. A lost
   * preference is acceptable; a page that will not render is not.
   */
  describe("when storage is unavailable", () => {
    it("Then reading falls back instead of throwing", () => {
      vi.stubGlobal("localStorage", {
        getItem: () => {
          throw new Error("access denied");
        },
      });

      expect(() => readFlag("k")).not.toThrow();
      expect(readFlag("k")).toBeUndefined();
    });

    it("Then writing gives up quietly instead of throwing", () => {
      vi.stubGlobal("localStorage", {
        setItem: () => {
          throw new Error("quota exceeded");
        },
      });

      expect(() => writeFlag("k", true)).not.toThrow();
    });
  });

  describe("when I build a key", () => {
    it("Then it is namespaced to the app", () => {
      expect(flagKey("section", "inbox", "done")).toBe(
        "todo-app:section:inbox:done"
      );
    });

    it("Then different parts give different keys", () => {
      expect(flagKey("section", "inbox", "done")).not.toBe(
        flagKey("section", "project-1", "done")
      );
    });
  });
});
