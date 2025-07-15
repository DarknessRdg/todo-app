import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { Outlet } from "react-router";

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />

      <main className="grow-1 px-8 py-5">
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
