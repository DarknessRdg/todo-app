import type { LabelEntity } from "@/backend/label-service";
import type { ProjectEntity } from "@/backend/project-service";
import type { TodoEntity } from "@/backend/todo-service";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DatabaseName = "darknessRdg/todo-web-app";
const DatabaseVersion = 5;

export const Tables = {
  Todo: "todo",
  Project: "project",
  Label: "label",
} as const;

/**
 * Projects v3 briefly created on first run. Nobody asked for them: a project
 * list is the user's to build, and inventing three means every install starts
 * with rows that have to be worked around rather than used.
 *
 * Listed only so v4 can take them back out again. Deletable once no database
 * that ran v3 is still in use.
 */
const AbandonedSeedIds = [
  "project-personal",
  "project-work",
  "project-learning",
];

interface Database extends DBSchema {
  todo: {
    key: string;
    value: TodoEntity;
  };
  project: {
    key: string;
    value: ProjectEntity;
  };
  label: {
    key: string;
    value: LabelEntity;
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

      // v3 added projects. `projectId` on a todo is optional, so existing rows
      // need no backfill — they simply belong to no project yet. The list
      // starts empty: it is the user's to build.
      if (oldVersion < 3) {
        db.createObjectStore(Tables.Project, { keyPath: "id" });
      }

      // v5 added labels: a store of their own, and `labelIds` on every todo.
      // The array is backfilled rather than defended at each call site, the
      // same way v2 backfilled subtasks — code that reads `todo.labelIds.map`
      // must not have to ask whether the row predates the field.
      if (oldVersion < 5) {
        db.createObjectStore(Tables.Label, { keyPath: "id" });
      }

      if (oldVersion < 5 && oldVersion > 0) {
        const store = transaction.objectStore(Tables.Todo);

        for (const todo of await store.getAll()) {
          if (todo.labelIds !== undefined) continue;
          await store.put({ ...todo, labelIds: [] });
        }
      }

      // v4 takes the three projects v3 seeded back out. They are matched by
      // their fixed seed ids, so nothing the user created is touched — a real
      // project carries a generated uuid and can never collide with these.
      if (oldVersion === 3) {
        const store = transaction.objectStore(Tables.Project);

        for (const id of AbandonedSeedIds) await store.delete(id);
      }
    },
  });
}
