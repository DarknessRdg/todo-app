import { cleanup, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppRouteTable } from "@/router";
import { renderWithContainer } from "@/test/container";
import { setupUser, waitFor } from "@/test/user";

const notFound = "not-found";
const notFoundInboxLink = "not-found.inbox.link";

function renderAt(route: string) {
  return renderWithContainer(<AppRouteTable />, { route });
}

describe("routing", () => {
  describe("when the url matches no route", () => {
    it("Then the not-found page stands in for the missing one", async () => {
      renderAt("/nowhere");

      expect(await screen.findByTestId(notFound)).toBeInTheDocument();
    });

    it("Then the url is left as it was, so it can be read and corrected", async () => {
      const { currentLocation } = renderAt("/nowhere");

      await screen.findByTestId(notFound);

      expect(currentLocation()).toBe("/nowhere");
    });

    it("Then the inbox is one click away", async () => {
      const user = setupUser();
      const { currentLocation } = renderAt("/nowhere");

      await user.click(await screen.findByTestId(notFoundInboxLink));

      await waitFor(() => expect(currentLocation()).toBe("/"));
    });

    it("Then a deep unknown url is caught too, not just a top-level one", async () => {
      renderAt("/todo/abc/extra/segments");

      expect(await screen.findByTestId(notFound)).toBeInTheDocument();
    });
  });

  describe("when the url matches a route", () => {
    /**
     * Every view in the sidebar now has a page of its own, so nothing lands on
     * a placeholder any more — `ComingSoon` is gone with the last of them.
     */
    it("Then the not-found page stays away", async () => {
      renderAt("/overdue");

      expect(
        await screen.findByTestId("overdue.page.title")
      ).toBeInTheDocument();
      expect(screen.queryByTestId(notFound)).not.toBeInTheDocument();
    });

    it("Then /upcoming and /completed are pages of their own too", async () => {
      renderAt("/upcoming");
      expect(
        await screen.findByTestId("upcoming.page.title")
      ).toBeInTheDocument();

      cleanup();

      renderAt("/completed");
      expect(
        await screen.findByTestId("completed.page.title")
      ).toBeInTheDocument();
    });

    it("Then /settings is a page of its own, not the placeholder", async () => {
      renderAt("/settings");

      expect(
        await screen.findByTestId("settings.page.title")
      ).toBeInTheDocument();
      expect(screen.queryByTestId(notFound)).not.toBeInTheDocument();
    });

    it("Then /labels is the built view, not the placeholder", async () => {
      renderAt("/labels");

      expect(
        await screen.findByTestId("labels.page.title")
      ).toBeInTheDocument();
    });

    it("Then /today is the built view, not the placeholder", async () => {
      renderAt("/today");

      expect(await screen.findByTestId("today.page.title")).toBeInTheDocument();
    });
  });
});
