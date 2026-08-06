import { Route, Routes } from "react-router";
import { Inbox } from "./pages/inbox/inbox";
import { TodoPage } from "./pages/todo/todo-page";
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
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Inbox />} />
            <Route path="todo/:id" element={<TodoPage />} />
          </Route>
        </Routes>
      </ContainerContext.Provider>
    </QueryClientProvider>
  );
}
