import { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { useQuery } from "@tanstack/react-query";

export const QueryTodoKey = "list-todos";
export function useTodoList() {
  const container = useContainer();
  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const {
    isLoading,
    error,
    data: todoList,
  } = useQuery({
    queryKey: [QueryTodoKey],
    queryFn: async () => {
      return await todoService.listAll();
    },
  });

  return {
    isLoading,
    error,
    todoList,
  };
}
