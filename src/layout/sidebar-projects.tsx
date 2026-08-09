import { Hash, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Text } from "@/components/ui/text";
import { testProp } from "@/lib/test-id";
import { useProjectCreate, useProjects } from "@/pages/inbox/use-projects";
import { useTodoList } from "@/pages/inbox/use-todo-list";

/**
 * The projects section of the sidebar.
 *
 * Creating one happens here rather than on a settings page somewhere: the
 * moment you want a project is the moment you are looking at the list that
 * does not have it.
 */
export function SidebarProjects() {
  const { pathname } = useLocation();
  const { projects } = useProjects();
  const { allTodos } = useTodoList();
  const create = useProjectCreate();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  // Enter submits and closes the field, and closing it fires a blur that would
  // otherwise submit the same name a second time.
  const settled = useRef(false);

  /** Open todos per project, so a count never advertises finished work. */
  const openCount = (projectId: string) =>
    allTodos?.filter((todo) => todo.projectId === projectId && !todo.done)
      .length ?? 0;

  const startAdding = () => {
    setDraft("");
    settled.current = false;
    setAdding(true);
  };

  const submit = () => {
    if (settled.current) return;
    settled.current = true;
    setAdding(false);

    const name = draft.trim();
    // The service refuses a blank name anyway; stopping here keeps the field
    // from closing as though something had been created.
    if (name === "") return;

    create.mutate(name);
  };

  return (
    <SidebarGroup className="mt-1 flex-1">
      <SidebarGroupLabel className="eyebrow flex items-center justify-between pr-1">
        <span>Projects</span>
        <button
          type="button"
          aria-label="New project"
          onClick={startAdding}
          {...testProp("sidebar.project.create.button")}
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-5 items-center justify-center rounded-md transition-colors">
          <Plus className="size-3.5" />
        </button>
      </SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu>
          {projects.map((project) => {
            const path = `/project/${project.id}`;
            const active = pathname === path;
            const count = openCount(project.id);

            return (
              <SidebarMenuItem key={project.id}>
                {/*
                  `asChild` so the rendered element is the Link's own anchor: a
                  real href the browser can open in a new tab or copy.
                */}
                <SidebarMenuButton asChild isActive={active} className="h-8 gap-1.5">
                  <Link
                    to={path}
                    aria-current={active ? "page" : undefined}
                    {...testProp(`sidebar.project.${project.id}.link`)}>
                    <Hash className="text-muted-foreground/70 size-3.5 shrink-0" />
                    <span className="truncate">{project.name}</span>
                    {count > 0 ? (
                      <span
                        {...testProp(`sidebar.project.${project.id}.count`)}
                        className="text-muted-foreground ml-auto text-xs tabular-nums">
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {adding && (
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
                settled.current = true;
                setAdding(false);
              }
            }}
            className="mt-1 h-8 px-2 text-sm"
          />
        )}

        {projects.length === 0 && !adding && (
          <Text variant="muted" className="px-2 py-1.5 text-xs">
            No projects yet.
          </Text>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
