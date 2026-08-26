import { describe, expect, it } from "vitest";

import {
  applyTodoFilter,
  dueWindow,
  emptyTodoFilter,
  isTodoFilterActive,
  parseTodoFilter,
  todoFilterToParams,
  parseTodoSort,
  parseTodoListView,
  todoListViewToParams,
  sortTodos,
  defaultTodoSort,
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
  priority: undefined,
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

  it("when the url carries a priority and a label, Then both are read back", () => {
    expect(parse("priority=high&label=Bug")).toMatchObject({
      priority: "high",
      labels: ["Bug"],
    });
  });

  it("when the url asks for the untriaged, Then that is read back too", () => {
    expect(parse("priority=unset").priority).toBe("unset");
  });

  /**
   * Levels are stored lowercase, so the url carries them lowercase. A value
   * wearing its display spelling names no level, and is dropped rather than
   * honoured — the same fallback `due` gets.
   */
  it("when the url names no level we know, Then the priority is dropped", () => {
    expect(parse("priority=High").priority).toBeUndefined();
    expect(parse("priority=critical").priority).toBeUndefined();
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
      priority: "urgent",
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

  it("when only a priority or a label is set, Then it counts as active, so it can be cleared", () => {
    expect(isTodoFilterActive(filter({ priority: "low" }))).toBe(true);
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

  describe("when I filter by priority", () => {
    const urgent = todo({ title: "urgent", priority: "urgent" });
    const low = todo({ title: "low", priority: "low" });
    const untriaged = todo({ title: "untriaged", priority: undefined });
    const todos = [urgent, low, untriaged];

    it("Then only todos carrying that level are kept", () => {
      expect(applyTodoFilter(todos, filter({ priority: "urgent" }), today)).toEqual([
        urgent,
      ]);
    });

    /**
     * `"unset"` is the filter's word for an absence, not a fifth level — see
     * `TodoFilter.priority`. It is the only way to ask what has not been
     * triaged, which is the question a ranked list makes worth asking.
     */
    it("Then asking for none keeps the todos nobody has ranked", () => {
      expect(applyTodoFilter(todos, filter({ priority: "unset" }), today)).toEqual([
        untriaged,
      ]);
    });

    it("Then an unranked todo is left out of a level's list", () => {
      expect(
        applyTodoFilter(todos, filter({ priority: "low" }), today)
      ).not.toContain(untriaged);
    });
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

describe("parseTodoSort", () => {
  it("when the url names a sort, Then it is read back", () => {
    expect(parseTodoSort("due")).toBe("due");
  });

  /** A hand-edited url shows a plain list, never an empty or shuffled one. */
  it("when the url names a sort that does not exist, Then the default stands", () => {
    expect(parseTodoSort("whenever")).toBe(defaultTodoSort);
  });

  it("when the url says nothing, Then the default stands", () => {
    expect(parseTodoSort(null)).toBe(defaultTodoSort);
  });
});

describe("todoListViewToParams", () => {
  const roundTrip = (filter: TodoFilter, sort: Parameters<typeof sortTodos>[1]) =>
    parseTodoListView(todoListViewToParams({ filter, sort }));

  /**
   * The whole query string has one owner: the hook that writes it replaces
   * everything but `?todo=`, so a sort written outside this function would be
   * dropped by the next keystroke in the search box.
   */
  it("when a filter and a sort are both set, Then both survive the url", () => {
    const value = filter({ query: "docs" });

    expect(roundTrip(value, "priority")).toEqual({
      filter: value,
      sort: "priority",
    });
  });

  it("when the sort is the default, Then it writes nothing to the url", () => {
    expect(
      todoListViewToParams({ filter: emptyTodoFilter, sort: defaultTodoSort })
        .toString()
    ).toBe("");
  });

  /**
   * Sorting hides nothing, so it must not light up the Clear button or the
   * "nothing matches" empty state — both of which read `isTodoFilterActive`.
   */
  it("when only the sort is set, Then the filter does not read as active", () => {
    const { filter: parsed } = roundTrip(emptyTodoFilter, "title");

    expect(isTodoFilterActive(parsed)).toBe(false);
  });
});

describe("sortTodos", () => {
  const sortable = (overrides: Partial<Filterable> & { createdAt?: Date } = {}) =>
    ({ ...todo(), createdAt: at(1), ...overrides }) as Filterable & {
      createdAt: Date;
    };

  it("when I do not choose a sort, Then the order the store gave is left alone", () => {
    const todos = [
      sortable({ title: "b", dueDate: at(1) }),
      sortable({ title: "a", dueDate: at(2) }),
    ];

    expect(titles(sortTodos(todos, "manual"))).toEqual(["b", "a"]);
  });

  it("when I sort, Then the list I was given is not rearranged under me", () => {
    const todos = [sortable({ title: "b" }), sortable({ title: "a" })];

    sortTodos(todos, "title");

    expect(titles(todos)).toEqual(["b", "a"]);
  });

  describe("when I sort by due date", () => {
    it("Then the soonest comes first", () => {
      const todos = [
        sortable({ title: "later", dueDate: at(20) }),
        sortable({ title: "sooner", dueDate: at(2) }),
      ];

      expect(titles(sortTodos(todos, "due"))).toEqual(["sooner", "later"]);
    });

    /** An undated todo is not due in 1970; it is not due at all. */
    it("Then an undated todo goes last", () => {
      const todos = [
        sortable({ title: "undated", dueDate: undefined }),
        sortable({ title: "dated", dueDate: at(20) }),
      ];

      expect(titles(sortTodos(todos, "due"))).toEqual(["dated", "undated"]);
    });

    it("Then todos sharing a date keep the order they arrived in", () => {
      const todos = [
        sortable({ title: "second", dueDate: at(5) }),
        sortable({ title: "first", dueDate: at(5) }),
      ];

      expect(titles(sortTodos(todos, "due"))).toEqual(["second", "first"]);
    });
  });

  describe("when I sort by priority", () => {
    it("Then urgent comes first", () => {
      const todos = [
        sortable({ title: "low", priority: "low" }),
        sortable({ title: "urgent", priority: "urgent" }),
      ];

      expect(titles(sortTodos(todos, "priority"))).toEqual(["urgent", "low"]);
    });

    it("Then a todo nobody ranked goes last", () => {
      const todos = [
        sortable({ title: "unranked", priority: undefined }),
        sortable({ title: "low", priority: "low" }),
      ];

      expect(titles(sortTodos(todos, "priority"))).toEqual(["low", "unranked"]);
    });
  });

  it("when I sort by title, Then it is alphabetical whatever the case", () => {
    const todos = [
      sortable({ title: "banana" }),
      sortable({ title: "Apple" }),
    ];

    expect(titles(sortTodos(todos, "title"))).toEqual(["Apple", "banana"]);
  });
});
