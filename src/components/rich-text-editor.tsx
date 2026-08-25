import { cn } from "@/lib/utils";
import Placeholder from "@tiptap/extension-placeholder";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { toast } from "sonner";
import {
  ImageSizeLimit,
  firstImageFile,
  fitsImageSizeLimit,
  readImageDataUrl,
} from "@/lib/image";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Heading } from "@tiptap/extension-heading";
import { Extension, getHTMLFromFragment } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import { loadEmojis, searchEmojis, type Emoji } from "@/lib/emoji";
import type { MarkdownSerializerState } from "prosemirror-markdown";
import { createLowlight, common } from "lowlight";
import { Markdown } from "tiptap-markdown";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Ban,
  Bold,
  ChevronDown,
  CircleCheck,
  CircleX,
  Code,
  Info,
  SquareCode,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Columns3,
  Link as LinkIcon,
  List,
  ListCollapse,
  ListOrdered,
  ListTodo,
  Pilcrow,
  PanelBottomOpen,
  PanelRightOpen,
  Quote,
  Redo2,
  Rows3,
  Smile,
  Strikethrough,
  Trash2,
  Table as TableIcon,
  TriangleAlert,
  Type as TypeIcon,
  Underline as UnderlineIcon,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { testProp, type TestIdProps } from "@/lib/test-id";
import type { RichTextDoc, RichTextValue } from "@/lib/rich-text";

/**
 * `common` is lowlight's curated grammar set (~35 languages) rather than `all`
 * (~190) — the long tail is mostly weight in the bundle for a todo app.
 */
const lowlight = createLowlight(common);

/**
 * Markdown has no way to write an empty paragraph — consecutive newlines are
 * just a paragraph break — so a blank line the user typed is dropped on save
 * and never comes back. Serialising it as a lone non-breaking space keeps the
 * paragraph alive: it is not markdown whitespace, so it survives the round
 * trip, and it renders as the blank line that was meant.
 */
const BlankLine = "\u00a0";

/* -------------------------------------------------------------------------- */
/* Code blocks: the per-block language picker                                  */
/* -------------------------------------------------------------------------- */

/**
 * The picker's value when the block names no language of its own. Not a real
 * language — it stands for leaving `language` unset, which is what sends
 * lowlight down its `highlightAuto` path.
 */
const AutoDetect = "auto";

/** The grammars lowlight can actually apply, so the list cannot promise more. */
const languages = lowlight.listLanguages().sort();

/**
 * The lowlight code block with a language picker in its top-right corner.
 *
 * The `language` attribute already arrives set from a fence that named one
 * (```` ```ts ````), a paste carrying `class="language-…"`, or VS Code's
 * clipboard payload — the picker just surfaces it and makes it editable, and is
 * the only route for a block created from the toolbar, which sets no language
 * and would otherwise be auto-detected forever.
 */
const CodeBlockWithLanguage = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },

  /**
   * Where a code block comes from: a block you opened, and nothing else.
   *
   * Copying out of any text editor puts two flavours of the same thing on the
   * clipboard — the plain text, and an html rendering of the editor's own
   * screen: a `<pre>` of coloured `<span>`s. That `<pre>` is what ProseMirror
   * prefers (html wins over text whenever both are there), and `<pre>` is the
   * code block's own parse rule, so a README pasted out of an IDE arrived as
   * one long code block with its markdown showing.
   *
   * The rendering carries no information the text does not — only colour and a
   * font — so it is dropped and the text is read as the markdown it is. Which
   * editor it came from does not matter: VS Code names the language on the
   * clipboard, JetBrains does not, and neither has to be asked.
   *
   * Two things this deliberately does not touch:
   *
   * - **A paste inside a code block.** ProseMirror already keeps text literal
   *   there, and that is the one route to a code block: open one, then paste.
   * - **Genuinely formatted content.** A web page, a document, an email — that
   *   html is headings and links and lists, not a bare `<pre>`, so it takes
   *   the html path and keeps its formatting.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("codeBlockMarkdownPasteHandler"),
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (clipboard === null) return false;
            // Inside a code block a paste is literal text, markdown included.
            if (this.editor.isActive(this.type.name)) return false;

            const text = clipboard.getData("text/plain");
            if (!text) return false;

            const html = clipboard.getData("text/html");
            if (html !== "" && !isPlainTextRendering(html)) return false;

            return this.editor.commands.insertContent(
              parseMarkdown(this.editor, text)
            );
          },
        },
      }),
      // The stock handler is left out rather than fallen through to: it makes
      // a code block out of anything carrying `vscode-editor-data`, which is
      // the behaviour being replaced.
      ...(this.parent?.() ?? []).filter(notVsCodeCodeBlockHandler),
    ];
  },
});

/** Drops the code block's own "paste from VS Code" plugin. */
function notVsCodeCodeBlockHandler(plugin: Plugin): boolean {
  return !String(plugin.spec.key).startsWith("codeBlockVSCodeHandler");
}

/**
 * The tags an editor's screen is drawn with. Between them they say nothing:
 * a box, a run of coloured text, a line break. Everything an editor renders —
 * JetBrains wraps a `<pre>` of `<span>`s, VS Code nests `<div>`s of them — is
 * made of these and inline styles.
 */
const StylingOnlyTags = new Set(["DIV", "SPAN", "PRE", "BR"]);

/**
 * Whether an html payload is only a styled rendering of the plain text beside
 * it — which is to say, whether it carries any meaning at all.
 *
 * The line is semantic markup, not the source: a heading, a list, a link, a
 * `<strong>`, a `<code>` all state something the plain text cannot, so that
 * html is kept and parsed as the formatted content it is. A payload built from
 * nothing but boxes and coloured spans states only what colour someone's
 * editor theme is, so it is dropped in favour of the text.
 */
function isPlainTextRendering(html: string): boolean {
  const body = new DOMParser().parseFromString(html, "text/html").body;

  for (const element of body.querySelectorAll("*")) {
    if (!StylingOnlyTags.has(element.tagName)) return false;
  }
  return true;
}

function CodeBlockView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const language: string | null = node.attrs.language;

  return (
    <NodeViewWrapper className="relative">
      {editor.isEditable && (
        // Outside the document as far as ProseMirror is concerned: without
        // this the picker's own markup is treated as editable content.
        <div contentEditable={false} className="absolute top-2 right-2 z-10">
          <LanguagePicker
            editor={editor}
            index={nodeIndex(editor, getPos, "codeBlock")}
            language={language}
            onChange={(next) =>
              updateAttributes({
                language: next === AutoDetect ? null : next,
              })
            }
          />
        </div>
      )}
      <pre>
        {/* `as` is `NoInfer`d, so the tag has to be named on the type too. */}
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

function LanguagePicker({
  editor,
  index,
  language,
  onChange,
}: {
  editor: Editor;
  index: number;
  language: string | null;
  onChange: (language: string) => void;
}) {
  const testId = `editor.codeblock.${index}.language`;

  // A fence may name an alias ("ts") or a grammar lowlight does not carry.
  // Offering it back keeps the picker honest about what the block actually
  // says, rather than showing an empty box or silently rewriting it.
  const options =
    language !== null && !languages.includes(language)
      ? [language, ...languages]
      : languages;

  return (
    <Select value={language ?? AutoDetect} onValueChange={onChange}>
      <SelectTrigger
        testId={`${testId}.select`}
        size="sm"
        aria-label="Code language"
        // Keep the editor selection: prevent the click from blurring it.
        onMouseDown={(event) => event.preventDefault()}
        // Filled rather than transparent: it sits over the block, and a long
        // first line would otherwise run underneath the label.
        className="text-muted-foreground hover:text-foreground bg-muted dark:bg-muted h-6 border-0 px-1.5 font-mono text-xs shadow-none focus-visible:ring-0">
        <SelectValue />
      </SelectTrigger>

      <SelectContent
        // Same reason the link popover portals here: a modal dialog makes
        // everything outside itself inert, and a blur landing outside the
        // editor's chrome tears down click-to-edit views mid-interaction.
        container={chrome(editor)}
        data-editor-chrome=""
        className="max-h-64">
        <SelectItem testId={`${testId}.${AutoDetect}`} value={AutoDetect}>
          Auto detect
        </SelectItem>
        {options.map((option) => (
          <SelectItem
            key={option}
            testId={`${testId}.${option}`}
            value={option}
            className="font-mono text-xs">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Which node of its kind this is, counting from the top of the document — the
 * test id needs something stable to name it by, and neither a code block nor
 * an image has an id of its own. Positions shift as the document is edited;
 * the ordinal does not.
 */
function nodeIndex(
  editor: Editor,
  getPos: NodeViewProps["getPos"],
  type: string
): number {
  const pos = getPos();
  if (pos === undefined) return 0;

  let index = 0;
  editor.state.doc.descendants((child, childPos) => {
    if (child.type.name === type && childPos < pos) index += 1;
    return true;
  });

  return index;
}

/* -------------------------------------------------------------------------- */
/* Collapsible sections, and the callout they can be dressed as                */
/* -------------------------------------------------------------------------- */

/** The looks a collapsible section can wear. `plain` is the undressed one. */
const detailsVariants = [
  "plain",
  "info",
  "warning",
  "success",
  "error",
] as const;

type DetailsVariant = (typeof detailsVariants)[number];

/**
 * A collapsible section that can also be a callout.
 *
 * The variant rides as `data-variant`, resolved to a `--callout-*` token in
 * `index.css` — the same arrangement as the marker pen, and for the same
 * reason: a literal colour saved into a note could not follow the theme.
 *
 * `persist` writes the open/shut state into the document, so a section left
 * folded is still folded when the todo is reopened rather than springing open.
 */
const CalloutDetails = Details.extend({
  addAttributes() {
    return {
      // `persist` contributes the `open` attribute here — dropping the parent
      // would quietly turn persistence back off.
      ...this.parent?.(),
      variant: {
        default: "plain" satisfies DetailsVariant,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-variant") ?? "plain",
        renderHTML: (attributes: { variant?: string }) =>
          attributes.variant === undefined || attributes.variant === "plain"
            ? {}
            : { "data-variant": attributes.variant },
      },
    };
  },

  /**
   * The section is drawn by the extension's own node view, which has two habits
   * that lose the variant — both fixed here by wrapping it rather than
   * reimplementing it:
   *
   * 1. It stamps the attributes onto its `<div>` once, when the view is built,
   *    and its `update` only syncs the open/shut class. Dressing a section that
   *    was already on screen changed the document but not the pixels, so the
   *    callout only appeared after a reload. Hence `paint` on every update.
   * 2. Its fold arrow writes `setNodeMarkup(pos, undefined, { open })` — a
   *    *replacement* of the whole attribute set, which drops `variant` on the
   *    floor. Since a callout has to be opened to write its body, that turned
   *    every finished callout back into a plain collapsible. So the click is
   *    caught on the wrapper during capture — before the button's own listener
   *    ever runs — and re-dispatched keeping the rest of the attributes.
   */
  addNodeView() {
    const parent = this.parent?.();
    if (!parent) return null;

    return (props) => {
      const view = parent(props);
      const dom = view.dom instanceof HTMLElement ? view.dom : null;

      const paint = (variant: unknown) => {
        if (!dom) return;
        if (typeof variant === "string" && variant !== "plain") {
          dom.setAttribute("data-variant", variant);
        } else {
          dom.removeAttribute("data-variant");
        }
      };

      paint(props.node.attrs.variant);

      const { editor, getPos } = props;

      const fold = (event: MouseEvent) => {
        // Read-only falls through to the extension: it only toggles the class
        // there, touching no attributes, so there is nothing to preserve.
        if (!dom || !editor.isEditable) return;
        const target = event.target;
        const button = dom.querySelector(":scope > button");
        if (!button || !(target instanceof Node) || !button.contains(target)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (typeof pos !== "number") return;
        const node = editor.state.doc.nodeAt(pos);
        if (node?.type.name !== this.name) return;

        const { from, to } = editor.state.selection;
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              open: !node.attrs.open,
            });
            return true;
          })
          .setTextSelection({ from, to })
          .focus(undefined, { scrollIntoView: false })
          .run();
      };

      dom?.addEventListener("click", fold, true);

      return {
        ...view,
        update: (node, decorations, innerDecorations) => {
          const handled =
            view.update?.(node, decorations, innerDecorations) ?? true;
          if (handled) paint(node.attrs.variant);
          return handled;
        },
        destroy: () => {
          dom?.removeEventListener("click", fold, true);
          view.destroy?.();
        },
      };
    };
  },
}).configure({ persist: true });

/* -------------------------------------------------------------------------- */
/* The marker pen                                                              */
/* -------------------------------------------------------------------------- */

/** The pen colours, in the order the menu offers them. */
const highlightColours = ["yellow", "green", "blue", "pink", "purple"] as const;

/**
 * Highlight, but carrying the colour as a token *name* rather than the inline
 * `background-color` the extension ships. A literal colour baked into the saved
 * document could never follow the theme — it would stay a light pastel on the
 * near-black dark canvas — and the design system keeps colour in `index.css`.
 * The name resolves to `--highlight-*` there, per theme, via `mark[data-highlight]`.
 */
const HighlightPen = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-highlight"),
        renderHTML: (attributes: { color?: string | null }) =>
          attributes.color === null || attributes.color === undefined
            ? {}
            : { "data-highlight": attributes.color },
      },
    };
  },
}).configure({ multicolor: true });

/* -------------------------------------------------------------------------- */
/* Emoji                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * An emoji goes into the document as the plain character, not as a node of its
 * own: 🎉 is text everywhere it is ever read, so it round trips through the
 * saved markdown with no serializer, no parse rule and nothing to regenerate.
 * What the extension contributes is the `:shortcode` autocomplete — the list
 * and the search behind it live in `@/lib/emoji`, loaded on demand.
 */
type EmojiSuggestionState = {
  /** The matches for what has been typed so far, best first. */
  items: Emoji[];
  /** Where the shortcode sits on screen, so the list can point at it. */
  rect: DOMRect | null;
  /** Puts one into the document, replacing the shortcode. */
  select: (emoji: Emoji) => void;
};

type EmojiSuggestionOptions = {
  /** The list opened, moved, or (null) closed. */
  onChange: (state: EmojiSuggestionState | null) => void;
  /** A key pressed while the list is open. True when the list consumed it. */
  onKeyDown: (event: KeyboardEvent) => boolean;
};

/**
 * How many letters after the `:` before the list appears. One would offer the
 * first dozen of nineteen hundred emoji, which is noise; two narrows it enough
 * to be a menu rather than a catalogue.
 */
const EmojiQueryMinimum = 2;

/** How many matches the list shows — enough to choose from without scrolling. */
const EmojiSuggestionLimit = 12;

const EmojiSuggestion = Extension.create<EmojiSuggestionOptions>({
  name: "emojiSuggestion",

  addOptions() {
    return { onChange: () => {}, onKeyDown: () => false };
  },

  addProseMirrorPlugins() {
    const { onChange, onKeyDown } = this.options;

    const read = (props: SuggestionProps<Emoji>): EmojiSuggestionState => ({
      items: props.items,
      rect: props.clientRect?.() ?? null,
      select: (emoji) => props.command(emoji),
    });

    return [
      Suggestion<Emoji>({
        editor: this.editor,
        pluginKey: new PluginKey("emojiSuggestion"),
        char: ":",
        // A shortcode is one word, and the default prefix rule keeps `10:30`
        // and `https://` from being read as the start of one.
        allowSpaces: false,
        items: async ({ query }) =>
          query.length < EmojiQueryMinimum
            ? []
            : searchEmojis(await loadEmojis(), query, EmojiSuggestionLimit),
        command: ({ editor, range, props }) => {
          editor.chain().focus().insertContentAt(range, props.emoji).run();
        },
        render: () => ({
          onStart: (props) => onChange(read(props)),
          onUpdate: (props) => onChange(read(props)),
          onKeyDown: ({ event }) => onKeyDown(event),
          onExit: () => onChange(null),
        }),
      }),
    ];
  },
});

/* -------------------------------------------------------------------------- */
/* Alignment: an attribute markdown has no spelling for                        */
/* -------------------------------------------------------------------------- */

/**
 * Alignment lives as an *attribute* on the paragraph/heading, so tiptap-markdown's
 * html fallback — which only catches whole nodes and marks it does not know —
 * never sees it, and a centred paragraph comes back left-aligned.
 *
 * So an aligned block is written as the one thing markdown does carry losslessly:
 * inline HTML. Its content goes out as HTML too (`<strong>` rather than `**`),
 * because markdown nested inside a block-level tag is not re-parsed on the way
 * back in — the round trip has to be HTML the whole way down or not at all.
 *
 * Unaligned blocks, which is nearly all of them, are untouched and stay markdown.
 */
function writeAligned(
  state: MarkdownSerializerState,
  node: ProseMirrorNode
): boolean {
  const align: string | null = node.attrs.textAlign;
  if (align === null || align === "left") return false;

  state.write(getHTMLFromFragment(Fragment.from(node), node.type.schema));
  state.closeBlock(node);
  return true;
}

const ParagraphKeepingBlanks = Paragraph.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProseMirrorNode) {
          if (writeAligned(state, node)) return;

          if (node.childCount === 0) {
            state.write(BlankLine);
          } else {
            state.renderInline(node);
          }
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});

const HeadingKeepingAlignment = Heading.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProseMirrorNode) {
          if (writeAligned(state, node)) return;

          state.write(`${state.repeat("#", node.attrs.level)} `);
          state.renderInline(node);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});

/* -------------------------------------------------------------------------- */
/* Images: scale and alignment, neither of which markdown can say              */
/* -------------------------------------------------------------------------- */

/**
 * The sizes an image can be scaled to, as a percentage of the text column.
 *
 * Steps rather than a drag handle: the same editor is read on a phone, where
 * there is nothing to drag with, and a percentage of the column is the only
 * measurement that means the same thing on both. `FullWidth` is the default —
 * an image at full width carries no size at all, so it stays plain markdown.
 */
const ImageWidths = [25, 50, 75, 100] as const;
const FullWidth = 100;

/** Where an image sits in the column. `left` is the default and unwritten. */
type ImageAlign = "left" | "center" | "right";
const imageAlignments: { id: ImageAlign; label: string; icon: ReactNode }[] = [
  { id: "left", label: "Align left", icon: <AlignLeft /> },
  { id: "center", label: "Centre", icon: <AlignCenter /> },
  { id: "right", label: "Align right", icon: <AlignRight /> },
];

/**
 * The image, with a size and a place in the column.
 *
 * Markdown can say `![alt](src)` and nothing else — no width, no alignment —
 * so an image that has been scaled or moved is written as inline HTML instead,
 * the same fallback `writeAligned` uses for a centred paragraph. An image left
 * at full width and flush left is the overwhelming majority and stays the
 * portable spelling.
 *
 * The measurements live in `data-` attributes rather than in `width`/`style`
 * because they have to survive the round trip through markdown, and a
 * `data-` attribute is the one thing an html sanitiser and a markdown parser
 * both leave alone.
 */
const ImageWithLayout = Image.extend({
  // Inline, the way markdown means it: `![alt](src)` sits in a line of text.
  // As a block it was lifted out of the paragraph it was parsed into, and the
  // emptied paragraph left behind came back as a stray blank line on save.
  inline: true,
  group: "inline",

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw = Number(element.getAttribute("data-width"));
          return ImageWidths.some((width) => width === raw) ? raw : null;
        },
        renderHTML: (attributes: { width?: number | null }) =>
          attributes.width === null || attributes.width === undefined
            ? {}
            : { "data-width": String(attributes.width) },
      },
      align: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-align"),
        renderHTML: (attributes: { align?: ImageAlign | null }) =>
          attributes.align === null || attributes.align === undefined
            ? {}
            : { "data-align": attributes.align },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },

  /**
   * Pasting and dropping a picture.
   *
   * A screenshot arrives as a file and nothing else — no text, no html — so
   * ProseMirror has nothing to parse and the paste was silently doing nothing
   * at all. The file is read here instead and put in the document as a data
   * url, which is the only place it can go: there is no server to upload to.
   *
   * Reading a file is asynchronous and a paste is not, so the handler claims
   * the event straight away and the picture arrives a tick later.
   */
  addProseMirrorPlugins() {
    const insert = (files: FileList | null, at?: number): boolean => {
      const file = firstImageFile(files);
      if (file === null) return false;

      if (!fitsImageSizeLimit(file)) {
        toast.error("That picture is too big", {
          description: `A picture is stored inside the todo itself, so it has to stay under ${Math.round(
            ImageSizeLimit / (1024 * 1024)
          )} MB.`,
        });
        // Claimed even though nothing is inserted: falling through would drop
        // the file's name into the document as text.
        return true;
      }

      readImageDataUrl(file)
        .then((src) => {
          const chain = this.editor.chain().focus();
          if (at !== undefined) chain.setTextSelection(at);
          chain.setImage({ src }).run();
        })
        .catch((error: unknown) => {
          console.error(error);
          toast.error("That picture could not be read", {
            description: "Try saving it to a file and dropping it in instead.",
          });
        });

      return true;
    };

    return [
      new Plugin({
        key: new PluginKey("imageFileHandler"),
        props: {
          handlePaste: (_view, event) =>
            insert(event.clipboardData?.files ?? null),
          handleDrop: (view, event) => {
            const dropped = event.dataTransfer?.files ?? null;
            if (firstImageFile(dropped) === null) return false;

            // Where the picture was let go of, rather than wherever the caret
            // happened to be left.
            const at = view.posAtCoords({
              left: (event as DragEvent).clientX,
              top: (event as DragEvent).clientY,
            })?.pos;

            event.preventDefault();
            return insert(dropped, at);
          },
        },
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProseMirrorNode) {
          const { src, alt, width, align } = node.attrs;

          if (
            (width === null || width === FullWidth) &&
            (align === null || align === "left")
          ) {
            state.write(`![${state.esc(alt ?? "")}](${state.esc(src ?? "")})`);
          } else {
            state.write(
              getHTMLFromFragment(Fragment.from(node), node.type.schema)
            );
          }
        },
        parse: {},
      },
    };
  },
});

/**
 * The image and its controls: two steps of scale and three of alignment.
 *
 * The controls are on screen whenever the editor is editable, the way the code
 * block's language picker is, rather than appearing on hover — hovering is not
 * something a phone does.
 */
function ImageView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const width: number | null = node.attrs.width;
  const align: ImageAlign | null = node.attrs.align;
  const testId = `editor.image.${nodeIndex(editor, getPos, "image")}`;

  const at = ImageWidths.indexOf(
    (width ?? FullWidth) as (typeof ImageWidths)[number]
  );
  const scale = (to: number) =>
    updateAttributes({
      width: ImageWidths[to] === FullWidth ? null : ImageWidths[to],
    });

  return (
    <NodeViewWrapper
      as="span"
      {...testProp(testId)}
      data-align={align ?? "left"}
      className="my-1">
      {/*
        The picture and its controls in one inline box: the wrapper above is a
        full-width block (that is what carries the alignment), so anchoring the
        controls to it would leave them at the far edge of the line rather than
        on the corner of a quarter-width picture.
      */}
      {/*
        The size belongs to this box, not to the picture inside it. A
        percentage width on a child of a shrink-to-fit box resolves against
        that box's own preferred width — so a picture scaled to half sat at
        half size inside a full-width box, and centring the box left the
        picture looking off to one side. Sizing the box and letting the
        picture fill it makes the two the same thing again.
      */}
      <span
        data-width={width === null ? undefined : String(width)}
        className="relative inline-block align-top">
        <img src={node.attrs.src ?? ""} alt={node.attrs.alt ?? ""} />

        {editor.isEditable && (
          // Outside the document as far as ProseMirror is concerned: without
          // this the controls' own markup is treated as editable content.
          <span
            contentEditable={false}
            className="bg-card absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-full p-0.5 shadow-sm">
            <ToolbarButton
              testId={`${testId}.smaller.button`}
              label="Smaller"
              disabled={at <= 0}
              onClick={() => scale(at - 1)}>
              <ZoomOut />
            </ToolbarButton>
            <ToolbarButton
              testId={`${testId}.bigger.button`}
              label="Bigger"
              disabled={at >= ImageWidths.length - 1}
              onClick={() => scale(at + 1)}>
              <ZoomIn />
            </ToolbarButton>

            <Divider />

            {imageAlignments.map((option) => (
              <ToolbarButton
                key={option.id}
                testId={`${testId}.align.${option.id}.button`}
                label={option.label}
                active={(align ?? "left") === option.id}
                onClick={() =>
                  updateAttributes({
                    align: option.id === "left" ? null : option.id,
                  })
                }>
                {option.icon}
              </ToolbarButton>
            ))}
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
}

/* -------------------------------------------------------------------------- */
/* Tables: the pipe table, and everything it cannot say                        */
/* -------------------------------------------------------------------------- */

/**
 * The largest table the toolbar's grid offers, and the shape it starts on.
 *
 * A header, always: a markdown pipe table has no way to write a table without
 * one, so a headerless table would be lost on the first save. It is the first
 * of the rows picked rather than an extra on top — the grid draws it that way,
 * so 3 × 4 is a header and two rows under it, which is what the picture said it
 * would be.
 */
const TableGrid = { rows: 8, cols: 8 } as const;
const NewTable = { rows: 3, cols: 3 } as const;

/**
 * Whether a table can be written as a GFM pipe table, which is a narrower
 * thing than a table: one header row on top, one paragraph of plain inline
 * text per cell, every row the same width, and no cell containing the `|` that
 * separates them.
 *
 * Everything else — a merged cell, a list inside a cell, a centred column, a
 * literal pipe — has no pipe-table spelling, so it goes out as HTML instead of
 * being silently flattened into a table that says something different.
 */
function isPipeTable(node: ProseMirrorNode): boolean {
  if (node.childCount === 0) return false;

  const width = node.firstChild?.childCount ?? 0;
  if (width === 0) return false;

  let ok = true;
  node.forEach((row, _offset, rowIndex) => {
    if (row.childCount !== width) ok = false;

    row.forEach((cell) => {
      const isHeader = cell.type.name === "tableHeader";
      // The header row is the first one and nothing else — GFM has no
      // spelling for a header in the middle of a table.
      if (isHeader !== (rowIndex === 0)) ok = false;
      if (cell.attrs.colspan !== 1 || cell.attrs.rowspan !== 1) ok = false;
      if (!isPlainCell(cell)) ok = false;
    });
  });

  return ok;
}

/** One paragraph of unaligned, pipe-free text — all a pipe table cell holds. */
function isPlainCell(cell: ProseMirrorNode): boolean {
  const paragraph = cell.firstChild;
  if (cell.childCount !== 1 || paragraph?.type.name !== "paragraph") {
    return false;
  }

  const align: string | null = paragraph.attrs.textAlign;
  if (align !== null && align !== "left") return false;
  if (paragraph.textContent.includes("|")) return false;

  // A hard break, or anything else inline that is not text, would end the row
  // halfway through it.
  let plain = true;
  paragraph.forEach((child) => {
    if (!child.isText) plain = false;
  });
  return plain;
}

/**
 * The pipe table, written row by row. The header underline is emitted after
 * the first row rather than from the column count alone, so a table can never
 * claim more columns than it wrote.
 */
function writePipeTable(
  state: MarkdownSerializerState,
  node: ProseMirrorNode
): void {
  node.forEach((row, _offset, rowIndex) => {
    state.write("|");
    row.forEach((cell) => {
      state.write(" ");
      // Guarded by `isPlainCell`: the only child is the paragraph.
      state.renderInline(cell.firstChild!);
      state.write(" |");
    });
    state.ensureNewLine();

    if (rowIndex === 0) {
      state.write("|");
      row.forEach(() => state.write(" --- |"));
      state.ensureNewLine();
    }
  });

  state.closeBlock(node);
}

/**
 * A table markdown can carry, or the HTML that says the same thing.
 *
 * The HTML branch is the trick alignment already uses: `html: true` on the
 * markdown parser means a raw `<table>` comes back as the table it was, so a
 * merged cell survives being saved even though no pipe table can express it.
 */
const TableWritingPipes = Table.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProseMirrorNode) {
          if (isPipeTable(node)) {
            writePipeTable(state, node);
            return;
          }

          state.write(
            getHTMLFromFragment(Fragment.from(node), node.type.schema)
          );
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },

  addNodeView() {
    // `contentDOMElementTag` matters more than it looks. The React renderer
    // injects an element of its own to hold the rows, and it is a `div` unless
    // told otherwise — a `div` between `<table>` and `<tr>`, which is not a
    // table row group, so the rows stop being rows: the columns collapse to
    // their min-width and the table no longer fills its line.
    return ReactNodeViewRenderer(TableView, { contentDOMElementTag: "tbody" });
  },
});

/**
 * A table and the controls for the one being worked in.
 *
 * The controls float on the table itself, the way an image's scale and
 * alignment do — the row being added is the row the caret is in, and a menu in
 * the toolbar could only ever describe that in words.
 *
 * They appear only while the selection is inside *this* table, which is both
 * what makes them unambiguous and what keeps a document of several tables from
 * wearing several sets of buttons. That is also the tap that reveals them,
 * which matters: the same editor is read on a phone, where there is nothing to
 * hover with.
 *
 * Deleting a row, a column or the table is not the destructive action the
 * design system makes you confirm — that rule is about entities that go for
 * good. This is a document being written, and every one of these is one undo
 * away.
 */
function TableView({ editor, getPos }: NodeViewProps) {
  const testId = `editor.table.${nodeIndex(editor, getPos, "table")}`;

  // Read through `useEditorState` rather than off the editor directly: a
  // selection moving from one cell to another is a transaction, and nothing
  // else here would re-render for it.
  const working = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) return false;

      const at = getPos();
      if (at === undefined) return false;

      const node = editor.state.doc.nodeAt(at);
      if (!node) return false;

      const { from, to } = editor.state.selection;
      return from >= at && to <= at + node.nodeSize;
    },
  });

  const run = (action: (chain: ReturnType<Editor["chain"]>) => void) => () => {
    const chain = editor.chain().focus();
    action(chain);
    chain.run();
  };

  return (
    <NodeViewWrapper
      {...testProp(testId)}
      className={cn(
        "relative my-3",
        // Room above for the controls, and only while they are up. They sit in
        // this margin rather than on the table, so the header row stays
        // readable underneath them; a table nobody is working in keeps the
        // spacing every other block has, rather than a gap standing open for
        // buttons that are not there.
        working && "mt-11"
      )}>
      {/* The `<tbody>` the rows go in is the renderer's, injected here — hence
          `contentDOMElementTag` above. */}
      <NodeViewContent<"table"> as="table" />

      {working && (
        // Outside the document as far as ProseMirror is concerned: without this
        // the controls' own markup is treated as editable content.
        <div
          contentEditable={false}
          {...testProp(`${testId}.controls`)}
          // `bottom-full` puts the whole pill above the table's top edge rather
          // than straddling it: overlapping the header row would cover the
          // column names, which are the labels that say what the row controls
          // are about to act on.
          className="bg-card absolute right-0 bottom-full z-10 mb-1.5 flex items-center gap-0.5 rounded-full p-0.5 shadow-sm">
          <ToolbarButton
            testId={`${testId}.row.before.button`}
            label="Add row above"
            onClick={run((chain) => chain.addRowBefore())}>
            <PanelBottomOpen className="rotate-180" />
          </ToolbarButton>
          <ToolbarButton
            testId={`${testId}.row.after.button`}
            label="Add row below"
            onClick={run((chain) => chain.addRowAfter())}>
            <PanelBottomOpen />
          </ToolbarButton>
          <ToolbarButton
            testId={`${testId}.column.before.button`}
            label="Add column left"
            onClick={run((chain) => chain.addColumnBefore())}>
            <PanelRightOpen className="rotate-180" />
          </ToolbarButton>
          <ToolbarButton
            testId={`${testId}.column.after.button`}
            label="Add column right"
            onClick={run((chain) => chain.addColumnAfter())}>
            <PanelRightOpen />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            testId={`${testId}.row.delete.button`}
            label="Delete row"
            onClick={run((chain) => chain.deleteRow())}>
            <Rows3 />
          </ToolbarButton>
          <ToolbarButton
            testId={`${testId}.column.delete.button`}
            label="Delete column"
            onClick={run((chain) => chain.deleteColumn())}>
            <Columns3 />
          </ToolbarButton>
          <ToolbarButton
            testId={`${testId}.delete.button`}
            label="Delete table"
            className="text-destructive hover:text-destructive"
            onClick={run((chain) => chain.deleteTable())}>
            <Trash2 />
          </ToolbarButton>
        </div>
      )}
    </NodeViewWrapper>
  );
}

type RichTextEditorProps = {
  /**
   * The document to load, in either spelling.
   *
   * Markdown is the portable one and stays the record of truth, so a stored
   * value is never locked into ProseMirror's JSON. A `RichTextDoc` is that same
   * document already parsed: handing one over skips the markdown parse, which
   * is most of what mounting a description costs. Callers with both should pass
   * the doc — see `richTextContent`.
   */
  content?: string | RichTextDoc;
  editable?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  /** When true, wraps the editor in a bordered box with the formatting toolbar.
   * When false, renders just the (read-only) content — for click-to-edit views. */
  chrome?: boolean;
  /**
   * Called when focus leaves, with the document in both spellings so the caller
   * can store the portable one and the fast one together. Handing back a single
   * value rather than two arguments is deliberate: saving the markdown and
   * forgetting the doc would leave a stale cache behind.
   */
  onBlur?: (value: RichTextValue) => void;
  /**
   * Called with the same value when Escape is pressed in the text — the
   * keyboard's way out of the editor, which keeps what was written rather than
   * discarding it. Left unset, Escape passes through untouched.
   *
   * `onCancel` takes precedence: an editor that can be cancelled answers Escape
   * with the cancel, because two ways out that do opposite things to the same
   * key is how writing gets lost.
   */
  onEscape?: (value: RichTextValue) => void;
  /**
   * Saving on purpose. Given one, the chrome grows a footer with a Save button,
   * and this is called with the document at the moment it is pressed.
   *
   * A caller that wants this generally does *not* want `onBlur` as well:
   * together they are the autosave the footer exists to replace.
   */
  onSave?: (value: RichTextValue) => void;
  /**
   * Leaving without saving. Given one, the footer grows a Cancel button and
   * Escape answers to it. The editor puts its own text back to the `content` it
   * was handed before calling this, so the caller only has to close it.
   *
   * Writing that was never saved has nowhere else to exist, so a cancel that
   * would lose some asks first — see `cancel` below. This is called once the
   * answer is yes, or straight away when there was nothing to lose.
   */
  onCancel?: () => void;
} & TestIdProps;

export function RichTextEditor({
  content = "",
  editable = true,
  autoFocus = false,
  placeholder,
  className,
  chrome = true,
  onBlur,
  onEscape,
  onSave,
  onCancel,
  testId,
}: RichTextEditorProps) {
  // The `:` autocomplete: the plugin owns when it opens, React owns how it is
  // drawn. Both halves of that also have to be readable from the ProseMirror
  // keymap, which is built once and never sees a re-render — hence the refs.
  const [suggestion, setSuggestion] = useState<EmojiSuggestionState | null>(
    null
  );
  const [highlighted, setHighlighted] = useState(0);
  /** Whether the "throw the writing away?" question is on screen. */
  const [discarding, setDiscarding] = useState(false);
  /**
   * The document as the editor itself held it when this sitting began.
   *
   * Deliberately not the `content` prop. Markdown does not survive a parse and
   * a re-serialise byte for byte — a heading, a list, an escaped character all
   * come back spelled slightly differently — so comparing the two says "changed"
   * about a description nobody has touched. What the editor loaded is the only
   * honest baseline for "did the user change anything", and it is re-taken
   * every time the editor is handed a document.
   */
  const pristine = useRef<string | null>(null);
  const suggestionRef = useRef<EmojiSuggestionState | null>(null);
  const highlightedRef = useRef(0);
  // Escape dismisses the list without ending the shortcode, so the plugin stays
  // active and keeps reporting matches — this is what keeps them off screen
  // until the cursor has left the word it was offering for.
  const dismissedRef = useRef(false);
  suggestionRef.current = suggestion;
  highlightedRef.current = highlighted;

  /**
   * What the editable element wears. Recomputed every render and re-applied
   * below, because `useEditor` builds the editor once: everything passed here
   * is a snapshot of the first render unless something says otherwise.
   */
  const editorAttributes = {
    class: cn(
      chrome ? "min-h-24 p-2" : "",
      "outline-none md:text-sm",
      className
    ),
    ...testProp(testId),
  };

  const editor = useEditor({
    extensions: [
      // StarterKit ships a plain code block; swap it for the lowlight one so
      // fenced blocks are tokenised. Registering both would duplicate the node.
      StarterKit.configure({
        codeBlock: false,
        paragraph: false,
        heading: false,
      }),
      ParagraphKeepingBlanks,
      HeadingKeepingAlignment,
      CodeBlockWithLanguage.configure({ lowlight }),
      // Neither has a Markdown spelling. tiptap-markdown's `html: true` default
      // catches them anyway: an unknown *mark* falls back to inline HTML
      // (`<u>`, `<mark>`), which markdown carries and parses straight back.
      // Alignment is an attribute rather than a mark, so it needs its own
      // serializer — see `AlignedBlock`.
      HighlightPen,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      // Checklists do have a markdown spelling (GFM `- [x]`), and tiptap-markdown
      // ships the spec for it — so these round trip with no help from us.
      TaskList,
      TaskItem.configure({ nested: true }),
      // A collapsible block, which is three nodes: the `<details>` wrapper, the
      // always-visible `<summary>`, and the body that folds away. `persist`
      // writes the open/shut state into the document, so a section left folded
      // is still folded when the todo is reopened.
      CalloutDetails,
      DetailsSummary,
      DetailsContent,
      // Column resizing is left off: a width is a pixel measurement, and
      // markdown has nowhere to put one — dragging a column would look like it
      // worked until the todo was reopened.
      ImageWithLayout,
      TableWritingPipes.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      EmojiSuggestion.configure({
        onChange: (next) => {
          if (next === null) dismissedRef.current = false;
          if (dismissedRef.current) return;
          setSuggestion(next);
          setHighlighted(0);
        },
        onKeyDown: (event) => {
          const open = suggestionRef.current;
          if (open === null || open.items.length === 0) return false;

          if (event.key === "ArrowDown") {
            setHighlighted((at) => (at + 1) % open.items.length);
            return true;
          }
          if (event.key === "ArrowUp") {
            setHighlighted(
              (at) => (at - 1 + open.items.length) % open.items.length
            );
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            open.select(open.items[highlightedRef.current] ?? open.items[0]);
            return true;
          }
          return false;
        },
      }),
      // `transformPastedText` is what makes a plain-text paste — a markdown file
      // out of a terminal, a raw GitHub view, another note — arrive as rich
      // text instead of as its own source. A paste that carries real `text/html`
      // (a web page) is untouched: ProseMirror prefers the html flavour and
      // never reaches the text parser.
      Markdown.configure({ transformPastedText: true }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    // Only when it is born editable. A mounted editor is handed over by the
    // effect below, which focuses it then — autofocusing a read-only editor
    // on page load would take the caret for a document nobody asked to write
    // in.
    autofocus: autoFocus && editable ? "end" : false,
    editorProps: { attributes: editorAttributes },
    onCreate: ({ editor }) => remember(editor),
    // Focus moving into the editor's own chrome (the toolbar, the link popover)
    // is not the user leaving the editor — reporting a blur there tears down
    // click-to-edit views mid-interaction, closing the editor as the popover
    // opens. Only a blur that lands outside counts.
    onBlur: ({ editor, event }) => {
      if (movedIntoEditorChrome(event)) return;
      onBlur?.(valueOf(editor));
    },
  });

  /**
   * Keeps a mounted editor in step with its props.
   *
   * `useEditor` reads its options once, at creation, and never looks at them
   * again — so before this, flipping `editable` on a mounted editor changed
   * nothing but the toolbar, leaving a full set of controls above a surface
   * that could not be typed into. That is what lets one editor be handed
   * between reading and writing instead of a second one being built: the
   * document stays parsed and on screen, and only its editability changes.
   *
   * `autoFocus` is honoured on the handover rather than at mount, so the caret
   * lands in the text at the moment it becomes writable.
   */
  useEffect(() => {
    if (!editor) return;

    const wasEditable = editor.isEditable;

    if (wasEditable !== editable) editor.setEditable(editable);
    editor.setOptions({ editorProps: { attributes: editorAttributes } });

    // A fresh sitting starts here, whatever was on screen while it was being
    // read — so cancelling straight after opening asks nothing.
    if (editable && !wasEditable) remember(editor);

    if (autoFocus && editable && !wasEditable) {
      editor.commands.focus("end");
    }
    // `editorAttributes` is a fresh object every render; the values inside it
    // are what matter, so the effect keys on those instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editable, autoFocus, editorAttributes.class, testId]);

  /**
   * Undo the whole sitting: the text goes back to the document this editor was
   * handed, and the caller is told to close it.
   *
   * The restore happens here rather than in the caller because only the editor
   * can perform it — the `content` prop has not changed, so the sync effect
   * below sees nothing to do and would leave the abandoned writing on screen,
   * read-only and looking saved.
   */
  /** Take this document as the one nothing has been written on top of yet. */
  const remember = (editor: Editor) => {
    pristine.current = JSON.stringify(editor.getJSON());
  };

  const changed = (editor: Editor) =>
    pristine.current !== JSON.stringify(editor.getJSON());

  const cancel = () => {
    if (!editor) return;

    // Nothing written since it opened: there is nothing to lose, and a dialog
    // asking whether to lose it is a question with one answer.
    if (!changed(editor)) {
      onCancel?.();
      return;
    }

    setDiscarding(true);
  };

  /** The answer being yes. */
  const discard = () => {
    if (!editor) return;

    setDiscarding(false);
    editor.commands.setContent(content);
    remember(editor);
    onCancel?.();
  };

  /**
   * Escape hands the document back and leaves the editor.
   *
   * Bound as a plain listener on the editable — the same route ctrl+K takes —
   * rather than through ProseMirror's keymap, because a dialog above answers
   * Escape from a *document-level capture* listener. That runs before anything
   * here whatever the mount order, so the dialog cannot be beaten to the key;
   * it is instead told to stand down (see `isEditingRichText`), and this fires
   * afterwards on the way down to the target.
   *
   * No dependency array, matching the ctrl+K handler below: the listener closes
   * over props that change, and re-binding each render is cheaper than the
   * stale callback the alternative buys.
   */
  useEffect(() => {
    if (!editor) return;
    if (onEscape === undefined && onCancel === undefined) return;

    const dom = editor.view.dom;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // A layer inside the editor — the shortcode list — answers Escape by
      // closing itself, and stops the key here so the editor stays open. See
      // `EmojiSuggestions`.
      if (onCancel !== undefined) {
        cancel();
        return;
      }
      onEscape?.(valueOf(editor));
    };

    dom.addEventListener("keydown", onKeyDown);
    return () => dom.removeEventListener("keydown", onKeyDown);
  });

  // Sync when the content prop changes from the outside (e.g. after a refetch),
  // but never while the user is typing to avoid clobbering the cursor.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (holdsContent(editor, content)) return;
    editor.commands.setContent(content);
    remember(editor);
  }, [content, editor]);

  const emojiList = editor && (
    <EmojiSuggestions
      editor={editor}
      state={suggestion}
      highlighted={highlighted}
      onHighlight={setHighlighted}
      onDismiss={() => {
        dismissedRef.current = true;
        setSuggestion(null);
      }}
    />
  );

  // One root either way. Returning a fragment when there is no chrome would
  // put `EditorContent` under a different parent as `chrome` flips, which
  // unmounts it — and rebuilding the view is the whole thing being avoided.
  return (
    <div data-editor-chrome="" className="flex flex-col">
      <div
        className={cn(
          "rounded-lg",
          chrome && "focus-within:ring-ring border focus-within:ring-1"
        )}>
        {chrome && editable && editor && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      {/* Outside the box, and pinned to the bottom of whatever is scrolling —
          see `EditorActions`. */}
      {editable && editor && (onSave || onCancel) && (
        <EditorActions
          editor={editor}
          onSave={onSave}
          onCancel={onCancel && cancel}
        />
      )}
      <DiscardConfirm
        open={discarding}
        onOpenChange={setDiscarding}
        onDiscard={discard}
      />
      {emojiList}
    </div>
  );
}

/**
 * The `:shortcode` list, anchored to the shortcode itself rather than to any
 * element — same virtual-anchor trick as the link popover, and for the same
 * reason (see `LinkButton`). It never takes focus: the user is mid-word, and
 * the arrow keys are answered by the editor's own keymap.
 */
function EmojiSuggestions({
  editor,
  state,
  highlighted,
  onHighlight,
  onDismiss,
}: {
  editor: Editor;
  state: EmojiSuggestionState | null;
  highlighted: number;
  onHighlight: (at: number) => void;
  onDismiss: () => void;
}) {
  const rect = useRef<DOMRect | null>(null);
  const anchor = useRef({
    getBoundingClientRect: () => rect.current ?? new DOMRect(),
  });

  if (state?.rect != null) rect.current = state.rect;

  const items = state?.items ?? [];

  return (
    <Popover open={items.length > 0}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        testId="editor.emoji.suggestions"
        container={chrome(editor)}
        data-editor-chrome=""
        onOpenAutoFocus={(event) => event.preventDefault()}
        // Escape is answered here rather than in the suggestion plugin's keymap:
        // Radix marks the event handled from a document-level listener, and
        // ProseMirror drops any key that already carries `defaultPrevented`, so
        // the editor genuinely never sees it while this list is on screen.
        //
        // `stopPropagation` covers the editor's *own* Escape listener, which is
        // a plain DOM handler on the editable and so is not bound by that. This
        // runs in the capture phase on the way down, and the list is the
        // innermost thing on screen: dismissing it must not also close the
        // editor it was offering into.
        onEscapeKeyDown={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
        align="start"
        side="bottom"
        sideOffset={6}
        className="max-h-64 w-56 overflow-y-auto p-1">
        {items.map((emoji, at) => (
          <button
            key={emoji.name}
            type="button"
            {...testProp(`editor.emoji.suggestions.${emoji.name}.button`)}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHighlight(at)}
            onClick={() => state?.select(emoji)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm",
              at === highlighted && "bg-accent"
            )}>
            <span className="text-base">{emoji.emoji}</span>
            <span className="truncate">{emoji.shortcodes[0]}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** True when focus left for the toolbar or the link popover, not the page. */
function movedIntoEditorChrome(event: FocusEvent) {
  const next = event.relatedTarget;
  return (
    next instanceof Element && next.closest("[data-editor-chrome]") !== null
  );
}

// tiptap-markdown augments the editor storage at runtime but ships no types
// for it, so we read the serializer through a narrow typed view.
type MarkdownStorage = {
  markdown: {
    getMarkdown: () => string;
    parser: {
      parse: (markdown: string, options?: { inline?: boolean }) => string;
    };
  };
};

function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();
}

/** Markdown source rendered to the html tiptap parses documents from. */
function parseMarkdown(editor: Editor, markdown: string): string {
  return (editor.storage as unknown as MarkdownStorage).markdown.parser.parse(
    markdown
  );
}

/** The document the editor is holding, in both spellings. */
function valueOf(editor: Editor): RichTextValue {
  return {
    doc: editor.getJSON() as RichTextDoc,
    markdown: getMarkdown(editor),
  };
}

/**
 * Whether the editor already holds what it is being given, so a re-render does
 * not reset the document under the user.
 *
 * Each spelling is compared in its own terms: markdown as text, a doc against
 * the editor's own JSON. Serialising to compare is cheap next to the
 * `setContent` it avoids, which tears the document down and rebuilds it.
 */
function holdsContent(editor: Editor, content: string | RichTextDoc): boolean {
  return typeof content === "string"
    ? content === getMarkdown(editor)
    : JSON.stringify(content) === JSON.stringify(editor.getJSON());
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      codeBlock: editor.isActive("codeBlock"),
      link: editor.isActive("link"),
      underline: editor.isActive("underline"),
      blockquote: editor.isActive("blockquote"),
      details: activeDetails(editor),
      table: editor.isActive("table"),
      highlight: activeHighlight(editor),
      block: activeBlock(editor),
      list: activeList(editor),
      align: activeAlign(editor),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  return (
    <div
      {...testProp("editor.toolbar")}
      /*
        Pinned to the top of whatever is scrolling the page — the modal's body,
        or the window on the detail route. A long description scrolls the
        formatting controls off screen exactly when they are being used, and
        reaching them meant scrolling back to the top of a document to change
        one word near the bottom.

        It needs an opaque fill of its own to be scrolled *under*, and the
        corner rounded to match the box it is pinned inside — a square fill
        would paint over the border's radius.
      */
      className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b px-1.5 py-1">
      <ToolbarButton
        testId="editor.toolbar.undo.button"
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.redo.button"
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 />
      </ToolbarButton>

      <Divider />

      <ToolbarMenu
        editor={editor}
        testId="editor.toolbar.block"
        label="Turn into"
        icon={blocks[state.block].icon}
        options={blocks}
        active={state.block}
      />
      <ToolbarMenu
        editor={editor}
        testId="editor.toolbar.list"
        label="List"
        icon={lists[state.list].icon}
        options={lists}
        active={state.list}
      />
      {/* Flat rather than inside the list menu: a quote is not a list, and it
          is reached often enough to earn a button of its own. */}
      <ToolbarButton
        testId="editor.toolbar.quote.button"
        label="Quote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote />
      </ToolbarButton>
      <DetailsMenu editor={editor} variant={state.details} />
      <TableMenu editor={editor} inside={state.table} />

      <Divider />

      <ToolbarButton
        testId="editor.toolbar.bold.button"
        label="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.italic.button"
        label="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.strike.button"
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.underline.button"
        label="Underline"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon />
      </ToolbarButton>
      <HighlightMenu editor={editor} colour={state.highlight} />

      <Divider />

      <ToolbarButton
        testId="editor.toolbar.code.button"
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.codeblock.button"
        label="Code block"
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <SquareCode />
      </ToolbarButton>
      <LinkButton editor={editor} active={state.link} />
      <ImageButton editor={editor} />

      <Divider />

      <ToolbarMenu
        editor={editor}
        testId="editor.toolbar.align"
        label="Align"
        icon={alignments[state.align].icon}
        options={alignments}
        active={state.align}
      />
      <EmojiButton editor={editor} />
    </div>
  );
}

/**
 * Adding an image: a url and the words that stand in for it.
 *
 * A url rather than a file picker, because there is nowhere to put a file —
 * the app has no server, and an uploaded image would have to be carried inside
 * the todo itself as base64.
 *
 * The alt text is a field rather than an afterthought: it is what a screen
 * reader announces and what shows when the url one day stops resolving, which
 * for an image that lives on someone else's server is a matter of time.
 */
function ImageButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");

  const apply = () => {
    const url = src.trim();
    if (url === "") return;

    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: alt.trim() || undefined })
      .run();

    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSrc("");
          setAlt("");
        }
      }}>
      <PopoverTrigger asChild>
        <ToolbarButton testId="editor.toolbar.image.button" label="Image">
          <ImageIcon />
        </ToolbarButton>
      </PopoverTrigger>

      <PopoverContent
        container={chrome(editor)}
        data-editor-chrome=""
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-72 p-2">
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}>
          <LinkField
            testId="editor.toolbar.image.url.input"
            icon={<ImageIcon className="size-3.5" />}
            placeholder="Image link"
            value={src}
            onChange={setSrc}
            autoFocus
          />
          <LinkField
            testId="editor.toolbar.image.alt.input"
            icon={<TypeIcon className="size-3.5" />}
            placeholder="Describe the image"
            value={alt}
            onChange={setAlt}
          />

          <div className="mt-0.5 flex items-center justify-end gap-1">
            <Button testId="editor.toolbar.image.apply" size="sm" type="submit">
              Add
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The table button: a grid you pick a shape from, and nothing else.
 *
 * Rows and columns used to be added and removed from this menu, which meant
 * naming the thing you were changing ("add row below" — below which?) instead
 * of pointing at it. They live on the table now, in the same floating controls
 * an image carries; see `TableView`. What is left here is the one thing that
 * has no table to sit on yet: making one.
 *
 * Disabled while the caret is already in a table, because inserting there would
 * nest a table inside a cell — which no pipe table can spell, so it would come
 * back as HTML on the next save.
 */
function TableMenu({ editor, inside }: { editor: Editor; inside: boolean }) {
  // Controlled, because the grid inside is made of plain buttons rather than
  // menu items — nothing closes the menu on its own when a size is picked.
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          testId="editor.toolbar.table.menu"
          label={inside ? "The table's own controls are on it" : "Table"}
          disabled={inside}
          width="wide">
          <TableIcon />
          <ChevronDown className="size-3 opacity-50" />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        container={chrome(editor)}
        data-editor-chrome=""
        align="start"
        // A closing menu hands focus back to the button that opened it, which
        // is the wrong place: the caret has just been put in the new table's
        // first cell, and the next thing typed belongs there rather than
        // nowhere. The command focuses the editor itself, so the restore is
        // only a race to undo it.
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-auto p-2">
        <TableSizePicker editor={editor} onPicked={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The size grid: 8 × 8 cells, filled up to whatever is being pointed at.
 *
 * Every cell is a real button rather than one grid with mouse maths on top, so
 * the shape can be picked by keyboard and read out by name — and so a spec can
 * ask for a size instead of simulating a hover.
 */
function TableSizePicker({
  editor,
  onPicked,
}: {
  editor: Editor;
  onPicked: () => void;
}) {
  const [over, setOver] = useState<{ rows: number; cols: number }>(NewTable);

  const insert = (rows: number, cols: number) => {
    editor
      .chain()
      .focus()
      // `withHeaderRow` counts inside `rows`, which is what makes the grid's
      // top row and the header the same row.
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
    onPicked();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        // The grid is one control made of many: arrowing between cells is the
        // keyboard's way of resizing, and each cell says what it would build.
        role="grid"
        aria-label="Table size"
        className="grid grid-cols-8 gap-0.5"
        onMouseLeave={() => setOver(NewTable)}>
        {Array.from({ length: TableGrid.rows }, (_, row) =>
          Array.from({ length: TableGrid.cols }, (_, col) => {
            const rows = row + 1;
            const cols = col + 1;
            const within = rows <= over.rows && cols <= over.cols;

            return (
              <button
                key={`${rows}x${cols}`}
                {...testProp(`editor.toolbar.table.size.${rows}x${cols}`)}
                type="button"
                // The caret has to survive the click: it is where the table
                // goes.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setOver({ rows, cols })}
                onFocus={() => setOver({ rows, cols })}
                onClick={() => insert(rows, cols)}
                aria-label={`${rows} by ${cols}`}
                className={cn(
                  "size-4 rounded-[3px] border transition-colors",
                  within
                    ? "border-primary bg-primary/70"
                    : "border-border bg-muted",
                  // The top row is the header, and says so even before it is
                  // picked — otherwise "3 rows" quietly means two.
                  rows === 1 && !within && "bg-foreground/15"
                )}
              />
            );
          })
        )}
      </div>

      <p
        {...testProp("editor.toolbar.table.size.label")}
        className="text-muted-foreground text-center text-xs">
        {over.rows} × {over.cols}
        <span className="opacity-60"> · header + {over.rows - 1}</span>
      </p>
    </div>
  );
}

/**
 * The emoji picker: the route for people who do not know the shortcode by
 * heart, where typing `:tada` is the route for people who do.
 *
 * The catalogue is fetched the first time the picker is opened rather than with
 * the editor — see `@/lib/emoji` — so the grid stands in as a skeleton for the
 * moment that takes.
 */
function EmojiButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalogue, setCatalogue] = useState<Emoji[] | null>(null);

  useEffect(() => {
    if (!open || catalogue !== null) return;

    let live = true;
    loadEmojis().then((emojis) => {
      if (live) setCatalogue(emojis);
    });
    return () => {
      live = false;
    };
  }, [open, catalogue]);

  const results =
    catalogue === null ? [] : searchEmojis(catalogue, query, EmojiPickerLimit);

  const insert = (emoji: Emoji) => {
    editor.chain().focus().insertContent(emoji.emoji).run();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}>
      <PopoverTrigger asChild>
        <ToolbarButton testId="editor.toolbar.emoji.button" label="Emoji">
          <Smile />
        </ToolbarButton>
      </PopoverTrigger>

      <PopoverContent
        // Portalled into the editor for the same reason as the link popover.
        container={chrome(editor)}
        data-editor-chrome=""
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-64 p-2">
        <Input
          testId="editor.toolbar.emoji.search.input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search emoji"
          autoFocus
          className="h-8"
        />

        {catalogue === null ? (
          <div
            aria-busy
            aria-label="Loading emoji"
            {...testProp("editor.toolbar.emoji.loading")}
            className="mt-2 grid grid-cols-8 gap-1">
            {Array.from({ length: EmojiPickerSkeletons }, (_, at) => (
              <Skeleton key={at} className="size-7 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="mt-2 grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
            {results.map((emoji) => (
              <button
                key={emoji.name}
                type="button"
                title={emoji.shortcodes[0]}
                aria-label={emoji.name}
                {...testProp(`editor.toolbar.emoji.${emoji.name}.button`)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(emoji)}
                className="hover:bg-accent flex size-7 items-center justify-center rounded-md text-base">
                {emoji.emoji}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** As many as the grid shows before it asks for a narrower search. */
const EmojiPickerLimit = 64;

/** One skeleton per cell of the grid the emoji will land in. */
const EmojiPickerSkeletons = 24;

/* -------------------------------------------------------------------------- */
/* The grouped menus                                                           */
/* -------------------------------------------------------------------------- */

/**
 * One entry in a toolbar menu: what it is called, the icon that stands for it
 * both in the list and on the trigger while it is the current one, and the
 * command that applies it.
 */
type ToolbarOption = {
  label: string;
  icon: ReactNode;
  apply: (editor: Editor) => void;
};

/**
 * The block the cursor sits in. Keyed rather than listed so the trigger can look
 * the current one up to borrow its icon, the way the tiptap toolbar does.
 */
const blocks: Record<string, ToolbarOption> = {
  paragraph: {
    label: "Paragraph",
    icon: <Pilcrow />,
    apply: (editor) => editor.chain().focus().setParagraph().run(),
  },
  h1: {
    label: "Heading 1",
    icon: <Heading1 />,
    apply: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  h2: {
    label: "Heading 2",
    icon: <Heading2 />,
    apply: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  h3: {
    label: "Heading 3",
    icon: <Heading3 />,
    apply: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
};

const lists: Record<string, ToolbarOption> = {
  none: {
    label: "No list",
    icon: <List />,
    apply: (editor) => editor.chain().focus().clearNodes().setParagraph().run(),
  },
  bulletlist: {
    label: "Bullet list",
    icon: <List />,
    apply: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  orderedlist: {
    label: "Numbered list",
    icon: <ListOrdered />,
    apply: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  tasklist: {
    label: "To-do list",
    icon: <ListTodo />,
    apply: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
};

const alignments: Record<string, ToolbarOption> = {
  left: {
    label: "Align left",
    icon: <AlignLeft />,
    apply: (editor) => editor.chain().focus().setTextAlign("left").run(),
  },
  center: {
    label: "Align center",
    icon: <AlignCenter />,
    apply: (editor) => editor.chain().focus().setTextAlign("center").run(),
  },
  right: {
    label: "Align right",
    icon: <AlignRight />,
    apply: (editor) => editor.chain().focus().setTextAlign("right").run(),
  },
  justify: {
    label: "Justify",
    icon: <AlignJustify />,
    apply: (editor) => editor.chain().focus().setTextAlign("justify").run(),
  },
};

/** The variant of the section the cursor is in, or null when it is in none. */
function activeDetails(editor: Editor): DetailsVariant | null {
  if (!editor.isActive("details")) return null;
  return editor.getAttributes("details").variant ?? "plain";
}

/** How each variant names and draws itself in the menu. */
const detailsLooks: Record<
  DetailsVariant,
  { label: string; icon: ReactNode; tone: string }
> = {
  plain: { label: "Collapsible", icon: <ListCollapse />, tone: "" },
  info: { label: "Info", icon: <Info />, tone: "text-callout-info" },
  warning: {
    label: "Warning",
    icon: <TriangleAlert />,
    tone: "text-callout-warning",
  },
  success: {
    label: "Success",
    icon: <CircleCheck />,
    tone: "text-callout-success",
  },
  error: { label: "Error", icon: <CircleX />, tone: "text-callout-error" },
};

/**
 * The collapsible section, and the four callouts it can be dressed as.
 *
 * Picking a look while the cursor already sits in a section re-dresses that one
 * rather than nesting a second inside it. "Remove" is the only way back out —
 * the extension ships no toggle, and without it a section could be created but
 * never undone.
 */
function DetailsMenu({
  editor,
  variant,
}: {
  editor: Editor;
  variant: DetailsVariant | null;
}) {
  const apply = (next: DetailsVariant) => {
    const chain = editor.chain().focus();
    if (variant === null) chain.setDetails();
    chain.updateAttributes("details", { variant: next }).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          testId="editor.toolbar.details.menu"
          label="Collapsible section"
          active={variant !== null}
          width="wide">
          <span className={variant === null ? "" : detailsLooks[variant].tone}>
            {variant === null
              ? detailsLooks.plain.icon
              : detailsLooks[variant].icon}
          </span>
          <ChevronDown className="size-3 opacity-50" />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        container={chrome(editor)}
        data-editor-chrome=""
        align="start"
        className="min-w-44">
        {detailsVariants.map((option) => (
          <DropdownMenuItem
            key={option}
            testId={`editor.toolbar.details.${option}.button`}
            onMouseDown={(event) => event.preventDefault()}
            onSelect={() => apply(option)}
            className={cn(option === variant && "bg-accent")}>
            <span className={detailsLooks[option].tone}>
              {detailsLooks[option].icon}
            </span>
            {detailsLooks[option].label}
          </DropdownMenuItem>
        ))}

        {variant !== null && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              testId="editor.toolbar.details.remove.button"
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => editor.chain().focus().unsetDetails().run()}>
              <Ban />
              Remove
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The pen colour on the selection, or null when it is not highlighted. */
function activeHighlight(editor: Editor): string | null {
  if (!editor.isActive("highlight")) return null;
  return editor.getAttributes("highlight").color ?? "yellow";
}

/**
 * The pen, and the six ways to set it. Its trigger carries a bar in whatever
 * colour is currently on the selection, so the toolbar says which pen is loaded
 * without opening the menu.
 */
function HighlightMenu({
  editor,
  colour,
}: {
  editor: Editor;
  colour: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          testId="editor.toolbar.highlight.menu"
          label="Highlight"
          active={colour !== null}
          width="wide">
          <span className="relative flex flex-col items-center">
            <Highlighter />
            <span
              className={cn(
                "mt-px h-[3px] w-4 rounded-full",
                colour === null ? "bg-transparent" : swatch[colour]
              )}
            />
          </span>
          <ChevronDown className="size-3 opacity-50" />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        container={chrome(editor)}
        data-editor-chrome=""
        align="start"
        className="min-w-40">
        {highlightColours.map((option) => (
          <DropdownMenuItem
            key={option}
            testId={`editor.toolbar.highlight.${option}.button`}
            onMouseDown={(event) => event.preventDefault()}
            onSelect={() =>
              editor.chain().focus().setHighlight({ color: option }).run()
            }
            className={cn("capitalize", option === colour && "bg-accent")}>
            <span className={cn("size-4 rounded-sm border", swatch[option])} />
            {option}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          testId="editor.toolbar.highlight.none.button"
          onMouseDown={(event) => event.preventDefault()}
          onSelect={() => editor.chain().focus().unsetHighlight().run()}>
          <Ban />
          None
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Tailwind scans for whole class names, so the five have to appear literally —
 * a `bg-highlight-${colour}` template would compile to nothing.
 */
const swatch: Record<string, string> = {
  yellow: "bg-highlight-yellow",
  green: "bg-highlight-green",
  blue: "bg-highlight-blue",
  pink: "bg-highlight-pink",
  purple: "bg-highlight-purple",
};

function activeBlock(editor: Editor): string {
  for (const level of [1, 2, 3]) {
    if (editor.isActive("heading", { level })) return `h${level}`;
  }
  return "paragraph";
}

function activeList(editor: Editor): string {
  if (editor.isActive("bulletList")) return "bulletlist";
  if (editor.isActive("orderedList")) return "orderedlist";
  if (editor.isActive("taskList")) return "tasklist";
  return "none";
}

function activeAlign(editor: Editor): string {
  for (const align of ["center", "right", "justify"]) {
    if (editor.isActive({ textAlign: align })) return align;
  }
  return "left";
}

/**
 * A group of related block commands collapsed behind one trigger, which wears
 * the icon of whichever option is currently in effect. Keeps the toolbar to a
 * single row in the ~600px description column, where fifteen flat buttons wrap.
 */
function ToolbarMenu({
  editor,
  testId,
  label,
  icon,
  options,
  active,
}: TestIdProps & {
  editor: Editor;
  label: string;
  icon: ReactNode;
  options: Record<string, ToolbarOption>;
  active: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton testId={`${testId}.menu`} label={label} width="wide">
          {icon}
          <ChevronDown className="size-3 opacity-50" />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        // Same reason the link popover portals here: a modal dialog makes
        // everything outside itself inert, and a blur landing outside the
        // editor's chrome tears down click-to-edit views mid-interaction.
        container={chrome(editor)}
        data-editor-chrome=""
        align="start"
        className="min-w-44">
        {Object.entries(options).map(([key, option]) => (
          <DropdownMenuItem
            key={key}
            testId={`${testId}.${key}.button`}
            // Keep the ProseMirror selection: without this the menu's own
            // focus handling blurs the editor before the command runs.
            onMouseDown={(event) => event.preventDefault()}
            onSelect={() => option.apply(editor)}
            className={cn(key === active && "bg-accent")}>
            {option.icon}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Divider() {
  return <Separator orientation="vertical" className="mx-1 !h-5" />;
}

/**
 * The link control. Opened either by its own toolbar button or by ctrl/cmd+K,
 * and anchored to the selection rather than to the button so it appears beside
 * the text being linked. Both fields are prefilled from what is selected: the
 * text so it can be renamed in place, the url so the shortcut edits an existing
 * link rather than re-creating it.
 */
function LinkButton({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [href, setHref] = useState("");
  const [anchored, setAnchored] = useState(false);

  // A *virtual* anchor rather than a positioned element: the popover renders
  // inside the dialog, whose translate-50% transform becomes the containing
  // block for anything `fixed`, so a positioned span lands offset by the
  // dialog's own translation (in the corner). A rect handed straight to the
  // positioner has no such frame of reference to get wrong.
  const selectionRect = useRef<DOMRect | null>(null);
  const virtualAnchor = useRef({
    getBoundingClientRect: () => selectionRect.current ?? new DOMRect(),
  });

  /**
   * Loads the fields and the anchor from whatever is selected. Deliberately
   * does *not* touch `open` — the trigger toggles that itself, and a second
   * writer on the same click makes the two fight (the popover opens and shuts
   * within one event).
   */
  const prepareFromSelection = () => {
    // A bare cursor inside a link means the whole link, so grow the selection
    // first — that is what lets ctrl+K edit a link without selecting it.
    if (editor.isActive("link") && editor.state.selection.empty) {
      editor.commands.extendMarkRange("link");
    }

    const { from, to } = editor.state.selection;

    setText(editor.state.doc.textBetween(from, to, " "));
    setHref(editor.getAttributes("link").href ?? "");

    selectionRect.current = selectionViewportRect(editor);
    setAnchored(selectionRect.current !== null);
  };

  /** The keyboard route, which has no trigger to toggle `open` for it. */
  const openFromSelection = () => {
    prepareFromSelection();
    setOpen(true);
  };

  // ctrl/cmd+K has to be caught on the editor's own DOM node: the selection
  // lives in ProseMirror, and the toolbar never holds focus while typing.
  useEffect(() => {
    const dom = editor.view.dom;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "k" || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      openFromSelection();
    };

    dom.addEventListener("keydown", onKeyDown);
    return () => dom.removeEventListener("keydown", onKeyDown);
  });

  const apply = () => {
    const url = href.trim();
    const label = text.trim();

    if (url === "") return remove();

    const chain = editor.chain().focus().extendMarkRange("link");

    // Renaming means replacing the selected text, which carries the mark with
    // it; leaving the text alone is just a mark change on what is selected.
    if (label !== "" && label !== currentText(editor)) {
      chain.insertContent({
        type: "text",
        text: label,
        marks: [{ type: "link", attrs: { href: url } }],
      });
    } else {
      chain.setLink({ href: url });
    }

    chain.run();
    setOpen(false);
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) prepareFromSelection();
        setOpen(next);
      }}>
      <PopoverTrigger asChild>
        <ToolbarButton
          testId="editor.toolbar.link.button"
          label="Link (Ctrl+K)"
          // No onClick: the trigger toggles `open` itself, and a second writer
          // on the same click makes the two fight.
          active={active}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
      </PopoverTrigger>

      {anchored && <PopoverAnchor virtualRef={virtualAnchor} />}

      <PopoverContent
        // Portalled into the editor rather than the body: a modal dialog makes
        // everything outside itself inert, so a body-level popover is dead to
        // clicks inside the todo modal. Staying in the subtree also keeps the
        // dialog from reading the interaction as a click outside.
        container={chrome(editor)}
        // Marks this as part of the editor's own chrome, so focus landing here
        // is not treated as the user leaving the editor.
        data-editor-chrome=""
        // The toolbar blocks its own mousedown so the ProseMirror selection
        // survives the click — which leaves focus in the editor, i.e. outside
        // this popover, and Radix reads that as "focus left, dismiss me".
        // Focus anywhere in the editor's chrome is not the user leaving.
        onFocusOutside={(event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest("[data-editor-chrome]") !== null
          ) {
            event.preventDefault();
          }
        }}
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-72 p-2">
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}>
          <LinkField
            testId="editor.toolbar.link.text.input"
            icon={<TypeIcon className="size-3.5" />}
            placeholder="Text"
            value={text}
            onChange={setText}
            autoFocus
          />
          <LinkField
            testId="editor.toolbar.link.url.input"
            icon={<LinkIcon className="size-3.5" />}
            placeholder="Link"
            value={href}
            onChange={setHref}
          />

          <div className="mt-0.5 flex items-center justify-end gap-1">
            {active && (
              <Button
                testId="editor.toolbar.link.remove"
                size="sm"
                variant="ghost"
                type="button"
                onClick={remove}>
                Remove
              </Button>
            )}
            <Button testId="editor.toolbar.link.apply" size="sm" type="submit">
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** One labelled field: the icon stands in for the label, the placeholder names it. */
function LinkField({
  icon,
  testId,
  placeholder,
  value,
  onChange,
  autoFocus = false,
}: TestIdProps & {
  icon: ReactNode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative flex items-center">
      <span className="text-muted-foreground pointer-events-none absolute left-2.5 flex">
        {icon}
      </span>
      <Input
        testId={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-8 pl-8"
      />
    </div>
  );
}

/** The editor's own wrapper — the portal target that keeps popovers usable. */
function chrome(editor: Editor): HTMLElement | null {
  return editor.view.dom.closest<HTMLElement>("[data-editor-chrome]");
}

function currentText(editor: Editor) {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, " ").trim();
}

/**
 * The viewport rect the selection occupies, so the popover can sit beside the
 * text. Spans both endpoints, so a multi-word selection anchors under the whole
 * range rather than its first character.
 *
 * Returns null when the geometry is unavailable (jsdom has no layout), which
 * falls the popover back to anchoring on its toolbar button.
 */
function selectionViewportRect(editor: Editor): DOMRect | null {
  try {
    const { from, to } = editor.state.selection;
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);

    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);
    const top = Math.min(start.top, end.top);
    const bottom = Math.max(start.bottom, end.bottom);

    if (![left, right, top, bottom].every(Number.isFinite)) return null;

    return new DOMRect(left, top, right - left, bottom - top);
  } catch {
    return null;
  }
}

type ToolbarButtonProps = Omit<
  ComponentProps<typeof Toggle>,
  "onClick" | "pressed"
> & {
  label: string;
  active?: boolean;
  /** `wide` leaves room for the chevron a menu trigger carries. */
  width?: "icon" | "wide";
  /** Optional: a button inside a Radix trigger lets the trigger do the work. */
  onClick?: () => void;
  children: ReactNode;
};

/**
 * The question in front of a cancel that would lose writing.
 *
 * Not portalled into the editor's chrome, unlike the popovers: this is a modal
 * over the whole page, and it is asked *because* the editor is about to close.
 * Keeping focus in the editor is the one thing it must not do.
 */
function DiscardConfirm({
  open,
  onOpenChange,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent testId="editor.discard.dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Throw away what you wrote?</AlertDialogTitle>
          <AlertDialogDescription>
            This description has changes that were never saved. Leaving now
            drops them, and they cannot be brought back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel testId="editor.discard.keep">
            Keep writing
          </AlertDialogCancel>
          <AlertDialogAction
            testId="editor.discard.confirm"
            variant="destructive"
            onClick={onDiscard}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The footer: the two ways out of an editor that saves on purpose.
 *
 * It floats rather than sitting in the box. Inside the border it belonged to
 * the text — the bottom row of a long document, only reachable by scrolling to
 * the end of the writing to agree to keep it. Pinned below the box instead, it
 * follows the scroll and stays where it was last seen.
 *
 * Right-aligned and its own small surface, so it reads as being *over* the
 * document rather than part of it, and covers as little of the text as two
 * buttons can.
 *
 * Both hold the caret where it is (`onMouseDown` preventDefault) rather than
 * taking focus. That keeps the selection for anything the caller does next, and
 * means pressing either cannot be mistaken for the user leaving the editor.
 */
function EditorActions({
  editor,
  onSave,
  onCancel,
}: {
  editor: Editor;
  onSave?: (value: RichTextValue) => void;
  onCancel?: () => void;
}) {
  return (
    <div
      {...testProp("editor.actions")}
      className="bg-background/85 border-border sticky bottom-2 z-20 mt-2 ml-auto flex items-center gap-1 rounded-full border p-1 shadow-sm backdrop-blur-sm">
      {onCancel && (
        <Button
          testId="editor.cancel.button"
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCancel}>
          Cancel
        </Button>
      )}
      {onSave && (
        <Button
          testId="editor.save.button"
          type="button"
          size="sm"
          className="rounded-full"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSave(valueOf(editor))}>
          Save
        </Button>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  active = false,
  width = "icon",
  onClick,
  className,
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <Toggle
      {...props}
      size="sm"
      pressed={active}
      aria-label={label}
      title={label}
      // Keep the editor selection: prevent the click from blurring it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        // Full-strength ink rather than the muted grey a toolbar usually wears:
        // that grey means "the editor is not focused", and this toolbar is only
        // ever on screen while it is.
        "text-foreground hover:text-foreground gap-0.5 disabled:opacity-40",
        width === "icon" ? "w-8" : "px-1.5",
        className
      )}>
      {children}
    </Toggle>
  );
}
