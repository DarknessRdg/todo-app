/**
 * The dialog an element sits inside, if any.
 *
 * Radix popovers and popper content need this twice over when they open within
 * a modal: as the portal target, because a dialog makes the rest of the body
 * inert and a body-level portal is dead to clicks; and as the collision
 * boundary, because `DialogContent` is `overflow-hidden` and its
 * `translate-…-50%` makes it the containing block, so anything positioned
 * inside is clipped at its edge unless Radix is told to keep it in.
 *
 * Returns `undefined` (not `null`) outside a dialog, so Radix falls back to its
 * own defaults rather than being handed an empty container.
 */
export function dialogOf(element: Element | null | undefined) {
  return (
    element?.closest<HTMLElement>("[data-slot='dialog-content']") ?? undefined
  );
}
