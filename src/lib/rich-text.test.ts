import { describe, expect, it } from "vitest";

import { isEditingRichText, richTextContent } from "@/lib/rich-text";

/** What an open editor amounts to in the DOM: a ProseMirror editable surface. */
function surface(editable: boolean) {
  const element = document.createElement("div");
  element.setAttribute("contenteditable", String(editable));
  return element;
}

describe("richTextContent", () => {
  const doc = { type: "doc", content: [] };

  it("when a parsed doc was stored, Then that is what the editor is given", () => {
    expect(richTextContent("the notes", doc)).toBe(doc);
  });

  it("when only markdown was stored, Then the markdown is parsed instead", () => {
    expect(richTextContent("the notes", undefined)).toBe("the notes");
  });

  it("when neither was stored, Then the editor starts empty", () => {
    expect(richTextContent(undefined, undefined)).toBe("");
  });
});

describe("isEditingRichText", () => {
  it("when the key landed on an editable surface, Then an edit is in progress", () => {
    expect(isEditingRichText(surface(true))).toBe(true);
  });

  it("when it landed on something inside one, Then the edit still counts", () => {
    const paragraph = document.createElement("p");
    surface(true).append(paragraph);

    expect(isEditingRichText(paragraph)).toBe(true);
  });

  it("when the surface is only being read, Then there is no edit", () => {
    expect(isEditingRichText(surface(false))).toBe(false);
  });

  it("when it landed on an ordinary field, Then there is no edit", () => {
    expect(isEditingRichText(document.createElement("input"))).toBe(false);
  });

  it("when there is nothing to look at, Then there is no edit", () => {
    expect(isEditingRichText(null)).toBe(false);
  });
});
