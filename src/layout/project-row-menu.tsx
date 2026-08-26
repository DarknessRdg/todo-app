import { FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectEntity } from "@/backend/project-service";
import { canMoveProject } from "@/lib/project-tree";
import { testProp } from "@/lib/test-id";

/**
 * What can be done to a project as a whole: rename it, file it somewhere else,
 * or delete it.
 *
 * The move submenu lists only the parents this project could actually go to —
 * a greyed list of twenty names the reader has to test one by one is noise, and
 * the rule that decides is the same one the service enforces, so the menu can
 * never offer something that would then be refused.
 */
export function ProjectRowMenu({
  project,
  projects,
  onRename,
  onMove,
  onDelete,
}: {
  project: ProjectEntity;
  projects: readonly ProjectEntity[];
  onRename: () => void;
  onMove: (parentId: string | undefined) => void;
  onDelete: () => void;
}) {
  const testId = `sidebar.project.${project.id}`;

  const targets = projects.filter(
    (candidate) =>
      candidate.id !== project.id &&
      canMoveProject(projects, { id: project.id, parentId: candidate.id })
  );

  // Already at the top level, so there is nowhere to promote it to.
  const canPromote = project.parentId !== undefined;
  const movable = canPromote || targets.length > 0;

  const moveTestId = `${testId}.move`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`More for ${project.name}`}
          {...testProp(`${testId}.menu.button`)}
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-5 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-focus-within/project:opacity-100 group-hover/project:opacity-100 data-[state=open]:opacity-100">
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuItem testId={`${testId}.rename.button`} onSelect={onRename}>
          <Pencil />
          Rename
        </DropdownMenuItem>

        {/*
          Flat rather than a submenu. A nested Radix menu is one more thing to
          open before the choice is even visible, and the list it hides is
          short — every project this one is *allowed* to go under, which the
          rule below has already narrowed.
        */}
        {movable && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel
              {...testProp(`${moveTestId}.label`)}
              className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
              <FolderInput className="size-3.5" />
              Move to
            </DropdownMenuLabel>

            {canPromote && (
              <DropdownMenuItem
                testId={`${moveTestId}.root.button`}
                onSelect={() => onMove(undefined)}>
                Top level
              </DropdownMenuItem>
            )}

            {targets.map((target) => (
              <DropdownMenuItem
                key={target.id}
                testId={`${moveTestId}.${target.id}.button`}
                onSelect={() => onMove(target.id)}>
                {target.name}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          testId={`${testId}.delete.button`}
          variant="destructive"
          onSelect={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
