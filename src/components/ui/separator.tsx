"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";
import { testProp, type TestIdProps } from "@/lib/test-id";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  testId,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & TestIdProps) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
      {...testProp(testId)}
    />
  );
}

export { Separator };
