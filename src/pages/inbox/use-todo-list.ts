import { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { useQuery } from "@tanstack/react-query";
import { dayKey } from "@/lib/due-dates";
import { applyTodoFilter, type TodoFilter } from "@/lib/todo-filter";

export const QueryTodoKey = "list-todos";

/**
 * The todo list, optionally narrowed to one project and/or one due date.
 *
 * The filters are applied here rather than in the query: every todo is already
 * held under one key, so narrowing in the queryFn would mean a second cache
 * entry per project and a second thing for every mutation to invalidate.
 */
export function useTodoList({
  projectId,
  dueOn,
  filter,
}: {
  projectId?: string;
  /** Keeps only what is due on this calendar day — what `/today` is. */
  dueOn?: Date;
  /** The reader's own narrowing, from the url. See `@/lib/todo-filter`. */
  filter?: TodoFilter;
} = {}) {
  const container = useContainer();
  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const { isLoading, error, data } = useQuery({
    queryKey: [QueryTodoKey],
    queryFn: async () => {
      return await todoService.listAll();
    },
  });

  const byProject =
    projectId === undefined
      ? data
      : data?.filter((todo) => todo.projectId === projectId);

  // Compared as calendar days, not as instants: a due date carries a time, and
  // "due today" is a day the reader is living in rather than a 24-hour window.
  const day = dueOn === undefined ? undefined : dayKey(dueOn);
  const byDay =
    day === undefined
      ? byProject
      : byProject?.filter(
          (todo) => todo.dueDate !== undefined && dayKey(todo.dueDate) === day
        );

  // Last, over what the page already narrowed: the page decides which todos
  // are on it, the reader decides which of those to look at.
  const scoped =
    filter === undefined || byDay === undefined
      ? byDay
      : applyTodoFilter(byDay, filter, new Date());

  const count = scoped?.length || 0;

  return {
    isLoading,
    error,
    count,
    todoList: scoped?.filter((it) => !it.done),
    doneList: scoped?.filter((it) => it.done),
    /** Every todo, whatever the filter — for counts across all projects. */
    allTodos: data,
  };
}
