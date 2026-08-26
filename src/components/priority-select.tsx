import { useRef, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PriorityBadge } from "@/pages/inbox/todo-meta";
import { dialogOf } from "@/lib/dialog-container";
import {
  TodoPriorities,
  priorityLabel,
  type TodoPriority,
} from "@/lib/priority";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { cn } from "@/lib/utils";

type PrioritySelectProps = TestIdProps & {
  value: TodoPriority | undefined;
  onChange: (priority: TodoPriority | undefined) => void;
  /** What the trigger says when nothing has been chosen. */
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
};

/**
 * How urgent a todo is, chosen from the four levels — or taken back to nothing,
 * which is a real answer rather than a fifth level.
 *
 * A `Popover` rather than a `Select`, matching `ProjectSelect`: the panel holds
 * badges rather than plain text, and the two controls sit next to each other in
 * the properties panel where a mismatch would show.
 */
export function PrioritySelect({
  value,
  onChange,
  placeholder = "None",
  className,
  align = "start",
  testId,
}: PrioritySelectProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  // Read on every render rather than once: the trigger is null on the first
  // pass, and opening the popover re-renders, so by the time the panel mounts
  // this resolves.
  const dialog = dialogOf(trigger.current);

  const choose = (priority: TodoPriority | undefined) => {
    onChange(priority);
    setOpen(false);
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
          {value === undefined ? (
            <span className="text-xs">{placeholder}</span>
          ) : (
            <PriorityBadge priority={value} />
          )}
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
        className="w-48 p-1.5">
        <div className="flex flex-col">
          <PriorityOption
            testId={testId === undefined ? undefined : `${testId}.none`}
            label={placeholder}
            selected={value === undefined}
            onSelect={() => choose(undefined)}
          />

          {/* Most urgent first: a list that escalates downwards reads as a
              ranking, and the level being reached for is usually the top one. */}
          {[...TodoPriorities].reverse().map((priority) => (
            <PriorityOption
              key={priority}
              testId={
                testId === undefined ? undefined : `${testId}.${priority}`
              }
              label={priorityLabel[priority]}
              badge={priority}
              selected={value === priority}
              onSelect={() => choose(priority)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PriorityOption({
  testId,
  label,
  badge,
  selected,
  onSelect,
}: TestIdProps & {
  label: string;
  badge?: TodoPriority;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      {...testProp(testId)}
      type="button"
      onClick={onSelect}
      className="hover:bg-muted flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm">
      {badge === undefined ? (
        <span className="text-muted-foreground">{label}</span>
      ) : (
        <PriorityBadge priority={badge} />
      )}
      {selected ? <Check className="size-3.5 shrink-0" /> : null}
    </button>
  );
}
