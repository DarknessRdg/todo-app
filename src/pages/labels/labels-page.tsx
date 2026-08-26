import { Link } from "react-router";
import { ListPlus, Pencil, Tag, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import type { LabelEntity } from "@/backend/label-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TooltipText } from "@/components/ui/tooltip";
import { testProp } from "@/lib/test-id";
import { NoProject, searchTodos } from "@/lib/todo-search";
import { EmptyList } from "@/pages/inbox/empty-list";
import { TodoProjectBadge } from "@/pages/inbox/todo-project-badge";
import { useProjects } from "@/pages/inbox/use-projects";
import {
  useLabelCreate,
  useLabelDelete,
  useLabelMembership,
  useLabelRename,
  useLabels,
} from "@/pages/inbox/use-labels";
import { useTodoList } from "@/pages/inbox/use-todo-list";

/**
 * Labels, managed on a page of their own.
 *
 * The second home for this — the sidebar section does the same job in the
 * margin — so the two can be compared side by side before one is kept. What a
 * page buys over the sidebar is room: the rename field is full width, the
 * actions are visible rather than hidden behind hover, and each label can say
 * how much of the workspace it accounts for.
 */
export function LabelsPage() {
  const { labels, isLoading } = useLabels();
  const { allTodos } = useTodoList();
  const create = useLabelCreate();

  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState<string | undefined>(undefined);
  const [deleting, setDeleting] = useState<LabelEntity | undefined>(undefined);
  const [assigning, setAssigning] = useState<LabelEntity | undefined>(
    undefined
  );

  const usage = (labelId: string) => {
    const carrying = allTodos?.filter((todo) =>
      todo.labelIds.includes(labelId)
    );

    return {
      total: carrying?.length ?? 0,
      open: carrying?.filter((todo) => !todo.done).length ?? 0,
    };
  };

  const submit = () => {
    const name = draft.trim();
    // The service refuses a blank name anyway; stopping here keeps the field
    // from clearing as though something had been created.
    if (name === "") return;

    create.mutate(name);
    setDraft("");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Text variant="eyebrow" className="mb-1">
          Workspace
        </Text>
        <Text testId="labels.page.title" variant="h1">
          Labels
        </Text>
      </div>

      <form
        className="mb-6 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}>
        <Input
          testId="labels.page.create.input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="New label…"
          aria-label="New label name"
          className="bg-card h-11 border-0 shadow-none"
        />
        <Button
          testId="labels.page.create.button"
          type="submit"
          className="h-11 rounded-full px-6">
          Add
        </Button>
      </form>

      {isLoading ? (
        <LabelsSkeleton />
      ) : labels.length === 0 ? (
        <EmptyList
          testId="labels.page.empty"
          icon={<Tag className="size-5" />}
          title="No labels yet"
          message="Labels cut across projects — one can sit on any todo, anywhere. Name your first one above."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {labels.map((label) => (
            <div
              key={label.id}
              {...testProp(`labels.page.${label.id}`)}
              className="bg-card flex items-center gap-3 rounded-2xl px-4 py-3">
              {label.id === renaming ? (
                <RenameField
                  label={label}
                  onDone={() => setRenaming(undefined)}
                />
              ) : (
                <>
                  <Tag className="text-muted-foreground size-4 shrink-0" />
                  {/*
                    A real link, not a click handler: this page manages labels,
                    and reading the todos carrying one is a different page with
                    a url of its own that can be shared and returned to.
                  */}
                  <Link
                    to={`/label/${label.id}`}
                    {...testProp(`labels.page.${label.id}.name`)}
                    className="truncate text-sm hover:underline">
                    {label.name}
                  </Link>

                  <span
                    {...testProp(`labels.page.${label.id}.usage`)}
                    className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {usageText(usage(label.id))}
                  </span>

                  <TooltipText text="Add todos" asChild>
                    <Button
                      testId={`labels.page.${label.id}.assign.button`}
                      variant="ghost"
                      size="icon"
                      aria-label={`Add todos to ${label.name}`}
                      className="text-muted-foreground hover:text-foreground size-8"
                      onClick={() => setAssigning(label)}>
                      <ListPlus className="size-4" />
                    </Button>
                  </TooltipText>

                  <TooltipText text="Rename" asChild>
                    <Button
                      testId={`labels.page.${label.id}.rename.button`}
                      variant="ghost"
                      size="icon"
                      aria-label={`Rename ${label.name}`}
                      className="text-muted-foreground hover:text-foreground size-8"
                      onClick={() => setRenaming(label.id)}>
                      <Pencil className="size-4" />
                    </Button>
                  </TooltipText>

                  <TooltipText text="Delete" asChild>
                    <Button
                      testId={`labels.page.${label.id}.delete.button`}
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${label.name}`}
                      className="text-muted-foreground hover:text-destructive size-8"
                      onClick={() => setDeleting(label)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipText>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <AssignTodosDialog
        label={assigning}
        onClose={() => setAssigning(undefined)}
      />

      <DeleteLabelDialog
        label={deleting}
        todos={deleting === undefined ? 0 : usage(deleting.id).total}
        onClose={() => setDeleting(undefined)}
      />
    </div>
  );
}

/**
 * Pulling todos into a label: pick the label, then tick the todos.
 *
 * The other direction — one todo, several labels — already exists on the todo's
 * own detail. This is the direction a page can offer that a detail cannot:
 * labelling ten todos without opening ten todos.
 *
 * Todos already carrying the label start ticked, so the dialog reads as "which
 * todos have this label" rather than "which am I adding". Unticking one is
 * therefore how it comes off, and Save writes only the difference — a workspace
 * of two hundred todos must not mean two hundred writes because one was ticked.
 *
 * Search and selection are component state, not url state: this is a picker,
 * and nobody wants to link to a half-finished one.
 */
function AssignTodosDialog({
  label,
  onClose,
}: {
  label: LabelEntity | undefined;
  onClose: () => void;
}) {
  const { allTodos } = useTodoList();
  const { projects } = useProjects();
  const membership = useLabelMembership();

  const [query, setQuery] = useState("");
  const [project, setProject] = useState<string>(AnyProject);
  const [ticked, setTicked] = useState<string[]>([]);
  // What was already true when the dialog opened, so Save can write the change
  // rather than the whole selection.
  const [initial, setInitial] = useState<string[]>([]);

  const todos = allTodos ?? [];

  // Loaded once per opening rather than in an effect: the dialog is keyed by
  // the label, so a fresh one means a fresh starting point.
  const opened = useRef<string | undefined>(undefined);
  if (label !== undefined && opened.current !== label.id) {
    opened.current = label.id;
    const carrying = todos
      .filter((todo) => todo.labelIds.includes(label.id))
      .map((todo) => todo.id);

    setInitial(carrying);
    setTicked(carrying);
    setQuery("");
    setProject(AnyProject);
  }

  const matches = searchTodos(todos, {
    query,
    projectId: project === AnyProject ? undefined : project,
  });

  const added = ticked.filter((id) => !initial.includes(id));
  const removed = initial.filter((id) => !ticked.includes(id));

  const toggle = (id: string) =>
    setTicked((current) =>
      current.includes(id)
        ? current.filter((it) => it !== id)
        : [...current, id]
    );

  // Everything *on offer*, not everything there is: with a search running, the
  // list on screen is what "all" can honestly mean — ticking two hundred todos
  // the reader cannot see is not what they asked for.
  const shown = matches.map((todo) => todo.id);
  const allTicked =
    shown.length > 0 && shown.every((id) => ticked.includes(id));

  const toggleAll = () =>
    setTicked((current) =>
      allTicked
        ? current.filter((id) => !shown.includes(id))
        : [...new Set([...current, ...shown])]
    );

  const save = () => {
    if (label !== undefined && (added.length > 0 || removed.length > 0)) {
      membership.mutate({
        labelId: label.id,
        add: todos.filter((todo) => added.includes(todo.id)),
        remove: todos.filter((todo) => removed.includes(todo.id)),
      });
    }

    onClose();
  };

  return (
    <Dialog
      open={label !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          opened.current = undefined;
          onClose();
        }
      }}>
      <DialogContent
        testId="labels.assign.dialog"
        className="flex max-h-[80vh] flex-col gap-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add todos to “{label?.name}”</DialogTitle>
          <DialogDescription>
            Tick the todos this label belongs on. Unticking one takes it off.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex items-center gap-2">
          <Input
            testId="labels.assign.search.input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title"
            aria-label="Search todos by title"
            className="h-9"
          />

          <Select value={project} onValueChange={setProject}>
            <SelectTrigger
              testId="labels.assign.project.select"
              aria-label="Filter by project"
              className="h-9 w-40 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem testId="labels.assign.project.any" value={AnyProject}>
                Any project
              </SelectItem>
              <SelectItem testId="labels.assign.project.none" value={NoProject}>
                No project
              </SelectItem>
              {projects.map((option) => (
                <SelectItem
                  key={option.id}
                  testId={`labels.assign.project.${option.id}`}
                  value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {matches.length > 0 && (
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm">
            <Checkbox
              testId="labels.assign.selectall.checkbox"
              checked={allTicked}
              onCheckedChange={() => toggleAll()}
              aria-label="Select all todos on offer"
            />
            <span className="text-muted-foreground">
              {allTicked ? "Clear all" : "Select all"}
              {" · "}
              {matches.length} shown
            </span>
          </label>
        )}

        <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {matches.map((todo) => (
            <label
              key={todo.id}
              className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm">
              <Checkbox
                testId={`labels.assign.todo.${todo.id}.checkbox`}
                checked={ticked.includes(todo.id)}
                onCheckedChange={() => toggle(todo.id)}
              />
              <span className="min-w-0 grow truncate">{todo.title}</span>
              <TodoProjectBadge projectId={todo.projectId} />
            </label>
          ))}

          {matches.length === 0 && (
            <Text
              testId="labels.assign.empty"
              variant="muted"
              className="px-2 py-6 text-center">
              {todos.length === 0
                ? "No todos in this workspace yet."
                : "No todo matches that search."}
            </Text>
          )}
        </div>

        <DialogFooter className="mt-4 items-center sm:justify-between">
          <Text
            testId="labels.assign.summary"
            variant="muted"
            className="text-xs">
            {changeText(added.length, removed.length)}
          </Text>

          <div className="flex items-center gap-2">
            <Button
              testId="labels.assign.cancel"
              variant="ghost"
              onClick={onClose}>
              Cancel
            </Button>
            <Button testId="labels.assign.save" onClick={save}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The Select needs a value for "no filter"; undefined is not one it can hold. */
const AnyProject = "__any__";

/** What Save is about to do, so it is never a surprise. */
function changeText(added: number, removed: number): string {
  if (added === 0 && removed === 0) return "No changes";

  const parts = [];
  if (added > 0) parts.push(`Add ${added}`);
  if (removed > 0) parts.push(`remove ${removed}`);

  return parts.join(", ");
}

/** "On 3 todos, 1 open" — what deleting this would actually disturb. */
function usageText({ total, open }: { total: number; open: number }) {
  if (total === 0) return "Not used yet";

  return `On ${total} todo${total === 1 ? "" : "s"}${open > 0 ? `, ${open} open` : ""}`;
}

function RenameField({
  label,
  onDone,
}: {
  label: LabelEntity;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(label.name);
  const rename = useLabelRename();

  const submit = () => {
    const name = draft.trim();
    onDone();

    if (name === "" || name === label.name) return;
    rename.mutate({ id: label.id, name });
  };

  return (
    <form
      className="flex grow items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}>
      <Tag className="text-muted-foreground size-4 shrink-0" />
      <Input
        testId={`labels.page.${label.id}.rename.input`}
        autoFocus
        value={draft}
        aria-label={`Rename ${label.name}`}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
          }
        }}
        className="h-8"
      />
      <Button
        testId={`labels.page.${label.id}.rename.save`}
        type="submit"
        size="sm"
        className="h-8">
        Save
      </Button>
    </form>
  );
}

/**
 * Deleting a label takes it off every todo carrying it, so it asks first — the
 * house rule for anything destructive. Here the dialog can also say how many
 * todos that is, which is the number that decides the answer.
 */
function DeleteLabelDialog({
  label,
  todos,
  onClose,
}: {
  label: LabelEntity | undefined;
  todos: number;
  onClose: () => void;
}) {
  const remove = useLabelDelete();

  return (
    <AlertDialog
      open={label !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <AlertDialogContent testId="labels.page.delete.dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{label?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {todos === 0
              ? "Nothing is carrying it, so nothing else changes."
              : `It comes off ${todos} todo${todos === 1 ? "" : "s"}. The todos themselves stay.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel testId="labels.page.delete.cancel">
            Keep it
          </AlertDialogCancel>
          <AlertDialogAction
            testId="labels.page.delete.confirm"
            onClick={() => {
              if (label !== undefined) remove.mutate(label.id);
              onClose();
            }}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Row-shaped stand-ins, so the list does not jump when the labels land. */
function LabelsSkeleton() {
  return (
    <div
      {...testProp("labels.page.loading")}
      aria-busy
      aria-label="Loading labels"
      className="flex flex-col gap-2">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="bg-card flex items-center gap-3 rounded-2xl px-4 py-3">
          <Skeleton className="size-4 shrink-0 rounded-md" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
