import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router";

import { useNavigation } from "@/hooks/navigation";

/**
 * Reports where the *router* thinks it is, which is the thing under test: the
 * browser's url carries the basename, the router's location does not.
 */
function Harness() {
  const { removeQueryParms } = useNavigation();
  const location = useLocation();

  return (
    <>
      <button data-test-id="drop" onClick={() => removeQueryParms("todo")}>
        drop
      </button>
      <span data-test-id="path">{location.pathname}</span>
      <span data-test-id="search">{location.search}</span>
    </>
  );
}

/**
 * Mounts the hook at `url`, with the browser's address bar set to the same
 * place. Both halves matter: the bug this covers came from reading the address
 * bar instead of the router, and the two only differ once the app is served
 * from a sub-path.
 */
function renderAt({ url, basename }: { url: string; basename?: string }) {
  window.history.replaceState({}, "", url);

  // The entry carries the basename, exactly as the address bar does — the
  // router is what strips it back off.
  return render(
    <MemoryRouter basename={basename} initialEntries={[url]}>
      <Harness />
    </MemoryRouter>
  );
}

afterEach(() => window.history.replaceState({}, "", "/"));

const path = () => screen.getByTestId("path").textContent;
const search = () => screen.getByTestId("search").textContent;

describe("useNavigation", () => {
  /**
   * GitHub Pages serves the app from `/todo-app/`, so the address bar carries
   * that prefix and the router's own location does not. Closing the todo modal
   * dropped a query param, and reading the path off the browser handed the
   * prefix back to a router that adds it again — `/todo-app` became
   * `/todo-app/todo-app`, and the app was gone.
   */
  describe("when I drop a query param and the app is served from a sub-path", () => {
    it("Then it stays where it was, rather than nesting the sub-path inside itself", async () => {
      const user = userEvent.setup();
      renderAt({ url: "/todo-app?todo=abc", basename: "/todo-app" });

      await user.click(screen.getByTestId("drop"));

      await waitFor(() => expect(search()).toBe(""));
      expect(path()).toBe("/");
    });
  });

  describe("when I drop a query param from a nested page", () => {
    it("Then the page it was dropped from is the page it stays on", async () => {
      const user = userEvent.setup();
      renderAt({ url: "/todo/abc?todo=def" });

      await user.click(screen.getByTestId("drop"));

      await waitFor(() => expect(search()).toBe(""));
      expect(path()).toBe("/todo/abc");
    });

    it("Then the params it was not asked about are left alone", async () => {
      const user = userEvent.setup();
      renderAt({ url: "/?todo=abc&filter=open" });

      await user.click(screen.getByTestId("drop"));

      await waitFor(() => expect(search()).toBe("?filter=open"));
    });
  });
});
