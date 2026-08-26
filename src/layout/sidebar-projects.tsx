import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

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
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Text } from "@/components/ui/text";
import type { ProjectEntity } from "@/backend/project-service";
import { buildProjectTree } from "@/lib/project-tree";
import { testProp } from "@/lib/test-id";
import { SidebarProjectNode } from "@/layout/sidebar-project-node";
import {
  useProjectCreate,
  useProjectDelete,
  useProjectMove,
  useProjectRename,
  useProjects,
} from "@/pages/inbox/use-projects";
import { useTodoList } from "@/pages/inbox/use-todo-list";

/** What the top-level `+` files a project under: nothing. */
const TopLevel = "__root__";

/**
 * The projects section of the sidebar, as a tree.
 *
 * Creating one happens here rather than on a settings page somewhere: the
 * moment you want a project is the moment you are looking at the list that
 * does not have it. The same goes for filing one inside another — the shape of
 * the tree is only ever obvious while looking at it.
 */
export function SidebarProjects() {
  const { pathname } = useLocation();
  const { projects } = useProjects();
  const { allTodos } = useTodoList();
  const create = useProjectCreate();
  const rename = useProjectRename();
  const move = useProjectMove();
  const remove = useProjectDelete();

  /** Which project a new child is being named under — `TopLevel` for none. */
  const [addingUnder, setAddingUnder] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState<string | undefined>();
  const [deleting, setDeleting] = useState<ProjectEntity | undefined>();
  // Enter submits and closes the field, and closing it fires a blur that would
  // otherwise submit the same name a second time.
  const settled = useRef(false);

  const tree = useMemo(() => buildProjectTree(projects), [projects]);

  /**
   * Open todos per project, so a count never advertises finished work.
   *
   * Counted once into a map rather than filtered per row: the tree renders one
   * row per project and a filter each would be quadratic in the number of
   * todos, on a sidebar that is mounted on every page.
   */
  const openCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const todo of allTodos ?? []) {
      if (todo.done || todo.projectId === undefined) continue;
      counts.set(todo.projectId, (counts.get(todo.projectId) ?? 0) + 1);
    }

    return counts;
  }, [allTodos]);

  const startAdding = (parentId: string) => {
    setDraft("");
    settled.current = false;
    setRenaming(undefined);
    setAddingUnder(parentId);
  };

  const submit = () => {
    if (settled.current) return;
    settled.current = true;

    const under = addingUnder;
    const name = draft.trim();
    setAddingUnder(undefined);

    // The service refuses a blank name anyway; stopping here keeps the field
    // from closing as though something had been created.
    if (name === "" || under === undefined) return;

    create.mutate({
      name,
      parentId: under === TopLevel ? undefined : under,
    });
  };

  const submitRename = (project: ProjectEntity) => {
    if (settled.current) return;
    settled.current = true;

    const name = draft.trim();
    setRenaming(undefined);

    if (name === "" || name === project.name) return;

    rename.mutate({ id: project.id, name });
  };

  const cancel = () => {
    settled.current = true;
    setAddingUnder(undefined);
    setRenaming(undefined);
  };

  /** The field that names a new project, wherever it is about to land. */
  const draftField = (
    <div className="px-1 py-0.5">
      <Input
        testId="sidebar.project.create.input"
        autoFocus
        value={draft}
        aria-label="New project name"
        placeholder="Project name…"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={submit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className="h-8 px-2 text-sm"
      />
    </div>
  );

  return (
    <SidebarGroup className="mt-1 flex-1">
      <SidebarGroupLabel className="eyebrow flex items-center justify-between pr-1">
        <span>Projects</span>
        <button
          type="button"
          aria-label="New project"
          onClick={() => startAdding(TopLevel)}
          {...testProp("sidebar.project.create.button")}
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-5 items-center justify-center rounded-md transition-colors">
          <Plus className="size-3.5" />
        </button>
      </SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu>
          {tree.map((node) =>
            renaming === node.id ? (
              <RenameRow
                key={node.id}
                project={node}
                draft={draft}
                onChange={setDraft}
                onSubmit={() => submitRename(node)}
                onCancel={cancel}
              />
            ) : (
              <SidebarProjectNode
                key={node.id}
                node={node}
                projects={projects}
                pathname={pathname}
                openCount={(id) => openCounts.get(id) ?? 0}
                draftUnder={addingUnder}
                draft={draftField}
                actions={{
                  onAddChild: startAdding,
                  onRename: (project) => {
                    setDraft(project.name);
                    settled.current = false;
                    setAddingUnder(undefined);
                    setRenaming(project.id);
                  },
                  onMove: (params) => move.mutate(params),
                  onDelete: setDeleting,
                }}
              />
            )
          )}
        </SidebarMenu>

        {addingUnder === TopLevel && draftField}

        {projects.length === 0 && addingUnder === undefined && (
          <Text variant="muted" className="px-2 py-1.5 text-xs">
            No projects yet.
          </Text>
        )}
      </SidebarGroupContent>

      <DeleteProjectDialog
        project={deleting}
        projects={projects}
        openTodos={
          deleting === undefined ? 0 : (openCounts.get(deleting.id) ?? 0)
        }
        onClose={() => setDeleting(undefined)}
        onConfirm={(id) => {
          remove.mutate(id);
          setDeleting(undefined);
        }}
      />
    </SidebarGroup>
  );
}

/**
 * A project being renamed in place, rather than in a dialog — the name is one
 * short string and the row it belongs to is right there.
 */
function RenameRow({
  project,
  draft,
  onChange,
  onSubmit,
  onCancel,
}: {
  project: ProjectEntity;
  draft: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-1 py-0.5">
      <Input
        testId={`sidebar.project.${project.id}.rename.input`}
        autoFocus
        value={draft}
        aria-label={`Rename ${project.name}`}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onSubmit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        className="h-8 px-2 text-sm"
      />
    </div>
  );
}

/**
 * One dialog for the whole tree, driven by which project is going — rather than
 * one mounted per row, on a sidebar that is on screen for every page.
 *
 * It names both consequences with real counts, because neither is obvious: the
 * children do not go with it, and the todos do not either. Nothing is destroyed
 * except the project row itself, which is what makes one confirmation enough.
 */
function DeleteProjectDialog({
  project,
  projects,
  openTodos,
  onClose,
  onConfirm,
}: {
  project: ProjectEntity | undefined;
  projects: readonly ProjectEntity[];
  openTodos: number;
  onClose: () => void;
  onConfirm: (id: string) => void;
}) {
  if (project === undefined) return null;

  const children = projects.filter(
    (candidate) => candidate.parentId === project.id
  );
  const parent = projects.find((candidate) => candidate.id === project.parentId);

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent testId="sidebar.project.delete.dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            <Text className="text-inherit">
              The project goes. Nothing filed in it does:
              {openTodos > 0
                ? ` its ${openTodos} open ${openTodos === 1 ? "todo" : "todos"} move back to the Inbox`
                : " it holds no open todos"}
              {children.length > 0
                ? `, and its ${children.length} sub-${children.length === 1 ? "project" : "projects"} move up to ${parent?.name ?? "the top level"}.`
                : "."}
            </Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel testId="sidebar.project.delete.cancel">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            testId="sidebar.project.delete.confirm"
            variant="destructive"
            onClick={() => onConfirm(project.id)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
