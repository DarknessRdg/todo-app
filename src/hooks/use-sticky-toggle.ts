import { useState } from "react";

import { readFlag, writeFlag } from "@/lib/persisted-flag";

/**
 * A boolean that remembers itself across reloads, keyed by `key`.
 *
 * The key is allowed to change under a mounted component, and doing so reloads
 * the value from storage. That is not a nicety: `/project/a` and `/project/b`
 * render the same element, so the list is never unmounted between them — only
 * its project changes. Reading once on mount would leave the second project
 * wearing the first one's collapsed state, and then writing that state back
 * under the second one's key the moment anything was toggled.
 */
export function useStickyToggle(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(() => readFlag(key) ?? defaultValue);
  const [lastKey, setLastKey] = useState(key);

  // Adjusting state during render rather than in an effect: React re-runs this
  // component immediately with the new value, so the old key's state is never
  // painted under the new key.
  if (key !== lastKey) {
    setLastKey(key);
    setValue(readFlag(key) ?? defaultValue);
  }

  const set = (next: boolean) => {
    setValue(next);
    writeFlag(key, next);
  };

  return [value, set] as const;
}
