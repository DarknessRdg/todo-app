import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={cn(
        "hover:bg-accent flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
        className
      )}>
      <span className="text-foreground">Dark mode</span>

      <span
        aria-hidden
        className={cn(
          "relative flex size-8 items-center justify-center rounded-full border transition-colors",
          isDark
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-muted text-amber-500"
        )}>
        <Sun
          className={cn(
            "absolute size-4 transition-all duration-300",
            isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute size-4 transition-all duration-300",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
          )}
        />
      </span>
    </button>
  );
}
