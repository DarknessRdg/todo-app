import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { Inbox } from "@/pages/inbox/inbox";
import {
  createTestContainer,
  mockTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

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

describe("todo detail modal", () => {
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
});
