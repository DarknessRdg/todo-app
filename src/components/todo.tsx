import { Checkbox, type CheckboxProps } from "./ui/checkbox";

import { cn } from "@/lib/utils";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { TooltipText } from "@/components/ui/tooltip";
import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cva } from "class-variance-authority";

export function TodoTitle({
  title,
  className,
  done,
  testId,
  ...props
}: React.ComponentProps<"div"> &
  TestIdProps & {
    title: string;
    done: boolean;
    className?: string;
  }) {
  return (
    <div
      className={cn(
        "text-foreground font-medium transition-colors",
        "data-[done=true]:text-muted-foreground data-[done=true]:font-normal data-[done=true]:line-through",
        className
      )}
      data-done={done}
      {...props}
      {...testProp(testId)}>
      {title}
    </div>
  );
}

const todoCheckerVariants = cva(
  "flex size-5 items-center justify-center rounded-full border",
  {
    variants: {
      done: {
        true: "bg-primary text-primary-foreground",
        false: "",
      },
    },
  }
);

export function TodoChecker({ done }: { done: boolean }) {
  return (
    <div className={todoCheckerVariants({ done })}>
      {done && <CheckIcon className="size-3.5" />}
    </div>
  );
}

export function TodoCheckerInput({
  done,
  onToggle,
  disabled,
  dialogMessage = undefined,
  className,
  testId,
  ...props
}: Omit<CheckboxProps, "checked" | "onCheckedChange" | "onToggle"> &
  TestIdProps & {
    done: boolean;
    dialogMessage?: string;
    onToggle?: (checked: boolean) => void;
  }) {
  const Message = ({ children }: React.PropsWithChildren) => {
    if (!dialogMessage) return children;

    return (
      <TooltipText text={dialogMessage} asChild>
        <div className="flex">{children}</div>
      </TooltipText>
    );
  };

  return (
    <Message>
      <Checkbox
        {...props}
        disabled={disabled}
        className={cn(className, "size-5 rounded-full")}
        checked={done}
        onCheckedChange={onToggle}
        testId={testId}
      />
    </Message>
  );
}
