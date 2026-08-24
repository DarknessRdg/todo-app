/// <reference types="vite/client" />

/**
 * Tunable delays — see `src/lib/timing.ts`. Declared as strings because that is
 * what the environment hands over; `readDelay` does the parsing.
 */
interface ImportMetaEnv {
  /** Hold before a completed todo re-sorts into Done. Default 450. */
  readonly VITE_COMPLETION_RESORT_MS?: string;
  /** How long the completion confetti stays mounted. Default 1400. */
  readonly VITE_CONFETTI_VISIBLE_MS?: string;
  /**
   * The short commit sha the bundle was built from — see `src/lib/version.ts`.
   * Stamped in by `vite.config.ts`; empty on a dev server.
   */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
