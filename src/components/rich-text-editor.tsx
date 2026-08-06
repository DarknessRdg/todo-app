import { cn } from "@/lib/utils";
import Placeholder from "@tiptap/extension-placeholder";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

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
};

export function RichTextEditor({
  content = "",
  editable = true,
  autoFocus = false,
  placeholder,
  className,
  chrome = true,
  onBlur,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: cn(chrome ? "min-h-24 p-2" : "", "outline-none md:text-sm", className),
      },
    },
    onBlur: ({ editor }) => onBlur?.(getMarkdown(editor)),
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
    <div className="focus-within:ring-ring rounded-lg border focus-within:ring-1">
      {editable && editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
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
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <ToolbarButton
        label="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Heading 1"
        active={state.h1}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }>
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={state.h2}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
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

type ToolbarButtonProps = {
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
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      // Keep the editor selection: prevent the click from blurring it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "hover:bg-muted inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "bg-muted text-foreground"
      )}>
      {children}
    </button>
  );
}
