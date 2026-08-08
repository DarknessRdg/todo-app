import { TodoCheckerInput, TodoTitle } from "@/components/todo";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { Timing } from "@/lib/timing";
import { useTodoList } from "./use-todo-list";
import { EmptyList } from "@/pages/inbox/empty-list";
import { useTodoUpdate } from "@/pages/inbox/use-todo-update";
import { DeleteButton } from "@/pages/inbox/delete-button";
import type { TodoEntity } from "@/backend/todo-service";
import { Progress } from "@/components/ui/progress.tsx";
import { Spinner } from "@/components/ui/spinner";
import {
  DueBadge,
  LabelChips,
  PriorityBadge,
  ProjectBadge,
  SubtaskIndicator,
  metaFor,
} from "@/pages/inbox/todo-meta.tsx";
import { useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { ConfettiBurst } from "@/components/confetti-burst";

export function TodoList() {
  const { todoList, doneList, count, isLoading } = useTodoList();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
        <Spinner /> Loading…
      </div>
    );
  }

  if (count === 0) return <EmptyList />;

  const doneCount = doneList?.length ?? 0;
  const percentage = count > 0 ? (doneCount / count) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      <Section
        testId="home.todo.section.open"
        countTestId="home.todo.section.open.count"
        label="To do"
        count={todoList?.length ?? 0}>
        <TodoListContainer todoList={todoList} />
      </Section>

      {doneCount > 0 && (
        <Section
          testId="home.todo.section.done"
          countTestId="home.todo.section.done.count"
          label="Done"
          count={doneCount}
          trailing={
            <Progress
              value={percentage}
              className="h-1.5 w-24"
              aria-label={`${doneCount} of ${count} complete`}
            />
          }>
          <TodoListContainer todoList={doneList} />
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  count,
  trailing,
  children,
  testId,
  countTestId,
}: TestIdProps & {
  label: string;
  count: number;
  countTestId?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section {...testProp(testId)}>
      <div className="mb-3 flex items-center gap-2.5">
        <h2 className="text-base font-semibold tracking-tight">{label}</h2>
        <span {...testProp(countTestId)} className="count-chip">
          {count}
        </span>
        {trailing ? <div className="ml-auto">{trailing}</div> : null}
      </div>
      {children}
    </section>
  );
}

function TodoListContainer({ todoList }: { todoList?: TodoEntity[] }) {
  if (!todoList?.length) {
    return (
      <p className="text-muted-foreground/70 px-1 py-3 text-sm">
        Nothing here yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {todoList.map((it) => (
        <TodoItem todo={it} key={it.id} />
      ))}
    </div>
  );
}

function TodoItem({ todo }: { todo: TodoEntity }) {
  const { check } = useTodoUpdate();
  const navigate = useNavigate();

  const meta = metaFor(todo.id);
  const subtasks = todo.subtasks;
  const subDone = subtasks.filter((s) => s.done).length;

  // Optimistic done state: flip the checkbox instantly (so the completion
  // animation plays in place), then let the row re-sort to the Done section
  // once the animation has had a beat to be seen.
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const done = optimisticDone ?? todo.done;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // One-shot confetti on completion.
  const [burstKey, setBurstKey] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (optimisticDone !== null && todo.done === optimisticDone) {
      setOptimisticDone(null);
    }
  }, [todo.done, optimisticDone]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onToggle = (next: boolean) => {
    setOptimisticDone(next);
    window.clearTimeout(timer.current);
    if (next) {
      setBurstKey((k) => k + 1);
      setShowBurst(true);
      window.setTimeout(() => setShowBurst(false), Timing.confettiVisibleMs);
    }
    // Marking done: hold the row in place briefly so the pop + confetti are seen
    // before it relocates. Reopening: apply immediately.
    const delay = next ? Timing.completionResortMs : 0;
    timer.current = setTimeout(() => {
      check.mutate({ id: todo.id, done: next });
    }, delay);
  };

  const openTodoDetails = (id: string) => {
    navigate(`?todo=${id}`);
  };

  return (
    <div
      data-done={done}
      className="group bg-card hover:bg-card-hover flex items-start gap-3 rounded-2xl px-4 py-3.5 transition-colors">
      <div className="relative mt-0.5">
        <div className="data-[done=true]:opacity-60" data-done={done}>
          <TodoCheckerInput
            testId={`home.todo.${todo.id}.check.button`}
            dialogMessage={done ? "Reopen" : "Complete"}
            done={done}
            onToggle={onToggle}
          />
        </div>
        {showBurst && <ConfettiBurst key={burstKey} />}
      </div>

      <div className="min-w-0 grow data-[done=true]:opacity-60" data-done={done}>
        <div className="flex items-start gap-2">
          <TodoTitle
            testId={`home.todo.${todo.id}.title`}
            title={todo.title}
            done={done}
            className="grow cursor-pointer py-0.5 text-[0.95rem] leading-snug"
            onClick={() => openTodoDetails(todo.id)}
          />
          <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <DeleteButton title={todo.title} id={todo.id} />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <PriorityBadge priority={meta.priority} />
          <ProjectBadge project={meta.project} />
          <LabelChips labels={meta.labels} max={2} />
          {todo.dueDate ? <DueBadge date={todo.dueDate} /> : null}
          {subtasks.length > 0 ? (
            <SubtaskIndicator
              testId={`home.todo.${todo.id}.subtask.count`}
              done={subDone}
              total={subtasks.length}
              className="ml-0.5"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
