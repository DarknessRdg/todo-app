import { Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useTodoDetails } from "@/pages/inbox/use-todo-details.ts";
import { TodoDetail } from "@/pages/inbox/detail-body.tsx";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function TodoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { todo, isLoading } = useTodoDetails({ id: id ?? "" });

  if (!id) {
    return <Navigate to="/" />;
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
        <Spinner /> Loading…
      </div>
    );
  }

  if (!todo) {
    return <Navigate to="/" />;
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
