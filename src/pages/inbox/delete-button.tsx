import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { toast } from "@/components/ui/sonner";
import { TooltipText } from "@/components/ui/tooltip";
import { Text } from "@/components/ui/text";
import { useTodoDelete } from "@/pages/inbox/use-todo-delete";
import { Trash2Icon } from "lucide-react";

export function DeleteButton({ title, id }: { title: string; id: string }) {
  const { deleteTodoAsync, isPending } = useTodoDelete();
  const deleteAction = () => {
    toast.promise(async () => await deleteTodoAsync(id), {
      loading: "Deleting your todo...",
      success: "Todo deleted !!!",
      error: "Something wrong happened. Please try again.",
    });
  };

  const DeleteIcon = () =>
    isPending ? <Spinner variant="circle" /> : <Trash2Icon />;

  return (
    <AlertDialog>
      <TooltipText text="Delete it?" asChild>
        <AlertDialogTrigger asChild>
          <Button
            testId={`home.todo.${id}.delete.button`}
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive">
            <DeleteIcon />
          </Button>
        </AlertDialogTrigger>
      </TooltipText>
      <AlertDialogContent testId={`home.todo.${id}.delete.dialog`}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are sure you want to delete the ToDo?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>
              This action cannot be undone. This will permanently delete your
              ToDo and you won't be able to restore it.
            </Text>
            <Text variant="code" className="mt-4 mr-1 inline-block">
              {title}
            </Text>
            <Text className="inline-block">will be deleted.</Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel testId={`home.todo.${id}.delete.cancel`}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            testId={`home.todo.${id}.delete.confirm`}
            variant="destructive"
            onClick={deleteAction}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
