import { TodoCheckerInput, TodoContent, TodoTitle } from "@/components/todo";
import { useTodoList } from "./use-todo-list";
import { EmptyList } from "@/pages/inbox/empty-list";
import { useTodoUpdate } from "@/pages/inbox/use-todo-update";
import { DeleteButton } from "@/pages/inbox/delete-button";

export function TodoList() {
  const { todoList } = useTodoList();
  const { check } = useTodoUpdate();

  const checkClickHandler = (id: string) => {
    return (done: boolean) => check.mutate({ id, done });
  };

  if (!todoList || todoList.length === 0) return <EmptyList />;

  return (
    <div className="flex flex-col gap-2">
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
