import type { TodoService } from "@/backend/todo-service";
import { toast } from "@/components/ui/sonner";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { QueryTodoDetailsKey } from "@/pages/inbox/use-todo-details";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useTodoUpdate() {
  const todoService = useContainer().get<TodoService>(Dependencies.TodoService);
  const queryClient = useQueryClient();

  const descriptionMutation = useMutation({
    mutationFn: todoService.updateDescription,
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryTodoDetailsKey, id],
      });
    },
    onError: (error) => {
      console.error(error);

      toast.error("Error", {
        description:
          "An internal error happened while saving your description",
      });
    },
  });

  const checkMutation = useMutation({
    mutationFn: todoService.updateDone,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryTodoKey],
      });
    },
    onError: (error, params) => {
      console.error(error);

      const action = params.done
        ? "mark your todo as completed"
        : "uncheck your todo";

      toast.error("Error", {
        description: `An internal error happened while trying to ${action}`,
      });
    },
  });

  return {
    check: checkMutation,
    updateDescription: descriptionMutation,
  };
}
