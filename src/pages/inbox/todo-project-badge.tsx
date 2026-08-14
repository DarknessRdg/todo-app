import { ProjectBadge } from "@/pages/inbox/todo-meta";
import { useTodoProjectName } from "@/pages/inbox/use-todo-project";

/**
 * A todo's project badge, resolved from the stored project list.
 *
 * Renders nothing when the todo belongs to no project: a badge reading "none"
 * is noise on every todo still sitting in the inbox.
 */
export function TodoProjectBadge({
  projectId,
  className,
}: {
  projectId: string | undefined;
  className?: string;
}) {
  const name = useTodoProjectName(projectId);

  if (name === undefined) return null;

  return <ProjectBadge project={name} className={className} />;
}
