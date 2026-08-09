import { Logo } from "@/components/logo";
import { Text } from "@/components/ui/text";
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
import { SidebarProjects } from "@/layout/sidebar-projects";
import { views, viewIsActive } from "@/layout/views";
import { useTodoList } from "@/pages/inbox/use-todo-list";
import { Search, Settings } from "lucide-react";
import { Link, useLocation } from "react-router";

export function AppSidebar({ className }: { className?: string } = {}) {
  const { pathname } = useLocation();
  // Open todos only: a sidebar count is a to-do count, not a total, and one
  // that includes finished work never goes down.
  const { todoList } = useTodoList();
  const openCount = todoList?.length ?? 0;

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
          </button>
        </SidebarHeader>

        <SidebarGroup>
          <SidebarGroupLabel className="eyebrow">Views</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {views.map((view) => {
                const active = viewIsActive(view, pathname);
                // Only the inbox is built, so it is the only view whose count
                // can be counted rather than guessed.
                const count = view.id === "inbox" ? openCount : 0;

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
                        {count > 0 ? (
                          <span
                            {...testProp(`sidebar.view.${view.id}.count`)}
                            className="ml-auto text-xs tabular-nums opacity-90">
                            {count}
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

        <SidebarProjects />

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
              <Text variant="eyebrow" className="px-2 pt-1 pb-2">
                Appearance
              </Text>
              <ThemeToggle />
            </PopoverContent>
          </Popover>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
