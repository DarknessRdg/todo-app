import { describe, expect, it } from "vitest";

import { NoProject, searchTodos } from "@/lib/todo-search";

type Searchable = Parameters<typeof searchTodos>[0][number];

const todo = (overrides: Partial<Searchable> = {}): Searchable => ({
  title: "Read the docs",
  projectId: undefined,
  ...overrides,
});

const titles = (todos: Searchable[]) => todos.map((it) => it.title);

describe("searchTodos", () => {
  it("when nothing is asked for, Then every todo comes back", () => {
    const todos = [todo({ title: "a" }), todo({ title: "b" })];

    expect(searchTodos(todos, {})).toEqual(todos);
  });

  describe("when I search by title", () => {
    const todos = [
      todo({ title: "Read the docs" }),
      todo({ title: "Ship it" }),
    ];

    it("Then only matching titles come back", () => {
      expect(titles(searchTodos(todos, { query: "docs" }))).toEqual([
        "Read the docs",
      ]);
    });

    it("Then the case I typed does not matter", () => {
      expect(searchTodos(todos, { query: "DOCS" })).toHaveLength(1);
    });

    it("Then it matches inside the title, not just its start", () => {
      expect(searchTodos(todos, { query: "the" })).toHaveLength(1);
    });

    it("Then a stray space around it is ignored", () => {
      expect(searchTodos(todos, { query: "  docs  " })).toHaveLength(1);
    });
  });

  describe("when I narrow to a project", () => {
    const filed = todo({ title: "filed", projectId: "garden" });
    const elsewhere = todo({ title: "elsewhere", projectId: "kitchen" });
    const loose = todo({ title: "loose", projectId: undefined });
    const todos = [filed, elsewhere, loose];

    it("Then only that project's todos come back", () => {
      expect(titles(searchTodos(todos, { projectId: "garden" }))).toEqual([
        "filed",
      ]);
    });

    it("Then asking for no project finds the ones filed nowhere", () => {
      expect(titles(searchTodos(todos, { projectId: NoProject }))).toEqual([
        "loose",
      ]);
    });
  });

  it("when I search a title inside a project, Then a todo has to match both", () => {
    const todos = [
      todo({ title: "Read the docs", projectId: "garden" }),
      todo({ title: "Read the docs", projectId: "kitchen" }),
      todo({ title: "Ship it", projectId: "garden" }),
    ];

    const found = searchTodos(todos, { query: "docs", projectId: "garden" });

    expect(found).toHaveLength(1);
    expect(found[0].projectId).toBe("garden");
  });
});
