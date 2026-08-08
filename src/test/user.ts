import {
  waitFor as rtlWaitFor,
  type waitForOptions,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The interaction driver every spec must use instead of `userEvent.setup()`.
 *
 * `delay: null` is the point. By default user-event sleeps between the events
 * that make up a gesture, so a click costs ~6 real macrotasks and typing a
 * 13-character URL costs ~50 — each one also flushing React's scheduler. None
 * of that models anything a test asserts on; it is pure wall clock.
 */
export function setupUser() {
  return userEvent.setup({ delay: null });
}

export type User = ReturnType<typeof setupUser>;

/**
 * `waitFor` with a 10ms poll instead of Testing Library's 50ms.
 *
 * DOM assertions already resolve fast, because waitFor re-runs on mutations.
 * The slow ones are the assertions that touch no DOM — `expect(repository.x)
 * .toHaveBeenCalled()`, reading the router location — which can only settle on
 * a poll tick, and at 50ms a handful of those is most of a test's runtime.
 */
export function waitFor<T>(
  callback: () => T | Promise<T>,
  options: waitForOptions = {}
): Promise<T> {
  return rtlWaitFor(callback, { interval: 10, ...options });
}
