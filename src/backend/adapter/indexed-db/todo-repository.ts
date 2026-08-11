import { Tables, type AppIDB } from "@/backend/adapter/indexed-db/indexed-db";
import type {
  SubtaskEntity,
  TodoEntity,
  TodoRepository,
} from "@/backend/todo-service";

export class TodoRepositoryIndexedDB implements TodoRepository {
  private db: AppIDB;

  constructor(db: AppIDB) {
    this.db = db;
  }

  listAll = async () => {
    return this.db.getAll(Tables.Todo);
  };

  count = async () => {
    return this.db.count(Tables.Todo);
  };

  create = async (todo: TodoEntity) => {
    await this.db.add(Tables.Todo, todo);
  };

  delete = async (id: string) => {
    await this.db.delete(Tables.Todo, id);
  };

  getById = async (id: string) => {
    return this.db.get(Tables.Todo, id);
  };

  updateDone = async ({ id, done }: { id: string; done: boolean }) => {
    await this.mutateTodo(id, (todo) => ({
      ...todo,
      done,
      // Records the completion without touching `dueDate` — that is the date
      // the user picked, and stamping it here silently rewrote their choice.
      doneAt: done ? new Date() : undefined,
    }));
  };

  updateTitle = async ({ id, title }: { id: string; title: string }) => {
    await this.mutateTodo(id, (todo) => ({ ...todo, title }));
  };

  updateDueDate = async ({
    id,
    dueDate,
  }: {
    id: string;
    dueDate: Date | undefined;
  }) => {
    await this.mutateTodo(id, (todo) => ({ ...todo, dueDate }));
  };

  updateProject = async ({
    id,
    projectId,
  }: {
    id: string;
    projectId: string | undefined;
  }) => {
    await this.mutateTodo(id, (todo) => ({ ...todo, projectId }));
  };

  updateDescription = async ({
    id,
    description,
  }: {
    id: string;
    description: string;
  }) => {
    await this.mutateTodo(id, (todo) => ({ ...todo, description }));
  };

  updateLabels = async ({
    id,
    labelIds,
  }: {
    id: string;
    labelIds: string[];
  }) => {
    await this.mutateTodo(id, (todo) => ({ ...todo, labelIds }));
  };

  /**
   * Read-modify-write over every todo rather than an index lookup: the store
   * holds one workspace's todos, and a label is on a handful of them. An index
   * on an array field would be the answer at a scale this app does not have.
   */
  removeLabelEverywhere = async (labelId: string) => {
    const transaction = this.db.transaction(Tables.Todo, "readwrite");
    const store = transaction.objectStore(Tables.Todo);

    for (const todo of await store.getAll()) {
      const labelIds = todo.labelIds ?? [];
      if (!labelIds.includes(labelId)) continue;

      await store.put({
        ...todo,
        labelIds: labelIds.filter((id) => id !== labelId),
      });
    }

    await transaction.done;
  };

  addSubtask = async ({
    id,
    subtask,
  }: {
    id: string;
    subtask: SubtaskEntity;
  }) => {
    await this.mutateSubtasks(id, (subtasks) => [...subtasks, subtask]);
  };

  updateSubtaskDone = async ({
    id,
    subtaskId,
    done,
  }: {
    id: string;
    subtaskId: string;
    done: boolean;
  }) => {
    await this.mutateSubtasks(id, (subtasks) =>
      subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, done } : subtask
      )
    );
  };

  deleteSubtask = async ({
    id,
    subtaskId,
  }: {
    id: string;
    subtaskId: string;
  }) => {
    await this.mutateSubtasks(id, (subtasks) =>
      subtasks.filter((subtask) => subtask.id !== subtaskId)
    );
  };

  private mutateSubtasks = async (
    id: string,
    change: (subtasks: SubtaskEntity[]) => SubtaskEntity[]
  ) => {
    await this.mutateTodo(id, (todo) => ({
      ...todo,
      subtasks: change(todo.subtasks ?? []),
    }));
  };

  /**
   * Read-modify-write on one todo, within a single transaction.
   *
   * The read and the write go through `tx.store`, not through this class's own
   * methods: those open transactions of their own, and a nested transaction on
   * a store the outer readwrite already locked waits for a lock that cannot be
   * released until it returns — a deadlock, and no atomicity either way.
   */
  private mutateTodo = async (
    id: string,
    change: (todo: TodoEntity) => TodoEntity
  ) => {
    const transaction = this.db.transaction(Tables.Todo, "readwrite");
    const todo = await transaction.store.get(id);

    if (!todo) throw `Todo with given key does not exist: ${id}`;

    await transaction.store.put(change(todo));
    await transaction.done;
  };

  update = async (todo: TodoEntity) => {
    await this.db.put(Tables.Todo, todo);
  };
}
