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
      return await todoService.byId(id);
    },
  });

  return {
    isLoading,
    error,
    todo: data,
  };
}
