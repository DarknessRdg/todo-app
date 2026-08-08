import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils.ts";
import { testProp } from "@/lib/test-id";
import { views, viewIsActive } from "@/layout/views";
import { ChevronRight, Hash, Plus, Search, Settings } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";

type AreaNode = {
  name: string;
  count?: number;
  defaultOpen?: boolean;
  children?: AreaNode[];
};

// The hierarchy represents areas of life / projects — not tasks.
const areas: AreaNode[] = [
  {
    name: "Personal",
    defaultOpen: true,
    children: [
      { name: "Health", count: 4 },
      { name: "Finance", count: 1 },
      { name: "Home", count: 2 },
    ],
  },
  {
    name: "Work",
    defaultOpen: true,
    children: [
      {
        name: "Project Alpha",
        defaultOpen: true,
        children: [
          { name: "Backend", count: 6 },
          { name: "Infrastructure", count: 3 },
        ],
      },
    ],
  },
  {
    name: "Learning",
    children: [
      { name: "AI", count: 2 },
      { name: "Go" },
      { name: "Architecture" },
    ],
  },
];

export function AppSidebar({ className }: { className?: string } = {}) {
  const { pathname } = useLocation();

  return (
    <Sidebar className="border-none">
      <SidebarContent
        className={cn(
          "bg-sidebar mx-3 my-4 gap-0 rounded-xl border",
          className
        )}>
        <SidebarHeader className="gap-3 px-3 pt-4 pb-2">
          <Logo />
          <button
            type="button"
            className="text-muted-foreground bg-muted hover:text-foreground flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors">
            <Search className="size-4" />
            <span>Search</span>
            <span className="kbd ml-auto">/</span>
          </button>
        </SidebarHeader>

        <SidebarGroup>
          <SidebarGroupLabel className="eyebrow">Views</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {views.map((view) => {
                const active = viewIsActive(view, pathname);

                return (
                  <SidebarMenuItem key={view.id}>
                    {/*
                      `asChild` so the rendered element is the Link's own
                      anchor: a real href the browser can open in a new tab or
                      copy, rather than a button that fakes navigation.
                    */}
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-9 gap-2.5">
                      <Link
                        to={view.path}
                        aria-current={active ? "page" : undefined}
                        {...testProp(`sidebar.view.${view.id}.link`)}>
                        <view.icon className="size-4.5" />
                        <span>{view.title}</span>
                        {view.count ? (
                          <span className="ml-auto text-xs tabular-nums opacity-90">
                            {view.count}
                          </span>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-1 flex-1">
          <SidebarGroupLabel className="eyebrow flex items-center justify-between pr-1">
            <span>Areas</span>
            <button
              type="button"
              aria-label="New area"
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-5 items-center justify-center rounded-md transition-colors">
              <Plus className="size-3.5" />
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex flex-col">
              {areas.map((node) => (
                <AreaTreeNode key={node.name} node={node} />
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarFooter className="px-2 pb-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors">
                <Settings className="size-4" />
                Settings
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-56 p-2">
              <p className="eyebrow px-2 pt-1 pb-2">Appearance</p>
              <ThemeToggle />
            </PopoverContent>
          </Popover>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}

function AreaTreeNode({ node }: { node: AreaNode }) {
  const hasChildren = !!node.children?.length;
  const [open, setOpen] = useState(node.defaultOpen ?? false);

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setOpen((v) => !v)}
        aria-expanded={hasChildren ? open : undefined}
        className="text-foreground hover:bg-sidebar-accent group flex h-8 w-full items-center gap-1.5 rounded-lg px-2 text-sm transition-colors">
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-90"
            )}
          />
        ) : (
          <Hash className="text-muted-foreground/70 size-3.5 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
        {node.count ? (
          <span className="text-muted-foreground ml-auto text-xs tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
            {node.count}
          </span>
        ) : null}
      </button>

      {hasChildren && open && (
        <div className="tree-rail ml-[13px] pl-2">
          {node.children!.map((child) => (
            <AreaTreeNode key={child.name} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
