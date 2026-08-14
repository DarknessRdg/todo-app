import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { TodoCheckerInput } from "@/components/todo.tsx";
import type { TodoEntity } from "@/backend/todo-service.ts";
import { RichTextEditor } from "@/components/rich-text-editor.tsx";
import { useTodoUpdate } from "@/pages/inbox/use-todo-update.ts";
import { useTodoSubtasks } from "@/pages/inbox/use-todo-subtasks.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  DueBadge,
  PriorityBadge,
  StatusBadge,
  formatDate,
  metaFor,
  shortId,
} from "@/pages/inbox/todo-meta.tsx";
import {
  BookOpen,
  CalendarIcon,
  Check,
  CircleDot,
  FolderIcon,
  PencilLine,
  Plus,
  SignalHigh,
  Tag,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ConfettiBurst } from "@/components/confetti-burst";
import { InlineEdit } from "@/components/inline-edit";
import { ProjectSelect } from "@/components/project-select";
import { TodoProjectBadge } from "@/pages/inbox/todo-project-badge";
import { useTodoProjectName } from "@/pages/inbox/use-todo-project";
import { Timing } from "@/lib/timing";
import { richTextContent, type RichTextDoc } from "@/lib/rich-text";
import { Calendar } from "@/components/ui/calendar";
import { LabelPicker } from "@/components/label-picker";
import {
  useLabelCreate,
  useLabels,
  useTodoLabels,
} from "@/pages/inbox/use-labels";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Text, textVariants } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { TooltipText } from "@/components/ui/tooltip";
import { dialogOf } from "@/lib/dialog-container";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";
import { testProp } from "@/lib/test-id";
import { useTodoDetails } from "@/pages/inbox/use-todo-details.ts";
import { TodoLookupFailed } from "@/components/todo-lookup-failed";
import { Skeleton } from "@/components/ui/skeleton";

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
          <TodoBreadcrumbProject projectId={todo.projectId} />
          <span>{shortId(todo.id)}</span>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        ) : null}
      </div>

      <div className="flex items-start gap-3">
        <span className="mt-1.5 shrink-0">
          <TodoCompletion todo={todo} />
        </span>
        <TitleEditor todo={todo} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge done={todo.done} />
        <PriorityBadge priority={meta.priority} />
        {todo.dueDate ? <DueBadge date={todo.dueDate} /> : null}
        <TodoProjectBadge projectId={todo.projectId} />
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
        {/* Keyed so read mode is dropped when the pane moves to another todo:
            it is a way to read *this* one, not a setting. */}
        <Description key={todo.id} todo={todo} />

        <Subtasks todo={todo} />
      </main>

      <PropertiesPanel todo={todo} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The detail itself — one component, two containers                           */
/* -------------------------------------------------------------------------- */

/**
 * What the detail is currently showing. Handed to the container so it can frame
 * each state its own way — the modal needs the title for its dialog, the page
 * sizes itself differently once there is content to size around.
 */
export type TodoDetailView =
  | { status: "loading"; content: ReactNode }
  | { status: "error"; content: ReactNode }
  | { status: "missing"; content: ReactNode }
  | { status: "ready"; content: ReactNode; todo: TodoEntity };

type TodoDetailProps = {
  headerActions?: ReactNode;
} & (
  | { todo: TodoEntity; id?: never; children?: never }
  | {
      id: string;
      todo?: never;
      /**
       * How this container leaves for the inbox when the todo is not there.
       * The modal drops the query param; the page has a url to navigate off.
       */
      onLeave?: () => void;
      /**
       * The container seam. Every state's content is rendered here already —
       * the container only decides what to wrap it in (a dialog, a page). Omit
       * it and the content stands on its own.
       */
      children?: (view: TodoDetailView) => ReactNode;
    }
);

/**
 * The todo detail, given either the model or the id to resolve it from.
 *
 * Both the dedicated page and the inbox modal render *this* — content and the
 * states around it are defined once here, and the containers supply nothing but
 * their wrapper. A fix to the detail (the description editor's link popover,
 * say) therefore cannot land in one and miss the other.
 */
export function TodoDetail({ headerActions, ...props }: TodoDetailProps) {
  // Two components rather than a conditional hook: the id form has to read the
  // query, the model form must not.
  if (props.todo !== undefined) {
    return (
      <TodoDetailContent todo={props.todo} headerActions={headerActions} />
    );
  }

  return (
    <ResolvedTodoDetail
      id={props.id}
      headerActions={headerActions}
      onLeave={props.onLeave}>
      {props.children}
    </ResolvedTodoDetail>
  );
}

function TodoDetailContent({
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

/** Renders whatever the container asked for; bare content when it asked for nothing. */
const bareContainer = (view: TodoDetailView) => view.content;

function ResolvedTodoDetail({
  id,
  headerActions,
  onLeave,
  children = bareContainer,
}: {
  id: string;
  headerActions?: ReactNode;
  onLeave?: () => void;
  children?: (view: TodoDetailView) => ReactNode;
}) {
  const navigate = useNavigate();
  const { todo, isLoading, error, retry } = useTodoDetails({ id });
  const leave = onLeave ?? (() => void navigate("/"));

  if (isLoading) {
    return children({ status: "loading", content: <DetailLoading /> });
  }

  // Order matters: a read that *failed* is not the same as a todo that is not
  // there, and answering "no such todo" to a broken database sends the reader
  // hunting for a mistake they did not make.
  if (error) {
    return children({
      status: "error",
      content: (
        <TodoLookupFailed
          testId="todo.detail.error"
          onRetry={() => void retry()}
        />
      ),
    });
  }

  // Said out loud rather than redirected away from. The detail is reached by
  // url in both containers, so a shared or bookmarked link that no longer
  // resolves would otherwise dump the reader somewhere with no explanation —
  // and the url is the only record of which todo was asked for.
  if (!todo) {
    return children({
      status: "missing",
      content: <DetailMissing onLeave={leave} />,
    });
  }

  return children({
    status: "ready",
    todo,
    content: <TodoDetailContent todo={todo} headerActions={headerActions} />,
  });
}

/**
 * Stands in for the detail while it is read, shaped like what is about to
 * arrive: the header, the description block and the properties column all
 * occupy the space they will take, so nothing jumps when the data lands.
 */
function DetailLoading() {
  return (
    <div
      {...testProp("todo.detail.loading")}
      aria-busy
      aria-label="Loading this todo"
      className="flex min-h-full flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Skeleton className="h-3 w-40" />

        <div className="flex items-start gap-3">
          <Skeleton className="mt-1 size-5 shrink-0 rounded-full" />
          <Skeleton className="h-7 w-2/3" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </header>

      <div className="grid flex-1 items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="flex flex-col gap-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </section>

          <section className="flex flex-col gap-3">
            <Skeleton className="h-3 w-20" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </section>
        </div>

        <aside className="lg:border-border flex flex-col gap-3 lg:border-l lg:pl-8">
          <Skeleton className="h-3 w-20" />
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function DetailMissing({ onLeave }: { onLeave: () => void }) {
  return (
    <div
      className="flex flex-col items-start gap-3"
      {...testProp("todo.detail.missing")}>
      <Text variant="eyebrow">Not found</Text>
      <Text variant="h2">This todo is no longer here</Text>
      <Text variant="muted">
        It may have been deleted, or it was never on this device — todos are
        stored locally, so a link from elsewhere will not find one.
      </Text>

      <Button
        testId="todo.detail.missing.close.button"
        onClick={onLeave}
        className="mt-3 rounded-full">
        Back to the inbox
      </Button>
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
      <Text variant="eyebrow" className="mb-3">
        Properties
      </Text>

      <PropertyRow icon={<CircleDot className="size-3.5" />} label="Status">
        <StatusBadge done={todo.done} />
      </PropertyRow>

      <PropertyRow icon={<SignalHigh className="size-3.5" />} label="Priority">
        <PriorityBadge priority={meta.priority} />
      </PropertyRow>

      <PropertyRow icon={<FolderIcon className="size-3.5" />} label="Project">
        <TodoProjectPicker todo={todo} />
      </PropertyRow>

      <PropertyRow icon={<Tag className="size-3.5" />} label="Labels">
        <TodoLabelPicker todo={todo} />
      </PropertyRow>

      <PropertyRow icon={<CalendarIcon className="size-3.5" />} label="Due">
        <DueDatePicker todo={todo} />
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

      {/* Only once there is one: an open todo has no completion date, and a
          row reading "—" is noise on every todo still to be done. */}
      {todo.doneAt ? (
        <PropertyRow label="Completed">
          <span
            {...testProp("todo.detail.completed.date")}
            className="text-xs tabular-nums">
            {formatDate(todo.doneAt)}
          </span>
        </PropertyRow>
      ) : null}
    </aside>
  );
}

/**
 * The labels on this todo. Creating one from here puts it straight on, so a
 * label that does not exist yet is not a reason to leave the todo.
 */
function TodoLabelPicker({ todo }: { todo: TodoEntity }) {
  const { labels } = useLabels();
  const setLabels = useTodoLabels();
  const create = useLabelCreate();

  return (
    <LabelPicker
      testId={`todo.detail.labels`}
      labels={labels}
      selectedIds={todo.labelIds}
      onChange={(labelIds) => setLabels.mutate({ id: todo.id, labelIds })}
      onCreate={async (name) => {
        const label = await create.mutateAsync(name);
        // The service hands back the label it made — or the one already going
        // by that name — so it can go on without re-reading the list.
        if (label !== undefined) {
          setLabels.mutate({
            id: todo.id,
            labelIds: [...todo.labelIds, label.id],
          });
        }
      }}
    />
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

/** The project segment of the breadcrumb, dropped when there is no project. */
function TodoBreadcrumbProject({
  projectId,
}: {
  projectId: string | undefined;
}) {
  const name = useTodoProjectName(projectId);

  if (name === undefined) return null;

  return (
    <>
      <span className="text-foreground/70">{name}</span>
      <span className="opacity-40">/</span>
    </>
  );
}

/**
 * Sets or clears the due date from the properties panel.
 *
 * Clearing is offered as plainly as picking: a date set by mistake is as
 * common as one that was never wanted, and the only other way out would be
 * choosing an arbitrary day to mean "none".
 */
function DueDatePicker({ todo }: { todo: TodoEntity }) {
  const { updateDueDate } = useTodoUpdate();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = dialogOf(trigger.current);

  const choose = (dueDate: Date | undefined) => {
    updateDueDate.mutate({ id: todo.id, dueDate });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          testId="todo.detail.duedate.button"
          variant="ghost"
          size="sm"
          type="button"
          className="text-muted-foreground hover:text-foreground -mr-2 h-7 gap-1.5 px-2">
          <span className="text-xs tabular-nums">
            {todo.dueDate ? formatDate(todo.dueDate) : "Add a date"}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        container={dialog}
        collisionBoundary={dialog}
        collisionPadding={12}
        align="end"
        className="w-auto overflow-hidden p-0">
        <Calendar
          mode="single"
          selected={todo.dueDate}
          defaultMonth={todo.dueDate}
          onSelect={(date) => (date ? choose(date) : undefined)}
        />

        <div className="flex items-center gap-1 border-t p-2">
          <Button
            testId="todo.detail.duedate.today"
            variant="ghost"
            size="sm"
            className="grow"
            onClick={() => choose(new Date())}>
            Today
          </Button>
          {todo.dueDate ? (
            <Button
              testId="todo.detail.duedate.clear"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground grow"
              onClick={() => choose(undefined)}>
              Clear
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Moves the todo between projects, from the properties panel. */
function TodoProjectPicker({ todo }: { todo: TodoEntity }) {
  const { updateProject } = useTodoUpdate();

  return (
    <ProjectSelect
      testId="todo.detail.project"
      value={todo.projectId}
      placeholder="No project"
      onChange={(projectId) => updateProject.mutate({ id: todo.id, projectId })}
      // The properties panel sits against the right edge, so the panel lines
      // up with the trigger's right and opens inward.
      align="end"
      className="-mr-2 h-7"
    />
  );
}

/**
 * The completion toggle beside the title.
 *
 * The mutation fires immediately, unlike the list row: nothing relocates when a
 * todo is completed from its own detail, so there is no re-sort to hold still
 * for. The burst is the same one the list plays.
 */
function TodoCompletion({ todo }: { todo: TodoEntity }) {
  const { check } = useTodoUpdate();

  // Keyed so each completion remounts the burst and it fires again.
  const [burstKey, setBurstKey] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => () => window.clearTimeout(burstTimer.current), []);

  const onToggle = (done: boolean) => {
    if (done) {
      setBurstKey((key) => key + 1);
      setShowBurst(true);
      burstTimer.current = setTimeout(
        () => setShowBurst(false),
        Timing.confettiVisibleMs
      );
    }

    check.mutate({ id: todo.id, done });
  };

  return (
    <div className="relative">
      <TodoCheckerInput
        testId="todo.detail.check.button"
        done={todo.done}
        aria-label={todo.done ? "Reopen this todo" : "Complete this todo"}
        onToggle={onToggle}
      />
      {showBurst && <ConfettiBurst key={burstKey} />}
    </div>
  );
}

/**
 * Heading-sized in both states, so the text does not shift on the way into the
 * field. The two slots are styled separately, so the shared part is repeated
 * deliberately rather than inherited.
 */
// Derived from the `h1` variant rather than restated, so the title cannot
// drift away from every other page heading.
const titleType = cn(
  textVariants({ variant: "h1" }),
  "font-display grow px-2 py-0"
);

function TitleEditor({ todo }: { todo: TodoEntity }) {
  const { updateTitle } = useTodoUpdate();

  return (
    <InlineEdit
      required
      value={todo.title}
      onCommit={(title) => updateTitle.mutate({ id: todo.id, title })}>
      {/* The `h1` carries no classes of its own: `Slot` joins the two
          `className`s verbatim, so keeping them in one place avoids a fight. */}
      <InlineEdit.Read
        asChild
        testId="todo.detail.title"
        aria-label="Edit title">
        <Text className={titleType}>{todo.title}</Text>
      </InlineEdit.Read>

      <InlineEdit.Input
        testId="todo.detail.title.input"
        // The primitive's 3px ring plus `border-ring` reads as a halo at this
        // size; 2px and no focus border matches the inbox capture bar.
        // `px-0 py-0` overrides the primitive's own padding so the text sits
        // exactly where the heading had it, rather than jumping right.
        className={cn(
          titleType,
          "h-auto rounded-lg border-transparent shadow-none focus-visible:border-transparent focus-visible:ring-2 md:text-2xl"
        )}
      />
    </InlineEdit>
  );
}

/**
 * The description, and the switch that decides whether it is a field or a
 * document.
 *
 * Click-to-edit costs the one thing reading needs: a click that would select a
 * word instead turns the text into an editor, so a description cannot be
 * skimmed with the cursor, quoted, or copied out of. Read mode gives that back
 * for as long as it is on, and is per todo per visit rather than remembered —
 * editing is what the detail is for, and a preference that quietly persisted
 * would leave the next todo mysteriously refusing to open.
 */
function Description({ todo }: { todo: TodoEntity }) {
  const [readOnly, setReadOnly] = useState(false);
  // Owned here rather than in the editor below, because the section header is
  // where the outcome of a save is reported — and it has to be the very same
  // mutation that performed it, not a second one asked how it went.
  const { updateDescription } = useTodoUpdate();

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <Text variant="eyebrow">Description</Text>

        {/* Status and mode together on the right: both answer "what is this
            description doing", and split apart they read as unrelated. */}
        <div className="flex items-center gap-2">
          <SaveState mutation={updateDescription} />

          {/*
          The button says which mode the description is *in*, not which one the
          click leads to — an icon alone leaves the reader guessing which of the
          two it means, and that guess is the whole point of the control. The
          tooltip carries the action, so both readings are answered.

          Three signals move together so the state survives however it is read:
          the word, the icon, and the sage fill that marks selected everywhere
          else in the app. Colour alone would say nothing to a reader who cannot
          separate it from the canvas.

          The `on` hover is restated in the classes because the primitive's own
          hover paints mist over that sage — the state would otherwise drop out
          from under the cursor that is about to click it.
        */}
          <TooltipText
            testId="todo.detail.description.readonly.tooltip"
            text={readOnly ? "Switch back to editing" : "Switch to reading"}
            asChild>
            <Toggle
              testId="todo.detail.description.readonly.toggle"
              size="sm"
              pressed={readOnly}
              onPressedChange={setReadOnly}
              // No `aria-label`: it would replace the visible word as the
              // accessible name, leaving what is read aloud and what is on screen
              // saying different things. Radix supplies the pressed state.
              className="text-muted-foreground data-[state=on]:text-foreground data-[state=on]:hover:bg-accent data-[state=on]:hover:text-foreground -mr-1.5 h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium [&_svg]:size-3.5">
              {readOnly ? <BookOpen /> : <PencilLine />}
              {readOnly ? "Reading" : "Editing"}
            </Toggle>
          </TooltipText>
        </div>
      </div>

      <DescriptionEditor
        todo={todo}
        readOnly={readOnly}
        updateDescription={updateDescription}
      />
    </section>
  );
}

/**
 * Whether the description is being written, and whether the last write landed.
 *
 * The in-flight half is read straight off the mutation — the answer is already
 * there, and it cannot drift from what actually happened. The confirmation is
 * held for a beat and then goes, which is the one thing the mutation cannot say
 * on its own: `isSuccess` stays true forever, and a permanent tick becomes part
 * of the furniture rather than news.
 *
 * A failure says nothing here — the mutation raises a toast for that, and a
 * quiet marker in a header is the wrong place to report something that needs
 * acting on.
 */
function SaveState({
  mutation,
}: {
  mutation: ReturnType<typeof useTodoUpdate>["updateDescription"];
}) {
  const { isPending, isSuccess, submittedAt } = mutation;
  const [confirming, setConfirming] = useState(false);

  // Keyed on `submittedAt` rather than on success alone: it changes with every
  // write, so a second save re-arms the notice instead of the first one's timer
  // deciding how long the second is seen for.
  useEffect(() => {
    if (!isSuccess) return;

    setConfirming(true);
    const timer = setTimeout(() => setConfirming(false), Timing.savedVisibleMs);

    return () => clearTimeout(timer);
  }, [isSuccess, submittedAt]);

  if (isPending) {
    return (
      <span
        {...testProp("todo.detail.description.saving")}
        role="status"
        className="text-muted-foreground text-xs">
        Saving…
      </span>
    );
  }

  if (!confirming) return null;

  return (
    <span
      {...testProp("todo.detail.description.saved")}
      // Announced rather than only drawn: the tick and the colour are the whole
      // message, and neither reaches a screen reader.
      role="status"
      // The fade is CSS and the unmount is the timer above, both running off
      // `savedVisibleMs` — so the notice cannot finish fading and then sit
      // there invisible, or vanish mid-fade.
      style={{ animationDuration: `${Timing.savedVisibleMs}ms` }}
      className="text-success animate-saved-notice flex items-center gap-1 text-xs font-medium">
      <Check className="size-3.5" />
      Saved
    </span>
  );
}

function DescriptionEditor({
  todo,
  readOnly,
  updateDescription,
}: {
  todo: TodoEntity;
  readOnly: boolean;
  updateDescription: ReturnType<typeof useTodoUpdate>["updateDescription"];
}) {
  /**
   * The parsed document behind the markdown `InlineEdit` is tracking.
   *
   * `InlineEdit` deals in strings — which is right, it is the same machinery
   * the title uses — so the doc rides alongside rather than being threaded
   * through it. The editor reports both together, so the one landing here is
   * always the one the committed markdown came from.
   */
  const doc = useRef<RichTextDoc | undefined>(undefined);

  return (
    <InlineEdit
      readOnly={readOnly}
      value={todo.description ?? ""}
      onCommit={(description) =>
        updateDescription.mutate({
          id: todo.id,
          description,
          descriptionDoc: doc.current,
        })
      }>
      <InlineEdit.Read
        testId="todo.detail.description.read"
        aria-label="Edit description"
        // Read view only — the editor brings its own chrome and padding.
        className="p-2">
        {todo.description?.trim() ? (
          <RichTextEditor
            // The parsed copy when the todo has one, the markdown when it does
            // not — which is what makes an old row still readable.
            content={richTextContent(todo.description, todo.descriptionDoc)}
            editable={false}
            chrome={false}
          />
        ) : (
          // Nothing to read, and in read mode nothing to add either — the
          // invitation would name an action the click cannot perform.
          <Text variant="muted">
            {readOnly ? "No description" : "Add a description…"}
          </Text>
        )}
      </InlineEdit.Read>

      {/*
        Not `InlineEdit.Input`: the editor holds its own content and hands the
        markdown back on blur, and Enter has to stay a newline rather than
        saving.
      */}
      <InlineEdit.Edit>
        {({ commit }) => (
          <RichTextEditor
            testId="todo.detail.description.editor"
            content={richTextContent(todo.description, todo.descriptionDoc)}
            placeholder="Add a description…"
            editable
            autoFocus
            onBlur={(value) => {
              doc.current = value.doc;
              commit(value.markdown);
            }}
            // Escape is the keyboard's way out, and it keeps the writing:
            // the same commit clicking away performs. Deliberately not the
            // `cancel` that Escape means in a single-line field — a
            // description is long enough that discarding it silently would
            // be a loss, where a title can be retyped in seconds.
            onEscape={(value) => {
              doc.current = value.doc;
              commit(value.markdown);
            }}
          />
        )}
      </InlineEdit.Edit>
    </InlineEdit>
  );
}

function Subtasks({ todo }: { todo: TodoEntity }) {
  const { add, check, remove } = useTodoSubtasks({ id: todo.id });
  const [title, setTitle] = useState("");

  const subtasks = todo.subtasks;
  const doneCount = subtasks.filter((subtask) => subtask.done).length;
  const percentage =
    subtasks.length === 0 ? 0 : (doneCount / subtasks.length) * 100;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    // The service rejects a blank title anyway; stopping here keeps the field
    // from clearing as though something had been added.
    if (title.trim() === "") return;

    add.mutate(title);
    setTitle("");
  };

  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <Text variant="eyebrow" as="span">
          Subtasks
        </Text>
        {subtasks.length > 0 && (
          <>
            <span
              {...testProp("todo.detail.subtask.count")}
              className="text-muted-foreground text-xs tabular-nums">
              {doneCount}/{subtasks.length}
            </span>
            <Progress value={percentage} className="ml-auto h-1.5 w-24" />
          </>
        )}
      </div>

      <div className="flex flex-col">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            {...testProp(`todo.detail.subtask.${subtask.id}`)}
            className="group hover:bg-muted/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors">
            <Checkbox
              testId={`todo.detail.subtask.${subtask.id}.check`}
              checked={subtask.done}
              onCheckedChange={(done) =>
                check.mutate({ subtaskId: subtask.id, done: done === true })
              }
              className="size-5 rounded-full"
            />
            <span
              {...testProp(`todo.detail.subtask.${subtask.id}.title`)}
              data-done={subtask.done}
              className="text-foreground data-[done=true]:text-muted-foreground grow text-sm data-[done=true]:line-through">
              {subtask.title}
            </span>
            <Button
              testId={`todo.detail.subtask.${subtask.id}.delete.button`}
              variant="ghost"
              size="icon"
              aria-label="Delete subtask"
              onClick={() => remove.mutate(subtask.id)}
              className="text-muted-foreground hover:text-destructive size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-1 flex items-center gap-2">
        <Plus className="text-muted-foreground size-4 shrink-0" />
        <Input
          testId="todo.detail.subtask.add.input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add subtask"
          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <Button
          testId="todo.detail.subtask.add.button"
          type="submit"
          size="sm"
          variant="ghost"
          disabled={title.trim() === ""}>
          Add
        </Button>
      </form>
    </section>
  );
}
