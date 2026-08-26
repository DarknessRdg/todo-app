import { useMemo } from "react";
import { useParams } from "react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { testProp } from "@/lib/test-id";
import { NotFound } from "@/pages/not-found/not-found";
import { todosInProject } from "@/lib/todo-scope";
import {
  ListingCapture,
  ListingContainer,
  ListingContent,
  ListingFilter,
  ListingHeader,
  ListingMain,
  ListingModal,
  ListingRail,
} from "@/components/listing";
import { useProjects } from "@/pages/inbox/use-projects";
import { useTodoList } from "@/pages/inbox/use-todo-list";

/**
 * One project's todos. The same listing every other view assembles, handed a
 * narrower set — and the same capture bar, pre-filed into this project so
 * adding from here does not mean choosing it again every time.
 *
 * Its own todos only, never a sub-project's: the tree is for filing, and a
 * parent that quietly showed everything underneath would make "which project
 * is this in" unanswerable from the list.
 */
export function ProjectPage() {
  // `:id` never matches an empty segment, so by the time this renders the id
  // is always there — `/project` falls through to the catch-all route.
  const { id = "" } = useParams();
  const { projects, isLoading } = useProjects();
  const { allTodos } = useTodoList();

  const todos = useMemo(() => todosInProject(allTodos, id), [allTodos, id]);

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
    <ListingContainer scopeKey={`project:${project.id}`}>
      <ListingMain>
        <ListingHeader testId="project.page.title" eyebrow="Project">
          {project.name}
        </ListingHeader>

        <ListingCapture projectId={project.id} />
        <ListingFilter />
        <ListingContent todos={todos} />
      </ListingMain>

      <ListingRail todos={todos} />
      <ListingModal />
    </ListingContainer>
  );
}
