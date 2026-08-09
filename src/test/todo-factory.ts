import { faker } from "@faker-js/faker";

import type { ProjectEntity } from "@/backend/project-service";
import type {
  CreateTodoEntity,
  SubtaskEntity,
  TodoEntity,
} from "@/backend/todo-service";

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
    // Left unset rather than randomised: a spec that cares when a todo was
    // completed passes the date it wants to assert on.
    doneAt: undefined,
    // Empty rather than random: a spec that cares about subtasks passes them,
    // and one that does not should not have to reason about surprise rows.
    subtasks: [],
    ...overrides,
  };
}

export function makeSubtask(
  overrides: Partial<SubtaskEntity> = {}
): SubtaskEntity {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 2, max: 5 }),
    done: false,
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

export function makeProject(
  overrides: Partial<ProjectEntity> = {}
): ProjectEntity {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.department(),
    ...overrides,
  };
}
