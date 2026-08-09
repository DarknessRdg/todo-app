import { Slot } from "@radix-ui/react-slot";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";

import { Input, type InputProps } from "@/components/ui/input";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { cn } from "@/lib/utils";

/**
 * Inline edit (edit-in-place): a value that reads as ordinary content until it
 * is clicked, at which point the same spot becomes a field. Composed as slots
 * so both states are visible at the call site:
 *
 * ```tsx
 * <InlineEdit value={title} onCommit={save} required className="text-2xl">
 *   <InlineEdit.Read asChild testId="todo.detail.title">
 *     <h1>{title}</h1>
 *   </InlineEdit.Read>
 *   <InlineEdit.Input testId="todo.detail.title.input" />
 * </InlineEdit>
 * ```
 *
 * `InlineEdit.Input` covers single-line values; `InlineEdit.Edit` takes any
 * other control — a rich text editor, say — and hands it the machinery.
 */

/** What a control needs to drive an edit, handed to `InlineEdit.Edit`. */
export type InlineEditControls = {
  /** The working copy, discarded if the edit is abandoned. */
  value: string;
  onChange: (next: string) => void;
  /**
   * Saves and closes. Controls that hold their own value (an editor that hands
   * its content back on blur) pass it here instead of tracking `onChange`.
   */
  commit: (value?: string) => void;
  /** Closes without saving. */
  cancel: () => void;
};

type InlineEditContextValue = InlineEditControls & {
  editing: boolean;
  open: () => void;
};

const InlineEditContext = createContext<InlineEditContextValue | null>(null);

function useInlineEditContext(slot: string) {
  const context = useContext(InlineEditContext);

  if (context === null) {
    throw new Error(`<InlineEdit.${slot}> must be rendered inside <InlineEdit>`);
  }

  return context;
}

type InlineEditProps = PropsWithChildren<{
  /** The stored value. Also what an abandoned edit falls back to. */
  value: string;
  /** Called only when the value actually changed and passed `required`. */
  onCommit: (next: string) => void;
  /** Refuse a blank value, keeping the stored one, rather than saving it. */
  required?: boolean;
}>;

export function InlineEdit({
  value,
  onCommit,
  required = false,
  children,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // Enter saves and closes the field, and closing it can fire a blur of its
  // own — without this the same edit would be reported twice.
  const settled = useRef(false);

  const open = () => {
    // Every entry, not just the first: the stored value moves on as edits are
    // saved, and a stale draft would silently undo the last one.
    setDraft(value);
    settled.current = false;
    setEditing(true);
  };

  const commit = (explicit?: string) => {
    if (settled.current) return;
    settled.current = true;
    setEditing(false);

    const next = (explicit ?? draft).trim();

    // An unchanged value is not worth a write, and a blank one where a value is
    // required would leave the thing it names unidentifiable.
    if (next === value || (required && next === "")) return;

    onCommit(next);
  };

  const cancel = () => {
    settled.current = true;
    setEditing(false);
  };

  return (
    <InlineEditContext.Provider
      value={{
        editing,
        open,
        value: draft,
        onChange: setDraft,
        commit,
        cancel,
      }}>
      {children}
    </InlineEditContext.Provider>
  );
}

type InlineEditReadProps = PropsWithChildren<
  TestIdProps & {
    /**
     * Render the child element instead of a wrapping div, so the caller keeps
     * its own tag — an `h1` stays a heading rather than being nested in one
     * more div.
     */
    asChild?: boolean;
    /** Names the control for screen readers, e.g. "Edit title". */
    "aria-label"?: string;
    className?: string;
  }
>;

/**
 * The resting state. Each slot carries its own `className` — where the two
 * states need to line up, that is the caller's job to keep in step.
 *
 * Styling note: with `asChild`, keep the classes here and let the child carry
 * none of its own. Radix's `Slot` joins the two `className`s verbatim rather
 * than through `cn`, so classes that fight (two radii, two paddings) are
 * settled by stylesheet order, not by the order they are written.
 */
InlineEdit.Read = function InlineEditRead({
  asChild = false,
  testId,
  className,
  children,
  ...props
}: InlineEditReadProps) {
  const { editing, open } = useInlineEditContext("Read");

  if (editing) return null;

  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      {...props}
      {...testProp(testId)}
      // Deliberately not `role="button"`: it would replace the element's own
      // role, and a heading that announces itself as a button is no longer a
      // heading to a screen reader. Focusable and labelled is enough.
      tabIndex={0}
      onClick={open}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
      className={cn(
        "hover:border-border cursor-text rounded-lg border border-transparent transition-colors",
        className
      )}>
      {children}
    </Comp>
  );
};

/** Any control that is not a plain text field, handed the machinery. */
InlineEdit.Edit = function InlineEditEdit({
  children,
}: {
  children: (controls: InlineEditControls) => ReactNode;
}) {
  const { editing, value, onChange, commit, cancel } =
    useInlineEditContext("Edit");

  if (!editing) return null;

  return <>{children({ value, onChange, commit, cancel })}</>;
};

/**
 * The single-line preset: blur or Enter saves, Escape abandons.
 *
 * Styling is `ui/input`'s own, so it looks like every other field in the app
 * until a caller says otherwise.
 */
InlineEdit.Input = function InlineEditInput({
  testId,
  className,
  ...props
}: InputProps) {
  const { editing, value, onChange, commit, cancel } =
    useInlineEditContext("Input");

  if (!editing) return null;

  return (
    <Input
      {...props}
      testId={testId}
      value={value}
      autoFocus
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => commit()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
      className={className}
    />
  );
};
