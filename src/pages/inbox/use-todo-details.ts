import { useContainer } from "@/di-container/hook.ts";
import { TodoService } from "@/backend/todo-service.ts";
import { Dependencies } from "@/di-container";
import { useQuery } from "@tanstack/react-query";

export const QueryTodoDetailsKey = "todo-details";

export function useTodoDetails({ id }: { id: string }) {
  const container = useContainer();
  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const { isLoading, error, data } = useQuery({
    queryKey: [QueryTodoDetailsKey, id],
    queryFn: async () => {
      // `undefined` is what TanStack Query uses to mean "no data yet", so a
      // miss has to come back as null or it warns and treats it as a failure.
      return (await todoService.byId(id)) ?? null;
    },
  });

  return {
    isLoading,
    error,
    todo: data ?? undefined,
  };
}
