import { screen } from "@testing-library/react";
import { waitFor } from "@/test/user";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { RightRail } from "@/pages/inbox/right-rail";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";
import { dayKey } from "@/lib/due-dates";

const openCount = "home.overview.open.count";

/**
 * Rendered through `RightRail` — the wrapper is what the inbox actually mounts,
 * so this covers both it and the panel inside it.
 */
function renderRightRail(todos: TodoEntity[], projectId?: string) {
  const repository = inMemoryTodoRepository(todos);

  return {
    ...renderWithContainer(<RightRail projectId={projectId} />, {
      diContainer: createTestContainer(repository),
    }),
    repository,
  };
}

/** Whether the calendar marks one day as having anything due on it. */
function isMarkedDue(date: Date) {
  return (
    screen.queryByTestId(`home.overview.calendar.${dayKey(date)}.due.dot`) !==
    null
  );
}

/** Every number the panel puts on screen, read in one go. */
function shownStats() {
  const read = (testId: string) =>
    screen.queryByTestId(testId)?.textContent?.trim();

  return {
    open: read(openCount),
    done: read("home.overview.done.count"),
    dueToday: read("home.overview.duetoday.count"),
    percentage: read("home.overview.percentage"),
  };
}

const daysFromToday = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

describe("overview panel", () => {
  describe("when the panel loads", () => {
    it("Then the stats reflect the stored todos", async () => {
      renderRightRail([
        makeTodo({ done: false }),
        makeTodo({ done: false }),
        makeTodo({ done: false }),
        makeTodo({ done: true }),
      ]);

      await waitFor(() => expect(shownStats().open).toBe("3"));
      expect(shownStats()).toMatchObject({
        open: "3",
        done: "1",
        percentage: "25%", // 1 of 4
      });
    });

    it("Then an empty inbox reads as zero rather than as complete", async () => {
      const { repository } = renderRightRail([]);

      // Zero is also the pre-fetch state, so wait for the read to have happened
      // before believing the zeroes on screen.
      await waitFor(() => expect(repository.listAll).toHaveBeenCalled());
      expect(shownStats()).toEqual({
        open: "0",
        done: "0",
        dueToday: "0",
        percentage: "0%",
      });
    });
  });

  describe("when open todos are due on different days", () => {
    it("Then only the ones due today are counted", async () => {
      renderRightRail([
        makeTodo({ done: false, dueDate: daysFromToday(0) }),
        makeTodo({ done: false, dueDate: daysFromToday(0) }),
        makeTodo({ done: false, dueDate: daysFromToday(1) }),
        makeTodo({ done: false, dueDate: daysFromToday(-3) }),
        makeTodo({ done: false, dueDate: undefined }),
      ]);

      await waitFor(() => expect(shownStats().open).toBe("5"));
      expect(shownStats().dueToday).toBe("2");
    });

    it("Then a completed todo due today is not counted", async () => {
      renderRightRail([
        makeTodo({ done: false, dueDate: daysFromToday(0) }),
        makeTodo({ done: true, dueDate: daysFromToday(0) }),
      ]);

      await waitFor(() => expect(shownStats().open).toBe("1"));
      expect(shownStats().dueToday).toBe("1");
    });
  });

  describe("when todos are due on days the calendar is showing", () => {
    it("Then every day something is due on is marked", async () => {
      renderRightRail([
        makeTodo({ done: false, dueDate: daysFromToday(0) }),
        makeTodo({ done: false, dueDate: daysFromToday(0) }),
        makeTodo({ done: false, dueDate: daysFromToday(1) }),
      ]);

      await waitFor(() => expect(isMarkedDue(daysFromToday(0))).toBe(true));
      expect(isMarkedDue(daysFromToday(1))).toBe(true);
    });

    it("Then a day with nothing due is left unmarked", async () => {
      renderRightRail([makeTodo({ done: false, dueDate: daysFromToday(0) })]);

      await waitFor(() => expect(isMarkedDue(daysFromToday(0))).toBe(true));
      expect(isMarkedDue(daysFromToday(2))).toBe(false);
    });

    it("Then a day whose only todo is done is left unmarked", async () => {
      renderRightRail([
        makeTodo({ done: false, dueDate: daysFromToday(0) }),
        makeTodo({ done: true, dueDate: daysFromToday(1) }),
      ]);

      await waitFor(() => expect(isMarkedDue(daysFromToday(0))).toBe(true));
      expect(isMarkedDue(daysFromToday(1))).toBe(false);
    });
  });

  describe("when the panel is showing one project", () => {
    it("Then the calendar marks only days that project has todos due on", async () => {
      renderRightRail(
        [
          makeTodo({ done: false, dueDate: daysFromToday(0), projectId: "a" }),
          makeTodo({ done: false, dueDate: daysFromToday(1), projectId: "b" }),
        ],
        "a"
      );

      await waitFor(() => expect(isMarkedDue(daysFromToday(0))).toBe(true));
      expect(isMarkedDue(daysFromToday(1))).toBe(false);
    });

    it("Then the stats above it are narrowed the same way", async () => {
      renderRightRail(
        [
          makeTodo({ done: false, projectId: "a" }),
          makeTodo({ done: true, projectId: "a" }),
          makeTodo({ done: false, projectId: "b" }),
        ],
        "a"
      );

      await waitFor(() => expect(shownStats().open).toBe("1"));
      expect(shownStats().done).toBe("1");
    });
  });
});
