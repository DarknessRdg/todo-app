import { describe, expect, it } from "vitest";

import { projectForCapture } from "@/lib/todo-capture";

/**
 * The rule the disabled picker only *suggests*. Tested here rather than by
 * re-enabling the control in the DOM: Radix's trigger does not re-arm from an
 * attribute change, so that spec would be exercising the popover rather than
 * the rule — and the rule is the whole point, since the tamper this guards
 * against happens in dev tools, not in React.
 */
describe("projectForCapture", () => {
  it("when the page pins a project, Then that is where the todo goes", () => {
    expect(projectForCapture("pinned", undefined)).toBe("pinned");
  });

  it("when the field says otherwise, Then the pinned project still wins", () => {
    expect(projectForCapture("pinned", "tampered")).toBe("pinned");
  });

  it("when no project is pinned, Then the one that was picked is used", () => {
    expect(projectForCapture(undefined, "picked")).toBe("picked");
  });

  it("when neither is set, Then the todo belongs to no project", () => {
    expect(projectForCapture(undefined, undefined)).toBeUndefined();
  });
});
