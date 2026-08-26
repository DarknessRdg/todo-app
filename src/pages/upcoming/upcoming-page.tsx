import { useMemo } from "react";
import { CalendarDays } from "lucide-react";

import { EmptyList } from "@/pages/inbox/empty-list";
import { todosUpcoming } from "@/lib/todo-scope";
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
 * What is coming: open todos due after today.
 *
 * No capture bar. A todo written here would need a date in the future to belong
 * on the page it was written on, and a bar that swallows what you type is worse
 * than no bar — the same reason `/overdue` and `/completed` have none.
 */
export function UpcomingPage() {
  const today = new Date();
  const { allTodos } = useTodoList();

  const todos = useMemo(
    () => todosUpcoming(allTodos, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the day, not the instant
    [allTodos, today.toDateString()]
  );

  return (
    <ListingContainer scopeKey="upcoming">
      <ListingMain>
        <ListingHeader testId="upcoming.page.title" eyebrow="Views">
          Upcoming
        </ListingHeader>

        {/* This page is a due filter and a done filter already. */}
        <ListingFilter hide={["due", "done"]} />

        <ListingContent
          todos={todos}
          empty={
            <EmptyList
              testId="upcoming.todo.empty"
              icon={<CalendarDays className="size-5" />}
              title="Nothing scheduled"
              message="Nothing is due after today. Give a todo a date and it turns up here."
            />
          }
        />
      </ListingMain>

      <ListingRail todos={todos} />
      <ListingModal />
    </ListingContainer>
  );
}
