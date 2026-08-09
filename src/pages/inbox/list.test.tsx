import { screen, within } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { Inbox } from "@/pages/inbox/inbox";
import { TodoList } from "@/pages/inbox/list";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeSubtask, makeTodo } from "@/test/todo-factory";

const openSection = "home.todo.section.open";
const doneSection = "home.todo.section.done";
const emptyState = "home.todo.empty";
const openToggle = "home.todo.section.open.toggle";
const doneToggle = "home.todo.section.done.toggle";
const openCount = "home.todo.section.open.count";

const rowTitle = (todo: TodoEntity) => `home.todo.${todo.id}.title`;
const checkButton = (todo: TodoEntity) => `home.todo.${todo.id}.check.button`;
const modal = (todo: TodoEntity) => `home.todo.${todo.id}.modal`;
const deleteButton = (todo: TodoEntity) => `home.todo.${todo.id}.delete.button`;
const deleteDialog = (todo: TodoEntity) => `home.todo.${todo.id}.delete.dialog`;
const deleteConfirm = (todo: TodoEntity) =>
  `home.todo.${todo.id}.delete.confirm`;
const deleteCancel = (todo: TodoEntity) => `home.todo.${todo.id}.delete.cancel`;
const subtaskCount = (todo: TodoEntity) =>
  `home.todo.${todo.id}.subtask.count`;

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

  describe("when there is nothing in the inbox", () => {
    it("Then the empty state stands in for the list", async () => {
      renderInbox([]);

      expect(await screen.findByTestId(emptyState)).toBeInTheDocument();
      expect(screen.queryByTestId(openSection)).not.toBeInTheDocument();
      expect(screen.queryByTestId(doneSection)).not.toBeInTheDocument();
    });

    it("Then a single todo is enough to replace it with the list", async () => {
      const todo = makeTodo({ done: false });
      renderInbox([todo]);

      await screen.findByTestId(rowTitle(todo));

      expect(screen.queryByTestId(emptyState)).not.toBeInTheDocument();
    });
  });

  describe("when I complete a todo", () => {
    it("Then it moves from the open section to the done section", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });
      const { repository } = renderInbox([todo]);

      const open = await screen.findByTestId(openSection);
      expect(within(open).getByTestId(rowTitle(todo))).toBeInTheDocument();

      await user.click(screen.getByTestId(checkButton(todo)));

      // The row is held in place before it re-sorts so the completion animation
      // is visible. `Timing.completionResortMs` is 0 under test, so no sleep.
      await waitFor(() =>
        expect(
          within(screen.getByTestId(doneSection)).getByTestId(rowTitle(todo))
        ).toBeInTheDocument()
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
      const user = setupUser();
      const todo = makeTodo({ done: false });
      const other = makeTodo({ done: false });
      renderInbox([todo, other]);

      await screen.findByTestId(openSection);
      expect(shownCounts().heroOpen).toBe("2");

      await user.click(screen.getByTestId(checkButton(todo)));

      await waitFor(() =>
        expect(shownCounts()).toEqual({
          heroOpen: "1",
          heroDone: "1",
          percentage: "50%",
          openSection: "1",
          doneSection: "1",
        })
      );
    });
  });

  describe("when I reopen a done todo", () => {
    it("Then it moves back to the open section", async () => {
      const user = setupUser();
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
      const user = setupUser();
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
      const user = setupUser();
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
      const user = setupUser();
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
      const user = setupUser();
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

  describe("when a todo has subtasks", () => {
    it("Then its row shows how many are done", async () => {
      const todo = makeTodo({
        done: false,
        subtasks: [
          makeSubtask({ done: true }),
          makeSubtask({ done: true }),
          makeSubtask({ done: false }),
        ],
      });
      renderInbox([todo]);

      expect(await screen.findByTestId(subtaskCount(todo))).toHaveTextContent(
        "2/3"
      );
    });

    it("Then a todo without any shows no indicator", async () => {
      const todo = makeTodo({ done: false, subtasks: [] });
      renderInbox([todo]);

      await screen.findByTestId(rowTitle(todo));

      expect(screen.queryByTestId(subtaskCount(todo))).not.toBeInTheDocument();
    });
  });

  describe("when I open a todo", () => {
    it("Then the url carries its id", async () => {
      const user = setupUser();
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
      const user = setupUser();
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

  describe("when I collapse a section", () => {
    it("Then its todos are taken off the screen", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });
      renderInbox([todo]);

      await screen.findByTestId(rowTitle(todo));
      await user.click(screen.getByTestId(openToggle));

      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(todo))).not.toBeInTheDocument()
      );
    });

    it("Then its count stays on screen, so it still says how much is hidden", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });
      renderInbox([todo]);

      await screen.findByTestId(rowTitle(todo));
      await user.click(screen.getByTestId(openToggle));

      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(todo))).not.toBeInTheDocument()
      );
      expect(screen.getByTestId(openCount)).toHaveTextContent("1");
    });

    it("Then expanding it again brings them back", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });
      renderInbox([todo]);

      await screen.findByTestId(rowTitle(todo));
      await user.click(screen.getByTestId(openToggle));
      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(todo))).not.toBeInTheDocument()
      );

      await user.click(screen.getByTestId(openToggle));

      expect(await screen.findByTestId(rowTitle(todo))).toBeInTheDocument();
    });

    it("Then the other section is left open", async () => {
      const user = setupUser();
      const open = makeTodo({ done: false });
      const done = makeTodo({ done: true });
      renderInbox([open, done]);

      await screen.findByTestId(rowTitle(open));
      await user.click(screen.getByTestId(doneToggle));

      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(done))).not.toBeInTheDocument()
      );
      expect(screen.getByTestId(rowTitle(open))).toBeInTheDocument();
    });
  });

  describe("when I come back to a page whose section I collapsed", () => {
    it("Then it is still collapsed", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });

      const first = renderInbox([todo]);
      await screen.findByTestId(rowTitle(todo));
      await user.click(screen.getByTestId(openToggle));
      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(todo))).not.toBeInTheDocument()
      );
      first.unmount();

      renderInbox([todo]);

      await screen.findByTestId(openToggle);
      expect(screen.queryByTestId(rowTitle(todo))).not.toBeInTheDocument();
    });

    it("Then expanding it again is remembered too", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });

      const first = renderInbox([todo]);
      await screen.findByTestId(rowTitle(todo));
      await user.click(screen.getByTestId(openToggle));
      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(todo))).not.toBeInTheDocument()
      );
      await user.click(screen.getByTestId(openToggle));
      await screen.findByTestId(rowTitle(todo));
      first.unmount();

      renderInbox([todo]);

      expect(await screen.findByTestId(rowTitle(todo))).toBeInTheDocument();
    });
  });

  describe("when I move from one project to another without leaving the page", () => {
    /**
     * `/project/a` and `/project/b` render the same element, so `TodoList` is
     * never unmounted between them — only its `projectId` changes.
     */
    function renderProjectList(projectId: string, todos: TodoEntity[]) {
      return renderWithContainer(<TodoList projectId={projectId} />, {
        diContainer: createTestContainer(inMemoryTodoRepository(todos)),
        route: `/project/${projectId}`,
      });
    }

    it("Then the section I collapsed in the first is not collapsed in the second", async () => {
      const user = setupUser();
      const mine = makeTodo({ done: false, projectId: "a" });
      const theirs = makeTodo({ done: false, projectId: "b" });

      const { rerender } = renderProjectList("a", [mine, theirs]);

      await screen.findByTestId(rowTitle(mine));
      await user.click(screen.getByTestId(openToggle));
      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(mine))).not.toBeInTheDocument()
      );

      rerender(<TodoList projectId="b" />);

      expect(await screen.findByTestId(rowTitle(theirs))).toBeInTheDocument();
    });

    it("Then coming back to the first finds it still collapsed", async () => {
      const user = setupUser();
      const mine = makeTodo({ done: false, projectId: "a" });
      const theirs = makeTodo({ done: false, projectId: "b" });

      const { rerender } = renderProjectList("a", [mine, theirs]);

      await screen.findByTestId(rowTitle(mine));
      await user.click(screen.getByTestId(openToggle));
      await waitFor(() =>
        expect(screen.queryByTestId(rowTitle(mine))).not.toBeInTheDocument()
      );

      rerender(<TodoList projectId="b" />);
      await screen.findByTestId(rowTitle(theirs));

      rerender(<TodoList projectId="a" />);

      await screen.findByTestId(openToggle);
      expect(screen.queryByTestId(rowTitle(mine))).not.toBeInTheDocument();
    });
  });
});
