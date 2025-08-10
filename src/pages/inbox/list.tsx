import { TodoContent, TodoTitle } from "@/components/todo";
import { useTodoList } from "./use-todo-list";
import { EmptyList } from "@/pages/inbox/empty-list";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipText,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

export function TodoList() {
  const { todoList } = useTodoList();

  if (!todoList || todoList.length === 0) return <EmptyList />;

  return (
    <div>
      {todoList.map((it) => (
        <TodoContent>
          <div className="flex items-center justify-between">
            <TodoTitle title={it.title} />
            <DeleteButton title={it.title} id={it.id} />
          </div>
        </TodoContent>
      ))}
    </div>
  );
}

function DeleteButton({ title, id }: { title: string; id: string }) {
  const { deleteTodo } = useTodoDelete();
  const deleteAction = () => deleteTodo(id);

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
