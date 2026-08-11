import { screen } from "@testing-library/react";
import { waitFor } from "@/test/user";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { TodayPage } from "@/pages/today/today-page";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

function renderToday(todos: TodoEntity[]) {
  const repository = inMemoryTodoRepository(todos);

  return {
    ...renderWithContainer(<TodayPage />, {
      diContainer: createTestContainer(repository),
      // The rows navigate to open a todo, so the page needs a router around it.
      route: "/today",
    }),
    repository,
  };
}

const daysFromToday = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/** Whether a todo made it onto the page. */
const isListed = (todo: TodoEntity) =>
  screen.queryByTestId(`home.todo.${todo.id}.title`) !== null;

describe("today page", () => {
  describe("when the page loads", () => {
    it("Then a todo due today is listed", async () => {
      const dueToday = makeTodo({ done: false, dueDate: daysFromToday(0) });
      renderToday([dueToday]);

      await waitFor(() => expect(isListed(dueToday)).toBe(true));
    });

    it("Then one due another day is left out", async () => {
      const dueToday = makeTodo({ done: false, dueDate: daysFromToday(0) });
      const dueTomorrow = makeTodo({ done: false, dueDate: daysFromToday(1) });
      const overdue = makeTodo({ done: false, dueDate: daysFromToday(-2) });
      renderToday([dueToday, dueTomorrow, overdue]);

      await waitFor(() => expect(isListed(dueToday)).toBe(true));
      expect(isListed(dueTomorrow)).toBe(false);
      expect(isListed(overdue)).toBe(false);
    });

    it("Then one with no due date at all is left out", async () => {
      const dueToday = makeTodo({ done: false, dueDate: daysFromToday(0) });
      const someday = makeTodo({ done: false, dueDate: undefined });
      renderToday([dueToday, someday]);

      await waitFor(() => expect(isListed(dueToday)).toBe(true));
      expect(isListed(someday)).toBe(false);
    });

    it("Then one already completed today is still here, under Done", async () => {
      const done = makeTodo({ done: true, dueDate: daysFromToday(0) });
      renderToday([done]);

      await waitFor(() => expect(isListed(done)).toBe(true));
      expect(screen.getByTestId("home.todo.section.done")).toBeInTheDocument();
    });
  });

  describe("when nothing is due today", () => {
    it("Then it says so, rather than borrowing the inbox's empty state", async () => {
      renderToday([makeTodo({ done: false, dueDate: daysFromToday(3) })]);

      expect(await screen.findByTestId("today.todo.empty")).toBeInTheDocument();
      expect(screen.queryByTestId("home.todo.empty")).not.toBeInTheDocument();
    });
  });

  describe("when the panel beside it counts", () => {
    it("Then it counts today's todos, not every todo there is", async () => {
      renderToday([
        makeTodo({ done: false, dueDate: daysFromToday(0) }),
        makeTodo({ done: false, dueDate: daysFromToday(4) }),
      ]);

      await waitFor(() =>
        expect(
          screen.getByTestId("home.overview.open.count").textContent?.trim()
        ).toBe("1")
      );
    });
  });
});
