import { Text } from "@/components/ui/text";
import { EmptyList } from "@/pages/inbox/empty-list";
import { TodoList } from "@/pages/inbox/list";
import { NewInput } from "@/pages/inbox/new-input";
import { RightRail } from "@/pages/inbox/right-rail";
import { TodoModalRoute } from "@/pages/inbox/todo-modal-route";
import { Sun } from "lucide-react";

/**
 * Everything due today — the same list the inbox renders, narrowed to one
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

  return (
    <div className="flex items-start gap-8">
      <div className="min-w-0 grow">
        <div className="mb-6">
          <Text variant="eyebrow" className="mb-1">
            Today
          </Text>
          <Text testId="today.page.title" variant="h1">
            {longDate(today)}
          </Text>
        </div>

        {/* The capture bar already defaults a new todo to today, so anything
            added from here belongs to the page it was added on. */}
        <div className="my-6">
          <NewInput />
        </div>

        <TodoList
          dueOn={today}
          scope="today"
          empty={
            <EmptyList
              testId="today.todo.empty"
              icon={<Sun className="size-5" />}
              title="Nothing due today"
              message="A clear day. Anything you capture here is due today by default."
            />
          }
        />
      </div>

      <RightRail dueOn={today} />

      <TodoModalRoute />
    </div>
  );
}

/** "Monday, 10 August" — the day itself, since the eyebrow already says Today. */
function longDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
