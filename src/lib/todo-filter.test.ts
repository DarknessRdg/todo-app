import { describe, expect, it } from "vitest";

import {
  applyTodoFilter,
  dueWindow,
  emptyTodoFilter,
  isTodoFilterActive,
  parseTodoFilter,
  todoFilterToParams,
  type TodoFilter,
} from "@/lib/todo-filter";

/** A Wednesday, so week boundaries are visible in both directions. */
const today = new Date(2026, 7, 12, 9, 30);

const at = (day: number, hour = 12) => new Date(2026, 7, day, hour);

type Filterable = Parameters<typeof applyTodoFilter>[0][number];

const todo = (overrides: Partial<Filterable> = {}): Filterable => ({
  title: "Write the thing",
  done: false,
  dueDate: undefined,
  subtasks: [],
  labelIds: [],
  ...overrides,
});

const filter = (overrides: Partial<TodoFilter> = {}): TodoFilter => ({
  ...emptyTodoFilter,
  ...overrides,
});

const titles = (todos: Filterable[]) => todos.map((it) => it.title);

describe("parseTodoFilter", () => {
  const parse = (search: string) =>
    parseTodoFilter(new URLSearchParams(search));

  it("when the url carries nothing, Then nothing is filtered", () => {
    expect(parse("")).toEqual(emptyTodoFilter);
  });

  it("when the url carries a search, Then it is the query", () => {
    expect(parse("q=docs").query).toBe("docs");
  });

  it("when the url hides done, Then done todos are excluded", () => {
    expect(parse("done=hide").hideDone).toBe(true);
  });

  it("when the url names a due preset, Then it is read as that window", () => {
    expect(parse("due=week").due).toEqual({ kind: "preset", preset: "week" });
  });

  it("when the url names a single day, Then it is read as that day", () => {
    expect(parse("due=2026-08-12").due).toEqual({
      kind: "day",
      day: "2026-08-12",
    });
  });

  it("when the url names a due window that does not exist, Then it is ignored rather than emptying the list", () => {
    expect(parse("due=someday").due).toEqual({ kind: "any" });
  });

  it("when the url carries the fields that are not stored yet, Then they are still read back", () => {
    expect(parse("priority=High&label=Bug")).toMatchObject({
      priority: "High",
      labels: ["Bug"],
    });
  });

  it("when the url names several labels, Then all of them are asked for", () => {
    expect(parse("label=Bug&label=UX").labels).toEqual(["Bug", "UX"]);
  });

  it("when the url names one label twice, Then it is asked for once", () => {
    expect(parse("label=Bug&label=Bug").labels).toEqual(["Bug"]);
  });
});

describe("todoFilterToParams", () => {
  const roundTrip = (value: TodoFilter) =>
    parseTodoFilter(todoFilterToParams(value));

  it("when nothing is filtered, Then the url stays clean", () => {
    expect(todoFilterToParams(emptyTodoFilter).toString()).toBe("");
  });

  it("when a filter is set, Then reading the url back gives the same filter", () => {
    const value = filter({
      query: "docs",
      hideDone: true,
      due: { kind: "day", day: "2026-08-12" },
      openSubtasks: true,
      priority: "Urgent",
      labels: ["Bug", "UX"],
    });

    expect(roundTrip(value)).toEqual(value);
  });

  it("when a preset is set, Then it survives the url too", () => {
    const value = filter({ due: { kind: "preset", preset: "month" } });

    expect(roundTrip(value)).toEqual(value);
  });
});

describe("isTodoFilterActive", () => {
  it("when nothing is set, Then it is not active", () => {
    expect(isTodoFilterActive(emptyTodoFilter)).toBe(false);
  });

  it("when only the inert fields are set, Then it still counts as active, so it can be cleared", () => {
    expect(isTodoFilterActive(filter({ priority: "Low" }))).toBe(true);
    expect(isTodoFilterActive(filter({ labels: ["Bug"] }))).toBe(true);
  });

  it("when a query is set, Then it is active", () => {
    expect(isTodoFilterActive(filter({ query: "docs" }))).toBe(true);
  });
});

describe("dueWindow", () => {
  it("when the window is today, Then it spans that day alone", () => {
    const window = dueWindow({ kind: "preset", preset: "today" }, today);

    expect(window?.from.getDate()).toBe(12);
    expect(window?.to.getDate()).toBe(12);
  });

  it("when the window is this week, Then it spans the calendar week around today", () => {
    const window = dueWindow({ kind: "preset", preset: "week" }, today);

    // Week starts Sunday, matching the calendar in the rail.
    expect(window?.from.getDate()).toBe(9);
    expect(window?.to.getDate()).toBe(15);
  });

  it("when the window is this month, Then it spans the whole month", () => {
    const window = dueWindow({ kind: "preset", preset: "month" }, today);

    expect(window?.from.getDate()).toBe(1);
    expect(window?.to.getDate()).toBe(31);
  });

  it("when one day is picked, Then it spans that day", () => {
    const window = dueWindow({ kind: "day", day: "2026-08-20" }, today);

    expect(window?.from.getDate()).toBe(20);
    expect(window?.to.getDate()).toBe(20);
  });

  it("when nothing is picked, Then there is no window to draw", () => {
    expect(dueWindow({ kind: "any" }, today)).toBeUndefined();
  });

  it("when the filter is undated, Then there is no window to draw either", () => {
    expect(dueWindow({ kind: "undated" }, today)).toBeUndefined();
  });
});

describe("applyTodoFilter", () => {
  it("when nothing is filtered, Then every todo comes back", () => {
    const todos = [todo({ title: "a" }), todo({ title: "b", done: true })];

    expect(applyTodoFilter(todos, emptyTodoFilter, today)).toEqual(todos);
  });

  describe("when I search the title", () => {
    it("Then only matching todos come back", () => {
      const todos = [todo({ title: "Read the docs" }), todo({ title: "Ship" })];

      expect(
        titles(applyTodoFilter(todos, filter({ query: "docs" }), today))
      ).toEqual(["Read the docs"]);
    });

    it("Then the case I typed does not matter", () => {
      const todos = [todo({ title: "Read the DOCS" })];

      expect(
        applyTodoFilter(todos, filter({ query: "docs" }), today)
      ).toHaveLength(1);
    });

    it("Then surrounding spaces are ignored, so a stray one shows nothing missing", () => {
      const todos = [todo({ title: "Read the docs" })];

      expect(
        applyTodoFilter(todos, filter({ query: "  docs " }), today)
      ).toHaveLength(1);
    });
  });

  it("when I hide what is done, Then only open todos come back", () => {
    const todos = [
      todo({ title: "open" }),
      todo({ title: "closed", done: true }),
    ];

    expect(
      titles(applyTodoFilter(todos, filter({ hideDone: true }), today))
    ).toEqual(["open"]);
  });

  it("when I ask for open subtasks, Then todos with none, or with all of them checked, are left out", () => {
    const todos = [
      todo({
        title: "half done",
        subtasks: [{ done: true }, { done: false }],
      }),
      todo({
        title: "all done",
        subtasks: [{ done: true }],
      }),
      todo({ title: "no subtasks" }),
    ];

    expect(
      titles(applyTodoFilter(todos, filter({ openSubtasks: true }), today))
    ).toEqual(["half done"]);
  });

  describe("when I filter by when things are due", () => {
    const todos = [
      todo({ title: "yesterday", dueDate: at(11) }),
      todo({ title: "today", dueDate: at(12) }),
      todo({ title: "this week", dueDate: at(14) }),
      todo({ title: "this month", dueDate: at(28) }),
      todo({ title: "next month", dueDate: new Date(2026, 8, 4) }),
      todo({ title: "undated" }),
    ];

    it("Then one day keeps only what is due on it", () => {
      expect(
        titles(
          applyTodoFilter(
            todos,
            filter({ due: { kind: "day", day: "2026-08-14" } }),
            today
          )
        )
      ).toEqual(["this week"]);
    });

    it("Then a due date later in the day still counts as that day", () => {
      const late = [todo({ title: "late", dueDate: at(12, 23) })];

      expect(
        applyTodoFilter(
          late,
          filter({ due: { kind: "preset", preset: "today" } }),
          today
        )
      ).toHaveLength(1);
    });

    it("Then this week keeps the days around today", () => {
      expect(
        titles(
          applyTodoFilter(
            todos,
            filter({ due: { kind: "preset", preset: "week" } }),
            today
          )
        )
      ).toEqual(["yesterday", "today", "this week"]);
    });

    it("Then this month stops at the month's edge", () => {
      expect(
        titles(
          applyTodoFilter(
            todos,
            filter({ due: { kind: "preset", preset: "month" } }),
            today
          )
        )
      ).toEqual(["yesterday", "today", "this week", "this month"]);
    });

    it("Then overdue keeps only what is past, and never what is due today", () => {
      expect(
        titles(
          applyTodoFilter(todos, filter({ due: { kind: "overdue" } }), today)
        )
      ).toEqual(["yesterday"]);
    });

    it("Then undated keeps only what has no due date at all", () => {
      expect(
        titles(
          applyTodoFilter(todos, filter({ due: { kind: "undated" } }), today)
        )
      ).toEqual(["undated"]);
    });

    it("Then a done todo is still filtered by its due date", () => {
      const done = [todo({ title: "done today", done: true, dueDate: at(12) })];

      expect(
        applyTodoFilter(
          done,
          filter({ due: { kind: "preset", preset: "today" } }),
          today
        )
      ).toHaveLength(1);
    });
  });

  it("when several filters are set, Then a todo has to pass all of them", () => {
    const todos = [
      todo({ title: "Read the docs", dueDate: at(12) }),
      todo({ title: "Read the docs", done: true, dueDate: at(12) }),
      todo({ title: "Ship it", dueDate: at(12) }),
      todo({ title: "Read the docs", dueDate: at(28) }),
    ];

    const result = applyTodoFilter(
      todos,
      filter({
        query: "docs",
        hideDone: true,
        due: { kind: "preset", preset: "today" },
      }),
      today
    );

    expect(result).toHaveLength(1);
    expect(result[0].dueDate).toEqual(at(12));
  });

  it("when only the priority is set, which is not stored, Then nothing is filtered out", () => {
    const todos = [todo({ title: "a" }), todo({ title: "b" })];

    expect(
      applyTodoFilter(todos, filter({ priority: "Urgent" }), today)
    ).toEqual(todos);
  });

  describe("when I filter by label", () => {
    const bug = todo({ title: "bug", labelIds: ["bug-id"] });
    const ux = todo({ title: "ux", labelIds: ["ux-id"] });
    const both = todo({ title: "both", labelIds: ["bug-id", "ux-id"] });
    const bare = todo({ title: "bare" });
    const todos = [bug, ux, both, bare];

    it("Then only todos carrying it come back", () => {
      expect(
        titles(applyTodoFilter(todos, filter({ labels: ["bug-id"] }), today))
      ).toEqual(["bug", "both"]);
    });

    it("Then asking for two means either of them, not both at once", () => {
      expect(
        titles(
          applyTodoFilter(todos, filter({ labels: ["bug-id", "ux-id"] }), today)
        )
      ).toEqual(["bug", "ux", "both"]);
    });

    it("Then a todo carrying no labels at all is left out", () => {
      expect(
        applyTodoFilter(todos, filter({ labels: ["bug-id"] }), today)
      ).not.toContain(bare);
    });
  });
});
