import { QueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { TodoPage } from "@/pages/todo/todo-page";
import {
  createTestContainer,
  inMemoryTodoRepository,
  mockTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

const title = "todo.detail.title";
const backButton = "todo.page.back.button";
// The three non-content states are the shared detail's, not the page's — the
// modal renders the same ones, which is the point of the shared component.
const missing = "todo.detail.missing";
const missingInboxLink = "todo.detail.missing.close.button";
const loadFailed = "todo.detail.error";
const loadFailedRetry = "todo.detail.error.retry.button";

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

/** The same page, but over a repository whose reads blow up rather than miss. */
function renderFailingTodoPage({
  queryClient,
}: { queryClient?: QueryClient } = {}) {
  const repository = mockTodoRepository();
  repository.getById.mockRejectedValue(new Error("the database is gone"));

  return {
    ...renderWithContainer(
      <Routes>
        <Route path="/" element={<></>} />
        <Route path="/todo/:id" element={<TodoPage />} />
      </Routes>,
      {
        diContainer: createTestContainer(repository),
        route: `/todo/${makeTodo().id}`,
        queryClient,
      }
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
      const user = setupUser();
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
    it("Then it says the todo is no longer here", async () => {
      renderTodoPage({ stored: [makeTodo()], visiting: makeTodo().id });

      expect(await screen.findByTestId(missing)).toBeInTheDocument();
    });

    it("Then no detail is shown", async () => {
      renderTodoPage({ stored: [makeTodo()], visiting: makeTodo().id });

      await screen.findByTestId(missing);

      expect(screen.queryByTestId(title)).not.toBeInTheDocument();
    });

    it("Then the url is left alone, so the id can still be read off it", async () => {
      const absent = makeTodo();
      const { currentLocation } = renderTodoPage({
        stored: [makeTodo()],
        visiting: absent.id,
      });

      await screen.findByTestId(missing);

      expect(currentLocation()).toBe(`/todo/${absent.id}`);
    });

    it("Then the inbox is one click away", async () => {
      const user = setupUser();
      const { currentLocation } = renderTodoPage({
        stored: [makeTodo()],
        visiting: makeTodo().id,
      });

      await user.click(await screen.findByTestId(missingInboxLink));

      await waitFor(() => expect(currentLocation()).toBe("/"));
    });
  });

  describe("when the lookup itself fails", () => {
    it("Then it says so, rather than claiming the todo is missing", async () => {
      renderFailingTodoPage();

      expect(await screen.findByTestId(loadFailed)).toBeInTheDocument();
      expect(screen.queryByTestId(missing)).not.toBeInTheDocument();
    });

    it("Then retrying re-reads the todo", async () => {
      const user = setupUser();
      const { repository } = renderFailingTodoPage();

      await user.click(await screen.findByTestId(loadFailedRetry));

      await waitFor(() => expect(repository.getById).toHaveBeenCalledTimes(2));
    });

    /**
     * The app's own query client retries three times with a backoff, which
     * would leave the user on a spinner for seconds before anything is said.
     * The harness normally disables retries, so this spec supplies a client
     * with the production defaults — otherwise it could not fail.
     */
    it("Then it is not retried behind a spinner, so the failure surfaces at once", async () => {
      const { repository } = renderFailingTodoPage({
        queryClient: new QueryClient(),
      });

      await screen.findByTestId(loadFailed);

      expect(repository.getById).toHaveBeenCalledTimes(1);
    });
  });
});
