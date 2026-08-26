import type { TodoEntity } from "@/backend/todo-service";
import {
  ListingCapture,
  ListingContainer,
  ListingContent,
  ListingFilter,
  ListingMain,
  ListingModal,
  ListingRail,
  useListing,
} from "@/components/listing";
import { useTodoList } from "@/pages/inbox/use-todo-list";
import { Text } from "@/components/ui/text";
import { type TestIdProps } from "@/lib/test-id";
import { EmptyList } from "@/pages/inbox/empty-list";
import { dayKey } from "@/lib/due-dates";
import {
  dayFromKey,
  dueWindow,
  isTodoFilterActive,
  type TodoFilter,
} from "@/lib/todo-filter";
import { SearchX } from "lucide-react";
import { useCallback, useMemo } from "react";

/** A due filter as one string, so it can be compared by value in a dep list. */
function dueParam(due: TodoFilter["due"]): string {
  return due.kind === "day"
    ? due.day
    : due.kind === "preset"
      ? due.preset
      : due.kind;
}

export function Inbox() {
  // The hero reads the whole workspace, filtered or not: it is the summary the
  // page is titled after, and a number that moves when you type in the search
  // box is not a summary of anything.
  const { allTodos } = useTodoList();

  const doneCount = allTodos?.filter((todo) => todo.done).length ?? 0;
  const count = allTodos?.length ?? 0;
  const openCount = count - doneCount;
  const percentage = count > 0 ? Math.round((doneCount / count) * 100) : 0;

  // The rail is a month of day buttons, and every keystroke in the search box
  // is a new filter object. Memoised against what the calendar actually draws —
  // the due window, and nothing else — so typing does not redraw the calendar.
  return (
    <ListingContainer scopeKey="inbox">
      <ListingMain>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Text variant="eyebrow" className="mb-1">
              Workspace
            </Text>
            <Text variant="h1">Inbox</Text>
          </div>
        </div>

        {/*
          The hero is the inbox's alone, so it is written here rather than
          reached through a prop on the listing: a page that wants a banner
          simply puts one in its own column.

          It reads the whole workspace, filtered or not — it is the summary the
          page is titled after, and a number that moves when you type in the
          search box is not a summary of anything.
        */}
        <HeroPanel
          openCount={openCount}
          doneCount={doneCount}
          percentage={percentage}
        />

        <ListingCapture />
        <ListingFilter />
        <InboxList todos={allTodos} />
      </ListingMain>

      <InboxRail todos={allTodos} />
      <ListingModal />
    </ListingContainer>
  );
}

/** The list, and the words for when the reader's filter has emptied it. */
function InboxList({ todos }: { todos: TodoEntity[] | undefined }) {
  const { filter } = useListing();

  return (
    <ListingContent
      todos={todos}
      empty={
        isTodoFilterActive(filter) ? (
          <EmptyList
            testId="home.todo.empty.filtered"
            icon={<SearchX className="size-5" />}
            title="Nothing matches"
            message="No todo fits the filters above. Widen them, or clear them to see the lot."
          />
        ) : undefined
      }
    />
  );
}

/**
 * The rail, and the one place a calendar is a control rather than a picture.
 *
 * It stays unfiltered on purpose: picking a day is how the filter gets set, and
 * a calendar showing only the day already picked cannot be used to pick another.
 * It highlights the filter instead of obeying it.
 */
function InboxRail({ todos }: { todos: TodoEntity[] | undefined }) {
  const { filter, updateFilter } = useListing();

  // The rail is a month of day buttons, and every keystroke in the search box
  // is a new filter object. Memoised against what the calendar actually draws —
  // the due window, and nothing else — so typing does not redraw the calendar.
  const due = dueParam(filter.due);
  const calendar = useMemo(
    () => {
      const today = new Date();
      return {
        highlight: dueWindow(filter.due, today),
        selectedDay:
          filter.due.kind === "day" ? dayFromKey(filter.due.day) : undefined,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `due` is `filter.due`, by value
    [due]
  );

  /** Clicking a day filters to it; clicking it again clears the filter. */
  const pickDay = useCallback(
    (day: Date | undefined) =>
      updateFilter((previous) => ({
        ...previous,
        due:
          day === undefined
            ? { kind: "any" }
            : { kind: "day", day: dayKey(day) },
      })),
    [updateFilter]
  );

  return (
    <ListingRail
      todos={todos}
      highlight={calendar.highlight}
      selectedDay={calendar.selectedDay}
      onSelectDay={pickDay}
    />
  );
}

function HeroPanel({
  openCount,
  doneCount,
  percentage,
}: {
  openCount: number;
  doneCount: number;
  percentage: number;
}) {
  return (
    <section className="bg-accent text-accent-foreground rounded-2xl px-6 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
        <HeroStat
          testId="home.stats.open.count"
          label="Open tasks"
          value={openCount}
        />
        <div className="bg-foreground/10 hidden h-10 w-px sm:block" />
        <HeroStat
          testId="home.stats.done.count"
          label="Completed"
          value={doneCount}
        />

        <div className="ml-auto flex items-center gap-3.5">
          <ProgressRing value={percentage} />
          <div>
            <Text
              testId="home.stats.percentage"
              variant="h1"
              className="leading-none tabular-nums">
              {percentage}%
            </Text>
            <Text variant="muted" className="mt-1">
              tasks done
            </Text>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  testId,
}: TestIdProps & { label: string; value: number }) {
  return (
    <div>
      <Text
        testId={testId}
        variant="h1"
        className="text-3xl leading-none tabular-nums">
        {value}
      </Text>
      <Text variant="muted" className="mt-1.5">
        {label}
      </Text>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg viewBox="0 0 48 48" className="size-12 -rotate-90" aria-hidden>
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-foreground/15"
      />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-foreground transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}
