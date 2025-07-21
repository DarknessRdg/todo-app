import { TodoContent, TodoTitle } from "@/components/todo";
import { useTodoList } from "./use-todo-list";
import { EmptyList } from "@/pages/inbox/empty-list";

export function TodoList() {
  const { todoList } = useTodoList();

  if (!todoList || todoList.length === 0) return <EmptyList />;

  return (
    <div>
      {todoList.map((it) => (
        <TodoContent>
          <TodoTitle title={it.title} />
        </TodoContent>
      ))}
    </div>
  );
}
