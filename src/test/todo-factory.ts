import { faker } from "@faker-js/faker";

import type { CreateTodoEntity, TodoEntity } from "@/backend/todo-service";

/**
 * Test data is random by default so specs cannot quietly depend on a literal
 * they never declared. The rule that keeps that honest:
 *
 *   **Anything a test asserts on or branches on, it must pass explicitly.**
 *
 * Reading a generated value back out of the factory defeats the point — if the
 * test cares about the title, it supplies the title.
 *
 * Runs are reproducible: `src/test/setup.ts` seeds faker and prints the seed,
 * and `FAKER_SEED=<n> npx vitest run` replays a failure exactly.
 */

export function makeTodo(overrides: Partial<TodoEntity> = {}): TodoEntity {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 2, max: 6 }),
    done: faker.datatype.boolean(),
    createdAt: faker.date.recent({ days: 30 }),
    ...overrides,
  };
}

export function makeCreateTodo(
  overrides: Partial<CreateTodoEntity> = {}
): CreateTodoEntity {
  return {
    title: faker.lorem.sentence({ min: 2, max: 6 }),
    ...overrides,
  };
}
