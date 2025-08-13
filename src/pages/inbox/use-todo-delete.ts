import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { QueryCountKey } from "@/pages/inbox/use-todo-count";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useTodoDelete() {
  const todoService = useContainer().get<TodoService>(Dependencies.TodoService);

  const queryClient = useQueryClient();

  const { mutateAsync, isError, isPending, isSuccess } = useMutation({
    mutationFn: todoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryTodoKey, QueryCountKey],
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
