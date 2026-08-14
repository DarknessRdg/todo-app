/**
 * Booleans that outlive a reload — which sections are collapsed, and anything
 * else that is a preference rather than data.
 *
 * Every access is guarded: `localStorage` throws outright in some private
 * browsing modes and when a site is blocked from storing anything. A preference
 * that cannot be remembered is a small loss; a page that will not render
 * because of it is not.
 */

const Prefix = "todo-app";

/** Namespaced so the app's keys cannot collide with anything else on the origin. */
export function flagKey(...parts: string[]) {
  return [Prefix, ...parts].join(":");
}

/** The stored value, or undefined when there is none — or none that parses. */
export function readFlag(key: string): boolean | undefined {
  try {
    const raw = window.localStorage.getItem(key);

    if (raw === "true") return true;
    if (raw === "false") return false;

    // Anything else is something we did not write: a stale format, or another
    // tool's key. Treated as absent so the caller falls back to its default
    // rather than inheriting a value it cannot interpret.
    return undefined;
  } catch {
    return undefined;
  }
}

export function writeFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage full or blocked. The preference is lost for this session, which
    // is the whole cost.
  }
}
