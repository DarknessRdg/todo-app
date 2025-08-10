import { type Todo } from "@/types";
import { Card, CardContent, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TodoListItemProps = {
  todo: Todo;
  onClick?: () => void;
};

export function TodoListItem({ todo, onClick }: TodoListItemProps) {
  return (
    <Card className="mt-2 shadow-none first:mt-0" onClick={onClick}>
      <CardContent className="px-4">
        <div className="flex gap-3">
          <Checkbox defaultChecked={todo.done} />
          <TodoTitle title={todo.name} />
        </div>
      </CardContent>
    </Card>
  );
}

export function TodoTitle({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return <CardTitle className={className}>{title}</CardTitle>;
}

export function TodoContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}
