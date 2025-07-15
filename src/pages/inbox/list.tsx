import { TodoListItem } from "@/components/todo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { ChecklistBroIcon } from "@/pages/inbox/checklist-bro-svg";
import { useTodoList } from "./use-todo-list";

export function TodoList() {
  const { todoList } = useTodoList();

  if (!todoList || todoList.length === 0) return <EmptyList />;

  return (
    <div>
      {todoList.map((it) => (
        <TodoListItem todo={it} />
      ))}
    </div>
  );
}

function EmptyList() {
  return (
    <Card className="flex min-h-[50vh] flex-col items-center justify-center gap-2 shadow-none">
      <ChecklistBroIcon className="size-2/12" />
      <div className="-mt-6 pb-5 text-center">
        <Typography variant="large" className="font-semibold">
          No
          <Typography variant={"code"} className="mx-2 inline-block">
            TodDo
          </Typography>
          added
        </Typography>
        <Typography variant="muted">Please add your first todo item</Typography>
      </div>
      <Button variant="default" size="lg" className="w-2/12">
        Add your ToDo
      </Button>
    </Card>
  );
}
