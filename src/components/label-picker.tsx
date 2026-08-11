import { Check, Plus, Tag, X } from "lucide-react";
import { useState } from "react";

import type { LabelEntity } from "@/backend/label-service";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { testProp } from "@/lib/test-id";
import { cn } from "@/lib/utils";

/**
 * The labels on one todo: the chips it carries, and the picker that changes
 * them.
 *
 * Taking a label off is a click on its chip, with no confirmation — the label
 * still exists, and this only says the todo is not one of the ones carrying it.
 * Deleting the label itself is the destructive one, and lives in the sidebar
 * behind a dialog.
 *
 * A name that matches nothing offers to create it, so labelling a todo never
 * means leaving to go and make the label first.
 */
export function LabelPicker({
  testId,
  labels,
  selectedIds,
  onChange,
  onCreate,
}: {
  testId: string;
  /** Every label there is, to choose from. */
  labels: LabelEntity[];
  selectedIds: string[];
  onChange: (labelIds: string[]) => void;
  /** Creates one and puts it on the todo. */
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const matches = labels.filter((label) =>
    label.name.toLowerCase().includes(needle)
  );
  const exact = labels.some((label) => label.name.toLowerCase() === needle);

  const selected = selectedIds
    .map((id) => labels.find((label) => label.id === id))
    // A label deleted in another tab leaves its id behind; drawing a chip for
    // a name nobody can read is worse than drawing nothing.
    .filter((label): label is LabelEntity => label !== undefined);

  const toggle = (id: string) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((it) => it !== id)
        : [...selectedIds, id]
    );

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {selected.map((label) => (
        <Badge
          key={label.id}
          variant="secondary"
          className="gap-1 pr-1 font-normal">
          <Tag className="size-3" />
          {label.name}
          <button
            type="button"
            aria-label={`Remove ${label.name}`}
            {...testProp(`${testId}.${label.id}.remove.button`)}
            onClick={() => toggle(label.id)}
            className="text-muted-foreground hover:text-foreground rounded-full">
            <X className="size-3" />
          </button>
        </Badge>
      ))}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setQuery("");
        }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Add a label"
            {...testProp(`${testId}.add.button`)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-6 items-center gap-1 rounded-md px-1.5 text-xs transition-colors">
            <Plus className="size-3.5" />
            {selected.length === 0 && "Label"}
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-56 p-2">
          <Input
            testId={`${testId}.search.input`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find or create…"
            aria-label="Find or create a label"
            autoFocus
            className="h-8"
          />

          <Separator className="my-2" />

          <div className="flex max-h-56 flex-col overflow-y-auto">
            {matches.map((label) => {
              const checked = selectedIds.includes(label.id);

              return (
                <button
                  key={label.id}
                  type="button"
                  {...testProp(`${testId}.${label.id}.button`)}
                  onClick={() => toggle(label.id)}
                  className={cn(
                    "hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    checked && "bg-accent"
                  )}>
                  <Tag className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate">{label.name}</span>
                  {checked && <Check className="ml-auto size-3.5 shrink-0" />}
                </button>
              );
            })}

            {matches.length === 0 && needle === "" && (
              <Text variant="muted" className="px-2 py-3">
                No labels yet.
              </Text>
            )}
          </div>

          {needle !== "" && !exact && (
            <button
              type="button"
              {...testProp(`${testId}.create.button`)}
              onClick={() => {
                onCreate(query.trim());
                setQuery("");
              }}
              className="hover:bg-accent mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm">
              <Plus className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate">Create “{query.trim()}”</span>
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
