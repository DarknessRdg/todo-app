import { fireEvent, screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { TodoDetail } from "@/pages/inbox/detail-body";
import { useTodoDetails } from "@/pages/inbox/use-todo-details";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeSubtask, makeTodo } from "@/test/todo-factory";

const title = "todo.detail.title";
const readView = "todo.detail.description.read";
const editor = "todo.detail.description.editor";
const subtaskCount = "todo.detail.subtask.count";
const addInput = "todo.detail.subtask.add.input";
const addButton = "todo.detail.subtask.add.button";
const row = (id: string) => `todo.detail.subtask.${id}`;
const check = (id: string) => `todo.detail.subtask.${id}.check`;
const deleteButton = (id: string) =>
  `todo.detail.subtask.${id}.delete.button`;
const linkButton = "editor.toolbar.link.button";
const linkUrlInput = "editor.toolbar.link.url.input";

/**
 * `TodoDetail` takes its todo as a prop, so on its own it can never show the
 * result of a mutation. Both real callers (the modal and the page) feed it
 * from `useTodoDetails`, and that query is what invalidation refreshes — so
 * the spec mounts it behind the same subscription rather than a fixed prop.
 */
function SubscribedDetail({ id }: { id: string }) {
  const { todo } = useTodoDetails({ id });

  return todo ? <TodoDetail todo={todo} /> : null;
}

function renderDetail(todo: TodoEntity) {
  const repository = inMemoryTodoRepository([todo]);

  return {
    ...renderWithContainer(<SubscribedDetail id={todo.id} />, {
      diContainer: createTestContainer(repository),
    }),
    repository,
  };
}

describe("todo detail", () => {

  describe("when it is shown", () => {
    it("Then the todo's title is on screen", async () => {
      const todo = makeTodo({ title: "Rewire the doorbell" });
      renderDetail(todo);

      expect(await screen.findByTestId(title)).toHaveTextContent(
        "Rewire the doorbell"
      );
    });

    it("Then a todo without a description offers the placeholder", async () => {
      renderDetail(makeTodo({ description: undefined }));

      expect(await screen.findByTestId(readView)).toHaveTextContent(
        "Add a description…"
      );
    });
  });

  describe("when I click the description", () => {
    it("Then it turns into the editor", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));

      expect(await screen.findByTestId(editor)).toBeInTheDocument();
      expect(screen.queryByTestId(readView)).not.toBeInTheDocument();
    });
  });

  describe("when I edit the description and leave the field", () => {
    it("Then the new text is persisted", async () => {
      const user = setupUser();
      const todo = makeTodo({ description: "the old notes" });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.clear(field);
      await user.type(field, "the new notes");
      fireEvent.blur(field);

      await waitFor(() =>
        expect(repository.updateDescription).toHaveBeenCalledWith({
          id: todo.id,
          description: "the new notes",
        })
      );
    });

    it("Then an unchanged description is not written back", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ description: "the old notes" })
      );

      await user.click(await screen.findByTestId(readView));
      fireEvent.blur(await screen.findByTestId(editor));

      await waitFor(() =>
        expect(screen.getByTestId(readView)).toBeInTheDocument()
      );
      expect(repository.updateDescription).not.toHaveBeenCalled();
    });
  });

  describe("when I reach for the link control while editing the description", () => {
    it("Then the editor stays open instead of dropping back to read mode", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "read the docs" }));

      await user.click(await screen.findByTestId(readView));
      await user.click(await screen.findByTestId(linkButton));

      expect(await screen.findByTestId(linkUrlInput)).toBeInTheDocument();
      expect(screen.getByTestId(editor)).toBeInTheDocument();
      expect(screen.queryByTestId(readView)).not.toBeInTheDocument();
    });

    it("Then nothing is written back just for opening it", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ description: "read the docs" })
      );

      await user.click(await screen.findByTestId(readView));
      await user.click(await screen.findByTestId(linkButton));
      await screen.findByTestId(linkUrlInput);

      expect(repository.updateDescription).not.toHaveBeenCalled();
    });
  });

  describe("when I add a subtask", () => {
    it("Then it is persisted against the todo", async () => {
      const user = setupUser();
      const todo = makeTodo({ subtasks: [] });
      const { repository } = renderDetail(todo);

      await user.type(
        await screen.findByTestId(addInput),
        "Break it into steps"
      );
      await user.click(screen.getByTestId(addButton));

      await waitFor(() =>
        expect(repository.addSubtask).toHaveBeenCalledTimes(1)
      );
      expect(repository.addSubtask.mock.calls[0][0]).toMatchObject({
        id: todo.id,
        subtask: { title: "Break it into steps", done: false },
      });
    });

    it("Then it appears in the list", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ subtasks: [] }));

      await user.type(
        await screen.findByTestId(addInput),
        "Break it into steps"
      );
      await user.click(screen.getByTestId(addButton));

      expect(await screen.findByText("Break it into steps")).toBeInTheDocument();
    });

    it("Then the field clears, ready for the next one", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ subtasks: [] }));

      await user.type(await screen.findByTestId(addInput), "Draft it");
      await user.click(screen.getByTestId(addButton));

      await waitFor(() =>
        expect(screen.getByTestId(addInput)).toHaveValue("")
      );
    });

    it("Then pressing enter adds it without reaching for the button", async () => {
      const user = setupUser();
      const { repository } = renderDetail(makeTodo({ subtasks: [] }));

      await user.type(await screen.findByTestId(addInput), "Draft it{Enter}");

      await waitFor(() =>
        expect(repository.addSubtask).toHaveBeenCalledTimes(1)
      );
    });

    it("Then a blank title adds nothing", async () => {
      const user = setupUser();
      const { repository } = renderDetail(makeTodo({ subtasks: [] }));

      await user.type(await screen.findByTestId(addInput), "   {Enter}");

      expect(repository.addSubtask).not.toHaveBeenCalled();
    });
  });

  describe("when I complete a subtask", () => {
    it("Then the change is persisted", async () => {
      const user = setupUser();
      const subtask = makeSubtask({ done: false });
      const todo = makeTodo({ subtasks: [subtask] });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(check(subtask.id)));

      await waitFor(() =>
        expect(repository.updateSubtaskDone).toHaveBeenCalledWith({
          id: todo.id,
          subtaskId: subtask.id,
          done: true,
        })
      );
    });

    it("Then the completed tally goes up", async () => {
      const user = setupUser();
      const first = makeSubtask({ done: false });
      const second = makeSubtask({ done: false });
      renderDetail(makeTodo({ subtasks: [first, second] }));

      expect(await screen.findByTestId(subtaskCount)).toHaveTextContent("0/2");

      await user.click(screen.getByTestId(check(first.id)));

      await waitFor(() =>
        expect(screen.getByTestId(subtaskCount)).toHaveTextContent("1/2")
      );
    });

    it("Then reopening a done one brings the tally back down", async () => {
      const user = setupUser();
      const subtask = makeSubtask({ done: true });
      const todo = makeTodo({ subtasks: [subtask] });
      const { repository } = renderDetail(todo);

      expect(await screen.findByTestId(subtaskCount)).toHaveTextContent("1/1");

      await user.click(screen.getByTestId(check(subtask.id)));

      await waitFor(() =>
        expect(repository.updateSubtaskDone).toHaveBeenCalledWith({
          id: todo.id,
          subtaskId: subtask.id,
          done: false,
        })
      );
      await waitFor(() =>
        expect(screen.getByTestId(subtaskCount)).toHaveTextContent("0/1")
      );
    });
  });

  describe("when I delete a subtask", () => {
    it("Then only that one is removed", async () => {
      const user = setupUser();
      const doomed = makeSubtask({ title: "Doomed" });
      const survivor = makeSubtask({ title: "Survivor" });
      const todo = makeTodo({ subtasks: [doomed, survivor] });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(deleteButton(doomed.id)));

      await waitFor(() =>
        expect(repository.deleteSubtask).toHaveBeenCalledWith({
          id: todo.id,
          subtaskId: doomed.id,
        })
      );
      await waitFor(() =>
        expect(screen.queryByTestId(row(doomed.id))).not.toBeInTheDocument()
      );
      expect(screen.getByTestId(row(survivor.id))).toBeInTheDocument();
    });

    it("Then the tally shrinks with it", async () => {
      const user = setupUser();
      const doomed = makeSubtask({ done: true });
      const survivor = makeSubtask({ done: false });
      renderDetail(makeTodo({ subtasks: [doomed, survivor] }));

      expect(await screen.findByTestId(subtaskCount)).toHaveTextContent("1/2");

      await user.click(screen.getByTestId(deleteButton(doomed.id)));

      await waitFor(() =>
        expect(screen.getByTestId(subtaskCount)).toHaveTextContent("0/1")
      );
    });

    it("Then removing the last one takes the tally away entirely", async () => {
      const user = setupUser();
      const only = makeSubtask();
      renderDetail(makeTodo({ subtasks: [only] }));

      await user.click(await screen.findByTestId(deleteButton(only.id)));

      await waitFor(() =>
        expect(screen.queryByTestId(subtaskCount)).not.toBeInTheDocument()
      );
    });
  });
});
