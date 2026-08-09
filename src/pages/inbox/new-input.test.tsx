import { screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { describe, expect, it } from "vitest";

import { NewInput } from "@/pages/inbox/new-input";
import {
  createTestContainer,
  mockTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeCreateTodo } from "@/test/todo-factory";

const input = "home.todo.create.input";
const submit = "home.todo.create.submit";

function renderNewInput() {
  const repository = mockTodoRepository();

  return {
    ...renderWithContainer(<NewInput />, {
      diContainer: createTestContainer(repository),
    }),
    repository,
  };
}

/** The single todo the repository was asked to persist. */
function created(repository: ReturnType<typeof mockTodoRepository>) {
  expect(repository.create).toHaveBeenCalledTimes(1);
  return repository.create.mock.calls[0][0];
}

describe("new todo input", () => {
  describe("when I submit a title", () => {
    it("Then the todo is persisted with that title", async () => {
      const user = setupUser();
      // A pass-through assertion: a generated title proves the value the user
      // typed reached the repository untouched, which a literal would not.
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(created(repository).title).toBe(title));
    });

    it("Then it is persisted as not yet done", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(created(repository).done).toBe(false));
    });

    it("Then it defaults to being due today", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() =>
        expect(created(repository).dueDate?.toDateString()).toBe(
          new Date().toDateString()
        )
      );
    });

    it("Then the field clears, ready for the next capture", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(screen.getByTestId(input)).toHaveValue(""));
    });
  });

  describe("when I submit without a title", () => {
    it("Then nothing is persisted", async () => {
      const user = setupUser();
      const { repository } = renderNewInput();

      await user.click(screen.getByTestId(submit));

      // Give the mutation a chance to run before concluding it did not persist.
      await waitFor(() => expect(screen.getByTestId(input)).toHaveValue(""));
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});
