import { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { useQuery } from "@tanstack/react-query";

export const QueryTodoKey = "list-todos";

/**
 * Every todo in the workspace, under one key.
 *
 * Deliberately one cache entry and no narrowing: a page picks the todos it is
 * about with a selector from `@/lib/todo-scope`, and the reader narrows what is
 * left with `@/lib/todo-filter`. Doing either in the `queryFn` would mean a
 * second cache entry per view and a second thing for every mutation to
 * invalidate — for a list the client already holds in full.
 */
export function useTodoList() {
  const container = useContainer();
  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const { isLoading, error, data } = useQuery({
    queryKey: [QueryTodoKey],
    queryFn: async () => {
      return await todoService.listAll();
    },
  });

  return {
    isLoading,
    error,
    /** Every todo, for whoever is about to narrow them. */
    allTodos: data,
  };
}
