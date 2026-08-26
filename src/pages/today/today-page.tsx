import { useMemo } from "react";
import { Sun } from "lucide-react";

import { EmptyList } from "@/pages/inbox/empty-list";
import { todosDueOn } from "@/lib/todo-scope";
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
import { useTodoList } from "@/pages/inbox/use-todo-list";

/**
 * Everything due today — the same listing the inbox assembles, handed one
 * calendar day.
 *
 * Only *today*: overdue todos have their own view, and folding them in here
 * would leave that one with nothing to say and this one quietly lying about
 * what "today" means. Nothing is filed by hand into this view; it is a filter,
 * so a todo leaves it by having its due date changed.
 */
export function TodayPage() {
  // Read once per render rather than per consumer, so the list, the rail and
  // the heading cannot disagree about which day it is.
  const today = new Date();
  const { allTodos } = useTodoList();

  const todos = useMemo(
    () => todosDueOn(allTodos, today),
    // The day, not the instant: a new `Date` every render would rebuild this
    // list on every keystroke elsewhere on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTodos, today.toDateString()]
  );

  return (
    <ListingContainer scopeKey="today">
      <ListingMain>
        <ListingHeader testId="today.page.title" eyebrow="Today">
          {longDate(today)}
        </ListingHeader>

        {/* Pinned rather than defaulted: capture is undated everywhere else,
            and this page's whole promise is that what you add here is due
            today. */}
        <ListingCapture dueDate={today} />

        {/* No due control: this page *is* one, and offering to widen it would
            take the reader somewhere the heading no longer describes. */}
        <ListingFilter hide={["due"]} />

        <ListingContent
          todos={todos}
          empty={
            <EmptyList
              testId="today.todo.empty"
              icon={<Sun className="size-5" />}
              title="Nothing due today"
              message="A clear day. Anything you capture here is due today by default."
            />
          }
        />
      </ListingMain>

      <ListingRail todos={todos} />
      <ListingModal />
    </ListingContainer>
  );
}

/** "Wednesday, 12 August" — the heading is the day, so it is spelled out. */
function longDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
