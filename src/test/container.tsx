import type { PropsWithChildren, ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { Container } from "inversify";
import { MemoryRouter, useLocation, type Location } from "react-router";
import { vi, type Mock } from "vitest";

import type { TodoEntity, TodoRepository } from "@/backend/todo-service";
import { TodoService } from "@/backend/todo-service";
import type { LabelEntity, LabelRepository } from "@/backend/label-service";
import { LabelService } from "@/backend/label-service";
import type {
  ProjectEntity,
  ProjectRepository,
} from "@/backend/project-service";
import { ProjectService } from "@/backend/project-service";
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
    updateDone: vi
      .fn<TodoRepository["updateDone"]>()
      .mockResolvedValue(undefined),
    updateTitle: vi
      .fn<TodoRepository["updateTitle"]>()
      .mockResolvedValue(undefined),
    updateProject: vi
      .fn<TodoRepository["updateProject"]>()
      .mockResolvedValue(undefined),
    updateDueDate: vi
      .fn<TodoRepository["updateDueDate"]>()
      .mockResolvedValue(undefined),
    updatePriority: vi
      .fn<TodoRepository["updatePriority"]>()
      .mockResolvedValue(undefined),
    updateDescription: vi
      .fn<TodoRepository["updateDescription"]>()
      .mockResolvedValue(undefined),
    updateLabels: vi
      .fn<TodoRepository["updateLabels"]>()
      .mockResolvedValue(undefined),
    removeLabelEverywhere: vi
      .fn<TodoRepository["removeLabelEverywhere"]>()
      .mockResolvedValue(undefined),
    clearProjectEverywhere: vi
      .fn<TodoRepository["clearProjectEverywhere"]>()
      .mockResolvedValue(undefined),
    count: vi.fn<TodoRepository["count"]>().mockResolvedValue(0),
    getById: vi.fn<TodoRepository["getById"]>().mockResolvedValue(undefined),
    addSubtask: vi
      .fn<TodoRepository["addSubtask"]>()
      .mockResolvedValue(undefined),
    updateSubtaskDone: vi
      .fn<TodoRepository["updateSubtaskDone"]>()
      .mockResolvedValue(undefined),
    deleteSubtask: vi
      .fn<TodoRepository["deleteSubtask"]>()
      .mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * A `mockTodoRepository` whose reads reflect its own writes, for specs that
 * assert on what happens *after* a mutation invalidates a query. The plain mock
 * replays a fixed list, so nothing ever appears to change.
 *
 * Still `vi.fn()`-backed, so calls remain assertable.
 */
export function inMemoryTodoRepository(
  initial: TodoEntity[] = []
): MockTodoRepository {
  const rows: TodoEntity[] = initial.map((row) => ({
    ...row,
    subtasks: row.subtasks.map((subtask) => ({ ...subtask })),
    labelIds: [...row.labelIds],
  }));
  const find = (id: string) => rows.find((row) => row.id === id);

  return mockTodoRepository({
    listAll: vi.fn<TodoRepository["listAll"]>(async () =>
      rows.map((row) => ({
        ...row,
        subtasks: [...row.subtasks],
        labelIds: [...row.labelIds],
      }))
    ),
    getById: vi.fn<TodoRepository["getById"]>(async (id) => {
      const row = find(id);
      return row === undefined
        ? undefined
        : { ...row, subtasks: [...row.subtasks], labelIds: [...row.labelIds] };
    }),
    count: vi.fn<TodoRepository["count"]>(async () => rows.length),
    create: vi.fn<TodoRepository["create"]>(async (todo) => {
      rows.push({ ...todo });
    }),
    delete: vi.fn<TodoRepository["delete"]>(async (id) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index >= 0) rows.splice(index, 1);
    }),
    updateDone: vi.fn<TodoRepository["updateDone"]>(async ({ id, done }) => {
      const row = find(id);
      if (!row) return;

      row.done = done;
      // Stamped and cleared exactly as the real adapter does, so a spec reading
      // the completion date back is not being told a story by the fake.
      row.doneAt = done ? new Date() : undefined;
    }),
    updateProject: vi.fn<TodoRepository["updateProject"]>(
      async ({ id, projectId }) => {
        const row = find(id);
        if (row) row.projectId = projectId;
      }
    ),
    updateDueDate: vi.fn<TodoRepository["updateDueDate"]>(
      async ({ id, dueDate }) => {
        const row = find(id);
        if (row) row.dueDate = dueDate;
      }
    ),
    updatePriority: vi.fn<TodoRepository["updatePriority"]>(
      async ({ id, priority }) => {
        const row = find(id);
        if (row) row.priority = priority;
      }
    ),
    updateTitle: vi.fn<TodoRepository["updateTitle"]>(async ({ id, title }) => {
      const row = find(id);
      if (row) row.title = title;
    }),
    updateDescription: vi.fn<TodoRepository["updateDescription"]>(
      async ({ id, description }) => {
        const row = find(id);
        if (row) row.description = description;
      }
    ),
    updateLabels: vi.fn<TodoRepository["updateLabels"]>(
      async ({ id, labelIds }) => {
        const row = find(id);
        if (row) row.labelIds = [...labelIds];
      }
    ),
    removeLabelEverywhere: vi.fn<TodoRepository["removeLabelEverywhere"]>(
      async (labelId) => {
        for (const row of rows) {
          row.labelIds = row.labelIds.filter((it) => it !== labelId);
        }
      }
    ),
    clearProjectEverywhere: vi.fn<TodoRepository["clearProjectEverywhere"]>(
      async (projectId) => {
        for (const row of rows) {
          if (row.projectId === projectId) row.projectId = undefined;
        }
      }
    ),
    addSubtask: vi.fn<TodoRepository["addSubtask"]>(async ({ id, subtask }) => {
      const row = find(id);
      if (row) row.subtasks = [...row.subtasks, { ...subtask }];
    }),
    updateSubtaskDone: vi.fn<TodoRepository["updateSubtaskDone"]>(
      async ({ id, subtaskId, done }) => {
        const row = find(id);
        if (!row) return;
        row.subtasks = row.subtasks.map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, done } : subtask
        );
      }
    ),
    deleteSubtask: vi.fn<TodoRepository["deleteSubtask"]>(
      async ({ id, subtaskId }) => {
        const row = find(id);
        if (!row) return;
        row.subtasks = row.subtasks.filter(
          (subtask) => subtask.id !== subtaskId
        );
      }
    ),
  });
}

/** The ProjectRepository port, each method a typed `vi.fn()`. */
export type MockProjectRepository = {
  [K in keyof ProjectRepository]: Mock<ProjectRepository[K]>;
};

export function mockProjectRepository(
  overrides: Partial<MockProjectRepository> = {}
): MockProjectRepository {
  return {
    listAll: vi.fn<ProjectRepository["listAll"]>().mockResolvedValue([]),
    create: vi.fn<ProjectRepository["create"]>().mockResolvedValue(undefined),
    findByName: vi
      .fn<ProjectRepository["findByName"]>()
      .mockResolvedValue(undefined),
    rename: vi.fn<ProjectRepository["rename"]>().mockResolvedValue(undefined),
    move: vi.fn<ProjectRepository["move"]>().mockResolvedValue(undefined),
    delete: vi.fn<ProjectRepository["delete"]>().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * A `mockProjectRepository` whose reads reflect its own writes, so a spec can
 * create a project inline and then find it in the list.
 */
export function inMemoryProjectRepository(
  initial: ProjectEntity[] = []
): MockProjectRepository {
  const rows: ProjectEntity[] = initial.map((row) => ({ ...row }));

  return mockProjectRepository({
    listAll: vi.fn<ProjectRepository["listAll"]>(async () =>
      [...rows].sort((a, b) => a.name.localeCompare(b.name))
    ),
    create: vi.fn<ProjectRepository["create"]>(async (project) => {
      rows.push({ ...project });
    }),
    findByName: vi.fn<ProjectRepository["findByName"]>(async (name) => {
      const wanted = name.trim().toLocaleLowerCase();
      return rows.find((row) => row.name.toLocaleLowerCase() === wanted);
    }),
    rename: vi.fn<ProjectRepository["rename"]>(async ({ id, name }) => {
      const row = rows.find((it) => it.id === id);
      if (row) row.name = name;
    }),
    move: vi.fn<ProjectRepository["move"]>(async ({ id, parentId }) => {
      const row = rows.find((it) => it.id === id);
      if (row) row.parentId = parentId;
    }),
    delete: vi.fn<ProjectRepository["delete"]>(async (id) => {
      const index = rows.findIndex((it) => it.id === id);
      if (index >= 0) rows.splice(index, 1);
    }),
  });
}

/** The LabelRepository port, each method a typed `vi.fn()`. */
export type MockLabelRepository = {
  [K in keyof LabelRepository]: Mock<LabelRepository[K]>;
};

export function mockLabelRepository(
  overrides: Partial<MockLabelRepository> = {}
): MockLabelRepository {
  return {
    listAll: vi.fn<LabelRepository["listAll"]>().mockResolvedValue([]),
    create: vi.fn<LabelRepository["create"]>().mockResolvedValue(undefined),
    rename: vi.fn<LabelRepository["rename"]>().mockResolvedValue(undefined),
    delete: vi.fn<LabelRepository["delete"]>().mockResolvedValue(undefined),
    findByName: vi
      .fn<LabelRepository["findByName"]>()
      .mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * A `mockLabelRepository` whose reads reflect its own writes, so a spec can
 * create a label and then find it in the list.
 */
export function inMemoryLabelRepository(
  initial: LabelEntity[] = []
): MockLabelRepository {
  const rows: LabelEntity[] = initial.map((row) => ({ ...row }));

  return mockLabelRepository({
    listAll: vi.fn<LabelRepository["listAll"]>(async () =>
      [...rows].sort((a, b) => a.name.localeCompare(b.name))
    ),
    create: vi.fn<LabelRepository["create"]>(async (label) => {
      rows.push({ ...label });
    }),
    rename: vi.fn<LabelRepository["rename"]>(async ({ id, name }) => {
      const row = rows.find((it) => it.id === id);
      if (row) row.name = name;
    }),
    delete: vi.fn<LabelRepository["delete"]>(async (id) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index >= 0) rows.splice(index, 1);
    }),
    findByName: vi.fn<LabelRepository["findByName"]>(async (name) => {
      const wanted = name.trim().toLocaleLowerCase();
      return rows.find((row) => row.name.toLocaleLowerCase() === wanted);
    }),
  });
}

/**
 * Builds the same container shape the app uses, but backed by mock repositories
 * — no IndexedDB is opened, so this is synchronous unlike `createDIContainer()`.
 */
export function createTestContainer(
  repository: TodoRepository = mockTodoRepository(),
  projectRepository: ProjectRepository = mockProjectRepository(),
  labelRepository: LabelRepository = mockLabelRepository()
) {
  const container = new Container({ defaultScope: "Singleton" });

  container
    .bind<TodoService>(Dependencies.TodoService)
    .toConstantValue(new TodoService({ repository }));

  container
    .bind<ProjectService>(Dependencies.ProjectService)
    .toConstantValue(new ProjectService({ repository: projectRepository }));

  container
    .bind<LabelService>(Dependencies.LabelService)
    .toConstantValue(new LabelService({ repository: labelRepository }));

  return container;
}

/**
 * Renders through the same seams production uses: ContainerContext (which
 * `useContainer()` reads) and a QueryClientProvider with retries off.
 *
 * Pass `route` to mount inside a MemoryRouter — needed by anything that reads
 * search params or navigates. `currentLocation` reports back the live URL.
 */
export function renderWithContainer(
  ui: ReactElement,
  // `diContainer`, not `container` — RTL's RenderOptions already owns that name
  // for the host element, and the two silently collide.
  options: RenderOptions & {
    diContainer?: Container;
    route?: string;
    /**
     * Override the query client. The default disables retries so a spec never
     * waits out a backoff — which also makes the suite blind to whether the
     * *app* retries. A spec about retry behaviour must pass its own client
     * carrying the production defaults.
     */
    queryClient?: QueryClient;
  } = {}
) {
  const {
    diContainer = createTestContainer(),
    route,
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  } = options;

  let location: Location | undefined;

  function LocationProbe() {
    location = useLocation();
    return null;
  }

  function Wrapper({ children }: PropsWithChildren) {
    const tree = (
      <ContainerContext.Provider value={diContainer}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ContainerContext.Provider>
    );

    if (route === undefined) return tree;

    return (
      <MemoryRouter initialEntries={[route]}>
        <LocationProbe />
        {tree}
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    diContainer,
    queryClient,
    /** The live URL, e.g. `"/?todo=1"`. Only meaningful when `route` was passed. */
    currentLocation: () =>
      location === undefined
        ? undefined
        : `${location.pathname}${location.search}`,
  };
}
