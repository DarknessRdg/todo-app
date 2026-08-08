import type { TodoService } from "@/backend/todo-service";
import { toast } from "@/components/ui/sonner";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { QueryTodoDetailsKey } from "@/pages/inbox/use-todo-details";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Every subtask change moves two things on screen: the list inside the todo's
 * detail, and the `2/5` indicator on its row in the inbox — so both keys are
 * invalidated, not just the detail the user is looking at.
 */
export function useTodoSubtasks({ id }: { id: string }) {
  const todoService = useContainer().get<TodoService>(Dependencies.TodoService);
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QueryTodoDetailsKey, id] });
    queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
  };

  const onError = (error: unknown, action: string) => {
    console.error(error);

    toast.error("Error", {
      description: `An internal error happened while trying to ${action}`,
    });
  };

  const addMutation = useMutation({
    mutationFn: (title: string) => todoService.addSubtask({ id, title }),
    onSuccess: invalidate,
    onError: (error) => onError(error, "add your subtask"),
  });

  const checkMutation = useMutation({
    mutationFn: (params: { subtaskId: string; done: boolean }) =>
      todoService.updateSubtaskDone({ id, ...params }),
    onSuccess: invalidate,
    onError: (error, { done }) =>
      onError(
        error,
        done ? "complete your subtask" : "reopen your subtask"
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (subtaskId: string) =>
      todoService.deleteSubtask({ id, subtaskId }),
    onSuccess: invalidate,
    onError: (error) => onError(error, "delete your subtask"),
  });

  return {
    add: addMutation,
    check: checkMutation,
    remove: deleteMutation,
  };
}
