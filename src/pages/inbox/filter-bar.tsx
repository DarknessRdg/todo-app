import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { testProp } from "@/lib/test-id";
import {
  defaultTodoSort,
  emptyTodoFilter,
  isTodoFilterActive,
  type DueFilter,
  type TodoFilter,
  type TodoSort,
} from "@/lib/todo-filter";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/pages/inbox/todo-meta";
import { useLabels } from "@/pages/inbox/use-labels";
import {
  TodoPriorities,
  priorityLabel,
  type TodoPriority,
} from "@/lib/priority";
import type { LabelEntity } from "@/backend/label-service";
import { dayFromKey } from "@/lib/todo-filter";
import {
  ArrowUpDown,
  CalendarRange,
  ChevronDown,
  ListChecks,
  Search,
  SignalHigh,
  Tag,
  X,
} from "lucide-react";
import { useState } from "react";

/* -------------------------------------------------------------------------- */
/* The options each menu offers                                                */
/* -------------------------------------------------------------------------- */

const dueOptions: { id: string; label: string; due: DueFilter }[] = [
  { id: "any", label: "Any time", due: { kind: "any" } },
  { id: "today", label: "Today", due: { kind: "preset", preset: "today" } },
  { id: "week", label: "This week", due: { kind: "preset", preset: "week" } },
  {
    id: "month",
    label: "This month",
    due: { kind: "preset", preset: "month" },
  },
  { id: "overdue", label: "Overdue", due: { kind: "overdue" } },
  { id: "undated", label: "No due date", due: { kind: "undated" } },
];

/**
 * Most urgent first, and then the todos nobody has ranked.
 *
 * `"unset"` is not a level — see `TodoFilter.priority`. It is here because
 * "what have I not triaged yet" is one of the more useful things to ask a list,
 * and it can only be asked of an absence.
 */
const priorityOptions: { id: TodoPriority | "unset"; label: string }[] = [
  ...[...TodoPriorities].reverse().map((priority) => ({
    id: priority,
    label: priorityLabel[priority],
  })),
  { id: "unset", label: "None" },
];

/* -------------------------------------------------------------------------- */

/**
 * Every menu here is `modal={false}`.
 *
 * A modal Radix menu puts `pointer-events: none` on everything outside itself,
 * so clicking a *second* filter's trigger while the first is open is spent
 * dismissing the first — the bar looked stuck, needing one click to close and
 * another to open. Non-modal, the click dismisses one and opens the other,
 * which is what a row of filters is expected to do. Nothing here needs the
 * modal behaviour: there is no scroll to lock and nothing underneath to protect.
 */

/**
 * The inbox's filter bar. Every control writes the whole filter back, and the
 * filter itself lives in the url — see `useTodoFilter`.
 */
export function FilterBar({
  filter,
  onChange,
  sort,
  onSortChange,
  hide = [],
}: {
  filter: TodoFilter;
  onChange: (filter: TodoFilter) => void;
  sort: TodoSort;
  onSortChange: (sort: TodoSort) => void;
  /**
   * Controls the page has already decided, and the reader cannot. `/overdue` is
   * a due filter, so offering a due menu there would be offering to widen a
   * page past what it is — a control that either does nothing or takes you
   * somewhere the heading no longer describes.
   */
  hide?: FilterControl[];
}) {
  const set = (patch: Partial<TodoFilter>) => onChange({ ...filter, ...patch });
  const shows = (control: FilterControl) => !hide.includes(control);

  return (
    <div
      {...testProp("home.filter")}
      className="flex flex-wrap items-center gap-2">
      <div className="relative flex min-w-52 grow items-center sm:grow-0">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 size-3.5" />
        <Input
          testId="home.filter.search.input"
          value={filter.query}
          onChange={(event) => set({ query: event.target.value })}
          placeholder="Search todos"
          aria-label="Search todos"
          className="bg-card h-9 border-0 pl-8 shadow-none"
        />
      </div>

      {shows("due") && <DueMenu filter={filter} onChange={onChange} />}

      {shows("priority") && (
        <PriorityMenu
          value={filter.priority}
          onPick={(priority) => set({ priority })}
        />
      )}

      <SortMenu value={sort} onPick={onSortChange} />

      {shows("labels") && (
        <LabelPicker
          selected={filter.labels}
          onChange={(labels) => set({ labels })}
        />
      )}

      {shows("done") && (
        <FilterToggle
          testId="home.filter.done.toggle"
          label="Hide done"
          pressed={filter.hideDone}
          onPressedChange={(hideDone) => set({ hideDone })}
        />
      )}

      {shows("subtasks") && (
        <FilterToggle
          testId="home.filter.subtasks.toggle"
          label="Open subtasks"
          icon={<ListChecks className="size-3.5" />}
          pressed={filter.openSubtasks}
          onPressedChange={(openSubtasks) => set({ openSubtasks })}
        />
      )}

      {isTodoFilterActive(filter) && (
        <Button
          testId="home.filter.clear.button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-9 gap-1.5"
          onClick={() => onChange(emptyTodoFilter)}>
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}

/**
 * The due menu. A day picked off the calendar in the rail is not one of these
 * options, so it is shown as itself — the bar has to be able to say what the
 * list is showing however the filter was set.
 */
function DueMenu({
  filter,
  onChange,
}: {
  filter: TodoFilter;
  onChange: (filter: TodoFilter) => void;
}) {
  const active = dueOptions.find((option) => option.id === dueId(filter.due));

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <FilterTrigger
          testId="home.filter.due.menu"
          active={filter.due.kind !== "any"}>
          <CalendarRange className="size-3.5" />
          {active?.label ?? pickedDayLabel(filter.due)}
          <ChevronDown className="size-3 opacity-50" />
        </FilterTrigger>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-44">
        {dueOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            testId={`home.filter.due.${option.id}.button`}
            onSelect={() => onChange({ ...filter, due: option.due })}
            className={cn(option.id === dueId(filter.due) && "bg-accent")}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Which option a filter corresponds to, or undefined for a picked day. */
function dueId(due: DueFilter): string | undefined {
  return due.kind === "preset"
    ? due.preset
    : due.kind === "day"
      ? undefined
      : due.kind;
}

function pickedDayLabel(due: DueFilter): string {
  if (due.kind !== "day") return "Any time";

  const date = dayFromKey(due.day);
  return date === undefined ? "Any time" : formatDateShort(date);
}

/**
 * Labels, searchable and multi-select.
 *
 * Checkboxes rather than one-of: a todo carries several labels, so asking for
 * one at a time is the odd case. Picking does not close the popover — the whole
 * point of a list of checkboxes is ticking more than one.
 *
 * A popover rather than a `DropdownMenu`, because a menu claims every keystroke
 * for its own typeahead and pulls focus onto its items, so the search box
 * inside one could not be typed into. The list is also the filter expected to
 * outgrow the screen: a fixed menu of every label in the workspace stops being
 * usable long before it stops being rendered.
 */
function LabelPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (labels: string[]) => void;
}) {
  const { labels } = useLabels();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const matches = labels.filter((label) =>
    label.name.toLowerCase().includes(needle)
  );

  const toggle = (label: string) =>
    onChange(
      selected.includes(label)
        ? selected.filter((it) => it !== label)
        : [...selected, label]
    );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reopening starts from the whole list: a search left behind from last
        // time reads as "these are all the labels there are".
        if (next) setQuery("");
      }}>
      <PopoverTrigger asChild>
        <FilterTrigger
          testId="home.filter.label.menu"
          active={selected.length > 0}>
          <Tag className="size-3.5" />
          {labelTriggerText(selected, labels)}
          <ChevronDown className="size-3 opacity-50" />
        </FilterTrigger>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-2">
        <Input
          testId="home.filter.label.search.input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a label"
          aria-label="Find a label"
          autoFocus
          className="h-8"
        />

        <Separator className="my-2" />

        <div className="flex max-h-56 flex-col overflow-y-auto">
          {matches.map((label) => {
            const checked = selected.includes(label.id);

            return (
              <label
                key={label.id}
                className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                <Checkbox
                  testId={`home.filter.label.${label.name.toLowerCase()}.checkbox`}
                  checked={checked}
                  onCheckedChange={() => toggle(label.id)}
                />
                <span className="truncate">{label.name}</span>
              </label>
            );
          })}

          {matches.length === 0 && (
            <Text
              testId="home.filter.label.empty"
              variant="muted"
              className="px-2 py-3">
              {labels.length === 0 ? "No labels yet." : "No label matches."}
            </Text>
          )}
        </div>

        {selected.length > 0 && (
          <button
            type="button"
            {...testProp("home.filter.label.clear.button")}
            onClick={() => onChange([])}
            className="text-muted-foreground hover:text-foreground mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm">
            <X className="size-3.5" />
            Clear labels
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** "Label", the one name, or how many — the trigger has to fit in the bar. */
function labelTriggerText(selected: string[], labels: LabelEntity[]): string {
  if (selected.length === 0) return "Label";
  if (selected.length === 1) {
    return labels.find((label) => label.id === selected[0])?.name ?? "Label";
  }

  return `${selected.length} labels`;
}

/** One of the two menus over data the app does not store yet. */
/**
 * Sorting sits in the same bar as the filters and the same query string, but it
 * is not one of them: it never hides a todo, so it deliberately does not count
 * towards `isTodoFilterActive` and the Clear button leaves it alone. Clearing a
 * filter you set is one thing; being put back in an order you did not choose is
 * another.
 */
/** The controls a page can take off the bar because it has already decided. */
export type FilterControl = "due" | "priority" | "labels" | "done" | "subtasks";

const sortOptions: { id: TodoSort; label: string }[] = [
  { id: "manual", label: "Default order" },
  { id: "due", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "title", label: "Title" },
];

function SortMenu({
  value,
  onPick,
}: {
  value: TodoSort;
  onPick: (sort: TodoSort) => void;
}) {
  const chosen = sortOptions.find((option) => option.id === value);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <FilterTrigger
          testId="home.filter.sort.menu"
          active={value !== defaultTodoSort}>
          <ArrowUpDown className="size-3.5" />
          {value === defaultTodoSort ? "Sort" : chosen?.label}
          <ChevronDown className="size-3 opacity-50" />
        </FilterTrigger>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-44">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            testId={`home.filter.sort.${option.id}.button`}
            onSelect={() => onPick(option.id)}
            className={cn(option.id === value && "bg-accent")}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const testId = "home.filter.priority";

function PriorityMenu({
  value,
  onPick,
}: {
  value: TodoPriority | "unset" | undefined;
  onPick: (value: TodoPriority | "unset" | undefined) => void;
}) {
  const chosen = priorityOptions.find((option) => option.id === value);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <FilterTrigger testId={`${testId}.menu`} active={value !== undefined}>
          <SignalHigh className="size-3.5" />
          {chosen?.label ?? "Priority"}
          <ChevronDown className="size-3 opacity-50" />
        </FilterTrigger>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-44">
        {priorityOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            testId={`${testId}.${option.id}.button`}
            onSelect={() => onPick(option.id)}
            className={cn(option.id === value && "bg-accent")}>
            {option.label}
          </DropdownMenuItem>
        ))}

        {value !== undefined && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              testId={`${testId}.any.button`}
              onSelect={() => onPick(undefined)}>
              Any priority
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterTrigger({
  testId,
  active,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { testId: string; active: boolean }) {
  return (
    <Button
      {...props}
      testId={testId}
      variant="ghost"
      size="sm"
      className={cn(
        "h-9 gap-1.5 rounded-md px-2.5 font-normal",
        active ? "bg-accent text-accent-foreground" : "bg-card"
      )}>
      {children}
    </Button>
  );
}

function FilterToggle({
  testId,
  label,
  icon,
  pressed,
  onPressedChange,
}: {
  testId: string;
  label: string;
  icon?: React.ReactNode;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}) {
  return (
    <Toggle
      testId={testId}
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      aria-label={label}
      className={cn(
        "h-9 gap-1.5 px-2.5 text-sm font-normal",
        pressed ? "" : "bg-card"
      )}>
      {icon}
      {label}
    </Toggle>
  );
}
