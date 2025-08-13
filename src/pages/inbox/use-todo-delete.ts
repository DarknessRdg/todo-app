import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { QueryCountKey } from "@/pages/inbox/use-todo-count";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const invalidateKeys = [QueryTodoKey, QueryCountKey];

export function useTodoDelete() {
  const todoService = useContainer().get<TodoService>(Dependencies.TodoService);

  const queryClient = useQueryClient();

  const { mutateAsync, isError, isPending, isSuccess } = useMutation({
    mutationFn: todoService.delete,
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
  });

  return {
    deleteTodoAsync: mutateAsync,
    isPending,
    isError,
    isSuccess,
  };
}
