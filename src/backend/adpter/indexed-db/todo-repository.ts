import type { TodoRepository } from "@/backend/todo-service";
import { OpenDb, Tables, type AppIDB } from "./indexed-db";

export class TodoRepositoryIndexedDB implements TodoRepository {
  private db: AppIDB;

  constructor(db: AppIDB) {
    this.db = db;
  }

  listAll = async () => {
    return this.db.getAll(Tables.Todo);
  };
}
