import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { CompletedPage } from "@/pages/completed/completed-page";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";
import { writeSetting } from "@/lib/settings";

const todoTitle = (todo: TodoEntity) => `home.todo.${todo.id}.title`;

function renderCompleted(todos: TodoEntity[]) {
  return renderWithContainer(<CompletedPage />, {
    diContainer: createTestContainer(inMemoryTodoRepository(todos)),
    route: "/completed",
  });
}

describe("completed page", () => {
  describe("when the page loads", () => {
    it("Then a finished todo is listed", async () => {
      const done = makeTodo({ done: true });
      renderCompleted([done]);

      expect(await screen.findByTestId(todoTitle(done))).toBeInTheDocument();
    });

    it("Then one still open is left out", async () => {
      const done = makeTodo({ done: true });
      const open = makeTodo({ done: false });
      renderCompleted([done, open]);

      await screen.findByTestId(todoTitle(done));
      expect(screen.queryByTestId(todoTitle(open))).not.toBeInTheDocument();
    });

    /**
     * One flat list: the page is already only done todos, so the usual split
     * would put a "To do" heading over nothing.
     */
    it("Then there are no open and done sections to split it into", async () => {
      const done = makeTodo({ done: true });
      renderCompleted([done]);

      await screen.findByTestId(todoTitle(done));
      expect(
        screen.queryByTestId("home.todo.section.open")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("home.todo.section.done")
      ).not.toBeInTheDocument();
    });
  });

  it("when I look for a capture bar, Then there is none", async () => {
    renderCompleted([makeTodo({ done: true })]);

    await screen.findByTestId("completed.page.title");
    expect(
      screen.queryByTestId("home.todo.create.input")
    ).not.toBeInTheDocument();
  });

  /**
   * The setting hides finished work from every *other* list. Obeying it here
   * would empty the one page whose whole subject is finished work.
   */
  it("when done todos are set to be hidden, Then this page still shows them", async () => {
    writeSetting("hideDone", true);
    const done = makeTodo({ done: true });
    renderCompleted([done]);

    expect(await screen.findByTestId(todoTitle(done))).toBeInTheDocument();
    localStorage.clear();
  });

  it("when nothing is finished, Then it says so", async () => {
    renderCompleted([]);

    expect(
      await screen.findByTestId("completed.todo.empty")
    ).toBeInTheDocument();
  });
});
