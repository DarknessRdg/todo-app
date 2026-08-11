import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { dayKey } from "@/lib/due-dates";

/**
 * The list filter: what it is, how it is read off the url, and how it is
 * applied. Kept away from React so the rules can be tested as rules — the bar,
 * the list and the calendar all read the same shape.
 *
 * The filter lives in the url (`?q=docs&due=week`) rather than in component
 * state: it survives a reload, it can be linked to, and the back button undoes
 * it — the same reasoning as `?todo=<id>` opening the modal.
 */

/** Which days a filter is asking for. */
export type DueFilter =
  | { kind: "any" }
  | { kind: "preset"; preset: DuePreset }
  | { kind: "day"; day: string }
  | { kind: "overdue" }
  | { kind: "undated" };

export type DuePreset = "today" | "week" | "month";

export type TodoFilter = {
  /** Matched against the title, case-insensitively. */
  query: string;
  hideDone: boolean;
  due: DueFilter;
  /** Only todos that still have something unchecked under them. */
  openSubtasks: boolean;
  /**
   * Priority is *not* stored on a todo — `todo-meta.ts` derives it from the id,
   * so there is nothing to filter on and nothing the reader could change. It is
   * carried here, and offered in the bar, so the shape of the finished filter is
   * visible; `applyTodoFilter` deliberately ignores it.
   */
  priority?: string;
  /**
   * Label *ids*, matched against what a todo carries. Several means "any of
   * these": a todo carries labels rather than one label, and asking for Bug and
   * UX to find only todos carrying both is the rarer question — the union is
   * what narrowing a list usually means. They ride the url as repeated `label`
   * params.
   */
  labels: string[];
};

export const emptyTodoFilter: TodoFilter = {
  query: "",
  hideDone: false,
  due: { kind: "any" },
  openSubtasks: false,
  labels: [],
};

/**
 * Sunday, matching the calendar in the right rail — "this week" has to be the
 * row the reader can see highlighted, not an ISO week that straddles two.
 */
export const WeekStartsOn = 0;

/** The subset of a todo the filter reads. */
type FilterableTodo = {
  title: string;
  done: boolean;
  dueDate?: Date | undefined;
  subtasks: readonly { done: boolean }[];
  labelIds: readonly string[];
};

const presets: DuePreset[] = ["today", "week", "month"];

/** `yyyy-mm-dd`, the shape a picked day takes in the url. */
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseTodoFilter(params: URLSearchParams): TodoFilter {
  const filter: TodoFilter = {
    query: params.get("q") ?? "",
    hideDone: params.get("done") === "hide",
    due: parseDue(params.get("due")),
    openSubtasks: params.get("subtasks") === "open",
    // Deduplicated: `?label=Bug&label=Bug` is one label asked for twice.
    labels: [...new Set(params.getAll("label"))],
  };

  const priority = params.get("priority");

  return { ...filter, ...(priority === null ? {} : { priority }) };
}

/**
 * An unreadable value is dropped rather than honoured. A hand-edited url should
 * show too much, never an empty list the reader cannot explain.
 */
function parseDue(value: string | null): DueFilter {
  if (value === null) return { kind: "any" };
  if (value === "overdue") return { kind: "overdue" };
  if (value === "undated") return { kind: "undated" };
  if ((presets as string[]).includes(value)) {
    return { kind: "preset", preset: value as DuePreset };
  }
  if (dayPattern.test(value)) return { kind: "day", day: value };

  return { kind: "any" };
}

/** Only what is actually set — an untouched filter leaves the url alone. */
export function todoFilterToParams(filter: TodoFilter): URLSearchParams {
  const params = new URLSearchParams();

  if (filter.query !== "") params.set("q", filter.query);
  if (filter.hideDone) params.set("done", "hide");
  if (filter.openSubtasks) params.set("subtasks", "open");
  if (filter.priority !== undefined) params.set("priority", filter.priority);
  for (const label of filter.labels) params.append("label", label);

  const due = serialiseDue(filter.due);
  if (due !== undefined) params.set("due", due);

  return params;
}

function serialiseDue(due: DueFilter): string | undefined {
  switch (due.kind) {
    case "any":
      return undefined;
    case "preset":
      return due.preset;
    case "day":
      return due.day;
    default:
      return due.kind;
  }
}

export function isTodoFilterActive(filter: TodoFilter): boolean {
  return todoFilterToParams(filter).toString() !== "";
}

/**
 * The days a due filter covers, for the calendar to draw.
 *
 * Undefined where there is no window to draw: "any" covers everything, and
 * "overdue"/"undated" are not a stretch of calendar — overdue reaches back
 * further than the month on screen, and undated is nowhere at all.
 */
export function dueWindow(
  due: DueFilter,
  today: Date
): { from: Date; to: Date } | undefined {
  switch (due.kind) {
    case "preset":
      return windowForPreset(due.preset, today);
    case "day": {
      const day = dayFromKey(due.day);
      return day === undefined
        ? undefined
        : { from: startOfDay(day), to: endOfDay(day) };
    }
    default:
      return undefined;
  }
}

function windowForPreset(preset: DuePreset, today: Date) {
  switch (preset) {
    case "today":
      return { from: startOfDay(today), to: endOfDay(today) };
    case "week":
      return {
        from: startOfWeek(today, { weekStartsOn: WeekStartsOn }),
        to: endOfWeek(today, { weekStartsOn: WeekStartsOn }),
      };
    case "month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
  }
}

/** The date a `yyyy-mm-dd` key names, read as a local day. */
export function dayFromKey(key: string): Date | undefined {
  if (!dayPattern.test(key)) return undefined;

  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  // Rejects the likes of `2026-02-31`, which `Date` would roll into March.
  return dayKey(date) === key ? date : undefined;
}

export function applyTodoFilter<T extends FilterableTodo>(
  todos: readonly T[],
  filter: TodoFilter,
  today: Date
): T[] {
  const query = filter.query.trim().toLowerCase();
  const window = dueWindow(filter.due, today);

  return todos.filter((todo) => {
    if (query !== "" && !todo.title.toLowerCase().includes(query)) return false;
    if (filter.hideDone && todo.done) return false;
    if (filter.openSubtasks && !todo.subtasks.some((sub) => !sub.done)) {
      return false;
    }
    if (
      filter.labels.length > 0 &&
      !filter.labels.some((id) => todo.labelIds.includes(id))
    ) {
      return false;
    }

    return matchesDue(todo, filter.due, window, today);
  });
}

function matchesDue(
  todo: FilterableTodo,
  due: DueFilter,
  window: { from: Date; to: Date } | undefined,
  today: Date
): boolean {
  if (due.kind === "any") return true;
  if (due.kind === "undated") return todo.dueDate === undefined;
  if (todo.dueDate === undefined) return false;

  // Overdue is "before today started", so something due later today is not yet
  // late — the reader still has the day to do it.
  if (due.kind === "overdue") return todo.dueDate < startOfDay(today);

  if (window === undefined) return true;

  return todo.dueDate >= window.from && todo.dueDate <= window.to;
}
