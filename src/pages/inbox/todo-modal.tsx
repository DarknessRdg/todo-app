import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useTodoDetails } from "@/pages/inbox/use-todo-details.ts";
import { Navigate, useNavigate } from "react-router";
import { TodoDetail } from "@/pages/inbox/detail-body.tsx";
import { Button } from "@/components/ui/button";
import { TooltipText } from "@/components/ui/tooltip";
import { Maximize2 } from "lucide-react";

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
  const navigate = useNavigate();

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

  const openFullScreen = () => navigate(`/todo/${todo.id}`);

  return (
    <Dialog open={true} onOpenChange={onCloseNavigateBack}>
      <DialogContent
        testId={`home.todo.${todo.id}.modal`}
        // Radix dismisses on pointerdown, which unmounts the backdrop before the
        // click is dispatched — the click then hit-tests onto the row underneath
        // and re-navigates to ?todo=<id>, so the modal blinks back open. Keep the
        // backdrop up for the whole gesture and close on its click instead.
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        overlayProps={{ onClick: onClose }}
        className="flex h-[85vh] max-h-[85vh] w-[90vw] max-w-[min(1100px,90vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,90vw)]">
        <DialogHeader className="sr-only">
          <DialogTitle>{todo.title}</DialogTitle>
          <DialogDescription>
            Details for this todo: description, properties and subtasks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-7">
          <TodoDetail
            todo={todo}
            headerActions={
              <TooltipText text="Open full screen" asChild>
                <Button
                  testId={`home.todo.${todo.id}.modal.fullscreen.button`}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground mr-8 size-8"
                  onClick={openFullScreen}
                  aria-label="Open full screen">
                  <Maximize2 className="size-4" />
                </Button>
              </TooltipText>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
