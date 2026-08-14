/**
 * Which project a captured todo is filed under.
 *
 * A page that pins one wins, always. The capture bar disables its project
 * picker while a project is pinned, but a disabled control is a courtesy and
 * not a guarantee — the attribute comes off in any browser's dev tools — so the
 * value is applied when the todo is built rather than read back off the field.
 */
export function projectForCapture(
  pinned: string | undefined,
  chosen: string | undefined
): string | undefined {
  return pinned ?? chosen;
}
