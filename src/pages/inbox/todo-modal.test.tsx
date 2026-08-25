import { QueryClient } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react";
import { setupUser, waitFor, type User } from "@/test/user";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { Inbox } from "@/pages/inbox/inbox";
import {
  createTestContainer,
  mockTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

const descriptionRead = "todo.detail.description.read";
const descriptionEditor = "todo.detail.description.editor";

/**
 * Renders the inbox with one todo and its detail modal already open. The todo
 * is generated, so nothing here depends on a particular id or title — the test
 * ids are derived from whatever was generated.
 */
function renderInboxWithModalOpen(overrides: Partial<TodoEntity> = {}) {
  const todo = makeTodo(overrides);

  const repository = mockTodoRepository();
  repository.listAll.mockResolvedValue([todo]);
  repository.getById.mockResolvedValue(todo);
  repository.count.mockResolvedValue(1);

  const rendered = renderWithContainer(<Inbox />, {
    diContainer: createTestContainer(repository),
    route: `/?todo=${todo.id}`,
  });

  return {
    ...rendered,
    todo,
    repository,
    modal: `home.todo.${todo.id}.modal`,
    rowTitle: `home.todo.${todo.id}.title`,
    fullScreenButton: `home.todo.${todo.id}.modal.fullscreen.button`,
    fullScreenTooltip: `home.todo.${todo.id}.modal.fullscreen.tooltip`,
  };
}

/**
 * Models how a browser really dismisses a modal by clicking the backdrop:
 * `pointerdown` fires first, and only then is the click target hit-tested
 * again. If the backdrop tore itself down in between, the click lands on
 * whatever is now underneath — which is exactly the reopen bug.
 *
 * `user.click` cannot express this: it resolves the target once, up front.
 */
async function dismissByClickingOutside(rowTitle: string) {
  fireEvent.pointerDown(screen.getByTestId("dialog.overlay"), {
    button: 0,
    pointerId: 1,
    pointerType: "mouse",
  });

  await act(async () => {});

  const topmost =
    screen.queryByTestId("dialog.overlay") ?? screen.getByTestId(rowTitle);
  fireEvent.click(topmost);
}

/**
 * The one file over the global 1s budget, and the only place the exception is
 * granted. Opening the modal mounts a full ProseMirror editor (tiptap +
 * lowlight's ~35 grammars) before any spec here can click anything, and under a
 * parallel run that alone can pass a second.
 *
 * It is granted rather than fixed because these specs need the real editor —
 * they exist to prove a popover survives being inside a modal dialog, which a
 * mocked editor could not show. Cutting the cost means keeping the editor out
 * of the *other* files that only incidentally render it.
 */
/**
 * The inbox with `?todo=<id>` pointing at a todo the repository cannot hand
 * back — either because it is not there, or because the read blew up. The list
 * is left empty so nothing but the modal is under test.
 */
function renderInboxWithUnreadableTodo({
  reason,
  queryClient,
}: {
  reason: "missing" | "error";
  queryClient?: QueryClient;
}) {
  const id = makeTodo().id;
  const repository = mockTodoRepository();

  if (reason === "error") {
    repository.getById.mockRejectedValue(new Error("the database is gone"));
  }

  return {
    ...renderWithContainer(<Inbox />, {
      diContainer: createTestContainer(repository),
      route: `/?todo=${id}`,
      queryClient,
    }),
    id,
    repository,
    modal: `home.todo.${id}.modal`,
    missing: "todo.detail.missing",
    missingClose: "todo.detail.missing.close.button",
    failed: "todo.detail.error",
    failedRetry: "todo.detail.error.retry.button",
  };
}

describe("todo detail modal", { timeout: 3000 }, () => {
  it("when the url carries a todo id, Then the modal is open", async () => {
    const { modal } = renderInboxWithModalOpen();

    expect(await screen.findByTestId(modal)).toBeInTheDocument();
  });

  it("when clicking outside, Then it closes once and does not flicker back open", async () => {
    const { modal, rowTitle, currentLocation } = renderInboxWithModalOpen();

    await screen.findByTestId(modal);

    // A reopen can be transient, so watch the DOM rather than sampling after
    // the fact — waitFor would happily miss a modal that came back and left.
    let reopened = 0;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (
            node.matches(`[data-test-id="${modal}"]`) ||
            node.querySelector(`[data-test-id="${modal}"]`)
          ) {
            reopened += 1;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    await dismissByClickingOutside(rowTitle);

    await waitFor(() => expect(currentLocation()).toBe("/"));
    await new Promise((resolve) => setTimeout(resolve, 100));
    observer.disconnect();

    expect(reopened).toBe(0);
    expect(screen.queryByTestId(modal)).not.toBeInTheDocument();
    expect(currentLocation()).toBe("/");
  });

  it("when I open the description's link popover inside it, Then the popover is usable", async () => {
    const user = setupUser();
    renderInboxWithModalOpen({ description: "read the docs" });

    // The frame now opens before the read finishes, so waiting on the modal
    // itself no longer means the detail is in it — wait for the content.
    await user.click(await screen.findByTestId("todo.detail.description.read"));
    await user.click(await screen.findByTestId("editor.toolbar.link.button"));

    // A dialog makes everything outside it inert, so a popover portalled to the
    // body lands outside the modal and cannot be typed into.
    const url = await screen.findByTestId("editor.toolbar.link.url.input");
    await user.type(url, "https://x.dev");

    expect(url).toHaveValue("https://x.dev");
  });

  describe("when I press escape while editing the description", () => {
    /** Opens the modal with the description already in its editor. */
    async function editDescription(user: User) {
      const rendered = renderInboxWithModalOpen({
        description: "the old notes",
      });

      await user.click(await screen.findByTestId(descriptionRead));
      // Clicked into rather than relying on the editor's own autofocus, which
      // jsdom does not honour — the caret has to really be in the text or the
      // keys under test land on the dialog instead.
      await user.click(await screen.findByTestId(descriptionEditor));

      return rendered;
    }

    it("Then the modal stays open", async () => {
      const user = setupUser();
      const { modal } = await editDescription(user);

      await user.keyboard("{Escape}");

      // Flushed rather than polled: `waitFor` on something still being there is
      // satisfied by the first tick, before a closing dialog would have gone.
      await act(async () => {});
      expect(screen.getByTestId(modal)).toBeInTheDocument();
    });

    /**
     * Escape is the keyboard's Cancel now that the editor has one — it puts the
     * saved text back and closes, rather than committing on the way out. The
     * modal itself still stands down for the key (see the spec above), which is
     * what stops the same press closing the dialog.
     */
    it("Then what I wrote is discarded rather than saved", async () => {
      const user = setupUser();
      const { repository } = await editDescription(user);

      await user.keyboard(" and a new line{Escape}");
      await user.click(await screen.findByTestId("editor.discard.confirm"));

      await screen.findByTestId(descriptionRead);
      expect(repository.updateDescription).not.toHaveBeenCalled();
      expect(screen.getByTestId(descriptionRead)).not.toHaveTextContent(
        "and a new line"
      );
    });

    it("Then the editor gives way to the read view", async () => {
      const user = setupUser();
      await editDescription(user);

      await user.keyboard("{Escape}");

      expect(await screen.findByTestId(descriptionRead)).toBeInTheDocument();
      expect(screen.queryByTestId(descriptionEditor)).not.toBeInTheDocument();
    });
  });

  it("when I press escape with the description at rest, Then the modal closes", async () => {
    const user = setupUser();
    const { modal, currentLocation } = renderInboxWithModalOpen();

    await screen.findByTestId(modal);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(currentLocation()).toBe("/"));
    expect(screen.queryByTestId(modal)).not.toBeInTheDocument();
  });

  describe("when the modal opens", () => {
    it("Then the full screen label stays down, though the dialog focuses its button", async () => {
      const { modal, fullScreenButton, fullScreenTooltip } =
        renderInboxWithModalOpen();

      await screen.findByTestId(modal);
      // The dialog moves focus onto the first control as it opens, which is
      // what used to bring the tooltip up with it.
      (await screen.findByTestId(fullScreenButton)).focus();

      // Flushed rather than polled: `waitFor` on an absence is satisfied by the
      // first tick, which is before the tooltip it is meant to catch would have
      // rendered — the assertion has to run after React has settled.
      await act(async () => {});

      expect(screen.queryByTestId(fullScreenTooltip)).not.toBeInTheDocument();
    });

    it("Then pointing at that button still explains it", async () => {
      const user = setupUser();
      const { fullScreenButton, fullScreenTooltip } =
        renderInboxWithModalOpen();

      await user.hover(await screen.findByTestId(fullScreenButton));

      expect(await screen.findByTestId(fullScreenTooltip)).toBeInTheDocument();
    });
  });

  it("when I open it full screen, Then the url becomes the todo's own page", async () => {
    const user = setupUser();
    const { fullScreenButton, todo, currentLocation } =
      renderInboxWithModalOpen();

    await user.click(await screen.findByTestId(fullScreenButton));

    await waitFor(() => expect(currentLocation()).toBe(`/todo/${todo.id}`));
  });

  describe("when the todo behind the url is not there", () => {
    it("Then it says so, instead of vanishing without a word", async () => {
      const { missing } = renderInboxWithUnreadableTodo({ reason: "missing" });

      expect(await screen.findByTestId(missing)).toBeInTheDocument();
    });

    it("Then the url keeps the id, so it can still be read off it", async () => {
      const { missing, id, currentLocation } = renderInboxWithUnreadableTodo({
        reason: "missing",
      });

      await screen.findByTestId(missing);

      expect(currentLocation()).toBe(`/?todo=${id}`);
    });

    it("Then dismissing it takes the todo back out of the url", async () => {
      const user = setupUser();
      const { missingClose, currentLocation } = renderInboxWithUnreadableTodo({
        reason: "missing",
      });

      await user.click(await screen.findByTestId(missingClose));

      await waitFor(() => expect(currentLocation()).toBe("/"));
    });
  });

  describe("when the lookup itself fails", () => {
    it("Then it says so, rather than claiming the todo is gone", async () => {
      const { failed, missing } = renderInboxWithUnreadableTodo({
        reason: "error",
      });

      expect(await screen.findByTestId(failed)).toBeInTheDocument();
      expect(screen.queryByTestId(missing)).not.toBeInTheDocument();
    });

    it("Then retrying re-reads the todo", async () => {
      const user = setupUser();
      const { failedRetry, repository } = renderInboxWithUnreadableTodo({
        reason: "error",
      });

      await user.click(await screen.findByTestId(failedRetry));

      await waitFor(() => expect(repository.getById).toHaveBeenCalledTimes(2));
    });

    // As on the todo page: the harness disables retries, so this spec brings
    // its own client with the production defaults or it could not fail.
    it("Then it is not retried behind a spinner, so the failure surfaces at once", async () => {
      const { failed, repository } = renderInboxWithUnreadableTodo({
        reason: "error",
        queryClient: new QueryClient(),
      });

      await screen.findByTestId(failed);

      expect(repository.getById).toHaveBeenCalledTimes(1);
    });
  });
});
