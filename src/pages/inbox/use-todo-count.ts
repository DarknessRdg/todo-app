import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { useQuery } from "@tanstack/react-query";

export const QueryCountKey = "count-all-todos";

export function useTodoCount() {
  const container = useContainer();
  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const {
    isLoading,
    error,
    data: count,
  } = useQuery({
    queryKey: [QueryCountKey],
    queryFn: async () => {
      return await todoService.count();
    },
  });

  return {
    isLoading,
    error,
    count,
  };
}
