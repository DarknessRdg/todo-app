import "fake-indexeddb/auto";

import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import { OpenDb } from "@/backend/adapter/indexed-db/indexed-db";
import { LabelRepositoryIndexedDB } from "@/backend/adapter/indexed-db/label-repository";
import { TodoRepositoryIndexedDB } from "@/backend/adapter/indexed-db/todo-repository";
import { makeLabel, makeTodo } from "@/test/todo-factory";

const DatabaseName = "darknessRdg/todo-web-app";

/** Every connection opened here, so none is left to block the teardown. */
const connections: Awaited<ReturnType<typeof OpenDb>>[] = [];

afterEach(async () => {
  for (const db of connections) db.close();
  connections.length = 0;
  await deleteDB(DatabaseName);
});

async function openRepositories() {
  const db = await OpenDb();
  connections.push(db);

  return {
    labels: new LabelRepositoryIndexedDB(db),
    todos: new TodoRepositoryIndexedDB(db),
  };
}

describe("LabelRepositoryIndexedDB", () => {
  it("when the database is created, Then it holds no labels until I add one", async () => {
    const { labels } = await openRepositories();

    expect(await labels.listAll()).toEqual([]);
  });

  it("when I create a label, Then it is stored", async () => {
    const { labels } = await openRepositories();
    const label = makeLabel({ name: "Frontend" });

    await labels.create(label);

    expect(await labels.listAll()).toEqual([label]);
  });

  it("when I list labels, Then they come back in alphabetical order", async () => {
    const { labels } = await openRepositories();
    await labels.create(makeLabel({ name: "Research" }));
    await labels.create(makeLabel({ name: "Bug" }));

    expect((await labels.listAll()).map((label) => label.name)).toEqual([
      "Bug",
      "Research",
    ]);
  });

  describe("when I rename a label", () => {
    it("Then the stored label answers to the new name", async () => {
      const { labels } = await openRepositories();
      const label = makeLabel({ name: "Frontend" });
      await labels.create(label);

      await labels.rename({ id: label.id, name: "UI" });

      expect(await labels.listAll()).toEqual([{ ...label, name: "UI" }]);
    });

    it("Then renaming one that is not there creates nothing", async () => {
      const { labels } = await openRepositories();

      await labels.rename({ id: makeLabel().id, name: "UI" });

      expect(await labels.listAll()).toEqual([]);
    });
  });

  it("when I delete a label, Then it is gone from the store", async () => {
    const { labels } = await openRepositories();
    const label = makeLabel();
    await labels.create(label);

    await labels.delete(label.id);

    expect(await labels.listAll()).toEqual([]);
  });

  describe("when I look a label up by name", () => {
    it("Then the case I typed does not matter", async () => {
      const { labels } = await openRepositories();
      const label = makeLabel({ name: "Frontend" });
      await labels.create(label);

      expect(await labels.findByName("frontend")).toEqual(label);
    });

    it("Then a name nothing answers to finds nothing", async () => {
      const { labels } = await openRepositories();

      expect(await labels.findByName("Frontend")).toBeUndefined();
    });
  });
});

describe("TodoRepositoryIndexedDB, on labels", () => {
  it("when I set a todo's labels, Then that is what it carries", async () => {
    const { todos } = await openRepositories();
    const todo = makeTodo({ labelIds: [] });
    await todos.create(todo);

    await todos.updateLabels({ id: todo.id, labelIds: ["a", "b"] });

    expect((await todos.getById(todo.id))?.labelIds).toEqual(["a", "b"]);
  });

  describe("when a label is deleted from everywhere", () => {
    it("Then the todos carrying it lose it", async () => {
      const { todos } = await openRepositories();
      const todo = makeTodo({ labelIds: ["doomed", "kept"] });
      await todos.create(todo);

      await todos.removeLabelEverywhere("doomed");

      expect((await todos.getById(todo.id))?.labelIds).toEqual(["kept"]);
    });

    it("Then the todos that never carried it are left alone", async () => {
      const { todos } = await openRepositories();
      const untouched = makeTodo({ labelIds: ["kept"] });
      await todos.create(untouched);

      await todos.removeLabelEverywhere("doomed");

      expect(await todos.getById(untouched.id)).toEqual(untouched);
    });
  });
});
