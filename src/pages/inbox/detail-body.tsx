import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { TodoChecker } from "@/components/todo.tsx";
import type { TodoEntity } from "@/backend/todo-service.ts";
import { RichTextEditor } from "@/components/rich-text-editor.tsx";
import { useTodoUpdate } from "@/pages/inbox/use-todo-update.ts";
import {
  DueBadge,
  LabelChips,
  PriorityBadge,
  ProjectBadge,
  StatusBadge,
  formatDate,
  metaFor,
  shortId,
  subtasksFor,
} from "@/pages/inbox/todo-meta.tsx";
import { CalendarIcon, CircleDot, FolderIcon, Plus, SignalHigh, Tag } from "lucide-react";
import { useState, type ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

export function TodoDetailHeader({
  todo,
  actions,
}: {
  todo: TodoEntity;
  actions?: ReactNode;
}) {
  const meta = metaFor(todo.id);

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
          <span className="text-foreground/70">Inbox</span>
          <span className="opacity-40">/</span>
          <span className="text-foreground/70">{meta.project}</span>
          <span className="opacity-40">/</span>
          <span>{shortId(todo.id)}</span>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        ) : null}
      </div>

      <h1 className="font-display flex items-start gap-3 text-2xl leading-snug font-semibold tracking-tight">
        <span className="mt-1 shrink-0">
          <TodoChecker done={todo.done} />
        </span>
        {todo.title}
      </h1>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge done={todo.done} />
        <PriorityBadge priority={meta.priority} />
        {todo.dueDate ? <DueBadge date={todo.dueDate} /> : null}
        <ProjectBadge project={meta.project} />
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Body: two-column — main content + properties panel                          */
/* -------------------------------------------------------------------------- */

export function TodoDetailBody({ todo }: { todo: TodoEntity }) {
  return (
    <div className="grid flex-1 items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <main className="flex min-w-0 flex-col gap-8">
        <section className="flex flex-col gap-2.5">
          <p className="eyebrow">Description</p>
          <DescriptionEditor todo={todo} />
        </section>

        <Subtasks todo={todo} />
      </main>

      <PropertiesPanel todo={todo} />
    </div>
  );
}

/* Convenience wrapper used by both the modal and the dedicated page. */
export function TodoDetail({
  todo,
  headerActions,
}: {
  todo: TodoEntity;
  headerActions?: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col gap-8">
      <TodoDetailHeader todo={todo} actions={headerActions} />
      <TodoDetailBody todo={todo} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Properties panel                                                            */
/* -------------------------------------------------------------------------- */

function PropertiesPanel({ todo }: { todo: TodoEntity }) {
  const meta = metaFor(todo.id);

  return (
    <aside className="lg:border-border flex flex-col gap-1 lg:border-l lg:pl-8">
      <p className="eyebrow mb-3">Properties</p>

      <PropertyRow icon={<CircleDot className="size-3.5" />} label="Status">
        <StatusBadge done={todo.done} />
      </PropertyRow>

      <PropertyRow icon={<SignalHigh className="size-3.5" />} label="Priority">
        <PriorityBadge priority={meta.priority} />
      </PropertyRow>

      <PropertyRow icon={<FolderIcon className="size-3.5" />} label="Project">
        <span className="text-sm">{meta.project}</span>
      </PropertyRow>

      <PropertyRow icon={<Tag className="size-3.5" />} label="Labels">
        <LabelChips labels={meta.labels} className="justify-end" />
      </PropertyRow>

      <PropertyRow icon={<CalendarIcon className="size-3.5" />} label="Due">
        <span className="text-xs tabular-nums">
          {todo.dueDate ? formatDate(todo.dueDate) : "—"}
        </span>
      </PropertyRow>

      <div className="my-3 border-t" />

      <PropertyRow label="Assignee">
        <Assignee name="You" />
      </PropertyRow>

      <PropertyRow label="Created">
        <span className="text-xs tabular-nums">
          {formatDate(todo.createdAt)}
        </span>
      </PropertyRow>
    </aside>
  );
}

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        {icon}
        {label}
      </span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Assignee({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="bg-primary/15 text-primary flex size-6 items-center justify-center rounded-full text-xs font-medium">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="text-sm">{name}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Description + Subtasks                                                       */
/* -------------------------------------------------------------------------- */

function DescriptionEditor({ todo }: { todo: TodoEntity }) {
  const { updateDescription } = useTodoUpdate();
  const [editing, setEditing] = useState(false);

  const handleBlur = (markdown: string) => {
    const next = markdown.trim();
    setEditing(false);

    if (next === (todo.description ?? "")) return;

    updateDescription.mutate({ id: todo.id, description: next });
  };

  if (editing) {
    return (
      <RichTextEditor
        content={todo.description}
        placeholder="Add a description…"
        editable
        autoFocus
        onBlur={handleBlur}
      />
    );
  }

  // Read view: renders as plain content, shows a light border on hover, and
  // turns into the editor on click.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className="hover:border-border cursor-text rounded-lg border border-transparent p-2 transition-colors">
      {todo.description?.trim() ? (
        <RichTextEditor content={todo.description} editable={false} chrome={false} />
      ) : (
        <p className="text-muted-foreground text-sm">Add a description…</p>
      )}
    </div>
  );
}

// Subtasks are illustrative for now — derived from the id so the count matches
// the list; no persistence wired yet.
function Subtasks({ todo }: { todo: TodoEntity }) {
  const [subtasks, setSubtasks] = useState(() => subtasksFor(todo.id));

  if (subtasks.length === 0) {
    return (
      <section>
        <p className="eyebrow mb-3">Subtasks</p>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground -ml-0.5 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors">
          <Plus className="size-4" />
          Add subtask
        </button>
      </section>
    );
  }

  const doneCount = subtasks.filter((s) => s.done).length;
  const percentage = (doneCount / subtasks.length) * 100;

  const toggle = (id: string) =>
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );

  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="eyebrow">Subtasks</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {doneCount}/{subtasks.length}
        </span>
        <Progress value={percentage} className="ml-auto h-1.5 w-24" />
      </div>

      <div className="flex flex-col">
        {subtasks.map((subtask) => (
          <label
            key={subtask.id}
            className="hover:bg-muted/60 -mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors">
            <Checkbox
              checked={subtask.done}
              onCheckedChange={() => toggle(subtask.id)}
              className="size-5 rounded-full"
            />
            <span
              data-done={subtask.done}
              className="text-foreground data-[done=true]:text-muted-foreground text-sm data-[done=true]:line-through">
              {subtask.title}
            </span>
          </label>
        ))}
      </div>

      <button
        type="button"
        className="text-muted-foreground hover:text-foreground mt-1 -ml-0.5 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors">
        <Plus className="size-4" />
        Add subtask
      </button>
    </section>
  );
}
