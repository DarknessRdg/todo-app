/**
 * How urgent a todo is, and the words for it.
 *
 * Kept in `lib/` rather than in the service because both the filter and the
 * sort need this vocabulary, and `todo-filter.ts` is deliberately domain-free —
 * it declares the shape it reads rather than importing `TodoEntity`. The
 * service builds its zod schema from the tuple below, so the levels are still
 * declared once.
 *
 * **There is no "none" level.** A todo nobody has triaged simply has no
 * priority, the same way an undated todo has no `dueDate` and an unfiled one
 * has no `projectId`. A sentinel would have to be written onto every existing
 * row to mean what absence already means.
 */

/** Least urgent first, so the tuple reads as a scale rather than a set. */
export const TodoPriorities = ["low", "medium", "high", "urgent"] as const;

export type TodoPriority = (typeof TodoPriorities)[number];

/** The words. Stored lowercase, shown like this. */
export const priorityLabel: Record<TodoPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/**
 * What "sort by priority" means: urgent first, and a todo carrying no priority
 * last — it has not been ranked, so it cannot come before things that have.
 */
export function priorityRank(priority: TodoPriority | undefined): number {
  if (priority === undefined) return TodoPriorities.length;

  return TodoPriorities.length - 1 - TodoPriorities.indexOf(priority);
}

/**
 * A level read off the url, or `undefined` when it says nothing we recognise —
 * a hand-edited url shows a plain list rather than an empty one.
 */
export function parsePriority(
  value: string | null | undefined
): TodoPriority | undefined {
  return TodoPriorities.find((priority) => priority === value);
}
