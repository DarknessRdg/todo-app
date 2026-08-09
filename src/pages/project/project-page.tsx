import { useParams } from "react-router";

import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { testProp } from "@/lib/test-id";
import { NotFound } from "@/pages/not-found/not-found";
import { TodoList } from "@/pages/inbox/list";
import { NewInput } from "@/pages/inbox/new-input";
import { RightRail } from "@/pages/inbox/right-rail";
import { TodoModalRoute } from "@/pages/inbox/todo-modal-route";
import { useProjects } from "@/pages/inbox/use-projects";

/**
 * One project's todos. The same list the inbox renders, narrowed — and the
 * same capture bar, pre-filed into this project so adding from here does not
 * mean choosing it again every time.
 */
export function ProjectPage() {
  // `:id` never matches an empty segment, so by the time this renders the id
  // is always there — `/project` falls through to the catch-all route.
  const { id = "" } = useParams();
  const { projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div
        {...testProp("project.page.loading")}
        aria-busy
        aria-label="Loading this project"
        className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-56" />
      </div>
    );
  }

  const project = projects.find((candidate) => candidate.id === id);

  // Rendered in place rather than redirected to: the url is the only record of
  // which project was asked for, and bouncing to the inbox throws it away.
  if (project === undefined) return <NotFound />;

  return (
    <div className="flex items-start gap-8">
      <div className="min-w-0 grow">
        <div className="mb-6">
          <Text variant="eyebrow" className="mb-1">
            Project
          </Text>
          <Text testId="project.page.title" variant="h1">
            {project.name}
          </Text>
        </div>

        <div className="my-6">
          <NewInput projectId={project.id} />
        </div>

        <TodoList projectId={project.id} />
      </div>

      <RightRail />

      <TodoModalRoute />
    </div>
  );
}
