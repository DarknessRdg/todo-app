import type { ProjectService } from "@/backend/project-service";
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
    mutationFn: (name: string) => projectService.create(name),
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
