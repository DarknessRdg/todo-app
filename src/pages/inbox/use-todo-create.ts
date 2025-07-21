import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useTodoCreate() {
  const container = useContainer();

  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: todoService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryTodoKey],
      });
    },
  });

  return {
    create: mutation,
    validateField: todoService.validateField,
  };
}
