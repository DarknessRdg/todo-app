import { useMemo } from "react";
import { useParams } from "react-router";
import { Tag } from "lucide-react";

import { EmptyList } from "@/pages/inbox/empty-list";
import { NotFound } from "@/pages/not-found/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { testProp } from "@/lib/test-id";
import { todosWithLabel } from "@/lib/todo-scope";
import {
  ListingContainer,
  ListingContent,
  ListingFilter,
  ListingHeader,
  ListingMain,
  ListingModal,
  ListingRail,
} from "@/components/listing";
import { useLabels } from "@/pages/inbox/use-labels";
import { useTodoList } from "@/pages/inbox/use-todo-list";

/**
 * Everything carrying one label.
 *
 * A label is not a place, so there is no capture bar: a todo written here would
 * have to be labelled on the way in, which is a decision the capture bar is the
 * wrong shape to ask for. `/labels` stays the page where labels themselves are
 * managed; this is the page where one is read.
 */
export function LabelPage() {
  // `:id` never matches an empty segment, so by the time this renders the id
  // is always there — `/label` falls through to the catch-all route.
  const { id = "" } = useParams();
  const { labels, isLoading } = useLabels();
  const { allTodos } = useTodoList();

  const todos = useMemo(() => todosWithLabel(allTodos, id), [allTodos, id]);

  if (isLoading) {
    return (
      <div
        {...testProp("label.page.loading")}
        aria-busy
        aria-label="Loading this label"
        className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-56" />
      </div>
    );
  }

  const label = labels.find((candidate) => candidate.id === id);

  // In place rather than redirected away from: the url is the only record of
  // which label was asked for.
  if (label === undefined) return <NotFound />;

  return (
    <ListingContainer scopeKey={`label:${label.id}`}>
      <ListingMain>
        <ListingHeader testId="label.page.title" eyebrow="Label">
          {label.name}
        </ListingHeader>

        {/* No label control: this page *is* one. */}
        <ListingFilter hide={["labels"]} />

        <ListingContent
          todos={todos}
          empty={
            <EmptyList
              testId="label.todo.empty"
              icon={<Tag className="size-5" />}
              title="Nothing carries this label"
              message="Put it on a todo from the todo's own detail, or from the labels page."
            />
          }
        />
      </ListingMain>

      <ListingRail todos={todos} />
      <ListingModal />
    </ListingContainer>
  );
}
