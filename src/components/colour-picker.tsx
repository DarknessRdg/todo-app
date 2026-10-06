import { CheckmarkIcon } from "@/icons";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { Tints, tintSwatch, type Tint } from "@/lib/tint";
import { cn } from "@/lib/utils";

/** What each tint is called aloud. */
export const tintName: Record<Tint, string> = {
  gray: "Gray",
  brown: "Brown",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  pink: "Pink",
  red: "Red",
};

/**
 * The palette as a row of swatches, one of them chosen.
 *
 * A radio group rather than a row of buttons: exactly one colour is ever worn,
 * and saying which is the group's job (`aria-checked`), not the tick's. An
 * absent value reads as gray, which is how a label or project made before
 * colours existed is drawn everywhere else.
 */
export function ColourPicker({
  value,
  onChange,
  testId,
  className,
}: TestIdProps & {
  value: Tint | undefined;
  onChange: (colour: Tint) => void;
  className?: string;
}) {
  const chosen = value ?? "gray";

  return (
    <div
      role="radiogroup"
      aria-label="Colour"
      className={cn("grid grid-cols-9 gap-1.5", className)}>
      {Tints.map((tint) => {
        const checked = tint === chosen;

        return (
          <button
            key={tint}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={tintName[tint]}
            title={tintName[tint]}
            {...testProp(
              testId === undefined ? undefined : `${testId}.${tint}`
            )}
            onClick={() => onChange(tint)}
            className={cn(
              "ring-offset-background focus-visible:ring-ring flex size-6 items-center justify-center rounded-md text-white transition-transform duration-150 outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 dark:text-black",
              tintSwatch[tint],
              checked && "ring-foreground ring-2 ring-offset-2"
            )}>
            {checked ? <CheckmarkIcon className="size-3.5" /> : null}
          </button>
        );
      })}
    </div>
  );
}
