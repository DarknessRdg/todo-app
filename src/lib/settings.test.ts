import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SettingsDefaults,
  readSetting,
  subscribeToSettings,
  writeSetting,
} from "@/lib/settings";

afterEach(() => localStorage.clear());

describe("settings", () => {
  describe("when nothing has been chosen", () => {
    it("Then each setting reads as the behaviour that shipped without it", () => {
      expect(readSetting("hideDone")).toBe(false);
      expect(readSetting("defaultTodoView")).toBe("write");
    });
  });

  describe("when a setting is chosen", () => {
    it("Then it is what reads back", () => {
      writeSetting("hideDone", true);

      expect(readSetting("hideDone")).toBe(true);
    });

    it("Then it outlives the page it was chosen on", () => {
      writeSetting("defaultTodoView", "read");

      // What a reload amounts to: the module reads storage afresh, holding
      // nothing of its own between calls.
      expect(readSetting("defaultTodoView")).toBe("read");
      expect(localStorage.getItem("todo-app:settings:defaultTodoView")).toBe(
        "read"
      );
    });

    it("Then everything reading it is told to look again", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSettings(listener);

      writeSetting("hideDone", true);

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it("Then it stops telling a listener that has gone away", () => {
      const listener = vi.fn();
      subscribeToSettings(listener)();

      writeSetting("hideDone", true);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  /**
   * A stored value we did not write — an older version's spelling, or another
   * tool on the same origin — must not be trusted into the app. The default is
   * the only thing known to be safe.
   */
  describe("when storage holds something unrecognised", () => {
    it("Then a nonsense boolean falls back rather than reading as true", () => {
      localStorage.setItem("todo-app:settings:hideDone", "yes please");

      expect(readSetting("hideDone")).toBe(SettingsDefaults.hideDone);
    });

    it("Then a view outside the two that exist falls back too", () => {
      localStorage.setItem("todo-app:settings:defaultTodoView", "presentation");

      expect(readSetting("defaultTodoView")).toBe(
        SettingsDefaults.defaultTodoView
      );
    });
  });

  it("when storage cannot be read at all, Then the defaults still answer", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage is blocked");
    });

    expect(readSetting("hideDone")).toBe(false);
  });
});
