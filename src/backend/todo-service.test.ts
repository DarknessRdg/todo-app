import { describe, expect, it } from "vitest";

import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { createTestContainer, mockTodoRepository } from "@/test/container";

describe("TodoService", () => {
  it("when resolved from the container, Then persists through the repository port", async () => {
    const repository = mockTodoRepository();
    const container = createTestContainer(repository);

    const service = container.get<TodoService>(Dependencies.TodoService);
    await service.create({ title: "wired up" });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create.mock.calls[0][0]).toMatchObject({
      title: "wired up",
    });
  });
});
