import { describe, expect, it } from "vitest";

import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { createTestContainer, mockTodoRepository } from "@/test/container";
import { makeCreateTodo } from "@/test/todo-factory";

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
});
