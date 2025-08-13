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
import { toast } from "@/components/ui/sonner";
import { TooltipText } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { useTodoDelete } from "@/pages/inbox/use-todo-delete";
import { Trash2Icon } from "lucide-react";

export function DeleteButton({ title, id }: { title: string; id: string }) {
  const { deleteTodoAsync } = useTodoDelete();
  const deleteAction = () => {
    toast.promise(async () => await deleteTodoAsync(id), {
      loading: "Deleting your todo...",
      success: "Todo deleted !!!",
      error: "Something wrong happened. Please try again.",
    });
  };

  return (
    <AlertDialog>
      <TooltipText text="Delete it?">
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive">
            <Trash2Icon />
          </Button>
        </AlertDialogTrigger>
      </TooltipText>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are sure you want to delete the ToDo?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Typography variant="p">
              This action cannot be undone. This will permanently delete your
              ToDo and you won't be able to restore it.
            </Typography>
            <Typography variant="code" className="mt-4 mr-1 inline-block">
              {title}
            </Typography>
            <Typography variant="p" className="inline-block">
              will be deleted.
            </Typography>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={deleteAction}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
