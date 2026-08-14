import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { cn } from "@/lib/utils";

type ThemeToggleProps = TestIdProps & {
  className?: string;
  /**
   * `row` is the labelled control a settings surface wants — the name of the
   * setting on the left, its state on the right. `icon` is the same switch with
   * the label dropped, for the sidebar, where it sits beside Settings and has
   * no room to say what it is in words.
   */
  variant?: "row" | "icon";
};

export function ThemeToggle({
  className,
  testId,
  variant = "row",
}: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      // A switch rather than a button: it has an on and an off, and
      // `aria-checked` is what says which one it is currently in. The label
      // stays constant for the same reason the Reading/Editing toggle's does —
      // a name that changes with the state is a name that cannot be searched
      // for or spoken about.
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      {...testProp(testId)}
      onClick={toggle}
      className={cn(
        "hover:bg-accent flex items-center gap-2 rounded-lg transition-colors",
        variant === "row"
          ? "w-full justify-between px-2 py-1.5 text-sm"
          : "justify-center p-1",
        className
      )}>
      {variant === "row" ? (
        <span className="text-foreground">Dark mode</span>
      ) : null}

      <ThemeSwitchFace isDark={isDark} compact={variant === "icon"} />
    </button>
  );
}

/**
 * The sun/moon crossfade. Both icons are always mounted and stacked, so one
 * rotates out as the other rotates in — swapping the element instead would
 * make the change a jump cut.
 */
function ThemeSwitchFace({
  isDark,
  compact,
}: {
  isDark: boolean;
  compact: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex items-center justify-center rounded-full border transition-colors",
        compact ? "size-7" : "size-8",
        isDark
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-muted text-amber-500"
      )}>
      <Sun
        className={cn(
          "absolute size-4 transition-all duration-300",
          isDark
            ? "scale-0 rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100"
        )}
      />
      <Moon
        className={cn(
          "absolute size-4 transition-all duration-300",
          isDark
            ? "scale-100 rotate-0 opacity-100"
            : "scale-0 -rotate-90 opacity-0"
        )}
      />
    </span>
  );
}
