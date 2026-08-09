import { TodoList } from "./list";
import { TodoModalRoute } from "@/pages/inbox/todo-modal-route.tsx";
import { RightRail } from "@/pages/inbox/right-rail.tsx";
import { NewInput } from "@/pages/inbox/new-input";
import { useTodoList } from "@/pages/inbox/use-todo-list";
import { Text } from "@/components/ui/text";
import { type TestIdProps } from "@/lib/test-id";

export function Inbox() {
  const { count, doneList } = useTodoList();

  const doneCount = doneList?.length ?? 0;
  const openCount = count - doneCount;
  const percentage = count > 0 ? Math.round((doneCount / count) * 100) : 0;

  return (
    <div className="flex items-start gap-8">
      <div className="min-w-0 grow">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Text variant="eyebrow" className="mb-1">
              Workspace
            </Text>
            <Text variant="h1">Inbox</Text>
          </div>
        </div>

        <HeroPanel
          openCount={openCount}
          doneCount={doneCount}
          percentage={percentage}
        />

        <div className="my-6">
          <NewInput />
        </div>

        <TodoList />
      </div>

      <RightRail />

      <TodoModalRoute />
    </div>
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
