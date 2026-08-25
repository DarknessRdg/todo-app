import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { setupUser, waitFor, type User } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { RichTextEditor } from "@/components/rich-text-editor";
import type { RichTextValue } from "@/lib/rich-text";
import { ImageSizeLimit } from "@/lib/image";

const editor = "editor.content";
const codeBlockButton = "editor.toolbar.codeblock.button";
const linkButton = "editor.toolbar.link.button";
const linkText = "editor.toolbar.link.text.input";
const linkUrl = "editor.toolbar.link.url.input";
const linkApply = "editor.toolbar.link.apply";
const linkRemove = "editor.toolbar.link.remove";
const toolbar = "editor.toolbar";
const imageButton = "editor.toolbar.image.button";
const imageUrl = "editor.toolbar.image.url.input";
const imageAlt = "editor.toolbar.image.alt.input";
const imageApply = "editor.toolbar.image.apply";
const image = "editor.image.0";
const imageSmaller = "editor.image.0.smaller.button";
const imageBigger = "editor.image.0.bigger.button";
const imageAlignCenter = "editor.image.0.align.center.button";
const imageControls = "editor.image.0.controls";
const tableMenu = "editor.toolbar.table.menu";
/** A cell in the toolbar's size grid: the table it would build, header included. */
const tableSize = (rows: number, cols: number) =>
  `editor.toolbar.table.size.${rows}x${cols}`;
const tableControls = "editor.table.0.controls";
const tableRowAfter = "editor.table.0.row.after.button";
const tableColumnAfter = "editor.table.0.column.after.button";
const tableRowDelete = "editor.table.0.row.delete.button";
const tableDelete = "editor.table.0.delete.button";
const saveButton = "editor.save.button";
const cancelButton = "editor.cancel.button";
const discardDialog = "editor.discard.dialog";
const discardConfirm = "editor.discard.confirm";
const keepWriting = "editor.discard.keep";

function renderEditor(
  props: Partial<Parameters<typeof RichTextEditor>[0]> = {}
) {
  /**
   * The markdown the editor hands back when focus leaves it.
   *
   * The editor reports both spellings of the document at once; these specs are
   * about the markdown round trip, so the helper unwraps it and they assert on
   * the string as they always have. `onSave` is the whole value, for the specs
   * that are about the doc stored beside it.
   */
  const onBlur = vi.fn<(markdown: string) => void>();
  const onSave = vi.fn<(value: RichTextValue) => void>();

  const { rerender } = render(
    <RichTextEditor
      testId={editor}
      onBlur={(value) => {
        onSave(value);
        onBlur(value.markdown);
      }}
      {...props}
    />
  );

  return { onBlur, onSave, rerender };
}

const blurEditor = () => fireEvent.blur(screen.getByTestId(editor));

/**
 * Fires a paste the way a real clipboard arrives.
 *
 * A copy out of a code editor carries three flavours at once: the plain text,
 * a syntax-coloured `text/html` rendering of it, and VS Code's own
 * `vscode-editor-data` naming the language it was copied from. Which of them
 * the editor trusts is the whole point of these specs, so the fake carries all
 * three.
 */
function paste({
  text = "",
  html = "",
  mode,
  files = [],
}: {
  text?: string;
  html?: string;
  mode?: string;
  files?: File[];
}) {
  fireEvent.paste(screen.getByTestId(editor), {
    clipboardData: {
      files,
      getData: (type: string) => {
        if (type === "text/plain") return text;
        if (type === "text/html") return html;
        if (type === "vscode-editor-data" && mode !== undefined)
          return JSON.stringify({ mode });
        return "";
      },
    },
  });
}

/** A picture on the clipboard, the way a screenshot arrives. */
function makeImageFile(bytes = 8): File {
  const file = new File(["x"], "screenshot.png", { type: "image/png" });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

/**
 * Waits until the caret is inside a table.
 *
 * The table menu reports it — the button is pressed while the caret is in one —
 * so waiting on it is what makes the keystrokes that follow land in a cell
 * rather than beside the table.
 */
async function insideTable() {
  // The dropdown runs a typeahead of its own while it is open, which eats the
  // keystrokes a spec sends next — so the grid being gone is half of "the caret
  // is in the table", and the table's own controls appearing is the other half:
  // they are on screen only for the table being worked in.
  await waitFor(() =>
    expect(screen.queryByTestId(tableSize(3, 3))).not.toBeInTheDocument()
  );
  await waitFor(() =>
    expect(screen.getByTestId(tableControls)).toBeInTheDocument()
  );
  // Closing the menu hands focus back to its trigger before the editor takes
  // it again; typing in between goes to the button.
  await waitFor(() => expect(screen.getByTestId(editor)).toHaveFocus());
}

/** Selects the whole document, so a spec can act on "the selected text". */
const selectAll = (user: User) => user.keyboard("{Control>}a{/Control}");

describe("rich text editor", () => {
  describe("when I mark the selected text from the toolbar", () => {
    /**
     * One case per mark, driven through the toolbar and asserted on the
     * markdown that comes back — the wrapping syntax is the observable
     * outcome, where the `<strong>` in the DOM is just how it is drawn.
     */
    const marks = [
      {
        name: "bold",
        button: "editor.toolbar.bold.button",
        wrapped: "**words**",
      },
      {
        name: "italic",
        button: "editor.toolbar.italic.button",
        wrapped: "*words*",
      },
      {
        name: "strikethrough",
        button: "editor.toolbar.strike.button",
        wrapped: "~~words~~",
      },
      {
        name: "inline code",
        button: "editor.toolbar.code.button",
        wrapped: "`words`",
      },
      // Markdown has no underline or highlight, so both go out as the inline
      // HTML markdown does carry — which is what comes back on reload.
      {
        name: "underline",
        button: "editor.toolbar.underline.button",
        wrapped: "<u>words</u>",
      },
    ];

    for (const mark of marks) {
      it(`Then ${mark.name} wraps it`, async () => {
        const user = setupUser();
        const { onBlur } = renderEditor({ content: "words" });

        await user.click(screen.getByTestId(editor));
        await selectAll(user);
        await user.click(screen.getByTestId(mark.button));
        blurEditor();

        await waitFor(() =>
          expect(onBlur).toHaveBeenCalledWith(
            expect.stringContaining(mark.wrapped)
          )
        );
      });
    }

    it("Then pressing the same button again unwraps it", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "words" });

      await user.click(screen.getByTestId(editor));
      await selectAll(user);
      await user.click(screen.getByTestId("editor.toolbar.bold.button"));
      await user.click(screen.getByTestId("editor.toolbar.bold.button"));
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).not.toContain("**");
    });
  });

  describe("when I highlight the selected text", () => {
    /** Opens the pen menu with the whole document selected. */
    const openPen = async (user: User) => {
      await user.click(screen.getByTestId(editor));
      await selectAll(user);
      await user.click(screen.getByTestId("editor.toolbar.highlight.menu"));
    };

    it("Then the colour I picked is what gets saved", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "words" });

      await openPen(user);
      await user.click(
        await screen.findByTestId("editor.toolbar.highlight.green.button")
      );
      blurEditor();

      // The colour rides as a token name, not a literal — that is what lets it
      // follow the theme instead of freezing a pastel into the document.
      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining('<mark data-highlight="green">words</mark>')
        )
      );
    });

    it("Then picking another colour replaces it rather than nesting", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "words" });

      await openPen(user);
      await user.click(
        await screen.findByTestId("editor.toolbar.highlight.green.button")
      );
      await openPen(user);
      await user.click(
        await screen.findByTestId("editor.toolbar.highlight.pink.button")
      );
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain('data-highlight="pink"');
      expect(onBlur.mock.lastCall?.[0]).not.toContain("green");
    });

    it("Then choosing none takes the highlight off again", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "words" });

      await openPen(user);
      await user.click(
        await screen.findByTestId("editor.toolbar.highlight.blue.button")
      );
      await openPen(user);
      await user.click(
        await screen.findByTestId("editor.toolbar.highlight.none.button")
      );
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("words");
      expect(onBlur.mock.lastCall?.[0]).not.toContain("<mark");
    });
  });

  describe("when I turn the current block into something else", () => {
    const blocks = [
      {
        name: "a heading",
        menu: "editor.toolbar.block.menu",
        item: "editor.toolbar.block.h1.button",
        prefix: "# words",
      },
      {
        name: "a smaller heading",
        menu: "editor.toolbar.block.menu",
        item: "editor.toolbar.block.h2.button",
        prefix: "## words",
      },
      {
        name: "a bullet list",
        menu: "editor.toolbar.list.menu",
        item: "editor.toolbar.list.bulletlist.button",
        prefix: "- words",
      },
      {
        name: "a numbered list",
        menu: "editor.toolbar.list.menu",
        item: "editor.toolbar.list.orderedlist.button",
        prefix: "1. words",
      },
      {
        name: "a checklist",
        menu: "editor.toolbar.list.menu",
        item: "editor.toolbar.list.tasklist.button",
        prefix: "- [ ] words",
      },
    ];

    for (const block of blocks) {
      it(`Then ${block.name} is what gets saved`, async () => {
        const user = setupUser();
        const { onBlur } = renderEditor({ content: "words" });

        await user.click(screen.getByTestId(editor));
        await user.click(screen.getByTestId(block.menu));
        await user.click(await screen.findByTestId(block.item));
        blurEditor();

        await waitFor(() =>
          expect(onBlur).toHaveBeenCalledWith(
            expect.stringContaining(block.prefix)
          )
        );
      });
    }

    it("Then a quote, straight from the toolbar, is what gets saved", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "words" });

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId("editor.toolbar.quote.button"));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(expect.stringContaining("> words"))
      );
    });
  });

  describe("when I fold a block into a collapsible section", () => {
    /** Opens the section menu with the cursor in the document. */
    const openSections = async (user: User) => {
      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId("editor.toolbar.details.menu"));
    };

    const pick = async (user: User, variant: string) =>
      user.click(
        await screen.findByTestId(`editor.toolbar.details.${variant}.button`)
      );

    it("Then the text I had becomes the section's body", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "the long version" });

      await openSections(user);
      await pick(user, "plain");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("<details");
      expect(onBlur.mock.lastCall?.[0]).toContain("the long version");
    });

    it("Then removing it unfolds the section again", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "the long version" });

      await openSections(user);
      await pick(user, "plain");
      await openSections(user);
      await pick(user, "remove");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).not.toContain("<details");
      expect(onBlur.mock.lastCall?.[0]).toContain("the long version");
    });

    /**
     * One case per callout, asserted on the variant that reaches the saved
     * document — the tint is presentation, the attribute is the outcome.
     */
    for (const variant of ["info", "warning", "success", "error"]) {
      it(`Then dressing it as ${variant} is what gets saved`, async () => {
        const user = setupUser();
        const { onBlur } = renderEditor({ content: "the long version" });

        await openSections(user);
        await pick(user, variant);
        blurEditor();

        await waitFor(() => expect(onBlur).toHaveBeenCalled());
        expect(onBlur.mock.lastCall?.[0]).toContain(
          `data-variant="${variant}"`
        );
      });
    }

    /**
     * The saved attribute is not enough: on screen the section is drawn by
     * Tiptap's own node view, and only `data-variant` on *that* element turns
     * it into a callout. Reached through the editor's own DOM because
     * ProseMirror renders the node — there is no element to hang a test id on.
     */
    for (const variant of ["info", "warning", "success", "error"]) {
      it(`Then it is dressed as ${variant} on screen straight away`, async () => {
        const user = setupUser();
        renderEditor({ content: "the long version" });

        await openSections(user);
        await pick(user, variant);

        await waitFor(() =>
          expect(
            screen
              .getByTestId(editor)
              .querySelector('[data-type="details"]')
              ?.getAttribute("data-variant")
          ).toBe(variant)
        );
      });
    }

    it("Then dressing one I already folded shows the callout without a reload", async () => {
      const user = setupUser();
      renderEditor({ content: "the long version" });

      await openSections(user);
      await pick(user, "plain");
      await openSections(user);
      await pick(user, "info");

      await waitFor(() =>
        expect(
          screen
            .getByTestId(editor)
            .querySelector('[data-type="details"]')
            ?.getAttribute("data-variant")
        ).toBe("info")
      );
    });

    it("Then undressing it back to plain drops the callout from the screen", async () => {
      const user = setupUser();
      renderEditor({ content: "the long version" });

      await openSections(user);
      await pick(user, "info");
      await openSections(user);
      await pick(user, "plain");

      await waitFor(() =>
        expect(
          screen.getByTestId(editor).querySelector('[data-type="details"]')
        ).not.toHaveAttribute("data-variant")
      );
    });

    it("Then re-dressing one swaps its look instead of nesting a second", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "the long version" });

      await openSections(user);
      await pick(user, "info");
      await openSections(user);
      await pick(user, "error");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      const saved = onBlur.mock.lastCall?.[0] as string;
      expect(saved).toContain('data-variant="error"');
      expect(saved).not.toContain("info");
      expect(saved.match(/<details/g)).toHaveLength(1);
    });

    it("Then an unstyled one is saved carrying no variant at all", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "the long version" });

      await openSections(user);
      await pick(user, "plain");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).not.toContain("data-variant");
    });
  });

  describe("when I type a shortcode in the text", () => {
    const suggestions = "editor.emoji.suggestions";

    /** Types `:tada` where the cursor is, which is what opens the list. */
    const typeShortcode = async (user: User, shortcode = ":tada") => {
      await user.click(screen.getByTestId(editor));
      await user.keyboard(shortcode);
    };

    it("Then the emoji it names is offered", async () => {
      const user = setupUser();
      renderEditor();

      await typeShortcode(user);

      expect(
        await screen.findByTestId(`${suggestions}.tada.button`)
      ).toBeInTheDocument();
    });

    it("Then picking one replaces the shortcode with the emoji", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await typeShortcode(user);
      await user.click(await screen.findByTestId(`${suggestions}.tada.button`));
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("🎉");
      expect(onBlur.mock.lastCall?.[0]).not.toContain("tada");
    });

    it("Then enter takes the one at the top of the list", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await typeShortcode(user);
      await screen.findByTestId(`${suggestions}.tada.button`);
      await user.keyboard("{Enter}");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("🎉");
    });

    it("Then escape leaves the shortcode as the text I typed", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await typeShortcode(user);
      await screen.findByTestId(`${suggestions}.tada.button`);
      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByTestId(suggestions)).not.toBeInTheDocument()
      );

      blurEditor();
      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain(":tada");
    });

    it("Then typing on past every match closes the list again", async () => {
      const user = setupUser();
      renderEditor();

      await typeShortcode(user);
      await screen.findByTestId(`${suggestions}.tada.button`);
      await user.keyboard("zzzqqq");

      await waitFor(() =>
        expect(screen.queryByTestId(suggestions)).not.toBeInTheDocument()
      );
    });
  });

  describe("when I pick an emoji from the toolbar", () => {
    const picker = "editor.toolbar.emoji";

    const openPicker = async (user: User) => {
      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(`${picker}.button`));
    };

    it("Then searching narrows the picker to what I asked for", async () => {
      const user = setupUser();
      renderEditor();

      await openPicker(user);
      await user.type(
        await screen.findByTestId(`${picker}.search.input`),
        "tada"
      );

      expect(
        await screen.findByTestId(`${picker}.tada.button`)
      ).toBeInTheDocument();
      expect(screen.queryByTestId(`${picker}.rocket.button`)).toBeNull();
    });

    it("Then the one I choose lands in the note", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "party time " });

      await openPicker(user);
      await user.type(
        await screen.findByTestId(`${picker}.search.input`),
        "tada"
      );
      await user.click(await screen.findByTestId(`${picker}.tada.button`));
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("🎉");
    });
  });

  describe("when I open a callout to write its body", () => {
    /**
     * The fold arrow belongs to Tiptap's node view, so it is reached through
     * the editor's DOM — there is no element of ours to hang a test id on.
     */
    const fold = (user: User) =>
      user.click(
        screen
          .getByTestId(editor)
          .querySelector('[data-type="details"] > button') as HTMLElement
      );

    const dressed = () =>
      screen
        .getByTestId(editor)
        .querySelector('[data-type="details"]')
        ?.getAttribute("data-variant");

    it("Then it keeps its look on screen", async () => {
      const user = setupUser();
      renderEditor({
        content:
          '<details data-variant="info"><summary>Heads up</summary><p>the long version</p></details>',
      });

      await waitFor(() => expect(dressed()).toBe("info"));
      await fold(user);

      await waitFor(() => expect(dressed()).toBe("info"));
    });

    it("Then it is still saved as a callout", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({
        content:
          '<details data-variant="info"><summary>Heads up</summary><p>the long version</p></details>',
      });

      await waitFor(() => expect(dressed()).toBe("info"));
      await fold(user);
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain('data-variant="info"');
    });

    it("Then it stays open, as folding a plain section already does", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({
        content:
          '<details data-variant="info"><summary>Heads up</summary><p>the long version</p></details>',
      });

      await waitFor(() => expect(dressed()).toBe("info"));
      await fold(user);
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("open");
    });
  });

  describe("when the content already holds a collapsible section", () => {
    it("Then it survives a round trip, still folded", async () => {
      const { onBlur } = renderEditor({
        content:
          "<details><summary>Notes</summary><p>the long version</p></details>",
      });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("Notes")
      );
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("<details");
      expect(onBlur.mock.lastCall?.[0]).toContain("Notes");
      expect(onBlur.mock.lastCall?.[0]).toContain("the long version");
    });
  });

  describe("when the content already holds a checklist", () => {
    /**
     * Driven through the content rather than by clicking the box: TaskItem's
     * checkbox is rendered by ProseMirror, so there is no test id to click and
     * walking to it is banned. What matters here is that the tick persists.
     */
    it("Then which items are ticked survives a round trip", async () => {
      const { onBlur } = renderEditor({
        content: "- [x] packed\n- [ ] posted",
      });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("packed")
      );
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("[x] packed");
      expect(onBlur.mock.lastCall?.[0]).toContain("[ ] posted");
    });
  });

  describe("when I align the current block", () => {
    it("Then the alignment survives being saved and reopened", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "words" });

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId("editor.toolbar.align.menu"));
      await user.click(
        await screen.findByTestId("editor.toolbar.align.center.button")
      );
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      const saved = onBlur.mock.lastCall?.[0] as string;

      cleanup();
      const reopened = renderEditor({ content: saved });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("words")
      );
      blurEditor();

      await waitFor(() =>
        expect(reopened.onBlur).toHaveBeenCalledWith(
          expect.stringContaining("center")
        )
      );
    });

    it("Then a block left where it was is still saved as plain markdown", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "words" });

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId("editor.toolbar.align.menu"));
      await user.click(
        await screen.findByTestId("editor.toolbar.align.left.button")
      );
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).not.toContain("<p");
    });
  });

  /**
   * The picker is per block, so its id carries the block's index — the same
   * disambiguation a list row gets from its entity id.
   */
  const languagePicker = "editor.codeblock.0.language.select";
  const languageOption = (language: string) =>
    `editor.codeblock.0.language.${language}`;

  const fenced = (language: string) =>
    `\`\`\`${language}\nconst answer = 42\n\`\`\``;

  it("when a fence names its language, Then the picker is already set to it", async () => {
    renderEditor({ content: fenced("ts") });

    expect(await screen.findByTestId(languagePicker)).toHaveTextContent("ts");
  });

  it("when a fence names no language, Then the picker offers to detect it", async () => {
    renderEditor({ content: fenced("") });

    expect(await screen.findByTestId(languagePicker)).toHaveTextContent(
      "Auto detect"
    );
  });

  it("when the editor is read only, Then no picker is offered", async () => {
    renderEditor({ content: fenced("ts"), editable: false });

    await screen.findByTestId(editor);

    expect(screen.queryByTestId(languagePicker)).not.toBeInTheDocument();
  });

  describe("when I pick a language for a code block", () => {
    it("Then the fence carries it in the markdown", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: fenced("") });

      await user.click(await screen.findByTestId(languagePicker));
      await user.click(await screen.findByTestId(languageOption("python")));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("```python")
        )
      );
    });

    it("Then the code it fences is left alone", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: fenced("") });

      await user.click(await screen.findByTestId(languagePicker));
      await user.click(await screen.findByTestId(languageOption("python")));
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("const answer = 42");
    });
  });

  it("when I hand a block back to auto detect, Then the fence stops naming a language", async () => {
    const user = setupUser();
    const { onBlur } = renderEditor({ content: fenced("python") });

    await user.click(await screen.findByTestId(languagePicker));
    await user.click(await screen.findByTestId(languageOption("auto")));
    blurEditor();

    await waitFor(() => expect(onBlur).toHaveBeenCalled());
    expect(onBlur.mock.lastCall?.[0]).not.toContain("```python");
  });

  describe("when I undo", () => {
    it("Then the last thing I typed is taken back", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("a mistake");
      await user.click(screen.getByTestId("editor.toolbar.undo.button"));
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).not.toContain("a mistake");
    });

    it("Then redo puts it back", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("a mistake");
      await user.click(screen.getByTestId("editor.toolbar.undo.button"));
      await user.click(screen.getByTestId("editor.toolbar.redo.button"));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("a mistake")
        )
      );
    });
  });

  describe("when it is rendered read-only", () => {
    it("Then there is no toolbar to edit with", async () => {
      renderEditor({ editable: false, content: "words" });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("words")
      );
      expect(screen.queryByTestId(toolbar)).not.toBeInTheDocument();
    });

    it("Then typing changes nothing", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ editable: false, content: "words" });

      await user.click(screen.getByTestId(editor));
      await user.keyboard("more");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).not.toContain("more");
    });
  });

  describe("when the content changes from outside", () => {
    it("Then the editor shows the new content", async () => {
      const { rerender } = renderEditor({ content: "the old notes" });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("the old notes")
      );

      rerender(<RichTextEditor testId={editor} content="the new notes" />);

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("the new notes")
      );
    });
  });

  describe("when I leave a blank line between paragraphs", () => {
    it("Then the saved notes differ from the same text without one", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("first{Enter}{Enter}second");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      const withBlank = onBlur.mock.lastCall?.[0];

      cleanup();
      const plain = renderEditor();
      await user.click(screen.getByTestId(editor));
      await user.keyboard("first{Enter}second");
      blurEditor();

      await waitFor(() => expect(plain.onBlur).toHaveBeenCalled());

      // Asserting on the difference, not the encoding: whatever marker is used
      // for the blank line, losing it makes the two indistinguishable.
      expect(withBlank).not.toBe(plain.onBlur.mock.lastCall?.[0]);
    });

    it("Then it survives being reloaded and saved again", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("first{Enter}{Enter}second");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      const saved = onBlur.mock.lastCall?.[0] as string;

      cleanup();
      const reopened = renderEditor({ content: saved });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("second")
      );
      blurEditor();

      await waitFor(() => expect(reopened.onBlur).toHaveBeenCalledWith(saved));
    });
  });

  describe("when I type a bare url", () => {
    it("Then it is saved as a link", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      // Autolinking only resolves once the url is terminated, so type past it.
      await user.click(screen.getByTestId(editor));
      await user.keyboard("see https://example.com ");
      blurEditor();

      // Serialized as a markdown autolink — the url is both label and target.
      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("<https://example.com>")
        )
      );
    });
  });

  describe("when I open a fenced code block", () => {
    it("Then the language I named is kept", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("```js{Enter}const answer = 42");
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("```js\nconst answer = 42\n```")
        )
      );
    });

    it("Then a newline inside it stays in the block instead of ending it", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("```ts{Enter}first(){Enter}second(){Enter}third()");
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("```ts\nfirst()\nsecond()\nthird()\n```")
        )
      );
    });
  });

  describe("when I link the selected text from the toolbar", () => {
    it("Then the selection becomes a link to the url I gave", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("the docs");
      await selectAll(user);

      await user.click(screen.getByTestId(linkButton));
      await user.type(await screen.findByTestId(linkUrl), "https://x.dev");
      await user.click(screen.getByTestId(linkApply));

      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("[the docs](https://x.dev)")
        )
      );
    });

    it("Then the surrounding prose is left alone", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "read the docs today" });

      await user.click(screen.getByTestId(editor));
      await selectAll(user);

      await user.click(screen.getByTestId(linkButton));
      await user.type(await screen.findByTestId(linkUrl), "https://x.dev");
      await user.click(screen.getByTestId(linkApply));

      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("[read the docs today](https://x.dev)")
        )
      );
    });
  });

  describe("when I open the link popover", () => {
    it("Then the text field holds what I had selected", async () => {
      const user = setupUser();
      renderEditor({ content: "read the docs" });

      await user.click(screen.getByTestId(editor));
      await selectAll(user);
      await user.click(screen.getByTestId(linkButton));

      expect(await screen.findByTestId(linkText)).toHaveValue("read the docs");
    });

    it("Then changing the text renames the link as well as targeting it", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({ content: "the old name" });

      await user.click(screen.getByTestId(editor));
      await selectAll(user);
      await user.click(screen.getByTestId(linkButton));

      const textField = await screen.findByTestId(linkText);
      await user.clear(textField);
      await user.type(textField, "the new name");
      await user.type(screen.getByTestId(linkUrl), "https://x.dev");
      await user.click(screen.getByTestId(linkApply));

      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("[the new name](https://x.dev)")
        )
      );
      expect(onBlur.mock.lastCall?.[0]).not.toContain("the old name");
    });
  });

  describe("when I press ctrl+k with text selected", () => {
    it("Then the same url field opens", async () => {
      const user = setupUser();
      renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("the docs");
      await selectAll(user);

      expect(screen.queryByTestId(linkUrl)).not.toBeInTheDocument();

      await user.keyboard("{Control>}k{/Control}");

      expect(await screen.findByTestId(linkUrl)).toBeInTheDocument();
    });

    it("Then the url I give links the selection", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("the docs");
      await selectAll(user);
      await user.keyboard("{Control>}k{/Control}");

      await user.type(await screen.findByTestId(linkUrl), "https://x.dev");
      await user.click(screen.getByTestId(linkApply));

      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("[the docs](https://x.dev)")
        )
      );
    });
  });

  describe("when the cursor sits inside a link", () => {
    it("Then the field opens holding the url it already has", async () => {
      const user = setupUser();
      renderEditor({ content: "read [the docs](https://example.com/docs)" });

      await user.click(screen.getByTestId(editor));
      await selectAll(user);
      await user.click(screen.getByTestId(linkButton));

      expect(await screen.findByTestId(linkUrl)).toHaveValue(
        "https://example.com/docs"
      );
    });

    it("Then removing it leaves the text as plain prose", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({
        content: "[the docs](https://example.com/docs)",
      });

      await user.click(screen.getByTestId(editor));
      await selectAll(user);
      await user.click(screen.getByTestId(linkButton));
      await user.click(await screen.findByTestId(linkRemove));

      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).toContain("the docs");
      expect(onBlur.mock.lastCall?.[0]).not.toContain("https://example.com");
    });
  });

  describe("when I press the toolbar's code block button", () => {
    it("Then what I type afterwards is fenced", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(codeBlockButton));
      await user.keyboard("first(){Enter}second()");
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("```\nfirst()\nsecond()\n```")
        )
      );
    });

    it("Then pressing it again returns the text to prose", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(codeBlockButton));
      await user.keyboard("just words");
      await user.click(screen.getByTestId(codeBlockButton));
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).not.toContain("```");
    });
  });

  describe("when the content already holds a fenced code block", () => {
    it("Then its lines survive a round trip unchanged", async () => {
      const { onBlur } = renderEditor({
        content: "```ts\nfirst()\nsecond()\n```",
      });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("first()")
      );
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("```ts\nfirst()\nsecond()\n```")
        )
      );
    });
  });

  /**
   * The parsed doc is stored beside the markdown so a description does not have
   * to be re-parsed every time it is shown — the markdown stays the record, the
   * doc is the copy that loads fast.
   */
  /**
   * Handing one mounted editor between reading and writing, rather than
   * building a second one: the document is already parsed and on screen, and
   * rebuilding it to make it typeable is most of what opening a description
   * costs.
   */
  describe("when a mounted editor is handed over for editing", () => {
    it("Then the text can be typed into, not just the toolbar shown", async () => {
      const user = setupUser();
      const onBlur = vi.fn<(value: RichTextValue) => void>();

      const { rerender } = render(
        <RichTextEditor testId={editor} editable={false} onBlur={onBlur} />
      );
      rerender(<RichTextEditor testId={editor} editable onBlur={onBlur} />);

      await user.click(screen.getByTestId(editor));
      await user.keyboard("typed after the handover");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0].markdown).toContain(
        "typed after the handover"
      );
    });

    it("Then handing it back stops it taking text again", async () => {
      const user = setupUser();
      const onBlur = vi.fn<(value: RichTextValue) => void>();

      const { rerender } = render(
        <RichTextEditor testId={editor} editable onBlur={onBlur} />
      );
      await user.click(screen.getByTestId(editor));
      await user.keyboard("while it was open");

      rerender(
        <RichTextEditor testId={editor} editable={false} onBlur={onBlur} />
      );
      await user.click(screen.getByTestId(editor));
      await user.keyboard("after it was closed");
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0].markdown).not.toContain(
        "after it was closed"
      );
    });
  });

  describe("when I leave the editor", () => {
    it("Then the document is handed back parsed as well as as markdown", async () => {
      const user = setupUser();
      const { onSave } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("the notes");
      blurEditor();

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      const value = onSave.mock.lastCall?.[0];
      expect(value?.markdown).toContain("the notes");
      expect(value?.doc).toMatchObject({ type: "doc" });
    });

    it("Then that doc is enough to show the same document again, with no markdown", async () => {
      const user = setupUser();
      const { onSave } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("the notes");
      blurEditor();
      await waitFor(() => expect(onSave).toHaveBeenCalled());

      cleanup();
      renderEditor({ content: onSave.mock.lastCall?.[0].doc });

      expect(await screen.findByTestId(editor)).toHaveTextContent("the notes");
    });
  });

  describe("when I press escape in the text", () => {
    it("Then what I wrote is handed back, the same as leaving the editor would", async () => {
      const user = setupUser();
      const onEscape = vi.fn<(value: RichTextValue) => void>();
      renderEditor({ onEscape });

      await user.click(screen.getByTestId(editor));
      await user.keyboard("some notes{Escape}");

      await waitFor(() => expect(onEscape).toHaveBeenCalled());
      expect(onEscape.mock.lastCall?.[0].markdown).toContain("some notes");
    });

    /**
     * Escape belongs to the innermost thing that can answer it, and while the
     * shortcode list is up that is the list. Answering both would close the
     * editor out from under someone who only meant to dismiss a menu.
     */
    it("Then the emoji list takes it first, leaving the editor alone", async () => {
      const user = setupUser();
      const onEscape = vi.fn<(value: RichTextValue) => void>();
      renderEditor({ onEscape });

      await user.click(screen.getByTestId(editor));
      await user.keyboard(":tada");
      await screen.findByTestId("editor.emoji.suggestions.tada.button");

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(
          screen.queryByTestId("editor.emoji.suggestions")
        ).not.toBeInTheDocument()
      );
      expect(onEscape).not.toHaveBeenCalled();
    });
  });

  describe("when the content already holds a markdown link", () => {
    it("Then it survives a round trip unchanged", async () => {
      const { onBlur } = renderEditor({
        content: "read [the docs](https://example.com/docs)",
      });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("read the docs")
      );
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("[the docs](https://example.com/docs)")
        )
      );
    });
  });

  describe("when I paste markdown copied out of a code editor", () => {
    it("Then it is parsed as rich text instead of becoming a code block", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      paste({
        text: "# Roadmap\n\nShip the **thing**.",
        html: '<div style="color: #1f1f1f"><span># Roadmap</span></div>',
        mode: "markdown",
      });
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith("# Roadmap\n\nShip the **thing**.")
      );
    });
  });

  describe("when I paste code copied out of a code editor", () => {
    it("Then it is read as text, because a code block is something you open on purpose", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      paste({ text: "const answer = 42", mode: "typescript" });
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(expect.not.stringContaining("```"))
      );
    });
  });

  describe("when I paste inside a code block I opened", () => {
    it("Then the text stays literal instead of being read as markdown", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(codeBlockButton));
      paste({ text: "# not a heading" });
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("```\n# not a heading\n```")
        )
      );
    });
  });

  describe("when I paste markdown copied out of a JetBrains IDE", () => {
    /**
     * What GoLand actually puts on the clipboard: no `vscode-editor-data` to
     * name the language, and an html flavour that is the IDE's own screen —
     * a `<pre>` of coloured `<span>`s, spaces as `&#32;` and newlines as
     * `<br>`. Nothing in it but styling, which is the whole point.
     */
    const jetBrainsHtml =
      '<html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"></head>' +
      '<body><div style="background-color:#1e1f22;color:#bcbec4">' +
      "<pre style=\"font-family:'JetBrains Mono',monospace;font-size:9,8pt;\">" +
      '<span style="color:#cf8e6d;">#&#32;</span>Agenda&#32;Backend<br><br>' +
      "API&#32;backend.</pre></div></body></html>";

    it("Then it is parsed as rich text rather than buried in a code block", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      paste({
        text: "# Agenda Backend\r\n\r\nAPI backend.",
        html: jetBrainsHtml,
      });
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith("# Agenda Backend\n\nAPI backend.")
      );
    });
  });

  describe("when I paste formatted content from a web page", () => {
    it("Then its formatting is kept rather than flattened into markdown source", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      paste({
        text: "Read the docs",
        html: "<p>Read <strong>the docs</strong></p>",
      });
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("Read **the docs**")
        )
      );
    });
  });

  describe("when I paste markdown as plain text", () => {
    it("Then its syntax is parsed rather than kept literal", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      paste({ text: "## Notes\n\n- first\n- second" });
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("## Notes\n\n- first\n- second")
        )
      );
    });
  });

  /**
   * The toolbar offers a shape rather than a fixed table: an 8×8 grid, where
   * the top row is the header a pipe table cannot do without. Picking 3 × 4
   * therefore means a header and two rows under it.
   */
  describe("when I insert a table from the toolbar", () => {
    it("Then it is saved as a markdown table", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(tableMenu));
      await user.click(await screen.findByTestId(tableSize(3, 3)));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("|  |  |  |\n| --- | --- | --- |")
        )
      );
    });

    it("Then the size I picked is the size I get, the header being its first row", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(tableMenu));
      await user.click(await screen.findByTestId(tableSize(2, 4)));
      blurEditor();

      // Two rows: the header, and one to write in.
      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining(
            "|  |  |  |  |\n| --- | --- | --- | --- |\n|  |  |  |  |"
          )
        )
      );
    });

    it("Then what I type lands in its first cell", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(tableMenu));
      await user.click(await screen.findByTestId(tableSize(3, 3)));
      await insideTable();
      await user.keyboard("Name");
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("| Name |  |  |")
        )
      );
    });
  });

  describe("when the content already holds a markdown table", () => {
    const table = "| Task | Owner |\n| --- | --- |\n| Ship it | Me |";

    it("Then its cells are on screen", async () => {
      renderEditor({ content: table });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("Ship it")
      );
    });

    it("Then it survives a round trip unchanged", async () => {
      const { onBlur } = renderEditor({ content: table });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("Ship it")
      );
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(expect.stringContaining(table))
      );
    });
  });

  /**
   * Rows and columns are added and removed from the table itself now, not from
   * the toolbar — the same floating controls an image carries, and for the same
   * reason: the thing being changed is the thing you are pointing at.
   */
  describe("when I work on the table I inserted", () => {
    /**
     * Inserts a table and leaves the caret in its first cell.
     *
     * Built through the toolbar rather than loaded as content because that is
     * what leaves the caret inside the table — which is the state every one of
     * these actions needs, and the state the controls themselves appear for.
     */
    async function insertTable(user: User) {
      const rendered = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(tableMenu));
      await user.click(await screen.findByTestId(tableSize(3, 3)));
      await insideTable();

      return rendered;
    }

    it("Then its controls are on the table rather than in the toolbar", async () => {
      const user = setupUser();
      await insertTable(user);

      expect(screen.getByTestId(tableControls)).toBeInTheDocument();
      expect(screen.getByTestId(tableRowAfter)).toBeInTheDocument();
    });

    it("Then adding a row writes another empty one", async () => {
      const user = setupUser();
      const { onBlur } = await insertTable(user);

      await user.click(screen.getByTestId(tableRowAfter));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining(
            "| --- | --- | --- |\n|  |  |  |\n|  |  |  |\n|  |  |  |"
          )
        )
      );
    });

    it("Then adding a column widens every row", async () => {
      const user = setupUser();
      const { onBlur } = await insertTable(user);

      await user.click(screen.getByTestId(tableColumnAfter));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("|  |  |  |  |\n| --- | --- | --- | --- |")
        )
      );
    });

    /**
     * The row that goes is the row the caret is in — which is the whole reason
     * these controls sit on the table rather than in the toolbar. Tab walks
     * cell by cell, so three of them from the first header cell of a 3-wide
     * table lands in the first cell of the row below.
     */
    it("Then deleting a row takes the one I am in, leaving the header", async () => {
      const user = setupUser();
      const { onBlur } = await insertTable(user);

      await user.keyboard("Head");
      await user.keyboard("{Tab}{Tab}{Tab}");
      await user.keyboard("Body");
      await user.click(screen.getByTestId(tableRowDelete));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("| Head |")
        )
      );
      expect(onBlur).toHaveBeenLastCalledWith(
        expect.not.stringContaining("Body")
      );
    });

    it("Then deleting it takes the whole table out", async () => {
      const user = setupUser();
      const { onBlur } = await insertTable(user);

      await user.click(screen.getByTestId(tableDelete));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(expect.not.stringContaining("|"))
      );
    });
  });

  describe("when a table is only being read", () => {
    it("Then it carries no controls to change it with", async () => {
      renderEditor({
        content: "| Task | Owner |\n| --- | --- |\n| Ship it | Me |",
        editable: false,
      });

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("Ship it")
      );
      expect(screen.queryByTestId(tableControls)).not.toBeInTheDocument();
    });
  });

  describe("when I add an image from the toolbar", () => {
    it("Then it is saved as a markdown image", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(imageButton));
      await user.type(
        await screen.findByTestId(imageUrl),
        "https://example.com/cat.png"
      );
      await user.type(screen.getByTestId(imageAlt), "a cat");
      await user.click(screen.getByTestId(imageApply));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("![a cat](https://example.com/cat.png)")
        )
      );
    });
  });

  describe("when the content already holds an image", () => {
    it("Then it is on screen", async () => {
      renderEditor({ content: "![a cat](https://example.com/cat.png)" });

      expect(await screen.findByTestId(image)).toBeInTheDocument();
    });
  });

  /**
   * The controls are the table's: on the thing being changed, and only while it
   * is the thing being worked on. Clicking the picture is what selects it, so
   * every one of these opens by doing that.
   */
  describe("when the caret comes to rest on an image", () => {
    it("Then its controls are on it", async () => {
      const user = setupUser();
      renderEditor({ content: "![a cat](https://example.com/cat.png)" });

      await user.click(screen.getByTestId(editor));

      expect(await screen.findByTestId(imageControls)).toBeInTheDocument();
    });

    it("Then a picture the caret is nowhere near carries none", async () => {
      const user = setupUser();
      renderEditor({
        content: "some words\n\n![a cat](https://example.com/cat.png)",
      });

      await user.click(screen.getByTestId(editor));
      await screen.findByTestId(image);

      expect(screen.queryByTestId(imageControls)).not.toBeInTheDocument();
    });
  });

  describe("when I scale an image down", () => {
    it("Then the size is saved with it", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({
        content: "![a cat](https://example.com/cat.png)",
      });

      await user.click(screen.getByTestId(editor));
      await user.click(await screen.findByTestId(imageSmaller));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining('data-width="95"')
        )
      );
    });

    /**
     * The four fixed sizes are gone: the buttons walk a 5% rung at a time for
     * as far as there is room, so a picture can be tuned rather than picked
     * from a shortlist.
     */
    it("Then it keeps stepping down past where the old four sizes stopped", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({
        content: "![a cat](https://example.com/cat.png)",
      });

      await user.click(screen.getByTestId(editor));
      const smaller = await screen.findByTestId(imageSmaller);
      await user.click(smaller);
      await user.click(smaller);
      await user.click(smaller);
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining('data-width="85"')
        )
      );
    });

    it("Then scaling it back to full size returns it to plain markdown", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({
        content: "![a cat](https://example.com/cat.png)",
      });

      await user.click(screen.getByTestId(editor));
      await user.click(await screen.findByTestId(imageSmaller));
      await user.click(screen.getByTestId(imageBigger));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          "![a cat](https://example.com/cat.png)"
        )
      );
    });
  });

  describe("when I align an image", () => {
    it("Then the alignment is saved with it", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor({
        content: "![a cat](https://example.com/cat.png)",
      });

      await user.click(screen.getByTestId(editor));
      await user.click(await screen.findByTestId(imageAlignCenter));
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining('data-align="center"')
        )
      );
    });
  });

  describe("when the content already holds a scaled image", () => {
    const scaled =
      '<img src="https://example.com/cat.png" alt="a cat" data-width="50" data-align="center">';

    it("Then it survives a round trip unchanged", async () => {
      const { onBlur } = renderEditor({ content: scaled });

      await screen.findByTestId(image);
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(expect.stringContaining(scaled))
      );
    });
  });

  describe("when I paste a picture from the clipboard", () => {
    it("Then it is put in the document", async () => {
      const user = setupUser();
      renderEditor();

      await user.click(screen.getByTestId(editor));
      paste({ files: [makeImageFile()] });

      expect(await screen.findByTestId(image)).toBeInTheDocument();
    });

    it("Then it is carried inside the todo, since there is nowhere to upload it", async () => {
      const user = setupUser();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      paste({ files: [makeImageFile()] });
      await screen.findByTestId(image);
      blurEditor();

      await waitFor(() =>
        expect(onBlur).toHaveBeenCalledWith(
          expect.stringContaining("data:image/png;base64,")
        )
      );
    });

    it("Then one too big to carry is turned away rather than swallowed", async () => {
      const user = setupUser();
      renderEditor();

      await user.click(screen.getByTestId(editor));
      paste({ files: [makeImageFile(ImageSizeLimit + 1)] });

      await waitFor(() =>
        expect(screen.queryByTestId(image)).not.toBeInTheDocument()
      );
    });
  });


  /**
   * The editor's own way out, for callers that want a save the user asks for
   * rather than one that happens when focus wanders. Both are opt-in: the bar
   * exists only for a caller that handed over something for it to do.
   */
  describe("when the editor is given a save and a cancel", () => {
    it("Then saving hands back the document in both spellings", async () => {
      const user = setupUser();
      const onSaved = vi.fn<(value: RichTextValue) => void>();
      renderEditor({ content: "the old notes", onSave: onSaved });

      await user.click(screen.getByTestId(editor));
      await user.keyboard(" and more");
      await user.click(screen.getByTestId(saveButton));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      const value = onSaved.mock.lastCall?.[0];
      expect(value?.markdown).toContain("and more");
      expect(value?.doc).toMatchObject({ type: "doc" });
    });

    it("Then cancelling an untouched document leaves without asking", async () => {
      const user = setupUser();
      const onSaved = vi.fn<(value: RichTextValue) => void>();
      const onCancel = vi.fn();
      renderEditor({
        content: "the old notes",
        onSave: onSaved,
        onCancel,
      });

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(cancelButton));

      await waitFor(() => expect(onCancel).toHaveBeenCalled());
      expect(screen.queryByTestId(discardDialog)).not.toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it("Then escape cancels too, rather than handing the writing back", async () => {
      const user = setupUser();
      const onEscape = vi.fn<(value: RichTextValue) => void>();
      const onCancel = vi.fn();
      renderEditor({ content: "the old notes", onCancel, onEscape });

      await user.click(screen.getByTestId(editor));
      await user.keyboard("{Escape}");

      await waitFor(() => expect(onCancel).toHaveBeenCalled());
      expect(onEscape).not.toHaveBeenCalled();
    });
  });

  /**
   * Writing that was never saved is gone for good once the editor closes, so
   * throwing it away is destruction and is confirmed like any other — but only
   * when there is something to lose. A dialog in front of a cancel that changes
   * nothing is a question with one answer.
   */
  describe("when I cancel after changing the text", () => {
    async function changeAndCancel(user: User) {
      const onCancel = vi.fn();
      renderEditor({ content: "the old notes", onCancel });

      await user.click(screen.getByTestId(editor));
      await user.keyboard(" and more");
      await user.click(screen.getByTestId(cancelButton));

      return { onCancel };
    }

    it("Then it asks before the writing is thrown away", async () => {
      const user = setupUser();
      const { onCancel } = await changeAndCancel(user);

      expect(await screen.findByTestId(discardDialog)).toBeInTheDocument();
      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByTestId(editor)).toHaveTextContent("and more");
    });

    it("Then discarding puts the text back and closes the editor", async () => {
      const user = setupUser();
      const { onCancel } = await changeAndCancel(user);

      await user.click(await screen.findByTestId(discardConfirm));

      await waitFor(() => expect(onCancel).toHaveBeenCalled());
      expect(screen.getByTestId(editor)).not.toHaveTextContent("and more");
      expect(screen.getByTestId(editor)).toHaveTextContent("the old notes");
    });

    it("Then keeping it leaves the editor open, holding what I wrote", async () => {
      const user = setupUser();
      const { onCancel } = await changeAndCancel(user);

      await user.click(await screen.findByTestId(keepWriting));

      await waitFor(() =>
        expect(screen.queryByTestId(discardDialog)).not.toBeInTheDocument()
      );
      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByTestId(editor)).toHaveTextContent("and more");
    });

    it("Then escape asks the same question rather than throwing it away", async () => {
      const user = setupUser();
      const onCancel = vi.fn();
      renderEditor({ content: "the old notes", onCancel });

      await user.click(screen.getByTestId(editor));
      await user.keyboard(" and more{Escape}");

      expect(await screen.findByTestId(discardDialog)).toBeInTheDocument();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  /**
   * What counts as "changed" is what the *editor* holds now against what it
   * held when the sitting began — never the markdown it was handed. Markdown
   * does not survive a parse and a re-serialise byte for byte, so comparing
   * against the prop asked the question of every description written with a
   * heading or a list, untouched or not.
   */
  describe("when I cancel a document I never typed into", () => {
    it("Then formatted markdown closes without asking", async () => {
      const user = setupUser();
      const onCancel = vi.fn();
      renderEditor({
        content: "# Heading\n\nSome **bold** notes\n\n- one\n- two",
        onCancel,
      });

      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(cancelButton));

      await waitFor(() => expect(onCancel).toHaveBeenCalled());
      expect(screen.queryByTestId(discardDialog)).not.toBeInTheDocument();
    });

    it("Then a document it was handed already parsed closes without asking", async () => {
      const user = setupUser();
      const onSaved = vi.fn<(value: RichTextValue) => void>();
      renderEditor({ content: "the old notes", onSave: onSaved });
      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(saveButton));
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      const doc = onSaved.mock.lastCall?.[0].doc;
      cleanup();

      const onCancel = vi.fn();
      renderEditor({ content: doc, onCancel });
      await user.click(screen.getByTestId(editor));
      await user.click(screen.getByTestId(cancelButton));

      await waitFor(() => expect(onCancel).toHaveBeenCalled());
      expect(screen.queryByTestId(discardDialog)).not.toBeInTheDocument();
    });

    it("Then typing and undoing it back to where it started asks nothing either", async () => {
      const user = setupUser();
      const onCancel = vi.fn();
      renderEditor({ content: "the old notes", onCancel });

      await user.click(screen.getByTestId(editor));
      await user.keyboard(" and more");
      await user.keyboard("{Control>}z{/Control}");
      await user.click(screen.getByTestId(cancelButton));

      await waitFor(() => expect(onCancel).toHaveBeenCalled());
      expect(screen.queryByTestId(discardDialog)).not.toBeInTheDocument();
    });
  });

  describe("when the editor is given neither a save nor a cancel", () => {
    it("Then there is no footer offering either", async () => {
      renderEditor({ content: "the old notes" });

      expect(await screen.findByTestId(editor)).toBeInTheDocument();
      expect(screen.queryByTestId(saveButton)).not.toBeInTheDocument();
      expect(screen.queryByTestId(cancelButton)).not.toBeInTheDocument();
    });
  });

  /*
    Dropping a picture is deliberately not specced here, and cannot be.
    ProseMirror resolves a drop through `view.posAtCoords`, which needs layout
    to answer — jsdom has none, so it returns null and the `handleDrop` prop is
    never reached, whatever the spec does. The path shares everything but that
    one line with the paste above, which is covered; the rest is a browser's to
    prove.
  */
});
