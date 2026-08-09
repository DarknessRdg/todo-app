import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/layout/sidebar";
import { views } from "@/layout/views";
import {
  createTestContainer,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";
import { setupUser, waitFor } from "@/test/user";

const viewLink = (id: string) => `sidebar.view.${id}.link`;
const inboxCount = "sidebar.view.inbox.count";

function renderSidebar(
  route: string,
  todos: ReturnType<typeof makeTodo>[] = []
) {
  return renderWithContainer(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
    { route, diContainer: createTestContainer(inMemoryTodoRepository(todos)) }
  );
}

describe("sidebar", () => {
  describe("when it renders", () => {
    it("Then every view is an anchor, so it can be opened in a new tab", () => {
      renderSidebar("/");

      for (const view of views) {
        expect(screen.getByTestId(viewLink(view.id)).tagName).toBe("A");
      }
    });

    it("Then each view carries the url of its own subtree", () => {
      renderSidebar("/");

      const hrefs = Object.fromEntries(
        views.map((view) => [
          view.id,
          screen.getByTestId(viewLink(view.id)).getAttribute("href"),
        ])
      );

      expect(hrefs).toEqual({
        inbox: "/",
        today: "/today",
        upcoming: "/upcoming",
        overdue: "/overdue",
        completed: "/completed",
        labels: "/labels",
      });
    });
  });

  describe("when I click a view from a todo's own page", () => {
    it("Then inbox takes me back to the root", async () => {
      const user = setupUser();
      const { currentLocation } = renderSidebar("/todo/abc123");

      await user.click(screen.getByTestId(viewLink("inbox")));

      await waitFor(() => expect(currentLocation()).toBe("/"));
    });

    it("Then another view takes me to its own url", async () => {
      const user = setupUser();
      const { currentLocation } = renderSidebar("/todo/abc123");

      await user.click(screen.getByTestId(viewLink("upcoming")));

      await waitFor(() => expect(currentLocation()).toBe("/upcoming"));
    });
  });

  describe("when the url changes", () => {
    it("Then the view owning it is the one marked current", () => {
      renderSidebar("/overdue");

      expect(screen.getByTestId(viewLink("overdue"))).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("Then a todo's own page still marks inbox, not the todo", () => {
      renderSidebar("/todo/abc123");

      expect(screen.getByTestId(viewLink("inbox"))).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("Then the views that do not own it are left unmarked", () => {
      renderSidebar("/overdue");

      expect(screen.getByTestId(viewLink("inbox"))).not.toHaveAttribute(
        "aria-current"
      );
    });
  });

  describe("when the inbox has open todos", () => {
    it("Then it carries their count", async () => {
      renderSidebar("/", [
        makeTodo({ done: false }),
        makeTodo({ done: false }),
      ]);

      expect(await screen.findByTestId(inboxCount)).toHaveTextContent("2");
    });

    it("Then finished ones are left out of it", async () => {
      renderSidebar("/", [makeTodo({ done: false }), makeTodo({ done: true })]);

      expect(await screen.findByTestId(inboxCount)).toHaveTextContent("1");
    });

    it("Then nothing open shows no count at all, rather than a zero", async () => {
      renderSidebar("/", [makeTodo({ done: true })]);

      await screen.findByTestId(viewLink("inbox"));

      expect(screen.queryByTestId(inboxCount)).not.toBeInTheDocument();
    });
  });

  it("when a view is not built yet, Then it carries no invented count", async () => {
    renderSidebar("/", [makeTodo({ done: false })]);

    await screen.findByTestId(viewLink("today"));

    expect(screen.queryByTestId("sidebar.view.today.count")).not.toBeInTheDocument();
  });
});
