import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { UpcomingPage } from "@/pages/upcoming/upcoming-page";
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

function renderUpcoming(todos: TodoEntity[]) {
  return renderWithContainer(<UpcomingPage />, {
    diContainer: createTestContainer(inMemoryTodoRepository(todos)),
    route: "/upcoming",
  });
}

describe("upcoming page", () => {
  describe("when the page loads", () => {
    it("Then a todo due after today is listed", async () => {
      const soon = makeTodo({ done: false, dueDate: daysFromToday(3) });
      renderUpcoming([soon]);

      expect(await screen.findByTestId(todoTitle(soon))).toBeInTheDocument();
    });

    it("Then one due today is left out, that being its own view", async () => {
      const soon = makeTodo({ done: false, dueDate: daysFromToday(3) });
      const today = makeTodo({ done: false, dueDate: daysFromToday(0) });
      renderUpcoming([soon, today]);

      await screen.findByTestId(todoTitle(soon));
      expect(screen.queryByTestId(todoTitle(today))).not.toBeInTheDocument();
    });

    it("Then an overdue one is left out", async () => {
      const soon = makeTodo({ done: false, dueDate: daysFromToday(3) });
      const late = makeTodo({ done: false, dueDate: daysFromToday(-2) });
      renderUpcoming([soon, late]);

      await screen.findByTestId(todoTitle(soon));
      expect(screen.queryByTestId(todoTitle(late))).not.toBeInTheDocument();
    });

    it("Then one with no due date at all is left out", async () => {
      const soon = makeTodo({ done: false, dueDate: daysFromToday(3) });
      const someday = makeTodo({ done: false, dueDate: undefined });
      renderUpcoming([soon, someday]);

      await screen.findByTestId(todoTitle(soon));
      expect(screen.queryByTestId(todoTitle(someday))).not.toBeInTheDocument();
    });
  });

  /**
   * A todo captured here would need a future date to belong on the page it was
   * captured on, and a bar that swallows what you type is worse than no bar.
   */
  it("when I look for a capture bar, Then there is none", async () => {
    renderUpcoming([makeTodo({ done: false, dueDate: daysFromToday(3) })]);

    await screen.findByTestId("upcoming.page.title");
    expect(screen.queryByTestId(capture)).not.toBeInTheDocument();
  });

  it("when nothing is scheduled, Then it says so rather than borrowing the inbox's words", async () => {
    renderUpcoming([]);

    expect(
      await screen.findByTestId("upcoming.todo.empty")
    ).toBeInTheDocument();
  });
});
