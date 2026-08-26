import { describe, expect, it } from "vitest";

import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import {
  createTestContainer,
  mockTodoRepository,
  type MockTodoRepository,
} from "@/test/container";
import { makeCreateTodo, makeTodo } from "@/test/todo-factory";

function serviceWith(repository: MockTodoRepository) {
  return createTestContainer(repository).get<TodoService>(
    Dependencies.TodoService
  );
}

describe("TodoService", () => {
  it("when resolved from the container, Then persists through the repository port", async () => {
    const repository = mockTodoRepository();
    const container = createTestContainer(repository);
    // Title stays generated on purpose: the assertion is pass-through, so a
    // random value proves it more than a literal the service could hard-code.
    const input = makeCreateTodo();

    const service = container.get<TodoService>(Dependencies.TodoService);
    await service.create(input);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create.mock.calls[0][0]).toMatchObject({
      title: input.title,
    });
  });

  /**
   * There is no level meaning "none": a todo nobody has triaged carries no
   * priority at all, the same way an undated one carries no due date. So the
   * service applies no default — there is nothing to default to.
   */
  describe("when I create a todo", () => {
    it("Then it carries no priority, none having been given", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).create(makeCreateTodo());

      expect(repository.create.mock.calls[0][0].priority).toBeUndefined();
    });

    it("Then a priority I do give is persisted with it", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).create(
        makeCreateTodo({ priority: "urgent" })
      );

      expect(repository.create.mock.calls[0][0].priority).toBe("urgent");
    });
  });

  describe("when I set a todo's priority", () => {
    it("Then it is persisted against it", async () => {
      const repository = mockTodoRepository();
      const todo = makeTodo();

      await serviceWith(repository).updatePriority({
        id: todo.id,
        priority: "high",
      });

      expect(repository.updatePriority).toHaveBeenCalledWith({
        id: todo.id,
        priority: "high",
      });
    });

    it("Then clearing it passes nothing rather than a level", async () => {
      const repository = mockTodoRepository();
      const todo = makeTodo();

      await serviceWith(repository).updatePriority({
        id: todo.id,
        priority: undefined,
      });

      expect(repository.updatePriority).toHaveBeenCalledWith({
        id: todo.id,
        priority: undefined,
      });
    });
  });

  it("when a todo is created, Then it starts with no subtasks", async () => {
    const repository = mockTodoRepository();

    await serviceWith(repository).create(makeCreateTodo());

    expect(repository.create.mock.calls[0][0].subtasks).toEqual([]);
  });

  describe("when I add a subtask", () => {
    it("Then it is persisted against its todo with the title I gave", async () => {
      const repository = mockTodoRepository();
      const todo = makeTodo();

      await serviceWith(repository).addSubtask({
        id: todo.id,
        title: "Break it into steps",
      });

      expect(repository.addSubtask).toHaveBeenCalledTimes(1);
      expect(repository.addSubtask.mock.calls[0][0]).toMatchObject({
        id: todo.id,
        subtask: { title: "Break it into steps", done: false },
      });
    });

    it("Then it is given an id of its own", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).addSubtask({
        id: makeTodo().id,
        title: "Break it into steps",
      });

      expect(repository.addSubtask.mock.calls[0][0].subtask.id).not.toBe("");
    });

    it("Then two added in a row do not share an id", async () => {
      const repository = mockTodoRepository();
      const service = serviceWith(repository);
      const { id } = makeTodo();

      await service.addSubtask({ id, title: "first" });
      await service.addSubtask({ id, title: "second" });

      const [first, second] = repository.addSubtask.mock.calls;
      expect(first[0].subtask.id).not.toBe(second[0].subtask.id);
    });

    it("Then an untitled one is rejected instead of persisted", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).addSubtask({
        id: makeTodo().id,
        title: "",
      });

      expect(repository.addSubtask).not.toHaveBeenCalled();
    });

    it("Then a title of only whitespace is rejected too", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).addSubtask({
        id: makeTodo().id,
        title: "   ",
      });

      expect(repository.addSubtask).not.toHaveBeenCalled();
    });

    it("Then the title is stored trimmed", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).addSubtask({
        id: makeTodo().id,
        title: "  padded  ",
      });

      expect(repository.addSubtask.mock.calls[0][0].subtask.title).toBe(
        "padded"
      );
    });
  });

  describe("when I retitle a todo", () => {
    it("Then the new title is persisted against it", async () => {
      const repository = mockTodoRepository();
      const todo = makeTodo();

      await serviceWith(repository).updateTitle({
        id: todo.id,
        title: "Repot the fig tree",
      });

      expect(repository.updateTitle).toHaveBeenCalledTimes(1);
      expect(repository.updateTitle.mock.calls[0][0]).toEqual({
        id: todo.id,
        title: "Repot the fig tree",
      });
    });

    it("Then the title is stored trimmed", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).updateTitle({
        id: makeTodo().id,
        title: "   Repot the fig tree   ",
      });

      expect(repository.updateTitle.mock.calls[0][0].title).toBe(
        "Repot the fig tree"
      );
    });

    it("Then an empty title is rejected, so a todo cannot be left nameless", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).updateTitle({
        id: makeTodo().id,
        title: "",
      });

      expect(repository.updateTitle).not.toHaveBeenCalled();
    });

    it("Then a title of only whitespace is rejected too", async () => {
      const repository = mockTodoRepository();

      await serviceWith(repository).updateTitle({
        id: makeTodo().id,
        title: "   ",
      });

      expect(repository.updateTitle).not.toHaveBeenCalled();
    });
  });

  describe("when I complete a subtask", () => {
    it("Then the change is passed to the repository", async () => {
      const repository = mockTodoRepository();
      const todo = makeTodo();

      await serviceWith(repository).updateSubtaskDone({
        id: todo.id,
        subtaskId: "sub-1",
        done: true,
      });

      expect(repository.updateSubtaskDone).toHaveBeenCalledWith({
        id: todo.id,
        subtaskId: "sub-1",
        done: true,
      });
    });

    it("Then reopening it passes done false", async () => {
      const repository = mockTodoRepository();
      const todo = makeTodo();

      await serviceWith(repository).updateSubtaskDone({
        id: todo.id,
        subtaskId: "sub-1",
        done: false,
      });

      expect(repository.updateSubtaskDone).toHaveBeenCalledWith({
        id: todo.id,
        subtaskId: "sub-1",
        done: false,
      });
    });
  });

  describe("when I delete a subtask", () => {
    it("Then only that subtask is removed", async () => {
      const repository = mockTodoRepository();
      const todo = makeTodo();

      await serviceWith(repository).deleteSubtask({
        id: todo.id,
        subtaskId: "sub-1",
      });

      expect(repository.deleteSubtask).toHaveBeenCalledWith({
        id: todo.id,
        subtaskId: "sub-1",
      });
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
