import { Route, Routes } from "react-router";
import { Inbox } from "./pages/inbox/inbox";
import { TodayPage } from "./pages/today/today-page";
import { LabelsPage } from "./pages/labels/labels-page";
import { TodoPage } from "./pages/todo/todo-page";
import { ProjectPage } from "./pages/project/project-page";
import { LabelPage } from "./pages/label/label-page";
import { UpcomingPage } from "./pages/upcoming/upcoming-page";
import { OverduePage } from "./pages/overdue/overdue-page";
import { CompletedPage } from "./pages/completed/completed-page";
import { SettingsPage } from "./pages/settings/settings-page";
import { NotFound } from "./pages/not-found/not-found";
import { AppLayout } from "./layout/layout";
import { createDIContainer } from "./di-container";
import { ContainerContext } from "./di-container/hook";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Container } from "inversify";

const queryClient = new QueryClient();

export function AppRoutes() {
  const [diContainer, setDiContainer] = useState<Container | null>(null);

  useEffect(() => {
    createDIContainer().then((c) => setDiContainer(c));
  }, []);

  if (!diContainer) {
    return <div>loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ContainerContext.Provider value={diContainer}>
        <AppRouteTable />
      </ContainerContext.Provider>
    </QueryClientProvider>
  );
}

/**
 * Every url the app answers to. Split out from `AppRoutes` so it can be
 * exercised on its own: the wrapper opens IndexedDB before it renders anything,
 * which a routing test has no business waiting for.
 */
export function AppRouteTable() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Inbox />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="labels" element={<LabelsPage />} />
        <Route path="label/:id" element={<LabelPage />} />
        {/*
          Every view in the sidebar now has a page of its own. They are all the
          same listing asking a different question — see
          `@/components/listing` — which is why adding one is a file of about
          forty lines rather than a placeholder.
        */}
        <Route path="upcoming" element={<UpcomingPage />} />
        <Route path="overdue" element={<OverduePage />} />
        <Route path="completed" element={<CompletedPage />} />
        {/* Not one of `views`: settings is reached from the sidebar footer,
            not from the list of things to look at. Its groups are urls of
            their own, so a group can be linked to and returned to. */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/:section" element={<SettingsPage />} />
        <Route path="todo/:id" element={<TodoPage />} />
        <Route path="project/:id" element={<ProjectPage />} />
        {/*
          Last, and inside the layout: an address that matches nothing still
          gets the sidebar, so the reader can navigate out rather than hitting
          a dead end.
        */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
