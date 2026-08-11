/**
 * Finding todos by title and project — what a picker needs when the thing being
 * chosen from is the whole workspace rather than a list already on screen.
 *
 * Kept apart from `todo-filter.ts` on purpose: that one is the reader narrowing
 * a list they are looking at, and lives in the url. This is a search inside a
 * picker, which nobody wants to link to.
 */

/** Asking for the todos filed under no project at all. */
export const NoProject = "__none__";

type SearchableTodo = {
  title: string;
  projectId?: string | undefined;
};

export function searchTodos<T extends SearchableTodo>(
  todos: readonly T[],
  { query = "", projectId }: { query?: string; projectId?: string }
): T[] {
  const needle = query.trim().toLowerCase();

  return todos.filter((todo) => {
    if (needle !== "" && !todo.title.toLowerCase().includes(needle)) {
      return false;
    }

    if (projectId === undefined) return true;
    if (projectId === NoProject) return todo.projectId === undefined;

    return todo.projectId === projectId;
  });
}
