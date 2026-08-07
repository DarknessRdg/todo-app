import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RichTextEditor } from "@/components/rich-text-editor";

const editor = "editor.content";
const codeBlockButton = "editor.toolbar.codeblock.button";
const linkButton = "editor.toolbar.link.button";
const linkText = "editor.toolbar.link.text.input";
const linkUrl = "editor.toolbar.link.url.input";
const linkApply = "editor.toolbar.link.apply";
const linkRemove = "editor.toolbar.link.remove";
const toolbar = "editor.toolbar";

function renderEditor(
  props: Partial<Parameters<typeof RichTextEditor>[0]> = {}
) {
  /** The markdown the editor hands back when focus leaves it. */
  const onBlur = vi.fn<(markdown: string) => void>();

  const { rerender } = render(
    <RichTextEditor testId={editor} onBlur={onBlur} {...props} />
  );

  return { onBlur, rerender };
}

const blurEditor = () => fireEvent.blur(screen.getByTestId(editor));

/** Selects the whole document, so a spec can act on "the selected text". */
const selectAll = (user: ReturnType<typeof userEvent.setup>) =>
  user.keyboard("{Control>}a{/Control}");

describe("rich text editor", () => {
  describe("when I mark the selected text from the toolbar", () => {
    /**
     * One case per mark, driven through the toolbar and asserted on the
     * markdown that comes back — the wrapping syntax is the observable
     * outcome, where the `<strong>` in the DOM is just how it is drawn.
     */
    const marks = [
      { name: "bold", button: "editor.toolbar.bold.button", wrapped: "**words**" },
      { name: "italic", button: "editor.toolbar.italic.button", wrapped: "*words*" },
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
    ];

    for (const mark of marks) {
      it(`Then ${mark.name} wraps it`, async () => {
        const user = userEvent.setup();
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
      const user = userEvent.setup();
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

  describe("when I turn the current block into something else", () => {
    const blocks = [
      { name: "a heading", button: "editor.toolbar.h1.button", prefix: "# words" },
      {
        name: "a smaller heading",
        button: "editor.toolbar.h2.button",
        prefix: "## words",
      },
      {
        name: "a bullet list",
        button: "editor.toolbar.bulletlist.button",
        prefix: "- words",
      },
      {
        name: "a numbered list",
        button: "editor.toolbar.orderedlist.button",
        prefix: "1. words",
      },
      { name: "a quote", button: "editor.toolbar.quote.button", prefix: "> words" },
    ];

    for (const block of blocks) {
      it(`Then ${block.name} is what gets saved`, async () => {
        const user = userEvent.setup();
        const { onBlur } = renderEditor({ content: "words" });

        await user.click(screen.getByTestId(editor));
        await user.click(screen.getByTestId(block.button));
        blurEditor();

        await waitFor(() =>
          expect(onBlur).toHaveBeenCalledWith(
            expect.stringContaining(block.prefix)
          )
        );
      });
    }
  });

  describe("when I undo", () => {
    it("Then the last thing I typed is taken back", async () => {
      const user = userEvent.setup();
      const { onBlur } = renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("a mistake");
      await user.click(screen.getByTestId("editor.toolbar.undo.button"));
      blurEditor();

      await waitFor(() => expect(onBlur).toHaveBeenCalled());
      expect(onBlur.mock.lastCall?.[0]).not.toContain("a mistake");
    });

    it("Then redo puts it back", async () => {
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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

  describe("when I type a bare url", () => {
    it("Then it is saved as a link", async () => {
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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
      const user = userEvent.setup();
      renderEditor({ content: "read the docs" });

      await user.click(screen.getByTestId(editor));
      await selectAll(user);
      await user.click(screen.getByTestId(linkButton));

      expect(await screen.findByTestId(linkText)).toHaveValue("read the docs");
    });

    it("Then changing the text renames the link as well as targeting it", async () => {
      const user = userEvent.setup();
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
      const user = userEvent.setup();
      renderEditor();

      await user.click(screen.getByTestId(editor));
      await user.keyboard("the docs");
      await selectAll(user);

      expect(screen.queryByTestId(linkUrl)).not.toBeInTheDocument();

      await user.keyboard("{Control>}k{/Control}");

      expect(await screen.findByTestId(linkUrl)).toBeInTheDocument();
    });

    it("Then the url I give links the selection", async () => {
      const user = userEvent.setup();
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
      const user = userEvent.setup();
      renderEditor({ content: "read [the docs](https://example.com/docs)" });

      await user.click(screen.getByTestId(editor));
      await selectAll(user);
      await user.click(screen.getByTestId(linkButton));

      expect(await screen.findByTestId(linkUrl)).toHaveValue(
        "https://example.com/docs"
      );
    });

    it("Then removing it leaves the text as plain prose", async () => {
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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
      const user = userEvent.setup();
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
});
