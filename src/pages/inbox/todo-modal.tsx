import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useNavigate } from "react-router";
import { TodoDetail, type TodoDetailView } from "@/pages/inbox/todo-detail.tsx";
import { Button } from "@/components/ui/button";
import { TooltipText } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";
import type { PropsWithChildren } from "react";

type TodoModalContentProps = {
  id: string;
  onClose: () => void;
};

const voidClose = () => {};

/**
 * The modal container. Like `TodoPage`, it renders `TodoDetail` and supplies
 * only the frame — so the detail itself, and every state around it, is the same
 * in both places by construction rather than by remembering to copy a fix over.
 */
export function TodoModalContent({
  id,
  onClose = voidClose,
}: TodoModalContentProps) {
  const navigate = useNavigate();

  return (
    <TodoDetail
      id={id}
      onLeave={onClose}
      headerActions={
        <TooltipText text="Open full screen" asChild>
          <Button
            testId={`home.todo.${id}.modal.fullscreen.button`}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground mr-8 size-8"
            onClick={() => void navigate(`/todo/${id}`)}
            aria-label="Open full screen">
            <Maximize2 className="size-4" />
          </Button>
        </TooltipText>
      }>
      {(view) => {
        // Nothing at all while the read is in flight: a dialog that pops open
        // empty and resizes a beat later is worse than one that arrives whole.
        if (view.status === "loading") return <></>;

        return (
          <ModalShell
            id={id}
            title={titleFor(view)}
            onClose={onClose}
            // Only the real detail needs the tall pane; a message in an 85vh
            // dialog is mostly empty space.
            className={
              view.status === "ready" ? "h-[85vh] max-h-[85vh]" : undefined
            }>
            {view.content}
          </ModalShell>
        );
      }}
    </TodoDetail>
  );
}

/** The dialog's accessible name, which differs per state. */
function titleFor(view: TodoDetailView) {
  switch (view.status) {
    case "error":
      return "This todo could not be read";
    case "missing":
      return "This todo is no longer here";
    default:
      return view.status === "ready" ? view.todo.title : "";
  }
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
