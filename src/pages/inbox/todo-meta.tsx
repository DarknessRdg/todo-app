import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { testProp, type TestIdProps } from "@/lib/test-id";
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

/* -------------------------------------------------------------------------- */
/* Illustrative metadata                                                       */
/* Subtasks, the project and labels are real and stored; priority and assignee */
/* are not — they are derived deterministically from the id so every surface   */
/* (list, modal, page) agrees on the same made-up value.                       */
/* -------------------------------------------------------------------------- */

const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function metaFor(id: string) {
  const h = hash(id);
  return {
    priority: PRIORITIES[(h >>> 3) % PRIORITIES.length],
  };
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
const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-foreground/[0.06] text-muted-foreground",
  Medium: "bg-foreground/[0.09] text-foreground",
  High: "bg-foreground/[0.16] text-foreground",
  Urgent: "bg-foreground text-background",
};

const PRIORITY_ICONS: Record<string, LucideIcon> = {
  Low: SignalLow,
  Medium: SignalMedium,
  High: SignalHigh,
  Urgent: AlertTriangle,
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  const Icon = PRIORITY_ICONS[priority] ?? SignalHigh;

  return (
    <Badge
      className={cn(
        "gap-1.5 border-transparent font-normal",
        PRIORITY_STYLES[priority],
        className
      )}>
      <Icon className="size-3.5" />
      {priority}
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
