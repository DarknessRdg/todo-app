import { describe, expect, it } from "vitest";

import {
  todosCompleted,
  todosDueOn,
  todosInProject,
  todosOverdue,
  todosUpcoming,
  todosWithLabel,
} from "@/lib/todo-scope";

const today = new Date(2026, 7, 12, 9, 30);
const at = (day: number, hour = 12) => new Date(2026, 7, day, hour);

const todo = (
  overrides: Partial<Parameters<typeof todosCompleted>[0] extends
    | (infer T)[]
    | undefined
    ? T
    : never> & { title?: string } = {}
) => ({
  title: "a todo",
  done: false,
  dueDate: undefined as Date | undefined,
  projectId: undefined as string | undefined,
  labelIds: [] as string[],
  ...overrides,
});

const titles = (todos: { title: string }[] | undefined) =>
  todos?.map((it) => it.title);

describe("todo scope", () => {
  /**
   * The query says `undefined` while it is loading. A page that is not ready
   * yet is not a page with nothing on it, and the two must not become the same
   * answer — otherwise every view flashes its empty state on the way in.
   */
  it("when the todos have not loaded, Then every scope stays unloaded", () => {
    expect(todosInProject(undefined, "any")).toBeUndefined();
    expect(todosDueOn(undefined, today)).toBeUndefined();
    expect(todosWithLabel(undefined, "any")).toBeUndefined();
    expect(todosOverdue(undefined, today)).toBeUndefined();
    expect(todosUpcoming(undefined, today)).toBeUndefined();
    expect(todosCompleted(undefined)).toBeUndefined();
  });

  describe("when a page is about one project", () => {
    it("Then only what is filed under it is kept", () => {
      const todos = [
        todo({ title: "mine", projectId: "work" }),
        todo({ title: "theirs", projectId: "home" }),
        todo({ title: "unfiled" }),
      ];

      expect(titles(todosInProject(todos, "work"))).toEqual(["mine"]);
    });
  });

  describe("when a page is about one day", () => {
    it("Then a todo due that day is kept whatever the time", () => {
      const todos = [todo({ title: "late", dueDate: at(12, 23) })];

      expect(titles(todosDueOn(todos, today))).toEqual(["late"]);
    });

    it("Then another day, and no day at all, are both left out", () => {
      const todos = [
        todo({ title: "tomorrow", dueDate: at(13) }),
        todo({ title: "someday", dueDate: undefined }),
      ];

      expect(todosDueOn(todos, today)).toEqual([]);
    });
  });

  describe("when a page is about one label", () => {
    it("Then only what carries it is kept", () => {
      const todos = [
        todo({ title: "bug", labelIds: ["bug", "ux"] }),
        todo({ title: "other", labelIds: ["ux"] }),
      ];

      expect(titles(todosWithLabel(todos, "bug"))).toEqual(["bug"]);
    });
  });

  describe("when a page is about what is late", () => {
    it("Then only what was due before today is kept", () => {
      const todos = [
        todo({ title: "late", dueDate: at(10) }),
        todo({ title: "today", dueDate: at(12) }),
        todo({ title: "soon", dueDate: at(14) }),
      ];

      expect(titles(todosOverdue(todos, today))).toEqual(["late"]);
    });

    /** Finished late is finished, not overdue. */
    it("Then something already finished is left out", () => {
      const todos = [todo({ title: "done late", dueDate: at(10), done: true })];

      expect(todosOverdue(todos, today)).toEqual([]);
    });
  });

  describe("when a page is about what is coming", () => {
    it("Then only what is due after today is kept", () => {
      const todos = [
        todo({ title: "soon", dueDate: at(14) }),
        todo({ title: "late", dueDate: at(10) }),
      ];

      expect(titles(todosUpcoming(todos, today))).toEqual(["soon"]);
    });

    /** Today belongs to `/today`; two views claiming it would each be wrong. */
    it("Then today itself is left out", () => {
      const todos = [todo({ title: "today", dueDate: at(12, 23) })];

      expect(todosUpcoming(todos, today)).toEqual([]);
    });

    it("Then a todo with no date at all is left out", () => {
      const todos = [todo({ title: "someday" })];

      expect(todosUpcoming(todos, today)).toEqual([]);
    });
  });

  describe("when a page is about what is finished", () => {
    it("Then only done todos are kept, whenever they were due", () => {
      const todos = [
        todo({ title: "done", done: true }),
        todo({ title: "open", done: false }),
      ];

      expect(titles(todosCompleted(todos))).toEqual(["done"]);
    });
  });
});
