import { Check, FolderIcon, Plus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Text } from "@/components/ui/text";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { dialogOf } from "@/lib/dialog-container";
import { cn } from "@/lib/utils";
import { useProjectCreate, useProjects } from "@/pages/inbox/use-projects";

type ProjectSelectProps = TestIdProps & {
  /** The selected project's id, or undefined for "no project". */
  value: string | undefined;
  onChange: (projectId: string | undefined) => void;
  /** Shown on the trigger when nothing is selected. */
  placeholder?: string;
  className?: string;
  /**
   * Which trigger edge the panel lines up with. `end` for a trigger sitting
   * against a right-hand edge, so the panel opens inward.
   */
  align?: "start" | "center" | "end";
};

/**
 * Picks a project, and makes one on the spot when the right one does not exist
 * yet — the whole point is not having to leave what you were doing to go and
 * create it somewhere else.
 *
 * Built on `Popover` rather than `Select` because it holds a text field: Radix's
 * Select owns the keyboard for type-ahead, so an input inside it never receives
 * what is typed.
 */
export function ProjectSelect({
  value,
  onChange,
  placeholder = "No project",
  className,
  align = "start",
  testId,
}: ProjectSelectProps) {
  const { projects } = useProjects();
  const create = useProjectCreate();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  const selected = projects.find((project) => project.id === value);

  // Read on every render rather than once: the trigger is null on the first
  // pass, and opening the popover re-renders, so by the time the panel mounts
  // this resolves.
  const dialog = dialogOf(trigger.current);

  const choose = (projectId: string | undefined) => {
    onChange(projectId);
    setOpen(false);
  };

  const submitNew = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = draft.trim();
    // The service refuses a blank name anyway; stopping here keeps the field
    // from clearing as though something had been created.
    if (name === "") return;

    const project = await create.mutateAsync(name);
    setDraft("");

    // An existing name comes back as the project already under it, so asking
    // for one that is already listed selects it instead of doing nothing.
    if (project !== undefined) choose(project.id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          testId={testId}
          variant="ghost"
          size="sm"
          type="button"
          className={cn(
            "text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2",
            className
          )}>
          <FolderIcon className="size-4" />
          <span className="text-xs">{selected?.name ?? placeholder}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        // Inside the todo modal the body is inert, so the panel has to live
        // within the dialog to be clickable at all — but the dialog is
        // `overflow-hidden` and its `translate-…-50%` makes it the containing
        // block for anything positioned, so it also *clips* what it holds.
        // Handing Radix the same element as the collision boundary is what
        // keeps the panel inside it rather than half cut off at the edge.
        container={dialog}
        collisionBoundary={dialog}
        collisionPadding={12}
        align={align}
        className="w-60 p-1.5">
        <div className="flex flex-col">
          <ProjectOption
            testId={testId === undefined ? undefined : `${testId}.none`}
            name={placeholder}
            selected={value === undefined}
            onSelect={() => choose(undefined)}
          />

          {projects.map((project) => (
            <ProjectOption
              key={project.id}
              testId={
                testId === undefined
                  ? undefined
                  : `${testId}.option.${project.id}`
              }
              name={project.name}
              selected={project.id === value}
              onSelect={() => choose(project.id)}
            />
          ))}
        </div>

        <div className="bg-border my-1.5 h-px" />

        <form onSubmit={submitNew} className="flex items-center gap-1">
          <Input
            testId={testId === undefined ? undefined : `${testId}.create.input`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="New project…"
            aria-label="New project name"
            className="h-8 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            testId={
              testId === undefined ? undefined : `${testId}.create.button`
            }
            type="submit"
            size="icon"
            variant="ghost"
            aria-label="Create project"
            disabled={draft.trim() === "" || create.isPending}
            className="size-8 shrink-0">
            <Plus className="size-4" />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function ProjectOption({
  name,
  selected,
  onSelect,
  testId,
}: TestIdProps & {
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      {...testProp(testId)}
      className="hover:bg-accent flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors">
      <Text variant="small" as="span" className="font-normal">
        {name}
      </Text>
      {selected && <Check className="size-3.5 shrink-0" />}
    </button>
  );
}
