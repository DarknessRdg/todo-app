import { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { useQuery } from "@tanstack/react-query";

export const QueryTodoKey = "list-todos";
export function useTodoList() {
  const container = useContainer();
  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const { isLoading, error, data } = useQuery({
    queryKey: [QueryTodoKey],
    queryFn: async () => {
      return await todoService.listAll();
    },
  });

  const count = data?.length || 0;

  return {
    isLoading,
    error,
    count,
    todoList: data?.filter((it) => !it.done),
    doneList: data?.filter((it) => it.done),
  };
}
