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

/**
 * Every number the page puts on screen, read in one go. Counts are asserted as
 * a whole because the failure that matters is them disagreeing with each other
 * — a hero stat that drifts from its section chip.
 */
function shownCounts() {
  const read = (testId: string) =>
    screen.queryByTestId(testId)?.textContent?.trim();

  return {
    heroOpen: read("home.stats.open.count"),
    heroDone: read("home.stats.done.count"),
    percentage: read("home.stats.percentage"),
    openSection: read("home.todo.section.open.count"),
    doneSection: read("home.todo.section.done.count"),
  };
}

describe("todo list", () => {
  describe("when the page loads", () => {
    it("Then every count reflects the stored todos", async () => {
      const todos = [
        makeTodo({ done: false }),
        makeTodo({ done: false }),
        makeTodo({ done: false }),
        makeTodo({ done: true }),
      ];
      renderInbox(todos);

      await screen.findByTestId(openSection);

      expect(shownCounts()).toEqual({
        heroOpen: "3",
        heroDone: "1",
        percentage: "25%", // 1 of 4
        openSection: "3",
        doneSection: "1",
      });
    });

    it("Then the done section is hidden while nothing is complete", async () => {
      renderInbox([makeTodo({ done: false })]);

      await screen.findByTestId(openSection);

      expect(screen.queryByTestId(doneSection)).not.toBeInTheDocument();
      expect(shownCounts().heroDone).toBe("0");
      expect(shownCounts().percentage).toBe("0%");
    });
  });

  describe("when I complete a todo", () => {
    it("Then it moves from the open section to the done section", async () => {
      const user = userEvent.setup();
      const todo = makeTodo({ done: false });
      const { repository } = renderInbox([todo]);

      const open = await screen.findByTestId(openSection);
      expect(within(open).getByTestId(rowTitle(todo))).toBeInTheDocument();

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

    it("Then it updates the counts", async () => {
      const user = userEvent.setup();
      const todo = makeTodo({ done: false });
      const other = makeTodo({ done: false });
      renderInbox([todo, other]);

      await screen.findByTestId(openSection);
      expect(shownCounts().heroOpen).toBe("2");

      await user.click(screen.getByTestId(checkButton(todo)));

      await waitFor(
        () =>
          expect(shownCounts()).toEqual({
            heroOpen: "1",
            heroDone: "1",
            percentage: "50%",
            openSection: "1",
            doneSection: "1",
          }),
        { timeout: 3000 }
      );
    });
  });

  describe("when I reopen a done todo", () => {
    it("Then it moves back to the open section", async () => {
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

    it("Then it updates the counts", async () => {
      const user = userEvent.setup();
      const todo = makeTodo({ done: true });
      renderInbox([todo]);

      await screen.findByTestId(doneSection);
      expect(shownCounts().percentage).toBe("100%");

      await user.click(screen.getByTestId(checkButton(todo)));

      await waitFor(() => {
        expect(shownCounts().heroOpen).toBe("1");
        expect(shownCounts().heroDone).toBe("0");
        expect(shownCounts().percentage).toBe("0%");
        expect(shownCounts().openSection).toBe("1");
      });
      // With nothing complete the whole section goes away, chip included.
      expect(screen.queryByTestId(doneSection)).not.toBeInTheDocument();
    });
  });

  describe("when I delete a todo", () => {
    it("Then it is removed from the screen", async () => {
      const user = userEvent.setup();
      const doomed = makeTodo({ done: false });
      const survivor = makeTodo({ done: false });
      const { repository } = renderInbox([doomed, survivor]);

      await screen.findByTestId(rowTitle(doomed));

      await user.click(screen.getByTestId(deleteButton(doomed)));
      await user.click(await screen.findByTestId(deleteConfirm(doomed)));

      // Not waitForElementToBeRemoved: the click flushes the removal
      // synchronously, and that helper throws if the element is already gone.
      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(doomed))).not.toBeInTheDocument()
      );

      expect(repository.delete).toHaveBeenCalledWith(doomed.id);
      expect(screen.getByTestId(rowTitle(survivor))).toBeInTheDocument();
    });

    it("Then it updates the counts", async () => {
      const user = userEvent.setup();
      const doomed = makeTodo({ done: false });
      const survivor = makeTodo({ done: false });
      const completed = makeTodo({ done: true });
      renderInbox([doomed, survivor, completed]);

      await screen.findByTestId(rowTitle(doomed));
      expect(shownCounts().heroOpen).toBe("2");

      await user.click(screen.getByTestId(deleteButton(doomed)));
      await user.click(await screen.findByTestId(deleteConfirm(doomed)));

      await waitFor(() =>
        expect(shownCounts()).toEqual({
          heroOpen: "1",
          heroDone: "1",
          percentage: "50%", // 1 of 2 now, not 1 of 3
          openSection: "1",
          doneSection: "1",
        })
      );
    });

    it("Then cancelling keeps it and leaves the counts alone", async () => {
      const user = userEvent.setup();
      const todo = makeTodo({ done: false });
      const { repository } = renderInbox([todo]);

      await screen.findByTestId(rowTitle(todo));
      const before = shownCounts();

      await user.click(screen.getByTestId(deleteButton(todo)));
      await user.click(await screen.findByTestId(deleteCancel(todo)));

      await waitFor(() =>
        expect(screen.queryByTestId(deleteDialog(todo))).not.toBeInTheDocument()
      );

      expect(repository.delete).not.toHaveBeenCalled();
      expect(screen.getByTestId(rowTitle(todo))).toBeInTheDocument();
      expect(shownCounts()).toEqual(before);
    });
  });

  describe("when I open a todo", () => {
    it("Then the url carries its id", async () => {
      const user = userEvent.setup();
      const first = makeTodo({ done: false });
      const second = makeTodo({ done: false });
      const { currentLocation } = renderInbox([first, second]);

      await screen.findByTestId(rowTitle(second));

      await user.click(screen.getByTestId(rowTitle(second)));

      await waitFor(() =>
        expect(currentLocation()).toBe(`/?todo=${second.id}`)
      );
    });

    it("Then the modal for the clicked todo opens", async () => {
      const user = userEvent.setup();
      const first = makeTodo({ done: false });
      const second = makeTodo({ done: false });
      renderInbox([first, second]);

      await screen.findByTestId(rowTitle(second));
      expect(screen.queryByTestId(modal(second))).not.toBeInTheDocument();

      await user.click(screen.getByTestId(rowTitle(second)));

      expect(await screen.findByTestId(modal(second))).toBeInTheDocument();
      // Two todos, so this proves the *clicked* one opened.
      expect(screen.queryByTestId(modal(first))).not.toBeInTheDocument();
    });
  });
});
