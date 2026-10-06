import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <TaskriptMark className="text-primary size-6 shrink-0" />
      {/* The seam of the name, drawn: "Task" in ink, the borrowed half of
          "script" one step down the ramp. */}
      <span className="font-display text-foreground text-lg leading-none font-semibold tracking-tight">
        Task<span className="text-muted-foreground">ript</span>
      </span>
    </span>
  );
}

/**
 * A check mark with a text caret after it — the task done, and the writing
 * that carries on beside it. The caret sits a step lighter, the same way the
 * second half of the wordmark does.
 */
export function TaskriptMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 12.5l4.5 4.5L16 7.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 5v14"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        className="opacity-40"
      />
    </svg>
  );
}
