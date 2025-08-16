import { Card, CardContent, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { TooltipText } from "@/components/ui/tooltip";
import { Sailboat } from "lucide-react";

export function TodoTitle({
  title,
  className,
  done,
}: {
  title: string;
  done: boolean;
  className?: string;
}) {
  return (
    <CardTitle
      className={cn(className, "data-[done=true]:line-through")}
      data-done={done}>
      {title}
    </CardTitle>
  );
}

export function TodoContent({
  children,
  done,
  className,
}: {
  done: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      data-done={done}
      className={cn(
        "hover:bg-secondary/40 data-[done=true]:bg-secondary text-secondary-foreground py-2 shadow-none",
        className
      )}>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

export function TodoCheckerInput({
  done,
  onToggle,
  disabled,
  dialogMessage = undefined,
  className,
}: {
  disabled?: boolean;
  done: boolean;
  dialogMessage?: string;
  onToggle?: (checked: boolean) => void;
  className?: string;
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
        disabled={disabled}
        className={cn(className, "size-5 rounded-full")}
        checked={done}
        onCheckedChange={onToggle}
      />
    </Message>
  );
}
