import type { LabelService } from "@/backend/label-service";
import type { TodoService } from "@/backend/todo-service";
import { toast } from "@/components/ui/sonner";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { QueryTodoDetailsKey } from "@/pages/inbox/use-todo-details";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const QueryLabelKey = "labels";

function useLabelService() {
  return useContainer().get<LabelService>(Dependencies.LabelService);
}

export function useLabels() {
  const labelService = useLabelService();

  const { data, isLoading } = useQuery({
    queryKey: [QueryLabelKey],
    queryFn: () => labelService.listAll(),
    // The store is IndexedDB in this same tab; a failed read is a real failure,
    // not a flaky network worth three retries.
    retry: false,
  });

  return { labels: data ?? [], isLoading };
}

export function useLabelCreate() {
  const labelService = useLabelService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => labelService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryLabelKey] });
    },
    onError: reportAs("creating"),
  });
}

export function useLabelRename() {
  const labelService = useLabelService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; name: string }) =>
      labelService.rename(params),
    onSuccess: (renamed) => {
      queryClient.invalidateQueries({ queryKey: [QueryLabelKey] });

      // The service refuses a name another label already answers to. Silence
      // would read as "renamed", leaving the old name on screen unexplained.
      if (!renamed) {
        toast.error("That name is taken", {
          description: "Another label already goes by it.",
        });
      }
    },
    onError: reportAs("renaming"),
  });
}

/**
 * Deleting a label is two writes: the label itself, and the id on every todo
 * carrying it. Both invalidate, because the rows draw their chips from the todo
 * and the name from the label list — leaving either stale shows a chip for a
 * label that is gone.
 */
export function useLabelDelete() {
  const labelService = useLabelService();
  const todoService = useContainer().get<TodoService>(Dependencies.TodoService);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await labelService.delete(id);
      await todoService.removeLabelEverywhere(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryLabelKey] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoDetailsKey] });
    },
    onError: reportAs("deleting"),
  });
}

/** Sets which labels a todo carries. */
export function useTodoLabels() {
  const todoService = useContainer().get<TodoService>(Dependencies.TodoService);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; labelIds: string[] }) =>
      todoService.updateLabels(params),
    // Labels are chips on the list row and a property on the detail, so both
    // have to be refreshed.
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoDetailsKey, id] });
    },
    onError: reportAs("updating"),
  });
}

/**
 * Puts one label on, or takes it off, several todos at once — what "pull todos
 * into this label" is underneath.
 *
 * The todos come in whole rather than as ids because each one's other labels
 * have to survive: this writes `labelIds`, so it needs to know what was already
 * there. One invalidation at the end rather than one per todo, or a list of
 * thirty would repaint thirty times.
 */
export function useLabelMembership() {
  const todoService = useContainer().get<TodoService>(Dependencies.TodoService);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      labelId,
      add,
      remove,
    }: {
      labelId: string;
      add: LabelledTodo[];
      remove: LabelledTodo[];
    }) => {
      for (const todo of add) {
        if (todo.labelIds.includes(labelId)) continue;
        await todoService.updateLabels({
          id: todo.id,
          labelIds: [...todo.labelIds, labelId],
        });
      }

      for (const todo of remove) {
        if (!todo.labelIds.includes(labelId)) continue;
        await todoService.updateLabels({
          id: todo.id,
          labelIds: todo.labelIds.filter((id) => id !== labelId),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoDetailsKey] });
    },
    onError: reportAs("updating"),
  });
}

/** The part of a todo this hook writes back. */
type LabelledTodo = { id: string; labelIds: string[] };

function reportAs(action: string) {
  return (error: unknown) => {
    console.error(error);

    toast.error("Error", {
      description: `An internal error happened while ${action} your label`,
    });
  };
}
