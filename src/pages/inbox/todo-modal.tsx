import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useTodoDetails } from "@/pages/inbox/use-todo-details.ts";
import { useNavigate } from "react-router";
import { TodoDetail } from "@/pages/inbox/detail-body.tsx";
import { TodoLookupFailed } from "@/components/todo-lookup-failed";
import { Button } from "@/components/ui/button";
import { TooltipText } from "@/components/ui/tooltip";
import { testProp } from "@/lib/test-id";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";
import type { PropsWithChildren } from "react";

type TodoModalContentProps = {
  id: string;
  onClose: () => void;
};

const voidClose = () => {};

export function TodoModalContent({
  id,
  onClose = voidClose,
}: TodoModalContentProps) {
  const { todo, isLoading, error, retry } = useTodoDetails({ id });
  const navigate = useNavigate();

  if (isLoading) {
    return <></>;
  }

  // Order matters: a read that *failed* is not the same as a todo that is not
  // there. Collapsing the two tells the reader their todo is gone when the
  // database is merely unreadable.
  if (error) {
    return (
      <ModalShell id={id} title="This todo could not be read" onClose={onClose}>
        <TodoLookupFailed
          testId={`home.todo.${id}.modal.error`}
          onRetry={() => void retry()}
        />
      </ModalShell>
    );
  }

  // Said out loud rather than silently closing. The modal is reached by url, so
  // a shared or bookmarked `?todo=` that no longer resolves would otherwise
  // dump the reader on someone else's inbox with no explanation.
  if (!todo) {
    return (
      <ModalShell id={id} title="This todo is no longer here" onClose={onClose}>
        <div
          className="flex flex-col items-start gap-3"
          {...testProp(`home.todo.${id}.modal.missing`)}>
          <p className="eyebrow">Not found</p>
          <h2 className="text-2xl font-medium tracking-tight">
            This todo is no longer here
          </h2>
          <p className="text-muted-foreground text-sm">
            It may have been deleted, or it was never on this device — todos are
            stored locally, so a link from elsewhere will not find one.
          </p>

          <Button
            testId={`home.todo.${id}.modal.missing.close.button`}
            onClick={onClose}
            className="mt-3 rounded-full">
            Back to the inbox
          </Button>
        </div>
      </ModalShell>
    );
  }

  const openFullScreen = () => navigate(`/todo/${todo.id}`);

  return (
    <ModalShell
      id={id}
      title={todo.title}
      onClose={onClose}
      // Only the real detail needs the tall pane; a message in an 85vh dialog
      // is mostly empty space.
      className="h-[85vh] max-h-[85vh]">
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
    </ModalShell>
  );
}

type ModalShellProps = PropsWithChildren<{
  id: string;
  /** Announced to screen readers; the visible heading lives in `children`. */
  title: string;
  onClose: () => void;
  className?: string;
}>;

/**
 * The dialog every state of this modal shares, so the dismissal behaviour below
 * is defined once rather than per state.
 */
function ModalShell({
  id,
  title,
  onClose,
  className,
  children,
}: ModalShellProps) {
  return (
    <Dialog
      open={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}>
      <DialogContent
        testId={`home.todo.${id}.modal`}
        // Radix dismisses on pointerdown, which unmounts the backdrop before the
        // click is dispatched — the click then hit-tests onto the row underneath
        // and re-navigates to ?todo=<id>, so the modal blinks back open. Keep the
        // backdrop up for the whole gesture and close on its click instead.
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        overlayProps={{ onClick: onClose }}
        className={cn(
          "flex w-[90vw] max-w-[min(1100px,90vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,90vw)]",
          className
        )}>
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Details for this todo: description, properties and subtasks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-7">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
