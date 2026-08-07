import type { PropsWithChildren, ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { Container } from "inversify";
import { vi, type Mock } from "vitest";

import type { TodoRepository } from "@/backend/todo-service";
import { TodoService } from "@/backend/todo-service";
import { ContainerContext } from "@/di-container/hook";
import { Dependencies } from "@/di-container";

/**
 * Each port method as a Mock carrying that method's real signature, so
 * `.mock.calls` entries and `mockResolvedValue` are both type-checked.
 */
export type MockTodoRepository = {
  [K in keyof TodoRepository]: Mock<TodoRepository[K]>;
};

/**
 * An in-memory stand-in for the TodoRepository port. Tests assert on the calls
 * (`repository.create.mock.calls`) instead of reaching for IndexedDB.
 *
 * No `as` cast: the returned object must structurally satisfy the port, so
 * adding a method to TodoRepository breaks this function until it is handled.
 */
export function mockTodoRepository(
  overrides: Partial<MockTodoRepository> = {}
): MockTodoRepository {
  return {
    listAll: vi.fn<TodoRepository["listAll"]>().mockResolvedValue([]),
    create: vi.fn<TodoRepository["create"]>().mockResolvedValue(undefined),
    delete: vi.fn<TodoRepository["delete"]>().mockResolvedValue(undefined),
    updateDone: vi.fn<TodoRepository["updateDone"]>().mockResolvedValue(undefined),
    updateDescription: vi
      .fn<TodoRepository["updateDescription"]>()
      .mockResolvedValue(undefined),
    count: vi.fn<TodoRepository["count"]>().mockResolvedValue(0),
    getById: vi.fn<TodoRepository["getById"]>().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Builds the same container shape the app uses, but backed by a mock repository
 * — no IndexedDB is opened, so this is synchronous unlike `createDIContainer()`.
 */
export function createTestContainer(repository: TodoRepository = mockTodoRepository()) {
  const container = new Container({ defaultScope: "Singleton" });

  container
    .bind<TodoService>(Dependencies.TodoService)
    .toConstantValue(new TodoService({ repository }));

  return container;
}

/**
 * Renders through the same seams production uses: ContainerContext (which
 * `useContainer()` reads) and a QueryClientProvider with retries off.
 */
export function renderWithContainer(
  ui: ReactElement,
  options: RenderOptions & { container?: Container } = {}
) {
  const { container: diContainer = createTestContainer(), ...renderOptions } =
    options;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <ContainerContext.Provider value={diContainer}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ContainerContext.Provider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    diContainer,
    queryClient,
  };
}
