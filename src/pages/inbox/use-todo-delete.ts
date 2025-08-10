import type { TodoService } from "@/backend/todo-service";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useTodoDelete() {
  const todoService = useContainer().get<TodoService>(Dependencies.TodoService);

  const queryClient = useQueryClient();

  const { mutate, isError, isPending, isSuccess } = useMutation({
    mutationFn: todoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryTodoKey],
      });
    },
  });

  return {
    deleteTodo: mutate,
    isPending,
    isError,
    isSuccess,
  };
}
