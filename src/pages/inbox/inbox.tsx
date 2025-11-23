import { Typography } from "@/components/ui/typography";
import { TodoList } from "./list";
import { useTodoCount } from "@/pages/inbox/use-todo-count";
import { AddButton } from "@/pages/inbox/add-button";
import { TodoModalContent } from "@/pages/inbox/todo-modal.tsx";
import { useNavigation } from "@/hooks/navigation.ts";

const QueryParamsKeys = {
  TodoId: "todo",
};

export function Inbox() {
  const { count } = useTodoCount();
  const { searchParams, removeQueryParms } = useNavigation();
  const todoId = searchParams.get(QueryParamsKeys.TodoId);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-end justify-center gap-4">
          <Typography variant="h3">Inbox</Typography>
          <Typography variant="code" className="font-normal">
            {count} items
          </Typography>
        </div>
        <div>
          <AddButton />
        </div>
      </div>
      <div className="mt-10">
        <TodoList />
        {todoId && (
          <TodoModalContent
            id={todoId}
            onClose={() => removeQueryParms(QueryParamsKeys.TodoId)}
          />
        )}
      </div>
    </>
  );
}
