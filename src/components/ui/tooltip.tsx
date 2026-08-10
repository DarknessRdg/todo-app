"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import { testProp, type TestIdProps } from "@/lib/test-id";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

type TooltipTriggerProps = React.ComponentProps<
  typeof TooltipPrimitive.Trigger
>;

/**
 * Radix opens a tooltip on focus as well as on hover, and *any* focus counts —
 * including the focus a dialog moves onto its first control as it opens. That
 * is why opening the todo modal came up with "Open full screen" already
 * floating beside a button nobody had pointed at.
 *
 * So focus only opens it when the browser considers that focus visible, which
 * is the same question being asked: `:focus-visible` is set for the keyboard
 * user tabbing to the control — who needs the label — and not for focus moved
 * programmatically after a click, who did not ask for it. Radix composes its
 * own handler with `checkForDefaultPrevented`, so preventing the event here is
 * what stops it opening. Hover is untouched.
 */
function TooltipTrigger({ onFocus, ...props }: TooltipTriggerProps) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      {...props}
      onFocus={(event) => {
        onFocus?.(event);
        if (!isFocusVisible(event.currentTarget)) event.preventDefault();
      }}
    />
  );
}

/** `:focus-visible` where it is understood, and "not visible" where it is not. */
function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return false;
  }
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}>
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

export type TooltipTextProps = TooltipTriggerProps &
  TestIdProps & {
    text: string;
  };

/** `testId` tags the floating label; the trigger is the caller's to tag. */
export function TooltipText({
  text,
  testId,
  children,
  ...props
}: TooltipTextProps) {
  return (
    <Tooltip>
      <TooltipTrigger {...props}>{children}</TooltipTrigger>
      <TooltipContent {...testProp(testId)}>
        {/* The tooltip surface owns the colour (ink with light text), so the
            variant hands it back rather than repainting it. */}
        <Text className="text-inherit">{text}</Text>
      </TooltipContent>
    </Tooltip>
  );
}
