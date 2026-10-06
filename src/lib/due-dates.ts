/**
 * Bucketing todos by the day they are due, for the calendar's per-day counts.
 *
 * Keyed by the *local* calendar day rather than by the `Date` itself: two todos
 * due on the same day carry different times, and an ISO/UTC key would file a
 * late-evening due date under tomorrow for anyone east of Greenwich — the
 * calendar draws local days, so the counts have to be counted in local days.
 */

/** The local calendar day a date falls on, as `yyyy-mm-dd`. */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * How many of `todos` are due on each day, keyed by `dayKey`.
 *
 * Days with nothing due are absent rather than zero, so a caller can ask
 * "is there anything here?" with a single lookup.
 */
export function countDueByDay(
  todos: readonly { dueDate?: Date | undefined }[]
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const todo of todos) {
    if (todo.dueDate === undefined) continue;

    const key = dayKey(todo.dueDate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

/**
 * Where a due date stands relative to today, for colouring the date a todo
 * carries.
 *
 * Compared by local calendar day, the same way the views are: a todo due at
 * nine this morning is due *today* at two in the afternoon, not overdue, or
 * the Today view and the badge on its own rows would disagree. A done todo is
 * `settled` whatever its date, because a late finish is still a finish (see
 * `todosOverdue`).
 */
export type DueState = "overdue" | "today" | "upcoming" | "settled";

export function dueState(
  todo: { dueDate: Date; done: boolean },
  today: Date
): DueState {
  if (todo.done) return "settled";

  const due = dayKey(todo.dueDate);
  const now = dayKey(today);

  if (due === now) return "today";
  return due < now ? "overdue" : "upcoming";
}
