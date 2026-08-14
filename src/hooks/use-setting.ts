import { useSyncExternalStore } from "react";

import {
  readSetting,
  subscribeToSettings,
  writeSetting,
  type Settings,
} from "@/lib/settings";

/**
 * One setting, and the way to change it.
 *
 * Subscribed rather than read once on mount: the settings page and the surfaces
 * a setting governs are different components, and hiding the done section has
 * to reach a list that is already on screen. Storage stays the single source of
 * truth — this only re-reads it when something says it changed, the same shape
 * `useTheme` uses for the document class.
 *
 * The snapshot is a primitive in every case, which is what keeps
 * `useSyncExternalStore` from looping: a fresh object each call would never
 * compare equal to the last one.
 */
export function useSetting<K extends keyof Settings>(name: K) {
  const value = useSyncExternalStore(
    subscribeToSettings,
    () => readSetting(name),
    () => readSetting(name)
  );

  return [value, (next: Settings[K]) => writeSetting(name, next)] as const;
}
