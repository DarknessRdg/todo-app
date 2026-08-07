import { cn } from "@/lib/utils";
import Placeholder from "@tiptap/extension-placeholder";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code,
  SquareCode,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Type as TypeIcon,
  Undo2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { testProp, type TestIdProps } from "@/lib/test-id";

/**
 * `common` is lowlight's curated grammar set (~35 languages) rather than `all`
 * (~190) — the long tail is mostly weight in the bundle for a todo app.
 */
const lowlight = createLowlight(common);

type RichTextEditorProps = {
  /**
   * The document content, stored/exchanged as Markdown. Markdown is a
   * portable, human-readable format so persisted values are not locked into
   * Tiptap's internal ProseMirror JSON representation.
   */
  content?: string;
  editable?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  /** When true, wraps the editor in a bordered box with the formatting toolbar.
   * When false, renders just the (read-only) content — for click-to-edit views. */
  chrome?: boolean;
  /** Called with the current document as a Markdown string when focus leaves. */
  onBlur?: (markdown: string) => void;
} & TestIdProps;

export function RichTextEditor({
  content = "",
  editable = true,
  autoFocus = false,
  placeholder,
  className,
  chrome = true,
  onBlur,
  testId,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      // StarterKit ships a plain code block; swap it for the lowlight one so
      // fenced blocks are tokenised. Registering both would duplicate the node.
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: cn(chrome ? "min-h-24 p-2" : "", "outline-none md:text-sm", className),
        ...testProp(testId),
      },
    },
    // Focus moving into the editor's own chrome (the toolbar, the link popover)
    // is not the user leaving the editor — reporting a blur there tears down
    // click-to-edit views mid-interaction, closing the editor as the popover
    // opens. Only a blur that lands outside counts.
    onBlur: ({ editor, event }) => {
      if (movedIntoEditorChrome(event)) return;
      onBlur?.(getMarkdown(editor));
    },
  });

  // Sync when the content prop changes from the outside (e.g. after a refetch),
  // but never while the user is typing to avoid clobbering the cursor.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (content === getMarkdown(editor)) return;
    editor.commands.setContent(content);
  }, [content, editor]);

  if (!chrome) {
    return <EditorContent editor={editor} />;
  }

  return (
    <div
      data-editor-chrome=""
      className="focus-within:ring-ring rounded-lg border focus-within:ring-1">
      {editable && editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

/** True when focus left for the toolbar or the link popover, not the page. */
function movedIntoEditorChrome(event: FocusEvent) {
  const next = event.relatedTarget;
  return next instanceof Element && next.closest("[data-editor-chrome]") !== null;
}

// tiptap-markdown augments the editor storage at runtime but ships no types
// for it, so we read the serializer through a narrow typed view.
type MarkdownStorage = { markdown: { getMarkdown: () => string } };

function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();
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
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  return (
    <div
      {...testProp("editor.toolbar")}
      className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <ToolbarButton
        testId="editor.toolbar.bold.button"
        label="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.italic.button"
        label="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.strike.button"
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.code.button"
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.codeblock.button"
        label="Code block"
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <SquareCode className="h-4 w-4" />
      </ToolbarButton>
      <LinkButton editor={editor} active={state.link} />

      <Divider />

      <ToolbarButton
        testId="editor.toolbar.h1.button"
        label="Heading 1"
        active={state.h1}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }>
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.h2.button"
        label="Heading 2"
        active={state.h2}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        testId="editor.toolbar.bulletlist.button"
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.orderedlist.button"
        label="Numbered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.quote.button"
        label="Quote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        testId="editor.toolbar.undo.button"
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        testId="editor.toolbar.redo.button"
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

function Divider() {
  return <div className="bg-border mx-1 h-5 w-px" />;
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

  const openFromSelection = () => {
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton
          testId="editor.toolbar.link.button"
          label="Link (Ctrl+K)"
          active={active}
          onClick={openFromSelection}>
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

type ToolbarButtonProps = Omit<ComponentProps<"button">, "onClick"> &
  TestIdProps & {
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
  };

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  testId,
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      // Keep the editor selection: prevent the click from blurring it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      {...testProp(testId)}
      className={cn(
        "hover:bg-muted inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "bg-muted text-foreground"
      )}>
      {children}
    </button>
  );
}
