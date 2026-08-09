import { describe, expect, it } from "vitest";

import { views, viewIsActive, type View } from "@/layout/views";

function view(id: string): View {
  const found = views.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no view with id ${id}`);
  return found;
}

describe("viewIsActive", () => {
  it("when the url is the view's own path, Then it is active", () => {
    expect(viewIsActive(view("today"), "/today")).toBe(true);
  });

  it("when the url is another view's path, Then it is not active", () => {
    expect(viewIsActive(view("today"), "/upcoming")).toBe(false);
  });

  it("when the url is nested under the view, Then it stays active", () => {
    expect(viewIsActive(view("labels"), "/labels/work")).toBe(true);
  });

  describe("when I am on a todo's own page", () => {
    it("Then inbox is active, because the detail is a row of the inbox", () => {
      expect(viewIsActive(view("inbox"), "/todo/abc")).toBe(true);
    });

    it("Then no other view claims it", () => {
      expect(viewIsActive(view("completed"), "/todo/abc")).toBe(false);
    });
  });

  describe("when I am at the root", () => {
    it("Then inbox is active", () => {
      expect(viewIsActive(view("inbox"), "/")).toBe(true);
    });

    it("Then no other view is", () => {
      expect(viewIsActive(view("upcoming"), "/")).toBe(false);
    });
  });

  // `/` is a prefix of every url, so the naive startsWith would light Inbox up
  // on every page in the app.
  it("when the url belongs to another view, Then inbox does not claim it as a prefix", () => {
    expect(viewIsActive(view("inbox"), "/overdue")).toBe(false);
  });
});
