import { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { useQuery } from "@tanstack/react-query";

export const QueryTodoKey = "list-todos";

/**
 * The todo list, optionally narrowed to one project.
 *
 * The filter is applied here rather than in the query: every todo is already
 * held under one key, so narrowing in the queryFn would mean a second cache
 * entry per project and a second thing for every mutation to invalidate.
 */
export function useTodoList({
  projectId,
}: { projectId?: string } = {}) {
  const container = useContainer();
  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const { isLoading, error, data } = useQuery({
    queryKey: [QueryTodoKey],
    queryFn: async () => {
      return await todoService.listAll();
    },
  });

  const scoped =
    projectId === undefined
      ? data
      : data?.filter((todo) => todo.projectId === projectId);

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
