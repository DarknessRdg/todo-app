import type { TodoEntity } from "@/backend/todo-service";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DatabaseName = "darknessRdg/todo-web-app";
const DatabaseVersion = 1;

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
    upgrade: (db) => {
      db.createObjectStore(Tables.Todo, { keyPath: "id" });
    },
  });
}
