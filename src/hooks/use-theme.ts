import { useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";

const listeners = new Set<() => void>();

function isDarkNow(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function setDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// The DOM class is the single source of truth, so every consumer stays in sync.
export function useTheme() {
  const isDark = useSyncExternalStore(subscribe, isDarkNow, () => false);

  return {
    isDark,
    toggle: () => setDark(!isDarkNow()),
    setIsDark: (v: boolean) => setDark(v),
  };
}
