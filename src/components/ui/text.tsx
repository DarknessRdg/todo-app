import { cva, type VariantProps } from "class-variance-authority";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { testProp, type TestIdProps } from "@/lib/test-id";
import { cn } from "@/lib/utils";

/**
 * Every text style the app uses, in one place.
 *
 * `variant` picks the styling, `as` picks the tag — they are separate on
 * purpose, so a heading that must be an `h1` for the document outline can still
 * be sized like a section heading:
 *
 * ```tsx
 * <Text variant="h2" as="h1">Page title</Text>
 * ```
 *
 * Anything a single place needs on top of a variant goes through `className`
 * (`<Text variant="h1" className="text-muted-foreground">`) rather than
 * becoming a variant of its own.
 *
 * Note `p` sets weight but not size: it is body copy in whatever context it
 * lands in, and the containers that own a size (a tooltip, a dialog
 * description) would otherwise be overridden by it. Variants that *are* a size
 * — `muted`, `small`, `lead`, `large` — say so explicitly.
 */
export const textVariants = cva("antialiased", {
  variants: {
    variant: {
      h1: "text-2xl font-semibold tracking-tight",
      h2: "text-2xl font-medium tracking-tight",
      h3: "text-xl font-semibold tracking-tight",
      h4: "text-lg font-semibold tracking-tight",
      h5: "text-base font-semibold tracking-tight",
      h6: "text-sm font-semibold tracking-tight",
      p: "font-normal",
      lead: "text-muted-foreground text-xl",
      large: "text-lg font-semibold",
      small: "text-sm leading-none font-medium",
      muted: "text-muted-foreground text-sm",
      /** The small caps-ish label above a section. Mirrors `.eyebrow`. */
      eyebrow: "text-muted-foreground text-xs font-medium",
      code: "bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      blockquote: "my-6 rounded-none border-l-2 pl-6 italic",
      link: "text-link underline underline-offset-2 transition-colors hover:decoration-2",
    },
  },
  defaultVariants: {
    variant: "p",
  },
});

export type TextVariant = NonNullable<
  VariantProps<typeof textVariants>["variant"]
>;

/** The tag each variant renders as when `as` is not given. */
const defaultElement: Record<TextVariant, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  p: "p",
  lead: "p",
  large: "p",
  small: "p",
  muted: "p",
  eyebrow: "p",
  code: "code",
  blockquote: "blockquote",
  link: "a",
};

export type TextProps = TestIdProps &
  HTMLAttributes<HTMLElement> & {
    /** Which style to apply. Defaults to `p`. */
    variant?: TextVariant;
    /** Which tag to render. Defaults to whatever suits the variant. */
    as?: ElementType;
    children?: ReactNode;
    /** For `variant="link"`, or any `as="a"`. */
    href?: string;
    target?: string;
    rel?: string;
  };

export function Text({
  variant = "p",
  as,
  className,
  testId,
  children,
  ...props
}: TextProps) {
  const Comp = as ?? defaultElement[variant];

  return (
    <Comp
      {...props}
      {...testProp(testId)}
      className={cn(textVariants({ variant }), className)}>
      {children}
    </Comp>
  );
}
