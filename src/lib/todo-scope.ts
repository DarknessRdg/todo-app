import { startOfDay } from "date-fns";

import { dayKey } from "@/lib/due-dates";

/**
 * Which of the workspace's todos belong on a page.
 *
 * This is the seam every list view is built on: one query holds every todo, a
 * page picks the ones it is about, and only then does the reader's own filter
 * narrow what is left. Kept pure and in one file so "what /overdue means" is a
 * rule with a spec rather than a predicate written inline on a page.
 *
 * Every selector takes and returns `undefined` untouched, because that is what
 * the query says while it is still loading — a page that is not ready yet is
 * not a page with no todos, and the two must not be told apart by accident.
 */

type ScopedTodo = {
  done: boolean;
  dueDate?: Date | undefined;
  projectId?: string | undefined;
  labelIds: readonly string[];
};

type Scope<T> = (todos: T[] | undefined) => T[] | undefined;

const select = <T>(keep: (todo: T) => boolean): Scope<T> =>
  (todos) => todos?.filter(keep);

/** Only what is filed under this project — its own, never a sub-project's. */
export function todosInProject<T extends ScopedTodo>(
  todos: T[] | undefined,
  projectId: string
) {
  return select<T>((todo) => todo.projectId === projectId)(todos);
}

/**
 * Only what is due on this calendar day.
 *
 * Compared as days, not as instants: a due date carries a time, and "due today"
 * is a day the reader is living in rather than a 24-hour window.
 */
export function todosDueOn<T extends ScopedTodo>(
  todos: T[] | undefined,
  day: Date
) {
  const wanted = dayKey(day);

  return select<T>(
    (todo) => todo.dueDate !== undefined && dayKey(todo.dueDate) === wanted
  )(todos);
}

/** Only what carries this label. */
export function todosWithLabel<T extends ScopedTodo>(
  todos: T[] | undefined,
  labelId: string
) {
  return select<T>((todo) => todo.labelIds.includes(labelId))(todos);
}

/**
 * Due before today and still open.
 *
 * Done todos are left out on purpose: a todo that was finished late is not
 * overdue, it is finished, and a view whose whole job is "what did I miss"
 * should not fill up with work that is already behind you.
 */
export function todosOverdue<T extends ScopedTodo>(
  todos: T[] | undefined,
  today: Date
) {
  const start = startOfDay(today);

  return select<T>(
    (todo) => !todo.done && todo.dueDate !== undefined && todo.dueDate < start
  )(todos);
}

/**
 * Due after today, and still open.
 *
 * Today itself belongs to `/today` — folding it in here would leave that view
 * with nothing of its own to say, and this one quietly answering a different
 * question than its name.
 */
export function todosUpcoming<T extends ScopedTodo>(
  todos: T[] | undefined,
  today: Date
) {
  const wanted = dayKey(today);

  return select<T>(
    (todo) =>
      !todo.done &&
      todo.dueDate !== undefined &&
      dayKey(todo.dueDate) !== wanted &&
      todo.dueDate >= startOfDay(today)
  )(todos);
}

/** Everything finished, whenever it was due. */
export function todosCompleted<T extends ScopedTodo>(todos: T[] | undefined) {
  return select<T>((todo) => todo.done)(todos);
}
