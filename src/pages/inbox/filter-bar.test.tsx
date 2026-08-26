import { screen } from "@testing-library/react";
import { setupUser, waitFor, type User } from "@/test/user";
import { describe, expect, it } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { dayKey } from "@/lib/due-dates";
import { Inbox } from "@/pages/inbox/inbox";
import type { LabelEntity } from "@/backend/label-service";
import {
  createTestContainer,
  inMemoryLabelRepository,
  inMemoryTodoRepository,
  mockProjectRepository,
  renderWithContainer,
} from "@/test/container";
import { makeLabel, makeTodo } from "@/test/todo-factory";

/**
 * Driven through the whole inbox rather than the bar alone: the filter lives in
 * the url, and what it is for is the list — a bar tested on its own would prove
 * only that a dropdown opens.
 */
function renderInbox(
  todos: TodoEntity[],
  route = "/",
  labels: LabelEntity[] = []
) {
  const repository = inMemoryTodoRepository(todos);

  return {
    ...renderWithContainer(<Inbox />, {
      diContainer: createTestContainer(
        repository,
        mockProjectRepository(),
        inMemoryLabelRepository(labels)
      ),
      route,
    }),
    repository,
  };
}

const daysFromToday = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const isListed = (todo: TodoEntity) =>
  screen.queryByTestId(`home.todo.${todo.id}.title`) !== null;

/** Opens the due menu and picks one of its options. */
async function pickDue(user: User, option: string) {
  await user.click(screen.getByTestId("home.filter.due.menu"));
  await user.click(
    await screen.findByTestId(`home.filter.due.${option}.button`)
  );
}

describe("inbox filter bar", () => {
  describe("when I search the list", () => {
    it("Then only matching todos stay on screen", async () => {
      const user = setupUser();
      const docs = makeTodo({ title: "Read the docs", done: false });
      const ship = makeTodo({ title: "Ship it", done: false });
      renderInbox([docs, ship]);

      await waitFor(() => expect(isListed(ship)).toBe(true));
      // Two letters, not four: every keystroke is a url write and a re-render,
      // and "do" narrows to the same one todo that "docs" would.
      await user.type(screen.getByTestId("home.filter.search.input"), "do");

      await waitFor(() => expect(isListed(ship)).toBe(false));
      expect(isListed(docs)).toBe(true);
    });

    it("Then the search is in the url, so the view can be linked to", async () => {
      const user = setupUser();
      const { currentLocation } = renderInbox([makeTodo({ done: false })]);

      await user.type(screen.getByTestId("home.filter.search.input"), "do");

      await waitFor(() => expect(currentLocation()).toContain("q=do"));
    });

    it("Then a search matching nothing says so, rather than reading as an empty inbox", async () => {
      const user = setupUser();
      renderInbox([makeTodo({ title: "Read the docs", done: false })]);

      await user.type(screen.getByTestId("home.filter.search.input"), "zzz");

      expect(
        await screen.findByTestId("home.todo.empty.filtered")
      ).toBeInTheDocument();
      expect(screen.queryByTestId("home.todo.empty")).not.toBeInTheDocument();
    });
  });

  describe("when the url already carries a filter", () => {
    it("Then the list opens filtered", async () => {
      const docs = makeTodo({ title: "Read the docs", done: false });
      const ship = makeTodo({ title: "Ship it", done: false });
      renderInbox([docs, ship], "/?q=docs");

      await waitFor(() => expect(isListed(docs)).toBe(true));
      expect(isListed(ship)).toBe(false);
    });
  });

  describe("when I hide what is done", () => {
    it("Then the done section goes with it", async () => {
      const user = setupUser();
      const open = makeTodo({ done: false });
      const closed = makeTodo({ done: true });
      renderInbox([open, closed]);

      await waitFor(() => expect(isListed(closed)).toBe(true));
      await user.click(screen.getByTestId("home.filter.done.toggle"));

      await waitFor(() => expect(isListed(closed)).toBe(false));
      expect(isListed(open)).toBe(true);
      expect(screen.queryByTestId("home.todo.section.done")).toBeNull();
    });
  });

  describe("when I filter by when things are due", () => {
    it("Then today keeps only what is due today", async () => {
      const user = setupUser();
      const now = makeTodo({ done: false, dueDate: daysFromToday(0) });
      const later = makeTodo({ done: false, dueDate: daysFromToday(9) });
      renderInbox([now, later]);

      await waitFor(() => expect(isListed(later)).toBe(true));
      await pickDue(user, "today");

      await waitFor(() => expect(isListed(later)).toBe(false));
      expect(isListed(now)).toBe(true);
    });

    it("Then overdue keeps only what is already late", async () => {
      const user = setupUser();
      const late = makeTodo({ done: false, dueDate: daysFromToday(-2) });
      const now = makeTodo({ done: false, dueDate: daysFromToday(0) });
      renderInbox([late, now]);

      await waitFor(() => expect(isListed(now)).toBe(true));
      await pickDue(user, "overdue");

      await waitFor(() => expect(isListed(now)).toBe(false));
      expect(isListed(late)).toBe(true);
    });

    it("Then no due date keeps only what was never scheduled", async () => {
      const user = setupUser();
      const someday = makeTodo({ done: false, dueDate: undefined });
      const now = makeTodo({ done: false, dueDate: daysFromToday(0) });
      renderInbox([someday, now]);

      await waitFor(() => expect(isListed(now)).toBe(true));
      await pickDue(user, "undated");

      await waitFor(() => expect(isListed(now)).toBe(false));
      expect(isListed(someday)).toBe(true);
    });
  });

  describe("when one menu is open and I click another", () => {
    it("Then the second one opens on that click, rather than on a second one", async () => {
      const user = setupUser();
      renderInbox([makeTodo({ done: false })]);

      await user.click(screen.getByTestId("home.filter.due.menu"));
      await screen.findByTestId("home.filter.due.today.button");

      await user.click(screen.getByTestId("home.filter.priority.menu"));

      expect(
        await screen.findByTestId("home.filter.priority.urgent.button")
      ).toBeInTheDocument();
    });
  });

  describe("when I click a day in the calendar", () => {
    const dayButton = (date: Date) =>
      screen.getByTestId(`home.overview.calendar.${dayKey(date)}.button`);

    it("Then the list narrows to that day", async () => {
      const user = setupUser();
      const now = makeTodo({ done: false, dueDate: daysFromToday(0) });
      const later = makeTodo({ done: false, dueDate: daysFromToday(2) });
      renderInbox([now, later]);

      await waitFor(() => expect(isListed(later)).toBe(true));
      await user.click(dayButton(daysFromToday(2)));

      await waitFor(() => expect(isListed(now)).toBe(false));
      expect(isListed(later)).toBe(true);
    });

    it("Then the day it picked is in the url", async () => {
      const user = setupUser();
      const later = makeTodo({ done: false, dueDate: daysFromToday(2) });
      const { currentLocation } = renderInbox([later]);

      await waitFor(() => expect(isListed(later)).toBe(true));
      await user.click(dayButton(daysFromToday(2)));

      await waitFor(() =>
        expect(currentLocation()).toContain(`due=${dayKey(daysFromToday(2))}`)
      );
    });
  });

  describe("when I clear the filters", () => {
    it("Then every todo comes back", async () => {
      const user = setupUser();
      const docs = makeTodo({ title: "Read the docs", done: false });
      const ship = makeTodo({ title: "Ship it", done: false });
      renderInbox([docs, ship], "/?q=docs");

      await waitFor(() => expect(isListed(docs)).toBe(true));
      await user.click(screen.getByTestId("home.filter.clear.button"));

      await waitFor(() => expect(isListed(ship)).toBe(true));
    });

    it("Then the url is clean again", async () => {
      const user = setupUser();
      const { currentLocation } = renderInbox(
        [makeTodo({ done: false })],
        "/?q=docs&done=hide"
      );

      await user.click(await screen.findByTestId("home.filter.clear.button"));

      await waitFor(() => expect(currentLocation()).toBe("/"));
    });

    it("Then there is nothing to clear until something is filtered", async () => {
      renderInbox([makeTodo({ done: false })]);

      await waitFor(() =>
        expect(screen.queryByTestId("home.filter.clear.button")).toBeNull()
      );
    });
  });

  describe("when I look for a label in a list too long to read", () => {
    const frontend = makeLabel({ name: "Frontend" });
    const bug = makeLabel({ name: "Bug" });

    const renderWithLabels = () =>
      renderInbox([makeTodo({ done: false })], "/", [frontend, bug]);

    const openLabels = async (user: User) =>
      user.click(screen.getByTestId("home.filter.label.menu"));

    it("Then typing narrows the labels on offer", async () => {
      const user = setupUser();
      renderWithLabels();

      await openLabels(user);
      await user.type(
        await screen.findByTestId("home.filter.label.search.input"),
        "fro"
      );

      expect(
        await screen.findByTestId("home.filter.label.frontend.checkbox")
      ).toBeInTheDocument();
      expect(screen.queryByTestId("home.filter.label.bug.checkbox")).toBeNull();
    });

    it("Then a search matching no label says so", async () => {
      const user = setupUser();
      renderWithLabels();

      await openLabels(user);
      await user.type(
        await screen.findByTestId("home.filter.label.search.input"),
        "zzz"
      );

      expect(
        await screen.findByTestId("home.filter.label.empty")
      ).toBeInTheDocument();
    });

    it("Then reopening it starts from the whole list again", async () => {
      const user = setupUser();
      renderWithLabels();

      await openLabels(user);
      await user.type(
        await screen.findByTestId("home.filter.label.search.input"),
        "fro"
      );
      await user.keyboard("{Escape}");
      await openLabels(user);

      expect(
        await screen.findByTestId("home.filter.label.bug.checkbox")
      ).toBeInTheDocument();
      expect(screen.getByTestId("home.filter.label.search.input")).toHaveValue(
        ""
      );
    });
  });

  describe("when I tick labels in the filter", () => {
    const bug = makeLabel({ name: "Bug" });
    const ux = makeLabel({ name: "UX" });

    const openLabels = async (user: User) =>
      user.click(screen.getByTestId("home.filter.label.menu"));

    const tick = async (user: User, name: string) =>
      user.click(
        await screen.findByTestId(`home.filter.label.${name}.checkbox`)
      );

    it("Then only todos carrying that label stay on screen", async () => {
      const user = setupUser();
      const bugged = makeTodo({ done: false, labelIds: [bug.id] });
      const other = makeTodo({ done: false, labelIds: [] });
      renderInbox([bugged, other], "/", [bug, ux]);

      await waitFor(() => expect(isListed(other)).toBe(true));
      await openLabels(user);
      await tick(user, "bug");

      await waitFor(() => expect(isListed(other)).toBe(false));
      expect(isListed(bugged)).toBe(true);
    });

    it("Then ticking a second one widens it to either", async () => {
      const user = setupUser();
      const bugged = makeTodo({ done: false, labelIds: [bug.id] });
      const uxed = makeTodo({ done: false, labelIds: [ux.id] });
      renderInbox([bugged, uxed], `/?label=${bug.id}`, [bug, ux]);

      await waitFor(() => expect(isListed(uxed)).toBe(false));
      await openLabels(user);
      await tick(user, "ux");

      await waitFor(() => expect(isListed(uxed)).toBe(true));
      expect(isListed(bugged)).toBe(true);
    });

    it("Then every one I ticked is in the url", async () => {
      const user = setupUser();
      const { currentLocation } = renderInbox(
        [makeTodo({ done: false })],
        "/",
        [bug, ux]
      );

      await openLabels(user);
      await tick(user, "bug");

      await waitFor(() =>
        expect(currentLocation()).toContain(`label=${bug.id}`)
      );
    });

    it("Then ticking one again takes it back off", async () => {
      const user = setupUser();
      const { currentLocation } = renderInbox(
        [makeTodo({ done: false })],
        `/?label=${bug.id}`,
        [bug, ux]
      );

      await openLabels(user);
      await tick(user, "bug");

      await waitFor(() => expect(currentLocation()).toBe("/"));
    });

    it("Then clearing the labels drops them all at once", async () => {
      const user = setupUser();
      const { currentLocation } = renderInbox(
        [makeTodo({ done: false })],
        `/?label=${bug.id}&label=${ux.id}`,
        [bug, ux]
      );

      await openLabels(user);
      await user.click(
        await screen.findByTestId("home.filter.label.clear.button")
      );

      await waitFor(() => expect(currentLocation()).toBe("/"));
    });
  });

  describe("when I change the sort", () => {
    it("Then the url carries it", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });
      const { currentLocation } = renderInbox([todo]);

      await waitFor(() => expect(isListed(todo)).toBe(true));
      await user.click(screen.getByTestId("home.filter.sort.menu"));
      await user.click(await screen.findByTestId("home.filter.sort.due.button"));

      await waitFor(() => expect(currentLocation()).toContain("sort=due"));
    });

    /**
     * Sorting hides nothing, so it must not put the list into the state that
     * offers to clear filters nobody set.
     */
    it("Then the filters do not start claiming to be set", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });
      renderInbox([todo]);

      await waitFor(() => expect(isListed(todo)).toBe(true));
      await user.click(screen.getByTestId("home.filter.sort.menu"));
      await user.click(
        await screen.findByTestId("home.filter.sort.title.button")
      );

      await waitFor(() =>
        expect(screen.getByTestId("home.filter.sort.menu")).toHaveTextContent(
          "Title"
        )
      );
      expect(
        screen.queryByTestId("home.filter.clear.button")
      ).not.toBeInTheDocument();
    });
  });

  describe("when I pick a priority", () => {
    /** An urgent todo and an unranked one, so both halves are visible. */
    const ranked = () => [
      makeTodo({ done: false, priority: "urgent" }),
      makeTodo({ done: false, priority: undefined }),
    ];

    async function pick(user: User, level: string, todos: TodoEntity[]) {
      const rendered = renderInbox(todos);

      await waitFor(() => expect(isListed(todos[0])).toBe(true));
      await user.click(screen.getByTestId("home.filter.priority.menu"));
      await user.click(
        await screen.findByTestId(`home.filter.priority.${level}.button`)
      );

      return rendered;
    }

    it("Then it is remembered in the url", async () => {
      const user = setupUser();
      const todos = ranked();
      const { currentLocation } = await pick(user, "urgent", todos);

      await waitFor(() =>
        expect(currentLocation()).toContain("priority=urgent")
      );
    });

    it("Then only todos carrying that level stay in the list", async () => {
      const user = setupUser();
      const [urgent, untriaged] = ranked();
      await pick(user, "urgent", [urgent, untriaged]);

      await waitFor(() => expect(isListed(untriaged)).toBe(false));
      expect(isListed(urgent)).toBe(true);
    });

    /**
     * The one question that can only be asked of an absence — see
     * `TodoFilter.priority`. There is no "none" level on the todo itself.
     */
    it("Then asking for none leaves the todos nobody has ranked", async () => {
      const user = setupUser();
      const [urgent, untriaged] = ranked();
      await pick(user, "unset", [urgent, untriaged]);

      await waitFor(() => expect(isListed(urgent)).toBe(false));
      expect(isListed(untriaged)).toBe(true);
    });
  });
});
