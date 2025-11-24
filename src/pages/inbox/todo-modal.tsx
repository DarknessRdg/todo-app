import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useTodoDetails } from "@/pages/inbox/use-todo-details.ts";
import { TodoChecker } from "@/components/todo.tsx";
import { Navigate } from "react-router";
import { Badge } from "@/components/ui/badge.tsx";
import { Typography } from "@/components/ui/typography.tsx";
import type { TodoEntity } from "@/backend/todo-service.ts";
import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea.tsx";

type TodoModalContentProps = {
  id: string;
  onClose: () => void;
};

const voidClose = () => {};

export function TodoModalContent({
  id,
  onClose = voidClose,
}: TodoModalContentProps) {
  const { todo, isLoading } = useTodoDetails({ id });

  if (isLoading) {
    return <></>;
  }

  if (!todo) {
    return <Navigate to="/" />;
  }

  const onCloseNavigateBack = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog defaultOpen={true} onOpenChange={onCloseNavigateBack}>
      <DialogContent className="w-fit min-w-3/12 sm:max-w-10/12">
        <DialogHeader className="gap-4">
          <DialogTitle className="flex gap-2">
            <TodoChecker done={todo.done} />
            {todo.title}
          </DialogTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {todo.dueDate?.toLocaleDateString()}
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            <Typography variant="small">Description</Typography>
            <DescriptionToggler todo={todo} />
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function DescriptionToggler({ todo }: { todo: TodoEntity }) {
  const [isEditing, setEditing] = useState<boolean>(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  if (isEditing) {
    return (
      <Textarea
        ref={ref}
        defaultValue={todo.description}
        onBlur={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className="min-h-9 rounded-lg border p-2 hover:cursor-text md:text-sm"
      onClick={() => setEditing(true)}>
      {ref?.current?.value || todo.description}
    </div>
  );
}
