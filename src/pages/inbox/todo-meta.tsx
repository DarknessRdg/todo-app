import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { priorityLabel, type TodoPriority } from "@/lib/priority";
import {
  AlertTriangle,
  CalendarIcon,
  CheckCircle2,
  CircleDot,
  FolderIcon,
  ListChecks,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Tag,
  type LucideIcon,
} from "lucide-react";

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
    <Badge className="bg-accent text-accent-foreground gap-1.5 border-transparent font-normal">
      <CheckCircle2 className="size-3.5" />
      Done
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="text-muted-foreground gap-1.5 font-normal">
      <CircleDot className="size-3.5" />
      Open
    </Badge>
  );
}

// Monochrome escalation — darkness carries the weight, icons carry the meaning.
const PRIORITY_STYLES: Record<TodoPriority, string> = {
  low: "bg-foreground/[0.06] text-muted-foreground",
  medium: "bg-foreground/[0.09] text-foreground",
  high: "bg-foreground/[0.16] text-foreground",
  urgent: "bg-foreground text-background",
};

const PRIORITY_ICONS: Record<TodoPriority, LucideIcon> = {
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: AlertTriangle,
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
        PRIORITY_STYLES[priority],
        className
      )}>
      <Icon className="size-3.5" />
      {priorityLabel[priority]}
    </Badge>
  );
}

export function ProjectBadge({
  project,
  className,
}: {
  project: string;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5 font-normal", className)}>
      <FolderIcon className="size-3.5" />
      {project}
    </Badge>
  );
}

export function DueBadge({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5 font-normal", className)}>
      <CalendarIcon className="size-3.5" />
      {formatDateShort(date)}
    </Badge>
  );
}

export function LabelChips({
  labels,
  max = 3,
  className,
}: {
  labels: string[];
  max?: number;
  className?: string;
}) {
  const shown = labels.slice(0, max);
  const extra = labels.length - shown.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {shown.map((label) => (
        <Badge key={label} variant="secondary" className="gap-1.5 font-normal">
          <Tag className="size-3.5" />
          {label}
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
      <ListChecks className="size-3.5" />
      {done}/{total}
    </span>
  );
}
