import "fake-indexeddb/auto";

import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import { OpenDb, Tables } from "@/backend/adapter/indexed-db/indexed-db";
import { TodoRepositoryIndexedDB } from "@/backend/adapter/indexed-db/todo-repository";
import { makeSubtask, makeTodo } from "@/test/todo-factory";

const DatabaseName = "darknessRdg/todo-web-app";

/**
 * Every connection this file opens, so it can be closed before the database is
 * dropped. `deleteDatabase` does not evict open connections — it fires
 * `blocked` and waits indefinitely — so leaving one open hangs the teardown and
 * every later spec with it.
 */
const connections: Awaited<ReturnType<typeof OpenDb>>[] = [];

async function openDatabase() {
  const db = await OpenDb();
  connections.push(db);
  return db;
}

afterEach(async () => {
  for (const db of connections) db.close();
  connections.length = 0;
  await deleteDB(DatabaseName);
});

/** A repository over a freshly opened database, seeded with the given todos. */
async function repositoryWith(todos: Awaited<ReturnType<typeof makeTodo>>[]) {
  const repository = new TodoRepositoryIndexedDB(await openDatabase());

  for (const todo of todos) await repository.create(todo);

  return repository;
}

describe("TodoRepositoryIndexedDB", () => {
  describe("when I add a subtask", () => {
    it("Then it is stored against its todo", async () => {
      const todo = makeTodo({ subtasks: [] });
      const repository = await repositoryWith([todo]);
      const subtask = makeSubtask({ title: "Draft the first pass" });

      await repository.addSubtask({ id: todo.id, subtask });

      const stored = await repository.getById(todo.id);
      expect(stored?.subtasks).toEqual([subtask]);
    });

    it("Then it is appended after the ones already there", async () => {
      const existing = makeSubtask();
      const todo = makeTodo({ subtasks: [existing] });
      const repository = await repositoryWith([todo]);
      const added = makeSubtask();

      await repository.addSubtask({ id: todo.id, subtask: added });

      const stored = await repository.getById(todo.id);
      expect(stored?.subtasks.map((subtask) => subtask.id)).toEqual([
        existing.id,
        added.id,
      ]);
    });

    it("Then a todo that is not there is refused rather than created", async () => {
      const repository = await repositoryWith([]);
      const missing = makeTodo();

      await expect(
        repository.addSubtask({ id: missing.id, subtask: makeSubtask() })
      ).rejects.toBeDefined();

      expect(await repository.count()).toBe(0);
    });
  });

  describe("when I complete a todo", () => {
    it("Then it is stamped with when it was completed", async () => {
      const todo = makeTodo({ done: false, doneAt: undefined });
      const repository = await repositoryWith([todo]);
      const before = Date.now();

      await repository.updateDone({ id: todo.id, done: true });

      const stored = await repository.getById(todo.id);
      expect(stored?.doneAt).toBeInstanceOf(Date);
      expect(stored!.doneAt!.getTime()).toBeGreaterThanOrEqual(before);
    });

    /**
     * The completion stamp used to be written over `dueDate`, which silently
     * rewrote a date the user had chosen every time they ticked the box.
     */
    it("Then the due date it was given is left alone", async () => {
      const dueDate = new Date("2026-03-01T00:00:00.000Z");
      const todo = makeTodo({ done: false, dueDate });
      const repository = await repositoryWith([todo]);

      await repository.updateDone({ id: todo.id, done: true });

      const stored = await repository.getById(todo.id);
      expect(stored?.dueDate).toEqual(dueDate);
    });
  });

  describe("when I reopen a todo", () => {
    it("Then the completion stamp is cleared, so it claims no completion date", async () => {
      const todo = makeTodo({ done: true, doneAt: new Date() });
      const repository = await repositoryWith([todo]);

      await repository.updateDone({ id: todo.id, done: false });

      const stored = await repository.getById(todo.id);
      expect(stored?.doneAt).toBeUndefined();
    });
  });

  describe("when I give a todo a due date", () => {
    it("Then the stored todo carries it", async () => {
      const todo = makeTodo({ dueDate: undefined });
      const repository = await repositoryWith([todo]);
      const dueDate = new Date("2026-09-01T00:00:00.000Z");

      await repository.updateDueDate({ id: todo.id, dueDate });

      const stored = await repository.getById(todo.id);
      expect(stored?.dueDate).toEqual(dueDate);
    });

    it("Then clearing it takes the date away rather than zeroing it", async () => {
      const todo = makeTodo({ dueDate: new Date("2026-09-01T00:00:00.000Z") });
      const repository = await repositoryWith([todo]);

      await repository.updateDueDate({ id: todo.id, dueDate: undefined });

      const stored = await repository.getById(todo.id);
      expect(stored?.dueDate).toBeUndefined();
    });

    it("Then the rest of the todo is left untouched", async () => {
      const todo = makeTodo({ dueDate: undefined, done: true });
      const repository = await repositoryWith([todo]);
      const dueDate = new Date("2026-09-01T00:00:00.000Z");

      await repository.updateDueDate({ id: todo.id, dueDate });

      const stored = await repository.getById(todo.id);
      expect(stored).toEqual({ ...todo, dueDate });
    });
  });

  describe("when I move a todo to a project", () => {
    it("Then the stored todo carries that project", async () => {
      const todo = makeTodo({ projectId: undefined });
      const repository = await repositoryWith([todo]);

      await repository.updateProject({
        id: todo.id,
        projectId: "project-work",
      });

      const stored = await repository.getById(todo.id);
      expect(stored?.projectId).toBe("project-work");
    });

    it("Then taking it out of every project clears the field", async () => {
      const todo = makeTodo({ projectId: "project-work" });
      const repository = await repositoryWith([todo]);

      await repository.updateProject({ id: todo.id, projectId: undefined });

      const stored = await repository.getById(todo.id);
      expect(stored?.projectId).toBeUndefined();
    });
  });

  describe("when I retitle a todo", () => {
    it("Then the stored title is the new one", async () => {
      const todo = makeTodo({ title: "Water the plants" });
      const repository = await repositoryWith([todo]);

      await repository.updateTitle({
        id: todo.id,
        title: "Repot the fig tree",
      });

      const stored = await repository.getById(todo.id);
      expect(stored?.title).toBe("Repot the fig tree");
    });

    it("Then the rest of the todo is left untouched", async () => {
      const todo = makeTodo({ title: "Water the plants", done: true });
      const repository = await repositoryWith([todo]);

      await repository.updateTitle({ id: todo.id, title: "Repot it" });

      const stored = await repository.getById(todo.id);
      expect(stored).toEqual({ ...todo, title: "Repot it" });
    });

    it("Then a todo that is not there is refused rather than created", async () => {
      const repository = await repositoryWith([]);

      await expect(
        repository.updateTitle({ id: makeTodo().id, title: "Anything" })
      ).rejects.toBeDefined();

      expect(await repository.count()).toBe(0);
    });
  });

  describe("when I save a description", () => {
    const doc = { type: "doc", content: [{ type: "paragraph" }] };

    it("Then both the markdown and the parsed copy are stored", async () => {
      const todo = makeTodo({ description: "the old notes" });
      const repository = await repositoryWith([todo]);

      await repository.updateDescription({
        id: todo.id,
        description: "the new notes",
        descriptionDoc: doc,
      });

      const stored = await repository.getById(todo.id);
      expect(stored?.description).toBe("the new notes");
      expect(stored?.descriptionDoc).toEqual(doc);
    });

    /**
     * The parsed copy is only ever valid for the markdown it was saved with, so
     * a write that brings none has to take the old one away — left behind, it
     * would be what the description is drawn from, showing text the todo no
     * longer says.
     */
    it("Then saving without one clears the copy already there", async () => {
      const todo = makeTodo({
        description: "the old notes",
        descriptionDoc: doc,
      });
      const repository = await repositoryWith([todo]);

      await repository.updateDescription({
        id: todo.id,
        description: "the new notes",
        descriptionDoc: undefined,
      });

      const stored = await repository.getById(todo.id);
      expect(stored?.descriptionDoc).toBeUndefined();
    });
  });

  describe("when I complete a subtask", () => {
    it("Then only that subtask changes", async () => {
      const target = makeSubtask({ done: false });
      const other = makeSubtask({ done: false });
      const todo = makeTodo({ subtasks: [target, other] });
      const repository = await repositoryWith([todo]);

      await repository.updateSubtaskDone({
        id: todo.id,
        subtaskId: target.id,
        done: true,
      });

      const stored = await repository.getById(todo.id);
      expect(stored?.subtasks).toEqual([
        { ...target, done: true },
        { ...other, done: false },
      ]);
    });

    it("Then reopening it sets done back to false", async () => {
      const subtask = makeSubtask({ done: true });
      const todo = makeTodo({ subtasks: [subtask] });
      const repository = await repositoryWith([todo]);

      await repository.updateSubtaskDone({
        id: todo.id,
        subtaskId: subtask.id,
        done: false,
      });

      const stored = await repository.getById(todo.id);
      expect(stored?.subtasks[0].done).toBe(false);
    });

    it("Then an unknown subtask id leaves the list alone", async () => {
      const subtask = makeSubtask({ done: false });
      const todo = makeTodo({ subtasks: [subtask] });
      const repository = await repositoryWith([todo]);

      await repository.updateSubtaskDone({
        id: todo.id,
        subtaskId: "not-a-subtask",
        done: true,
      });

      const stored = await repository.getById(todo.id);
      expect(stored?.subtasks).toEqual([subtask]);
    });
  });

  describe("when I delete a subtask", () => {
    it("Then it goes and its siblings stay", async () => {
      const doomed = makeSubtask();
      const survivor = makeSubtask();
      const todo = makeTodo({ subtasks: [doomed, survivor] });
      const repository = await repositoryWith([todo]);

      await repository.deleteSubtask({ id: todo.id, subtaskId: doomed.id });

      const stored = await repository.getById(todo.id);
      expect(stored?.subtasks).toEqual([survivor]);
    });

    it("Then the todo itself survives losing its last subtask", async () => {
      const only = makeSubtask();
      const todo = makeTodo({ subtasks: [only] });
      const repository = await repositoryWith([todo]);

      await repository.deleteSubtask({ id: todo.id, subtaskId: only.id });

      const stored = await repository.getById(todo.id);
      expect(stored).toBeDefined();
      expect(stored?.subtasks).toEqual([]);
    });
  });

  describe("when a database written before subtasks existed is opened", () => {
    /**
     * The v1 shape, written straight through `idb` so the migration is fed a
     * genuinely old row rather than one this codebase could no longer produce.
     */
    async function seedVersion1(todo: object) {
      const db = await openDB(DatabaseName, 1, {
        upgrade: (db) => {
          db.createObjectStore(Tables.Todo, { keyPath: "id" });
        },
      });

      await db.add(Tables.Todo, todo);
      db.close();
    }

    it("Then its todos are given an empty subtask list", async () => {
      const { id, title, done, createdAt } = makeTodo();
      await seedVersion1({ id, title, done, createdAt });

      const repository = new TodoRepositoryIndexedDB(await openDatabase());

      expect((await repository.getById(id))?.subtasks).toEqual([]);
    });

    it("Then the rest of the todo is left untouched", async () => {
      const { id, title, done, createdAt } = makeTodo({
        title: "Written before subtasks",
        done: true,
      });
      await seedVersion1({ id, title, done, createdAt });

      const repository = new TodoRepositoryIndexedDB(await openDatabase());
      const stored = await repository.getById(id);

      expect(stored).toMatchObject({
        id,
        title: "Written before subtasks",
        done: true,
      });
    });
  });
});
