import { flagKey } from "@/lib/persisted-flag";

/**
 * The preferences the app keeps, and the only place their names and defaults
 * are written down.
 *
 * Stored one key per setting rather than as a single blob: a blob that fails to
 * parse loses every preference at once, where a key that does takes only its
 * own down. Everything here is a preference about *this device* — how the app
 * looks and behaves for the person reading it — never data about the todos,
 * which belongs in IndexedDB.
 *
 * The theme is the one preference not kept here: it has to be applied to the
 * document before React runs, or the page flashes light before turning dark,
 * so it lives in `@/hooks/use-theme` with the class it sets.
 */

/** Whether a todo's description opens ready to read, or ready to be written in. */
export type TodoView = "read" | "write";

export type Settings = {
  /** Leaves finished todos out of every list, rather than in a folded section. */
  hideDone: boolean;
  defaultTodoView: TodoView;
};

/**
 * What the app does before anyone has said otherwise.
 *
 * Both are the behaviour that shipped before the setting existed, so turning
 * settings on for the first time changes nothing until something is chosen.
 */
export const SettingsDefaults: Settings = {
  hideDone: false,
  defaultTodoView: "write",
};

/**
 * How each setting is read back out of storage.
 *
 * Every one returns `undefined` for anything it does not recognise, so a value
 * written by an older version — or by another tool on the same origin — falls
 * back to the default instead of being trusted into the app as-is.
 */
const parsers: {
  [K in keyof Settings]: (raw: string) => Settings[K] | undefined;
} = {
  hideDone: (raw) =>
    raw === "true" ? true : raw === "false" ? false : undefined,
  defaultTodoView: (raw) =>
    raw === "read" || raw === "write" ? raw : undefined,
};

function keyOf(name: keyof Settings) {
  return flagKey("settings", name);
}

/**
 * Every access is guarded, for the same reason `persisted-flag` guards its own:
 * `localStorage` throws outright in some private browsing modes. A preference
 * that cannot be remembered is a small loss; a page that will not render
 * because of it is not.
 */
export function readSetting<K extends keyof Settings>(name: K): Settings[K] {
  try {
    const raw = window.localStorage.getItem(keyOf(name));
    if (raw === null) return SettingsDefaults[name];

    return parsers[name](raw) ?? SettingsDefaults[name];
  } catch {
    return SettingsDefaults[name];
  }
}

export function writeSetting<K extends keyof Settings>(
  name: K,
  value: Settings[K]
): void {
  try {
    window.localStorage.setItem(keyOf(name), String(value));
  } catch {
    // Storage full or blocked. The preference is lost for this session, which
    // is the whole cost — the change still applies to the page in front of the
    // reader, because the notification below does not depend on the write.
  }

  notify();
}

/* -------------------------------------------------------------------------- */
/* Change notification                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Settings are read from storage wherever they are used — the list, the todo
 * detail, the settings page — so changing one has to reach components that are
 * already on screen. Same arrangement as the theme, and for the same reason:
 * storage is the single source of truth, and this only tells everyone to look
 * at it again.
 */
const listeners = new Set<() => void>();

export function subscribeToSettings(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}
