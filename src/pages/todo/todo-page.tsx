import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useTodoDetails } from "@/pages/inbox/use-todo-details.ts";
import { TodoDetail } from "@/pages/inbox/detail-body.tsx";
import { NotFound } from "@/pages/not-found/not-found";
import { TodoLookupFailed } from "@/components/todo-lookup-failed";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function TodoPage() {
  // `:id` never matches an empty segment, so by the time this renders the id
  // is always there — `/todo` and `/todo/` fall through to the catch-all route.
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { todo, isLoading, error, retry } = useTodoDetails({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
        <Spinner /> Loading…
      </div>
    );
  }

  // Order matters: a read that *failed* is not the same as a todo that is not
  // there, and answering "no such todo" to a broken database sends the reader
  // hunting for a mistake they did not make.
  if (error) {
    return (
      <div className="py-16">
        <TodoLookupFailed testId="todo.page.error" onRetry={() => void retry()} />
      </div>
    );
  }

  // Rendered in place rather than redirected to: the url is the only record of
  // which todo was asked for, and bouncing to the inbox throws it away along
  // with any explanation.
  if (!todo) {
    return <NotFound />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Button
        testId="todo.page.back.button"
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="text-muted-foreground hover:text-foreground mb-6 -ml-2 gap-1.5">
        <ArrowLeft className="size-4" />
        <span className="text-xs font-medium">Back to inbox</span>
      </Button>

      <TodoDetail todo={todo} />
    </div>
  );
}

