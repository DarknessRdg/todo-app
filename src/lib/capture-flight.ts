/**
 * The hand-off between the capture bar and the list it feeds.
 *
 * When a todo is captured, the bar records where it is on screen under the
 * todo's title. When the new row mounts, it asks for that position and starts
 * its entrance there, so what was typed reads as firming up into a card and
 * dropping into the list rather than vanishing from one place and appearing
 * in another.
 *
 * The bar and the list are siblings that share no state, and the row only
 * exists once the store has written it and the list has refetched, a moment
 * nobody can schedule. A small module-level ledger, matched by title and
 * short-lived, is the honest size of the problem.
 */

export type CaptureOrigin = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/**
 * How long a capture waits for its row. A todo filed somewhere this list does
 * not show never arrives, and a row with the same title turning up much later
 * is not this capture.
 */
export const CaptureFlightWindowMs = 3000;

type Pending = { origin: CaptureOrigin; at: number };

const pending = new Map<string, Pending[]>();

export function rememberCapture(
  title: string,
  origin: CaptureOrigin,
  now: number = Date.now()
) {
  pending.set(title, [...(pending.get(title) ?? []), { origin, at: now }]);
}

/**
 * The position a row with this title should fly in from, if it was just
 * captured. Consumed on read: one capture flies one row. Captures of the same
 * title are handed out in the order they were made.
 */
export function takeCapture(
  title: string,
  now: number = Date.now()
): CaptureOrigin | undefined {
  const queue = (pending.get(title) ?? []).filter(
    (entry) => now - entry.at <= CaptureFlightWindowMs
  );
  const [next, ...rest] = queue;

  if (rest.length > 0) pending.set(title, rest);
  else pending.delete(title);

  return next?.origin;
}

/** Drops every pending capture. For specs, which share the module. */
export function forgetCaptures() {
  pending.clear();
}
