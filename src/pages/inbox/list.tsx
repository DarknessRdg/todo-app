import { TodoCheckerInput, TodoContent, TodoTitle } from "@/components/todo";
import { useTodoList } from "./use-todo-list";
import { EmptyList } from "@/pages/inbox/empty-list";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipText } from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
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
import { useTodoDelete } from "@/pages/inbox/use-todo-delete";
import { toast } from "@/components/ui/sonner";
import { useTodoUpdate } from "@/pages/inbox/use-todo-update";

export function TodoList() {
  const { todoList } = useTodoList();
  const { check } = useTodoUpdate();

  const checkClickHandler = (id: string) => {
    return (done: boolean) => check.mutate({ id, done });
  };

  if (!todoList || todoList.length === 0) return <EmptyList />;

  return (
    <div>
      {todoList.map((it) => (
        <TodoContent key={it.id}>
          <div className="flex items-center justify-between">
            <div className="flex gap-2.5">
              <TodoCheckerInput
                done={it.done}
                onToggle={checkClickHandler(it.id)}
              />
              <TodoTitle title={it.title} />
            </div>
            <DeleteButton title={it.title} id={it.id} />
          </div>
        </TodoContent>
      ))}
    </div>
  );
}

function DeleteButton({ title, id }: { title: string; id: string }) {
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
