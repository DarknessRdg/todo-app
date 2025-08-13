import { Tables, type AppIDB } from "@/backend/adapter/indexed-db/indexed-db";
import type { TodoEntity, TodoRepository } from "@/backend/todo-service";

export class TodoRepositoryIndexedDB implements TodoRepository {
  private db: AppIDB;

  constructor(db: AppIDB) {
    this.db = db;
  }

  listAll = async () => {
    return this.db.getAll(Tables.Todo);
  };

  count = async () => {
    return this.db.count(Tables.Todo)
  }

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
    await this.onTransaction("readwrite", async (txRepo) => {
      const todo = await txRepo.getById(id);

      if (!todo) throw `Todo with given key does not exist: ${id}`;

      todo.done = done;
      todo.dueDate = new Date();

      txRepo.update(todo);
    });
  };

  update = async (todo: TodoEntity) => {
    await this.db.put(Tables.Todo, todo);
  };

  private onTransaction = async (
    mode: "readonly" | "readwrite",
    action: (repo: TodoRepositoryIndexedDB) => Promise<void>
  ) => {
    const transaction = this.db.transaction(Tables.Todo, mode);
    const repo = new TodoRepositoryIndexedDB(transaction.db);

    await action(repo);
    await transaction.done;
  };
}
