import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/layout/sidebar";
import { views } from "@/layout/views";
import { renderWithContainer } from "@/test/container";
import { setupUser, waitFor } from "@/test/user";

const viewLink = (id: string) => `sidebar.view.${id}.link`;

function renderSidebar(route: string) {
  return renderWithContainer(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
    { route }
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
});
