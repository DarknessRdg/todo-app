/**
 * The emoji catalogue, and the search over it that both the `:` autocomplete
 * and the toolbar picker run.
 *
 * The catalogue is Tiptap's curated list (~1900 entries, ~600kB of source), so
 * it is **loaded on demand** rather than imported at the top of the editor:
 * nobody pays for it until they reach for an emoji. The search itself is a pure
 * function over whatever list it is handed, which is what makes it testable
 * without touching that weight.
 */

/** One entry, trimmed to the fields the search and the pickers actually read. */
export type Emoji = {
  /** Stable identifier, used for test ids and React keys. */
  name: string;
  /** The character itself — what ends up in the note. */
  emoji: string;
  /** Every name the emoji answers to, e.g. `party` and `tada`. */
  shortcodes: string[];
  /** Looser synonyms, e.g. `celebrate` for 🎉. */
  tags: string[];
};

let catalogue: Promise<Emoji[]> | null = null;

/**
 * The catalogue, fetched once per session and shared from then on.
 *
 * Entries with no character of their own (the custom GitHub ones, which are
 * really hosted images) are dropped: an emoji is stored in the note as plain
 * text, so one that cannot be typed has nothing to store.
 */
export function loadEmojis(): Promise<Emoji[]> {
  catalogue ??= import("@tiptap/extension-emoji").then((module) =>
    module.emojis
      .filter((item) => typeof item.emoji === "string" && item.emoji !== "")
      .map((item) => ({
        name: item.name,
        emoji: item.emoji as string,
        shortcodes: item.shortcodes,
        tags: item.tags,
      }))
  );

  return catalogue;
}

/**
 * The emoji matching `query`, best match first.
 *
 * A name match beats a tag match — typing "ship" means 🚢, not the rocket that
 * happens to be tagged with it — and both match on a prefix, so the list
 * narrows with every letter instead of only on the complete word.
 */
export function searchEmojis(
  emojis: Emoji[],
  query: string,
  limit = Number.POSITIVE_INFINITY
): Emoji[] {
  // The autocomplete hands over what was typed after the `:`, the picker hands
  // over a search box that may well have one pasted in. Neither is a match.
  const needle = query.toLowerCase().replaceAll(":", "").trim();
  if (needle === "") return emojis.slice(0, limit);

  const named: Emoji[] = [];
  const tagged: Emoji[] = [];

  for (const emoji of emojis) {
    if (emoji.shortcodes.some((code) => code.startsWith(needle))) {
      named.push(emoji);
    } else if (emoji.tags.some((tag) => tag.startsWith(needle))) {
      tagged.push(emoji);
    }
  }

  return [...named, ...tagged].slice(0, limit);
}
