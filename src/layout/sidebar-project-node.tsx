import { ChevronRight, Hash, Plus } from "lucide-react";
import { Link } from "react-router";

import type { ProjectEntity } from "@/backend/project-service";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useStickyToggle } from "@/hooks/use-sticky-toggle";
import { flagKey } from "@/lib/persisted-flag";
import { canAddChild, type ProjectNode } from "@/lib/project-tree";
import { testProp } from "@/lib/test-id";
import { cn } from "@/lib/utils";
import { ProjectRowMenu } from "@/layout/project-row-menu";

export type ProjectNodeActions = {
  onAddChild: (parentId: string) => void;
  onRename: (project: ProjectEntity) => void;
  onMove: (params: { id: string; parentId: string | undefined }) => void;
  onDelete: (project: ProjectEntity) => void;
};

/**
 * One project in the sidebar, and everything filed under it.
 *
 * Recursive rather than flattened, so a subtree collapses by not being
 * rendered — the alternative, drawing every row and hiding some, means the
 * reader's collapsed state has to be re-derived for every descendant on every
 * render.
 */
export function SidebarProjectNode({
  node,
  projects,
  pathname,
  openCount,
  actions,
  draftUnder,
  draft,
}: {
  node: ProjectNode<ProjectEntity>;
  /** The flat set, for the rules the menu asks about a move. */
  projects: readonly ProjectEntity[];
  pathname: string;
  openCount: (projectId: string) => number;
  actions: ProjectNodeActions;
  /** Which project is having a child named under it, if any. */
  draftUnder: string | undefined;
  /** The field that names it, drawn where the child will land. */
  draft: React.ReactNode;
}) {
  // Open by default: a fresh install should show the tree it has, not a row of
  // closed folders. Keyed per project, so collapsing one says nothing about
  // any other — and `useStickyToggle` survives the key changing under a
  // mounted component, which it does when the sidebar re-renders for a new
  // route without unmounting.
  const [open, setOpen] = useStickyToggle(flagKey("project", node.id), true);

  const path = `/project/${node.id}`;
  const active = pathname === path;
  const count = openCount(node.id);
  const hasChildren = node.children.length > 0;
  const testId = `sidebar.project.${node.id}`;

  return (
    <>
      <SidebarMenuItem className="group/project relative">
        {/*
          `asChild` so the rendered element is the Link's own anchor: a real
          href the browser can open in a new tab or copy.
        */}
        <SidebarMenuButton
          asChild
          isActive={active}
          className="h-8 gap-1.5 pr-14"
          // One indent per level, from the node's own depth rather than a
          // counter passed down — the tree already knows how deep it is.
          style={{ paddingLeft: `${(node.depth - 1) * 0.75 + 0.5}rem` }}>
          <Link
            to={path}
            aria-current={active ? "page" : undefined}
            {...testProp(`${testId}.link`)}>
            {hasChildren ? (
              <button
                type="button"
                aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
                aria-expanded={open}
                {...testProp(`${testId}.toggle`)}
                onClick={(event) => {
                  // The row is a link; the chevron is not a way of following it.
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(!open);
                }}
                className="text-muted-foreground/70 -ml-0.5 flex size-4 shrink-0 items-center justify-center rounded">
                <ChevronRight
                  className={cn("size-3.5 transition-transform", open && "rotate-90")}
                />
              </button>
            ) : (
              <Hash className="text-muted-foreground/70 size-3.5 shrink-0" />
            )}

            <span className="truncate">{node.name}</span>

            {count > 0 ? (
              <span
                {...testProp(`${testId}.count`)}
                className="text-muted-foreground ml-auto text-xs tabular-nums group-hover/project:opacity-0">
                {count}
              </span>
            ) : null}
          </Link>
        </SidebarMenuButton>

        {/*
          Outside the link, not inside it: an anchor may not contain buttons,
          and a menu that opened by following a href would be no menu at all.
        */}
        <div className="absolute top-1.5 right-1 flex items-center gap-0.5">
          {canAddChild(projects, node.id) && (
            <button
              type="button"
              aria-label={`New project in ${node.name}`}
              {...testProp(`${testId}.add.button`)}
              onClick={() => actions.onAddChild(node.id)}
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-5 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-focus-within/project:opacity-100 group-hover/project:opacity-100">
              <Plus className="size-3.5" />
            </button>
          )}

          <ProjectRowMenu
            project={node}
            projects={projects}
            onRename={() => actions.onRename(node)}
            onMove={(parentId) => actions.onMove({ id: node.id, parentId })}
            onDelete={() => actions.onDelete(node)}
          />
        </div>
      </SidebarMenuItem>

      {/*
        Named where it will land, rather than in a dialog or at the bottom of
        the list: the indent is the answer to "which project is this going in",
        and it is visible before the name is typed.
      */}
      {draftUnder === node.id ? draft : null}

      {open &&
        node.children.map((child) => (
          <SidebarProjectNode
            key={child.id}
            node={child}
            projects={projects}
            pathname={pathname}
            openCount={openCount}
            actions={actions}
            draftUnder={draftUnder}
            draft={draft}
          />
        ))}
    </>
  );
}
