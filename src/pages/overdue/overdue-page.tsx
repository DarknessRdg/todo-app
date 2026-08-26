import { useMemo } from "react";
import { CalendarClock } from "lucide-react";

import { EmptyList } from "@/pages/inbox/empty-list";
import { todosOverdue } from "@/lib/todo-scope";
import {
  ListingContainer,
  ListingContent,
  ListingFilter,
  ListingHeader,
  ListingMain,
  ListingModal,
  ListingRail,
} from "@/components/listing";
import { useTodoList } from "@/pages/inbox/use-todo-list";

/**
 * What was missed: open todos whose date has passed.
 *
 * Finished-late work is not here — it is finished, and a page whose whole job
 * is "what did I miss" would fill up with things that are already behind you.
 */
export function OverduePage() {
  const today = new Date();
  const { allTodos } = useTodoList();

  const todos = useMemo(
    () => todosOverdue(allTodos, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the day, not the instant
    [allTodos, today.toDateString()]
  );

  return (
    <ListingContainer scopeKey="overdue">
      <ListingMain>
        <ListingHeader testId="overdue.page.title" eyebrow="Views">
          Overdue
        </ListingHeader>

        <ListingFilter hide={["due", "done"]} />

        <ListingContent
          todos={todos}
          empty={
            <EmptyList
              testId="overdue.todo.empty"
              icon={<CalendarClock className="size-5" />}
              title="Nothing is late"
              message="Every dated todo is still ahead of you."
            />
          }
        />
      </ListingMain>

      <ListingRail todos={todos} />
      <ListingModal />
    </ListingContainer>
  );
}
