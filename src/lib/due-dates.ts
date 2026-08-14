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
