import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <Toaster />

      <main className="bg-background relative grow">
        <SidebarTrigger className="text-muted-foreground absolute top-4 left-2 z-10 md:hidden" />
        <div className="w-full px-6 py-10 md:px-10 lg:px-14">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
