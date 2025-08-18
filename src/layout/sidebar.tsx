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

const items = [
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
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
export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Logo />
          </SidebarGroupLabel>
          <Separator className="mt-3 mb-5" />
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
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
