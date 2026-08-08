/**
 * Every deliberate pause in the app — the beats that exist so an animation is
 * seen, not because any work is happening — is declared here and is overridable
 * from the environment.
 *
 * The reason is the test suite: a hard-coded `setTimeout(…, 450)` is 450ms of
 * real sleep in every spec that completes a todo, and no amount of test-side
 * cleverness removes it. With the durations in the environment, `vite.config.ts`
 * sets them to `0` for the `test` environment and the same code path runs
 * instantly. Production keeps the defaults below.
 *
 * Values are read through getters, not captured at module load, so `vi.stubEnv`
 * works and a spec can dial a single delay without reloading the module.
 */

const Defaults = {
  /** How long a just-completed row is held in place before it re-sorts. */
  completionResortMs: 450,
  /** How long the confetti burst stays mounted after a completion. */
  confettiVisibleMs: 1400,
} as const;

/**
 * Parses a duration out of the environment, where everything arrives as a
 * string or not at all. Anything unusable falls back rather than throwing —
 * a mistyped variable must not take the app down. `0` is a legitimate value
 * (that is how tests disable the pause), so it must not be treated as absent.
 */
export function readDelay(raw: unknown, fallback: number): number {
  if (raw === undefined || raw === null || raw === "") return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;

  return parsed;
}

export const Timing = {
  get completionResortMs() {
    return readDelay(
      import.meta.env.VITE_COMPLETION_RESORT_MS,
      Defaults.completionResortMs
    );
  },
  get confettiVisibleMs() {
    return readDelay(
      import.meta.env.VITE_CONFETTI_VISIBLE_MS,
      Defaults.confettiVisibleMs
    );
  },
};
