import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { QueryCountKey } from "@/pages/inbox/use-todo-count";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const invalidateKeys = [QueryTodoKey, QueryCountKey];

export function useTodoCreate() {
  const container = useContainer();

  const todoService = container.get<TodoService>(Dependencies.TodoService);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: todoService.create,
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
  });

  return {
    create: mutation,
    validateField: todoService.validateField,
  };
}
