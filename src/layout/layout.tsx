import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <Toaster />

      <main className="grow-1 px-8 py-5">
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
