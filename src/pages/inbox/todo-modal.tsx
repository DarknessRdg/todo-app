import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useTodoDetails } from "@/pages/inbox/use-todo-details.ts";

type TodoModalContentProps = {
  id: string;
  onClose: () => void;
};

const voidClose = () => {};

export function TodoModalContent({
  id,
  onClose = voidClose,
}: TodoModalContentProps) {
  const { todo } = useTodoDetails({ id });

  const onCloseNavigateBack = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog defaultOpen={true} onOpenChange={onCloseNavigateBack}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{todo?.title}</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
