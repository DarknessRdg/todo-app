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

  const titleMutation = useMutation({
    mutationFn: todoService.updateTitle,
    // The title is shown in two places, so both have to be refreshed: the
    // detail being edited, and the list row it was opened from.
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QueryTodoDetailsKey, id] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
    },
    onError: (error) => {
      console.error(error);

      toast.error("Error", {
        description: "An internal error happened while saving your title",
      });
    },
  });

  const projectMutation = useMutation({
    mutationFn: todoService.updateProject,
    // The project is shown on the list row and throughout the detail, so both
    // have to be refreshed.
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoDetailsKey, id] });
    },
    onError: (error) => {
      console.error(error);

      toast.error("Error", {
        description: "An internal error happened while moving your todo",
      });
    },
  });

  const checkMutation = useMutation({
    mutationFn: todoService.updateDone,
    // Done is shown in both places, so both have to be refreshed: the list this
    // may have been toggled from, and the detail, which can toggle it too.
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoDetailsKey, id] });
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
    updateTitle: titleMutation,
    updateProject: projectMutation,
    updateDescription: descriptionMutation,
  };
}
