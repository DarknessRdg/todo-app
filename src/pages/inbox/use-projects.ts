import type { ProjectService } from "@/backend/project-service";
import type { TodoService } from "@/backend/todo-service";
import { QueryTodoKey } from "@/pages/inbox/use-todo-list";
import { QueryTodoDetailsKey } from "@/pages/inbox/use-todo-details";
import { toast } from "@/components/ui/sonner";
import { Dependencies } from "@/di-container";
import { useContainer } from "@/di-container/hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const QueryProjectKey = "projects";

export function useProjects() {
  const projectService = useContainer().get<ProjectService>(
    Dependencies.ProjectService
  );

  const { data, isLoading } = useQuery({
    queryKey: [QueryProjectKey],
    queryFn: () => projectService.listAll(),
    // The store is IndexedDB in this same tab; a failed read is a real failure,
    // not a flaky network worth three retries.
    retry: false,
  });

  return { projects: data ?? [], isLoading };
}

export function useProjectCreate() {
  const projectService = useContainer().get<ProjectService>(
    Dependencies.ProjectService
  );
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { name: string; parentId?: string }) =>
      projectService.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryProjectKey] });
    },
    onError: (error) => {
      console.error(error);

      toast.error("Error", {
        description: "An internal error happened while creating your project",
      });
    },
  });
}

export function useProjectRename() {
  const projectService = useContainer().get<ProjectService>(
    Dependencies.ProjectService
  );
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; name: string }) =>
      projectService.rename(params),
    onSuccess: (renamed) => {
      if (!renamed) {
        toast.error("That name is taken", {
          description: "Another project already goes by it.",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: [QueryProjectKey] });
      // The name is drawn on every todo filed under it.
      queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
    },
    onError: (error) => {
      console.error(error);

      toast.error("Error", {
        description: "An internal error happened while renaming your project",
      });
    },
  });
}

export function useProjectMove() {
  const projectService = useContainer().get<ProjectService>(
    Dependencies.ProjectService
  );
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; parentId: string | undefined }) =>
      projectService.move(params),
    onSuccess: (moved) => {
      if (!moved) {
        toast.error("That move does not fit", {
          description: `Projects go three levels deep, and this one would need a fourth.`,
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: [QueryProjectKey] });
    },
    onError: (error) => {
      console.error(error);

      toast.error("Error", {
        description: "An internal error happened while moving your project",
      });
    },
  });
}

/**
 * Deleting a project: the row goes, its children move up to its own parent, and
 * its todos go back to the inbox.
 *
 * Both halves live here rather than in the page, because they are two services
 * writing two stores and the order matters — the todos are cleared first, so a
 * failure part-way leaves todos in a project that still exists rather than
 * pointing at one that does not.
 */
export function useProjectDelete() {
  const container = useContainer();
  const projectService = container.get<ProjectService>(
    Dependencies.ProjectService
  );
  const todoService = container.get<TodoService>(Dependencies.TodoService);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await todoService.clearProjectEverywhere(id);
      await projectService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryProjectKey] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoKey] });
      queryClient.invalidateQueries({ queryKey: [QueryTodoDetailsKey] });
    },
    onError: (error) => {
      console.error(error);

      toast.error("Error", {
        description: "An internal error happened while deleting your project",
      });
    },
  });
}
