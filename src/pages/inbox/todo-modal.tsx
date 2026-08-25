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
import { isEditingRichText } from "@/lib/rich-text";
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
      // The dialog has a fixed height, so it can hold the trail still and let
      // the reading column and the properties scroll under it separately —
      // rather than scrolling the whole detail and taking the close button off
      // screen with it.
      frame="panes"
      headerActions={
        <TooltipText
          text="Open full screen"
          testId={`home.todo.${id}.modal.fullscreen.tooltip`}
          asChild>
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
      {(view) => (
        <ModalShell
          id={id}
          title={titleFor(view)}
          onClose={onClose}
          // The tall pane is for the real detail — a message in an 85vh dialog
          // is mostly empty space. Loading takes it too, though: the read is
          // what it is about to become, and opening at the final size means
          // the content fills a frame that is already there rather than the
          // frame resizing under it.
          className={
            view.status === "ready" || view.status === "loading"
              ? "h-[85vh] max-h-[85vh]"
              : undefined
          }>
          {view.content}
        </ModalShell>
      )}
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
    case "loading":
      return "Loading this todo";
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
        // Escape belongs to the innermost thing that can answer it. With the
        // description open for editing that is the editor, which saves and
        // closes itself — taking the key here as well would shut the todo out
        // from under an edit, on the keystroke meant to finish it. Radix reads
        // `defaultPrevented` as "handled elsewhere", and the editor's own
        // listener still runs afterwards, so preventing here costs it nothing.
        onEscapeKeyDown={(event) => {
          if (isEditingRichText(event.target)) event.preventDefault();
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        overlayProps={{ onClick: onClose }}
        // 70% of the viewport, uncapped: the previous `min(1100px, …)` meant
        // anything wider than ~1220px got 1100px rather than a share of the
        // screen. `sm:` is repeated because the dialog primitive sets its own
        // `sm:max-w-lg`, which would otherwise win from that breakpoint up.
        className={cn(
          "flex w-[70vw] max-w-[70vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[70vw]",
          className
        )}>
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Details for this todo: description, properties and subtasks.
          </DialogDescription>
        </DialogHeader>

        {/*
          Not a scroller any more: the panes inside are. It still owns the
          padding, so every state — the detail, the skeleton, a failed read —
          sits the same distance from the dialog's edges.
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-7 lg:overflow-hidden">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
