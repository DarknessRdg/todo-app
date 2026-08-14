import { useProjects } from "@/pages/inbox/use-projects";

/**
 * The name of the project a todo belongs to, or undefined when it belongs to
 * none. Resolved from the project list rather than stored on the todo, so a
 * rename reaches every todo at once.
 */
export function useTodoProjectName(projectId: string | undefined) {
  const { projects } = useProjects();

  if (projectId === undefined) return undefined;

  return projects.find((project) => project.id === projectId)?.name;
}
