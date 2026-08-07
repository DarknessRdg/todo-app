import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { Inbox } from "@/pages/inbox/inbox";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

const openSection = "home.todo.section.open";
const doneSection = "home.todo.section.done";

const rowTitle = (todo: TodoEntity) => `home.todo.${todo.id}.title`;
const checkButton = (todo: TodoEntity) => `home.todo.${todo.id}.check.button`;
const modal = (todo: TodoEntity) => `home.todo.${todo.id}.modal`;
const deleteButton = (todo: TodoEntity) => `home.todo.${todo.id}.delete.button`;
const deleteDialog = (todo: TodoEntity) => `home.todo.${todo.id}.delete.dialog`;
const deleteConfirm = (todo: TodoEntity) =>
  `home.todo.${todo.id}.delete.confirm`;
const deleteCancel = (todo: TodoEntity) => `home.todo.${todo.id}.delete.cancel`;

function renderInbox(todos: TodoEntity[]) {
  const repository = inMemoryTodoRepository(todos);

  return {
    ...renderWithContainer(<Inbox />, {
      diContainer: createTestContainer(repository),
      route: "/",
    }),
    repository,
  };
}

describe("todo list", () => {
  it("when marked as done, Then it moves from the open section to the done section", async () => {
    const user = userEvent.setup();
    // `done` is pinned: this test branches on the starting state.
    const todo = makeTodo({ done: false });
    const { repository } = renderInbox([todo]);

    const open = await screen.findByTestId(openSection);
    expect(within(open).getByTestId(rowTitle(todo))).toBeInTheDocument();
    // The Done section is not rendered at all while nothing is complete.
    expect(screen.queryByTestId(doneSection)).not.toBeInTheDocument();

    await user.click(screen.getByTestId(checkButton(todo)));

    // The row is deliberately held in place for ~450ms so the completion
    // animation is visible before it re-sorts, so allow for that here.
    await waitFor(
      () =>
        expect(
          within(screen.getByTestId(doneSection)).getByTestId(rowTitle(todo))
        ).toBeInTheDocument(),
      { timeout: 3000 }
    );

    expect(
      within(screen.getByTestId(openSection)).queryByTestId(rowTitle(todo))
    ).not.toBeInTheDocument();
    expect(repository.updateDone).toHaveBeenCalledWith({
      id: todo.id,
      done: true,
    });
  });

  it("when a done todo is reopened, Then it moves back to the open section", async () => {
    const user = userEvent.setup();
    const todo = makeTodo({ done: true });
    const { repository } = renderInbox([todo]);

    const done = await screen.findByTestId(doneSection);
    expect(within(done).getByTestId(rowTitle(todo))).toBeInTheDocument();

    await user.click(screen.getByTestId(checkButton(todo)));

    await waitFor(() =>
      expect(
        within(screen.getByTestId(openSection)).getByTestId(rowTitle(todo))
      ).toBeInTheDocument()
    );

    expect(repository.updateDone).toHaveBeenCalledWith({
      id: todo.id,
      done: false,
    });
  });

  it("when a delete is confirmed, Then the todo is removed from the list", async () => {
    const user = userEvent.setup();
    const doomed = makeTodo({ done: false });
    const survivor = makeTodo({ done: false });
    const { repository } = renderInbox([doomed, survivor]);

    await screen.findByTestId(rowTitle(doomed));

    await user.click(screen.getByTestId(deleteButton(doomed)));
    await user.click(await screen.findByTestId(deleteConfirm(doomed)));

    await waitFor(() =>
      expect(screen.queryByTestId(rowTitle(doomed))).not.toBeInTheDocument()
    );

    expect(repository.delete).toHaveBeenCalledWith(doomed.id);
    expect(screen.getByTestId(rowTitle(survivor))).toBeInTheDocument();
  });

  it("when a delete is cancelled, Then the todo stays", async () => {
    const user = userEvent.setup();
    const todo = makeTodo({ done: false });
    const { repository } = renderInbox([todo]);

    await screen.findByTestId(rowTitle(todo));

    await user.click(screen.getByTestId(deleteButton(todo)));
    await user.click(await screen.findByTestId(deleteCancel(todo)));

    await waitFor(() =>
      expect(screen.queryByTestId(deleteDialog(todo))).not.toBeInTheDocument()
    );

    expect(repository.delete).not.toHaveBeenCalled();
    expect(screen.getByTestId(rowTitle(todo))).toBeInTheDocument();
  });

  it("when a todo is clicked, Then the url carries its id and its modal opens", async () => {
    const user = userEvent.setup();
    // Two todos, so the assertion proves the *clicked* one opened.
    const first = makeTodo({ done: false });
    const second = makeTodo({ done: false });
    const { currentLocation } = renderInbox([first, second]);

    await screen.findByTestId(rowTitle(second));
    expect(screen.queryByTestId(modal(second))).not.toBeInTheDocument();

    await user.click(screen.getByTestId(rowTitle(second)));

    expect(await screen.findByTestId(modal(second))).toBeInTheDocument();
    expect(currentLocation()).toBe(`/?todo=${second.id}`);
    expect(screen.queryByTestId(modal(first))).not.toBeInTheDocument();
  });
});
