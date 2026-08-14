import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { TodoDetail } from "@/pages/inbox/todo-detail.tsx";
import { Button } from "@/components/ui/button";

/**
 * The dedicated page container. Everything below the back button — the content
 * and the loading / failed / not-here states alike — comes from `TodoDetail`,
 * the same component the inbox modal renders. This file owns the frame and
 * nothing else.
 */
export function TodoPage() {
  // `:id` never matches an empty segment, so by the time this renders the id
  // is always there — `/todo` and `/todo/` fall through to the catch-all route.
  const { id = "" } = useParams();
  const navigate = useNavigate();

  return (
    <TodoDetail id={id}>
      {(view) => (
        // Full width: the detail's own two-column grid already holds the
        // reading measure, so capping the page as well only squeezed the
        // properties column against the description.
        <div className="w-full">
          <Button
            testId="todo.page.back.button"
            variant="ghost"
            size="sm"
            onClick={() => void navigate("/")}
            className="text-muted-foreground hover:text-foreground mb-6 -ml-2 gap-1.5">
            <ArrowLeft className="size-4" />
            <span className="text-xs font-medium">Back to inbox</span>
          </Button>

          {view.content}
        </div>
      )}
    </TodoDetail>
  );
}
