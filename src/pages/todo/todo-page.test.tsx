import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { TodoPage } from "@/pages/todo/todo-page";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

const title = "todo.detail.title";
const backButton = "todo.page.back.button";

/**
 * The page reads its id from the path, so it has to be mounted behind a real
 * route rather than rendered bare — `useParams()` is empty otherwise.
 */
function renderTodoPage({
  stored,
  visiting,
}: {
  stored: TodoEntity[];
  visiting: string;
}) {
  const repository = inMemoryTodoRepository(stored);

  return {
    ...renderWithContainer(
      <Routes>
        <Route path="/" element={<></>} />
        <Route path="/todo/:id" element={<TodoPage />} />
      </Routes>,
      { diContainer: createTestContainer(repository), route: `/todo/${visiting}` }
    ),
    repository,
  };
}

describe("todo page", () => {
  describe("when the url points at a stored todo", () => {
    it("Then its detail is shown", async () => {
      const todo = makeTodo({ title: "Repot the fig tree" });
      renderTodoPage({ stored: [todo], visiting: todo.id });

      expect(await screen.findByTestId(title)).toHaveTextContent(
        "Repot the fig tree"
      );
    });

    it("Then it is fetched by the id in the url", async () => {
      const wanted = makeTodo();
      const other = makeTodo();
      const { repository } = renderTodoPage({
        stored: [other, wanted],
        visiting: wanted.id,
      });

      await screen.findByTestId(title);

      expect(repository.getById).toHaveBeenCalledWith(wanted.id);
      expect(repository.getById).not.toHaveBeenCalledWith(other.id);
    });
  });

  describe("when I click back to inbox", () => {
    it("Then it navigates to the inbox", async () => {
      const user = userEvent.setup();
      const todo = makeTodo();
      const { currentLocation } = renderTodoPage({
        stored: [todo],
        visiting: todo.id,
      });

      await screen.findByTestId(backButton);
      await user.click(screen.getByTestId(backButton));

      await waitFor(() => expect(currentLocation()).toBe("/"));
    });
  });

  describe("when the url points at a todo that is not there", () => {
    it("Then it redirects to the inbox", async () => {
      const { currentLocation } = renderTodoPage({
        stored: [makeTodo()],
        visiting: makeTodo().id,
      });

      await waitFor(() => expect(currentLocation()).toBe("/"));
      expect(screen.queryByTestId(title)).not.toBeInTheDocument();
    });
  });
});
