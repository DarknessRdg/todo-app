import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import React, { type ReactNode } from "react";

const typographyVariants = cva("block antialiased", {
  variants: {
    variant: {
      h1: "text-4xl font-medium tracking-tight leading-tight lg:text-5xl",
      h2: "text-3xl font-medium tracking-tight",
      h3: "text-2xl font-medium tracking-tight",
      h4: "text-xl font-semibold tracking-tight",
      h5: "text-lg font-semibold",
      h6: "text-base font-semibold",
      p: "font-normal",
      blockquote: "my-6 border-l-2 rounded-none pl-6 italic",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
    },
  },
});
("");

export interface TypographyProps
  extends Omit<VariantProps<typeof typographyVariants>, "variant">,
    Required<Pick<VariantProps<typeof typographyVariants>, "variant">> {
  className?: string;
  children?: ReactNode;
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ variant = null, className, ...props }, ref) => {
    if (variant === null) {
      throw new Error("<Typography /> Variant cannot be null");
    }

    function getHtmlElement() {
      if (variant == null) return "";
      const customHtmlElement = {
        large: "p",
        muted: "p",
        small: "p",
        lead: "p",
      };

      if (Object.keys(customHtmlElement).includes(variant)) {
        return customHtmlElement[variant as keyof typeof customHtmlElement];
      }
      return variant!;
    }

    return React.createElement(getHtmlElement(), {
      className: cn(typographyVariants({ variant }), className),
      ref,
      ...props,
    });
  }
);
