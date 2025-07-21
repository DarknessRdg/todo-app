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

  create = async (todo: TodoEntity) => {
    await this.db.add(Tables.Todo, todo);
  };
}
