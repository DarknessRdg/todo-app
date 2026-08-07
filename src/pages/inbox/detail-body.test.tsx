import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { TodoDetail } from "@/pages/inbox/detail-body";
import { subtasksFor } from "@/pages/inbox/todo-meta";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

const title = "todo.detail.title";
const readView = "todo.detail.description.read";
const editor = "todo.detail.description.editor";
const subtaskCount = "todo.detail.subtask.count";
const subtaskCheck = (id: string) => `todo.detail.subtask.${id}.check`;
const linkButton = "editor.toolbar.link.button";
const linkUrlInput = "editor.toolbar.link.url.input";

function renderDetail(todo: TodoEntity) {
  const repository = inMemoryTodoRepository([todo]);

  return {
    ...renderWithContainer(<TodoDetail todo={todo} />, {
      diContainer: createTestContainer(repository),
    }),
    repository,
  };
}

/**
 * Subtasks are derived from the id: roughly a third of ids produce none, and
 * some produce a fully complete set. A spec that checks one off has to pick an
 * id that actually has something left to check rather than hope for one.
 */
function idWithPendingSubtask(): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const { id } = makeTodo();
    if (subtasksFor(id).some((subtask) => !subtask.done)) return id;
  }
  throw new Error("no generated id produced a pending subtask");
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
      const user = userEvent.setup();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(screen.getByTestId(readView));

      expect(await screen.findByTestId(editor)).toBeInTheDocument();
      expect(screen.queryByTestId(readView)).not.toBeInTheDocument();
    });
  });

  describe("when I edit the description and leave the field", () => {
    it("Then the new text is persisted", async () => {
      const user = userEvent.setup();
      const todo = makeTodo({ description: "the old notes" });
      const { repository } = renderDetail(todo);

      await user.click(screen.getByTestId(readView));
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
      const user = userEvent.setup();
      const { repository } = renderDetail(
        makeTodo({ description: "the old notes" })
      );

      await user.click(screen.getByTestId(readView));
      fireEvent.blur(await screen.findByTestId(editor));

      await waitFor(() =>
        expect(screen.getByTestId(readView)).toBeInTheDocument()
      );
      expect(repository.updateDescription).not.toHaveBeenCalled();
    });
  });

  describe("when I reach for the link control while editing the description", () => {
    it("Then the editor stays open instead of dropping back to read mode", async () => {
      const user = userEvent.setup();
      renderDetail(makeTodo({ description: "read the docs" }));

      await user.click(screen.getByTestId(readView));
      await user.click(await screen.findByTestId(linkButton));

      expect(await screen.findByTestId(linkUrlInput)).toBeInTheDocument();
      expect(screen.getByTestId(editor)).toBeInTheDocument();
      expect(screen.queryByTestId(readView)).not.toBeInTheDocument();
    });

    it("Then nothing is written back just for opening it", async () => {
      const user = userEvent.setup();
      const { repository } = renderDetail(
        makeTodo({ description: "read the docs" })
      );

      await user.click(screen.getByTestId(readView));
      await user.click(await screen.findByTestId(linkButton));
      await screen.findByTestId(linkUrlInput);

      expect(repository.updateDescription).not.toHaveBeenCalled();
    });
  });

  describe("when I check a subtask", () => {
    it("Then the completed tally goes up", async () => {
      const user = userEvent.setup();
      const id = idWithPendingSubtask();
      const subtasks = subtasksFor(id);
      const pending = subtasks.find((subtask) => !subtask.done)!;
      const doneBefore = subtasks.filter((subtask) => subtask.done).length;

      renderDetail(makeTodo({ id }));

      expect(await screen.findByTestId(subtaskCount)).toHaveTextContent(
        `${doneBefore}/${subtasks.length}`
      );

      await user.click(screen.getByTestId(subtaskCheck(pending.id)));

      await waitFor(() =>
        expect(screen.getByTestId(subtaskCount)).toHaveTextContent(
          `${doneBefore + 1}/${subtasks.length}`
        )
      );
    });
  });
});
