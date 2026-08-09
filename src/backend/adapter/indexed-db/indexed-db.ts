import type { TodoEntity } from "@/backend/todo-service";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DatabaseName = "darknessRdg/todo-web-app";
const DatabaseVersion = 2;

export const Tables = {
  Todo: "todo",
} as const;

interface Database extends DBSchema {
  todo: {
    key: string;
    value: TodoEntity;
  };
}

export type AppIDB = IDBPDatabase<Database>;

export function OpenDb() {
  return openDB<Database>(DatabaseName, DatabaseVersion, {
    upgrade: async (db, oldVersion, _newVersion, transaction) => {
      if (oldVersion < 1) {
        db.createObjectStore(Tables.Todo, { keyPath: "id" });
      }

      // v2 added subtasks. Rows written before it have no such field, and the
      // UI would read `undefined.length` — backfill rather than defend at
      // every call site.
      if (oldVersion < 2 && oldVersion > 0) {
        const store = transaction.objectStore(Tables.Todo);

        for (const todo of await store.getAll()) {
          if (todo.subtasks !== undefined) continue;
          await store.put({ ...todo, subtasks: [] });
        }
      }
    },
  });
}
