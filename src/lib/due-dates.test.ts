import { describe, expect, it } from "vitest";

import { countDueByDay, dayKey, dueState } from "@/lib/due-dates";

const at = (year: number, month: number, day: number, hour = 0) =>
  new Date(year, month - 1, day, hour);

describe("dayKey", () => {
  it("when given a date, Then it reads as the calendar day in local time", () => {
    expect(dayKey(at(2026, 8, 10))).toBe("2026-08-10");
  });

  it("when the time of day differs, Then two dates on the same day agree", () => {
    expect(dayKey(at(2026, 8, 10, 0))).toBe(dayKey(at(2026, 8, 10, 23)));
  });

  it("when the day is single-digit, Then it is padded so keys sort", () => {
    expect(dayKey(at(2026, 1, 2))).toBe("2026-01-02");
  });
});

describe("countDueByDay", () => {
  it("when several todos share a due date, Then that day carries their count", () => {
    const counts = countDueByDay([
      { dueDate: at(2026, 8, 10) },
      { dueDate: at(2026, 8, 10, 18) },
      { dueDate: at(2026, 8, 11) },
    ]);

    expect(counts.get("2026-08-10")).toBe(2);
    expect(counts.get("2026-08-11")).toBe(1);
  });

  it("when a todo has no due date, Then it is counted against no day at all", () => {
    const counts = countDueByDay([
      { dueDate: undefined },
      { dueDate: at(2026, 8, 10) },
    ]);

    expect(counts.size).toBe(1);
    expect(counts.get("2026-08-10")).toBe(1);
  });

  it("when nothing is due, Then no day carries a count", () => {
    expect(countDueByDay([]).size).toBe(0);
  });

  it("when a day has nothing due, Then it is absent rather than zero", () => {
    const counts = countDueByDay([{ dueDate: at(2026, 8, 10) }]);

    expect(counts.has("2026-08-11")).toBe(false);
  });
});

describe("dueState", () => {
  const today = at(2026, 8, 10, 14);

  it("when the date is before today, Then it is overdue", () => {
    expect(dueState({ dueDate: at(2026, 8, 9, 23), done: false }, today)).toBe(
      "overdue"
    );
  });

  it("when the date is today, earlier than now, Then it is due today rather than overdue", () => {
    expect(dueState({ dueDate: at(2026, 8, 10, 9), done: false }, today)).toBe(
      "today"
    );
  });

  it("when the date is after today, Then it is upcoming", () => {
    expect(dueState({ dueDate: at(2026, 8, 11), done: false }, today)).toBe(
      "upcoming"
    );
  });

  it("when the todo is done, Then a past date is settled rather than overdue", () => {
    expect(dueState({ dueDate: at(2026, 8, 1), done: true }, today)).toBe(
      "settled"
    );
  });
});
