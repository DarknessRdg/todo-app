import { TodoCheckerInput, TodoTitle } from "@/components/todo";
import { Text } from "@/components/ui/text";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { Timing } from "@/lib/timing";
import { useTodoList } from "./use-todo-list";
import { EmptyList } from "@/pages/inbox/empty-list";
import { useTodoUpdate } from "@/pages/inbox/use-todo-update";
import { DeleteButton } from "@/pages/inbox/delete-button";
import type { TodoEntity } from "@/backend/todo-service";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DueBadge,
  LabelChips,
  PriorityBadge,
  SubtaskIndicator,
  metaFor,
} from "@/pages/inbox/todo-meta.tsx";
import { useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { flagKey } from "@/lib/persisted-flag";
import { useStickyToggle } from "@/hooks/use-sticky-toggle";
import { ConfettiBurst } from "@/components/confetti-burst";
import { TodoProjectBadge } from "@/pages/inbox/todo-project-badge";
import { useLabels } from "@/pages/inbox/use-labels";
import type { TodoFilter } from "@/lib/todo-filter";
import { useSetting } from "@/hooks/use-setting";

export function TodoList({
  projectId,
  dueOn,
  filter,
  scope: scopeOverride,
  empty,
}: {
  projectId?: string;
  /** Narrows the list to one calendar day — see `useTodoList`. */
  dueOn?: Date;
  /** The reader's own narrowing — see `@/lib/todo-filter`. */
  filter?: TodoFilter;
  /** Where this list's collapsed sections are remembered. */
  scope?: string;
  /** What stands in for an empty list, when "Inbox zero" is the wrong words. */
  empty?: React.ReactNode;
} = {}) {
  const { todoList, doneList, count, isLoading } = useTodoList({
    projectId,
    dueOn,
    filter,
  });

  // Each page keeps its own: collapsing Done in the inbox says nothing about
  // whether it should be collapsed in a project.
  const scope = scopeOverride ?? projectId ?? "inbox";

  const [hideDone] = useSetting("hideDone");
  const openCount = todoList?.length ?? 0;

  if (isLoading) return <TodoListSkeleton />;

  // With the done section hidden, finished todos are not "some of the list" —
  // they are none of it, and a page holding only those has nothing to show.
  // Counting them towards `count` here would leave an empty "To do" heading
  // standing in for the empty state.
  if (hideDone ? openCount === 0 : count === 0) return empty ?? <EmptyList />;

  const doneCount = doneList?.length ?? 0;
  const percentage = count > 0 ? (doneCount / count) * 100 : 0;

  return (
    <div className="flex flex-col gap-8">
      <Section
        testId="home.todo.section.open"
        countTestId="home.todo.section.open.count"
        storageKey={flagKey("section", scope, "open")}
        label="To do"
        count={openCount}>
        <TodoListContainer todoList={todoList} />
      </Section>

      {/* The setting takes the section away rather than collapsing it: a
          heading that is only ever shut is clutter in the shape of one. */}
      {!hideDone && doneCount > 0 && (
        <Section
          testId="home.todo.section.done"
          countTestId="home.todo.section.done.count"
          storageKey={flagKey("section", scope, "done")}
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

/** Row-shaped stand-ins, so the list does not jump when the todos land. */
function TodoListSkeleton() {
  return (
    <div
      {...testProp("home.todo.list.loading")}
      aria-busy
      aria-label="Loading todos"
      className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center gap-2.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>

        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="bg-card flex items-start gap-3 rounded-2xl px-4 py-3.5">
              <Skeleton className="mt-0.5 size-5 shrink-0 rounded-full" />
              <div className="flex min-w-0 grow flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
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
  storageKey,
}: TestIdProps & {
  label: string;
  count: number;
  countTestId?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  /** Where this section's collapsed state is remembered. */
  storageKey: string;
}) {
  const [open, setOpen] = useStickyToggle(storageKey, true);

  return (
    <section {...testProp(testId)}>
      <div className="mb-3 flex items-center gap-2.5">
        {/*
          The heading itself is the control, so the whole label is a target
          rather than a chevron the size of a full stop. The count stays
          outside it: collapsed, it is the only thing still saying how much is
          in there.
        */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          {...testProp(testId === undefined ? undefined : `${testId}.toggle`)}
          className="group -ml-1 flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors">
          <ChevronRight
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
              open && "rotate-90"
            )}
          />
          <Text variant="h5">{label}</Text>
        </button>

        <span {...testProp(countTestId)} className="count-chip">
          {count}
        </span>
        {trailing ? <div className="ml-auto">{trailing}</div> : null}
      </div>

      {open ? children : null}
    </section>
  );
}

function TodoListContainer({ todoList }: { todoList?: TodoEntity[] }) {
  if (!todoList?.length) {
    return (
      <Text variant="muted" className="text-muted-foreground/70 px-1 py-3">
        Nothing here yet.
      </Text>
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
  const { labels } = useLabels();

  const meta = metaFor(todo.id);
  // Resolved by id, so a renamed label reads its new name here without the row
  // being rewritten, and a deleted one simply stops appearing.
  const todoLabels = todo.labelIds
    .map((id) => labels.find((label) => label.id === id)?.name)
    .filter((name): name is string => name !== undefined);
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

      <div
        className="min-w-0 grow data-[done=true]:opacity-60"
        data-done={done}>
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
          <TodoProjectBadge projectId={todo.projectId} />
          <LabelChips labels={todoLabels} max={2} />
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
