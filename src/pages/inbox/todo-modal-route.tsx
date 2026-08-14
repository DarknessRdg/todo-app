import { useNavigation } from "@/hooks/navigation.ts";
import { TodoModalContent } from "@/pages/inbox/todo-modal.tsx";

/** The search param that opens a todo's detail over whatever page you are on. */
export const TodoQueryParam = "todo";

/**
 * The detail modal, driven entirely by `?todo=<id>`.
 *
 * Every page that lists todos renders this. The rows navigate by search param
 * rather than by route, so a page that lists them without this changes the url
 * and then shows nothing — which is exactly what the project page did.
 */
export function TodoModalRoute() {
  const { searchParams, removeQueryParms } = useNavigation();
  const todoId = searchParams.get(TodoQueryParam);

  if (todoId === null) return null;

  return (
    <TodoModalContent
      id={todoId}
      onClose={() => removeQueryParms(TodoQueryParam)}
    />
  );
}
