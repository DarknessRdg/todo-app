import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { OverduePage } from "@/pages/overdue/overdue-page";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

const todoTitle = (todo: TodoEntity) => `home.todo.${todo.id}.title`;
const capture = "home.todo.create.input";

const daysFromToday = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

function renderOverdue(todos: TodoEntity[]) {
  return renderWithContainer(<OverduePage />, {
    diContainer: createTestContainer(inMemoryTodoRepository(todos)),
    route: "/overdue",
  });
}

describe("overdue page", () => {
  describe("when the page loads", () => {
    it("Then a todo whose date has passed is listed", async () => {
      const late = makeTodo({ done: false, dueDate: daysFromToday(-2) });
      renderOverdue([late]);

      expect(await screen.findByTestId(todoTitle(late))).toBeInTheDocument();
    });

    it("Then one due today is left out, that being its own view", async () => {
      const late = makeTodo({ done: false, dueDate: daysFromToday(-2) });
      const today = makeTodo({ done: false, dueDate: daysFromToday(0) });
      renderOverdue([late, today]);

      await screen.findByTestId(todoTitle(late));
      expect(screen.queryByTestId(todoTitle(today))).not.toBeInTheDocument();
    });

    /** Finished late is finished, not overdue. */
    it("Then one already completed is left out, however late it was", async () => {
      const late = makeTodo({ done: false, dueDate: daysFromToday(-2) });
      const doneLate = makeTodo({ done: true, dueDate: daysFromToday(-5) });
      renderOverdue([late, doneLate]);

      await screen.findByTestId(todoTitle(late));
      expect(screen.queryByTestId(todoTitle(doneLate))).not.toBeInTheDocument();
    });

    it("Then one with no due date at all is left out", async () => {
      const late = makeTodo({ done: false, dueDate: daysFromToday(-2) });
      const someday = makeTodo({ done: false, dueDate: undefined });
      renderOverdue([late, someday]);

      await screen.findByTestId(todoTitle(late));
      expect(screen.queryByTestId(todoTitle(someday))).not.toBeInTheDocument();
    });
  });

  it("when I look for a capture bar, Then there is none", async () => {
    renderOverdue([makeTodo({ done: false, dueDate: daysFromToday(-2) })]);

    await screen.findByTestId("overdue.page.title");
    expect(screen.queryByTestId(capture)).not.toBeInTheDocument();
  });

  it("when nothing is late, Then it says so rather than borrowing the inbox's words", async () => {
    renderOverdue([]);

    expect(await screen.findByTestId("overdue.todo.empty")).toBeInTheDocument();
  });
});
