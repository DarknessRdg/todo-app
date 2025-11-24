import { Card, CardContent, CardTitle } from "./ui/card";
import { Checkbox, type CheckboxProps } from "./ui/checkbox";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { TooltipText } from "@/components/ui/tooltip";
import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cva } from "class-variance-authority";

export function TodoTitle({
  title,
  className,
  done,
  ...props
}: React.ComponentProps<"div"> & {
  title: string;
  done: boolean;
  className?: string;
}) {
  return (
    <CardTitle
      className={cn(className, "data-[done=true]:line-through")}
      data-done={done}
      {...props}>
      {title}
    </CardTitle>
  );
}

export function TodoContent({
  children,
  done,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  done: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      {...props}
      data-done={done}
      className={cn(
        "hover:bg-secondary/40 data-[done=true]:bg-secondary text-secondary-foreground py-2 shadow-none",
        className
      )}>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
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
  ...props
}: Omit<CheckboxProps, "checked" | "onCheckedChange" | "onToggle"> & {
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
      />
    </Message>
  );
}
