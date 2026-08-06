import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <WeaveMark className="text-primary size-6 shrink-0" />
      <span className="font-display text-foreground text-lg leading-none font-semibold tracking-tight">
        Loom
      </span>
    </span>
  );
}

/** Two interlocking threads — capture woven into structure. */
function WeaveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 7c4 0 4 10 8 10s4-10 8-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 17c4 0 4-10 8-10s4 10 8 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-40"
      />
    </svg>
  );
}
