import { Route, Routes } from "react-router";
import { Inbox } from "./pages/inbox/inbox";
import { TodayPage } from "./pages/today/today-page";
import { LabelsPage } from "./pages/labels/labels-page";
import { TodoPage } from "./pages/todo/todo-page";
import { ProjectPage } from "./pages/project/project-page";
import { ComingSoon } from "./pages/coming-soon/coming-soon";
import { NotFound } from "./pages/not-found/not-found";
import { AppLayout } from "./layout/layout";
import { views } from "./layout/views";
import { createDIContainer } from "./di-container";
import { ContainerContext } from "./di-container/hook";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Container } from "inversify";

const queryClient = new QueryClient();

/** The sidebar views that have a real page; the rest get the placeholder. */
const builtViews = ["/", "/today", "/labels"];

const unbuiltViews = views.filter((view) => !builtViews.includes(view.path));

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
        {/*
          The sidebar links to every view by url, so each one needs a route
          to land on. These are placeholders until the views are built.
        */}
        {unbuiltViews.map((view) => (
          <Route key={view.id} path={view.path} element={<ComingSoon />} />
        ))}
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
