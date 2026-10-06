import type {
  Icon as LibraryIcon,
  IconWeight,
} from "@phosphor-icons/react/dist/lib/types";
import type { SVGProps } from "react";

import { testProp, type TestIdProps } from "@/lib/test-id";

/**
 * The app's own icon type. Components take and pass around `AppIcon`, never a
 * library's type, so the icon library can be swapped by editing this folder
 * and nothing else.
 */
export type AppIconProps = Omit<SVGProps<SVGSVGElement>, "ref" | "size"> &
  TestIdProps & {
    /** Width and height together; a `size-*` class wins over it. */
    size?: number | string;
  };
export type AppIcon = (props: AppIconProps) => React.ReactElement;

/**
 * One stroke weight for the whole app. Tune it here: every icon reads it, so
 * the set can never drift into two weights side by side.
 */
const weight: IconWeight = "bold";

/**
 * Wraps a library glyph as an app icon.
 *
 * Decorative by default (`aria-hidden`): an icon beside a word repeats the
 * word, and a screen reader saying both is noise. An icon that stands alone
 * belongs inside a control that carries its own `aria-label`.
 *
 * The 24px default is the size the app was drawn at; a `size-*` class
 * overrides it, because CSS wins over the attribute.
 */
export function defineIcon(
  Glyph: LibraryIcon,
  options: { weight?: IconWeight } = {}
): AppIcon {
  function AppIconComponent({ testId, ...props }: AppIconProps) {
    return (
      <Glyph
        size={24}
        weight={options.weight ?? weight}
        aria-hidden
        {...props}
        {...testProp(testId)}
      />
    );
  }

  return AppIconComponent;
}
