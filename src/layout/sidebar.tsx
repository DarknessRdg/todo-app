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
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils.ts";
import { testProp } from "@/lib/test-id";
import { SidebarProjects } from "@/layout/sidebar-projects";
import { views, viewIsActive } from "@/layout/views";
import { useTodoList } from "@/pages/inbox/use-todo-list";
import { Settings } from "lucide-react";
import { Link, useLocation } from "react-router";

export function AppSidebar({ className }: { className?: string } = {}) {
  const { pathname } = useLocation();
  // Open todos only: a sidebar count is a to-do count, not a total, and one
  // that includes finished work never goes down.
  const { todoList } = useTodoList();
  const openCount = todoList?.length ?? 0;
  const settingsActive = pathname === "/settings";

  return (
    <Sidebar className="border-none">
      <SidebarContent
        className={cn(
          "bg-sidebar mx-3 my-4 gap-0 rounded-xl border",
          className
        )}>
        {/*
          No search box here: the one in the inbox's filter bar is the real
          one, and this was a button that never did anything. Two search
          affordances, one of them dead, is worse than one that works.
        */}
        <SidebarHeader className="gap-3 px-3 pt-4 pb-2">
          <Logo />
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

        {/*
          Settings is a page now, so this is a real anchor like every view
          above it — it was a popover holding a single switch, which made the
          one setting the app has reachable only by knowing to look inside a
          menu. The switch keeps its place beside it: changing the theme is
          something you do while reading, and sending someone to another page
          to do it is a round trip for a thing that takes one click.
        */}
        <SidebarFooter className="px-2 pb-3">
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              aria-current={settingsActive ? "page" : undefined}
              data-active={settingsActive}
              {...testProp("sidebar.settings.link")}
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground flex h-9 grow items-center gap-2 rounded-lg px-2.5 text-sm transition-colors">
              <Settings className="size-4" />
              Settings
            </Link>

            <ThemeToggle testId="sidebar.theme.toggle" variant="icon" />
          </div>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
