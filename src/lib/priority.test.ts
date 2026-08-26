import { describe, expect, it } from "vitest";

import {
  TodoPriorities,
  parsePriority,
  priorityLabel,
  priorityRank,
} from "@/lib/priority";

describe("priority", () => {
  describe("when I read one off the url", () => {
    it("Then a level it names is kept", () => {
      expect(parsePriority("urgent")).toBe("urgent");
    });

    it("Then a word that names no level is dropped", () => {
      expect(parsePriority("critical")).toBeUndefined();
    });

    /**
     * A hand-edited url should show a plain list, never an empty one — the
     * same way `parseDue` falls back rather than filtering everything out.
     */
    it("Then a missing value is dropped", () => {
      expect(parsePriority(null)).toBeUndefined();
    });

    /**
     * Stored lowercase, displayed capitalised. The url carries what is stored,
     * so a value that arrives wearing its display spelling is not a level.
     */
    it("Then the display spelling is not a level", () => {
      expect(parsePriority("Urgent")).toBeUndefined();
    });
  });

  describe("when I rank the levels", () => {
    it("Then urgent comes before high", () => {
      expect(priorityRank("urgent")).toBeLessThan(priorityRank("high"));
    });

    it("Then they descend in the order they are declared", () => {
      const ranks = [...TodoPriorities].map(priorityRank);

      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    });

    /**
     * There is no "none" level — an untriaged todo simply has no priority, and
     * ranking has to put that somewhere. Last, like an undated todo.
     */
    it("Then a todo carrying none ranks after every level", () => {
      for (const priority of TodoPriorities) {
        expect(priorityRank(undefined)).toBeGreaterThan(priorityRank(priority));
      }
    });
  });

  it("when I show a level, Then it is named in words", () => {
    expect(priorityLabel.urgent).toBe("Urgent");
  });
});
