/**
 * ProseMirror's own JSON for a document — what the editor loads without having
 * to parse anything.
 *
 * Kept opaque on purpose: nothing outside the editor reads into it, so the
 * shape stays the editor's business and the stored copy is only ever a cache of
 * the markdown beside it. Typed structurally rather than as tiptap's
 * `JSONContent` so the domain layer never imports the editor.
 */
export type RichTextDoc = Record<string, unknown>;

/**
 * A document in both its spellings, which is what the editor hands back and
 * what gets stored.
 *
 * `markdown` is the record: portable, readable, and what everything falls back
 * to. `doc` is the same document pre-parsed — three times the bytes, and it
 * takes a description mount from ~31ms to ~13ms, because loading it skips the
 * markdown parse entirely. The two are always written together, so the cache
 * cannot drift away from the record it stands for.
 */
export type RichTextValue = {
  doc: RichTextDoc;
  markdown: string;
};

/**
 * What to hand the editor for a stored description: the parsed doc when there
 * is one, and the markdown when there is not.
 *
 * Rows written before the doc existed — and any restored from a markdown
 * backup — have only the markdown, and are parsed the old way until the next
 * save puts a doc beside them. Nothing is written just for reading one.
 */
export function richTextContent(
  markdown: string | undefined,
  doc: RichTextDoc | undefined
): string | RichTextDoc {
  return doc ?? markdown ?? "";
}

/**
 * Whether a keystroke landed inside a rich text editor that is open for
 * editing.
 *
 * Escape belongs to the innermost thing that can answer it: the editor saves
 * and closes itself, and only an Escape that nothing inside answered should
 * reach the dialog around it. A container asks this before treating one as a
 * dismissal.
 *
 * The editable surface is ProseMirror's own — it carries `contenteditable`,
 * set to `false` while a document is merely being read — so this cannot be
 * fooled by a read-only editor sitting on the page.
 */
export function isEditingRichText(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[contenteditable="true"]') !== null
  );
}
