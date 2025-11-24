import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Calendar1, CalendarDays, CalendarX, Inbox } from "lucide-react";
import { cn } from "@/lib/utils.ts";

const items = [
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
    active: true,
  },
  {
    title: "Today",
    url: "#",
    icon: Calendar1,
  },
  {
    title: "Upcoming",
    url: "#",
    icon: CalendarDays,
  },
  {
    title: "Overdue",
    url: "#",
    icon: CalendarX,
  },
];
export function AppSidebar({ className }: { className?: string } = {}) {
  return (
    <Sidebar className="border-none">
      <SidebarContent
        className={cn("bg-sidebar mx-4 my-5 rounded-2xl border", className)}>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Logo />
          </SidebarGroupLabel>
          <Separator className="mt-3 mb-5" />
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.active}>
                    <a href={item.url}>
                      <item.icon size={20} className="h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
