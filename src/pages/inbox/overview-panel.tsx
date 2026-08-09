import { Calendar } from "@/components/ui/calendar";
import { Text } from "@/components/ui/text";
import { type TestIdProps } from "@/lib/test-id";
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

export function OverviewPanel() {
  const { todoList, doneList, count } = useTodoList();

  const doneCount = doneList?.length ?? 0;
  const openCount = count - doneCount;
  const percentage = count > 0 ? Math.round((doneCount / count) * 100) : 0;

  const today = new Date();
  const dueTodayCount =
    todoList?.filter((t) => t.dueDate && isSameDay(t.dueDate, today)).length ??
    0;

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
            selected={today}
            today={today}
            captionLayout="label"
            className="w-full bg-transparent p-0"
          />
        </div>
      </section>
    </div>
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
