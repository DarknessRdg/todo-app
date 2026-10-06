import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { priorityLabel, type TodoPriority } from "@/lib/priority";
import { dueState, type DueState } from "@/lib/due-dates";
import { tintFill, type Tint } from "@/lib/tint";
import {
  type AppIcon,
  DoneStatusIcon,
  DueDateIcon,
  LabelIcon,
  OpenStatusIcon,
  OverdueIcon,
  PriorityHighIcon,
  PriorityLowIcon,
  PriorityMediumIcon,
  PriorityUrgentIcon,
  ProjectIcon,
  SubtasksIcon,
} from "@/icons";

/**
 * A stable number from an id, so the display ticket key below is the same one
 * every time a todo is looked at. Priority used to be derived from this too —
 * it is a stored field now, and `metaFor` is gone with it.
 */
export function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function shortId(id: string) {
  return `TASK-${(hash(id) % 9000) + 1000}`;
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                       */
/* -------------------------------------------------------------------------- */

export function StatusBadge({ done }: { done: boolean }) {
  return done ? (
    <Badge
      className={cn("gap-1.5 border-transparent font-normal", tintFill.green)}>
      <DoneStatusIcon className="size-3.5" />
      Done
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="text-muted-foreground gap-1.5 font-normal">
      <OpenStatusIcon className="size-3.5" />
      Open
    </Badge>
  );
}

// Escalation by hue, cool to hot, with the icon carrying the same meaning
// for anyone who cannot tell the colours apart.
const PRIORITY_TINTS: Record<TodoPriority, Tint> = {
  low: "gray",
  medium: "blue",
  high: "orange",
  urgent: "red",
};

const PRIORITY_ICONS: Record<TodoPriority, AppIcon> = {
  low: PriorityLowIcon,
  medium: PriorityMediumIcon,
  high: PriorityHighIcon,
  urgent: PriorityUrgentIcon,
};

/**
 * How urgent a todo is, when anyone has said.
 *
 * Nothing at all when nobody has. An untriaged todo is the ordinary case, and a
 * badge on every row saying so would be a badge that carries no information —
 * it would also drown the rows that *are* ranked, which is the whole point of
 * the escalation.
 */
export function PriorityBadge({
  priority,
  className,
  testId,
}: TestIdProps & {
  priority: TodoPriority | undefined;
  className?: string;
}) {
  if (priority === undefined) return null;

  const Icon = PRIORITY_ICONS[priority];

  return (
    <Badge
      {...testProp(testId)}
      className={cn(
        "gap-1.5 border-transparent font-normal",
        tintFill[PRIORITY_TINTS[priority]],
        className
      )}>
      <Icon className="size-3.5" />
      {priorityLabel[priority]}
    </Badge>
  );
}

export function ProjectBadge({
  project,
  colour,
  className,
}: {
  project: string;
  /** Absent on projects made before colours, which read as plain chips. */
  colour?: Tint;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 font-normal",
        colour && ["border-transparent", tintFill[colour]],
        className
      )}>
      <ProjectIcon className="size-3.5" />
      {project}
    </Badge>
  );
}

/**
 * Overdue and today are the two dates that ask for something, so they are the
 * two that get a colour; a date further out stays quiet. The state is also
 * spoken, not only drawn: colour is not the only way it is said.
 */
const DUE_TINTS: Record<DueState, Tint | undefined> = {
  overdue: "red",
  today: "orange",
  upcoming: undefined,
  settled: undefined,
};

const DUE_SPOKEN: Record<DueState, string | undefined> = {
  overdue: "Overdue",
  today: "Due today",
  upcoming: undefined,
  settled: undefined,
};

export function DueBadge({
  date,
  done = false,
  className,
}: {
  date: Date;
  /** A done todo's date is history, never overdue. */
  done?: boolean;
  className?: string;
}) {
  const state = dueState({ dueDate: date, done }, new Date());
  const tint = DUE_TINTS[state];
  const Icon = state === "overdue" ? OverdueIcon : DueDateIcon;

  return (
    <Badge
      variant={tint ? "default" : "secondary"}
      className={cn(
        "gap-1.5 font-normal",
        tint && ["border-transparent", tintFill[tint]],
        className
      )}>
      <Icon className="size-3.5" />
      {DUE_SPOKEN[state] ? (
        <span className="sr-only">{DUE_SPOKEN[state]}, </span>
      ) : null}
      {formatDateShort(date)}
    </Badge>
  );
}

export function LabelChips({
  labels,
  max = 3,
  className,
}: {
  /** In display order; a label with no colour reads as a plain chip. */
  labels: { id: string; name: string; colour?: Tint }[];
  max?: number;
  className?: string;
}) {
  const shown = labels.slice(0, max);
  const extra = labels.length - shown.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {shown.map((label) => (
        <Badge
          key={label.id}
          variant="secondary"
          className={cn(
            "gap-1.5 font-normal",
            label.colour && ["border-transparent", tintFill[label.colour]]
          )}>
          <LabelIcon className="size-3.5" />
          {label.name}
        </Badge>
      ))}
      {extra > 0 ? (
        <Badge variant="secondary" className="font-normal">
          +{extra}
        </Badge>
      ) : null}
    </div>
  );
}

export function SubtaskIndicator({
  done,
  total,
  className,
  testId,
}: TestIdProps & {
  done: number;
  total: number;
  className?: string;
}) {
  const complete = done === total;

  return (
    <span
      {...testProp(testId)}
      className={cn(
        "text-muted-foreground inline-flex items-center gap-1 text-xs tabular-nums",
        complete && "text-foreground",
        className
      )}
      title={`${done} of ${total} subtasks done`}>
      <SubtasksIcon className="size-3.5" />
      {done}/{total}
    </span>
  );
}
