import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Text } from "@/components/ui/text";
import { countDueByDay, dayKey } from "@/lib/due-dates";
import { WeekStartsOn } from "@/lib/todo-filter";
import { cn } from "@/lib/utils";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { Progress } from "@/components/ui/progress";
import { useTodoList } from "@/pages/inbox/use-todo-list";
import { CheckCircle2, Circle, CalendarClock } from "lucide-react";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function OverviewPanel({
  projectId,
  dueOn,
  highlight,
  selectedDay,
  onSelectDay,
}: {
  projectId?: string;
  dueOn?: Date;
  /** The days the list is filtered to, drawn behind the dates. */
  highlight?: { from: Date; to: Date };
  selectedDay?: Date;
  /**
   * Present when the calendar filters the list. Without it the calendar is a
   * picture of the month with today marked, which is all it is on the pages
   * that have no filter bar.
   */
  onSelectDay?: (day: Date | undefined) => void;
}) {
  const { todoList, doneList, count } = useTodoList({ projectId, dueOn });

  const doneCount = doneList?.length ?? 0;
  const openCount = count - doneCount;
  const percentage = count > 0 ? Math.round((doneCount / count) * 100) : 0;

  const today = new Date();
  const dueTodayCount =
    todoList?.filter((t) => t.dueDate && isSameDay(t.dueDate, today)).length ??
    0;

  // Open todos only, matching "Due today" above it: a todo that is done is not
  // due any more, and a calendar still counting it would contradict the stat
  // sitting three inches above it.
  const dueByDay = countDueByDay(todoList ?? []);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <Text variant="eyebrow" className="mb-3">
          Overview
        </Text>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat
            testId="home.overview.open.count"
            icon={<Circle className="size-4" />}
            value={openCount}
            label="Open"
          />
          <Stat
            testId="home.overview.done.count"
            icon={<CheckCircle2 className="size-4" />}
            value={doneCount}
            label="Done"
          />
          <Stat
            testId="home.overview.duetoday.count"
            icon={<CalendarClock className="size-4" />}
            value={dueTodayCount}
            label="Due today"
          />
          <Stat
            testId="home.overview.percentage"
            value={`${percentage}%`}
            label="Complete"
          />
        </div>

        <div className="mt-3">
          <Progress
            value={percentage}
            className="h-1.5"
            aria-label={`${doneCount} of ${count} complete`}
          />
        </div>
      </section>

      <section>
        <Text variant="eyebrow" className="mb-3">
          Calendar
        </Text>
        <div className="bg-card rounded-2xl p-3">
          <Calendar
            mode="single"
            // Where the calendar filters, the selection *is* the filter — with
            // nothing picked no day is selected, and today keeps its own mark.
            selected={onSelectDay === undefined ? today : selectedDay}
            onSelect={onSelectDay}
            today={today}
            captionLayout="label"
            // The week the presets mean has to be the week drawn here, or
            // "This week" highlights half of two rows. See `WeekStartsOn`.
            weekStartsOn={WeekStartsOn}
            modifiers={
              highlight === undefined ? undefined : { window: highlight }
            }
            modifiersClassNames={{ window: "bg-foreground/[0.07] rounded-md" }}
            className="w-full bg-transparent p-0"
            // The vendored calendar takes a replacement day button, so the
            // marks ride along without editing `components/ui/calendar.tsx`
            // — which would be lost the next time it is regenerated.
            components={{
              DayButton: (props) => (
                <DueMarkDayButton {...props} dueByDay={dueByDay} />
              ),
            }}
          />
        </div>
      </section>
    </div>
  );
}

/**
 * A day in the calendar, marked with a dot when anything is due on it.
 *
 * The dot sits under the date rather than over it: at this size a corner mark
 * crowds the digits it is meant to annotate, and the day button is already a
 * column with room for a second line.
 *
 * Its colour follows the day's own state. A selected day fills with `--primary`,
 * so a fixed ink dot would vanish into it — on a selected day the dot takes the
 * button's own text colour instead. The `!` is aimed at the day button's
 * `[&>span]:opacity-70`, which is meant for a muted second line of text and
 * would otherwise fade a mark that is the whole signal.
 */
function DueMarkDayButton({
  dueByDay,
  ...props
}: React.ComponentProps<typeof CalendarDayButton> & {
  dueByDay: Map<string, number>;
}) {
  const key = dayKey(props.day.date);
  const isDue = dueByDay.has(key);
  const selected = props.modifiers.selected === true;

  return (
    <CalendarDayButton
      {...props}
      // The day itself is a control where the calendar filters, so it needs to
      // be reachable by id like any other.
      {...testProp(`home.overview.calendar.${key}.button`)}>
      {props.children}
      {isDue && (
        <span
          {...testProp(`home.overview.calendar.${key}.due.dot`)}
          aria-label="Todos due"
          className={cn(
            "size-1.5 rounded-full opacity-100!",
            selected ? "bg-primary-foreground" : "bg-foreground/60"
          )}
        />
      )}
    </CalendarDayButton>
  );
}

function Stat({
  icon,
  value,
  label,
  testId,
}: TestIdProps & {
  icon?: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-2xl px-3.5 py-3">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        <Text variant="eyebrow" as="span">
          {label}
        </Text>
      </span>
      <Text
        testId={testId}
        variant="h1"
        as="span"
        className="font-display leading-none tabular-nums">
        {value}
      </Text>
    </div>
  );
}
