import { TodoCheckerInput, TodoContent, TodoTitle } from "@/components/todo";
import { useTodoList } from "./use-todo-list";
import { EmptyList } from "@/pages/inbox/empty-list";
import { useTodoUpdate } from "@/pages/inbox/use-todo-update";
import { DeleteButton } from "@/pages/inbox/delete-button";
import type { TodoEntity } from "@/backend/todo-service";
import { Typography } from "@/components/ui/typography";
import { NewInput } from "@/pages/inbox/new-input";
import { Progress } from "@/components/ui/progress.tsx";
import { useNavigate } from "react-router";

export function TodoList() {
  const { todoList, doneList, count } = useTodoList();

  if (count === 0) return <EmptyList />;

  const doneCount = doneList?.length || 0;
  const percentage = (doneCount / count) * 100;

  return (
    <div>
      <div className="mb-10">
        <Typography variant="h5" className="text-accent-foreground">
          Done{" "}
          <span className="ml-1">
            {doneCount} / {count}
          </span>
        </Typography>
        <Progress value={percentage} className="w-12/12" />
      </div>
      <div className="mb-5">
        <NewInput />
      </div>
      <Typography variant="h6" className="mb-3">
        To do
      </Typography>
      <TodoListContainer todoList={todoList} />
      <div className="mt-10">
        <Typography variant="h6" className="mb-3">
          Complete
        </Typography>
        <TodoListContainer todoList={doneList} />
      </div>
    </div>
  );
}

function TodoListContainer({ todoList }: { todoList?: TodoEntity[] }) {
  return (
    <div className="flex flex-col flex-nowrap gap-2">
      {todoList?.map((it) => (
        <TodoItem todo={it} key={it.id} />
      ))}
    </div>
  );
}

function TodoItem({ todo }: { todo: TodoEntity }) {
  const { check } = useTodoUpdate();
  const navigate = useNavigate();

  const checkClickHandler = (id: string) => {
    return (done: boolean) => check.mutate({ id, done });
  };

  const openTodoDetails = (id: string) => {
    navigate(`?todo=${id}`);
  };

  return (
    <TodoContent done={todo.done} className="py-0">
      <div className="flex items-center justify-between">
        <div className="flex grow items-center gap-2.5">
          <TodoCheckerInput
            dialogMessage={todo.done ? "Undo?" : "Done?"}
            done={todo.done}
            onToggle={checkClickHandler(todo.id)}
          />
          <TodoTitle
            title={todo.title}
            done={todo.done}
            className="grow py-4 hover:cursor-pointer"
            onClick={() => openTodoDetails(todo.id)}
          />
        </div>
        <DeleteButton title={todo.title} id={todo.id} />
      </div>
    </TodoContent>
  );
}
