import { afterEach, describe, expect, it } from "vitest";

import {
  CaptureFlightWindowMs,
  forgetCaptures,
  rememberCapture,
  takeCapture,
} from "@/lib/capture-flight";

const origin = { top: 120, left: 40, width: 600, height: 48 };

afterEach(() => forgetCaptures());

describe("capture flight", () => {
  describe("when a todo is captured and its row arrives", () => {
    it("Then the row is handed where the capture bar was", () => {
      rememberCapture("Buy milk", origin, 1_000);

      expect(takeCapture("Buy milk", 1_050)).toEqual(origin);
    });

    it("Then a second row with that title is handed nothing", () => {
      rememberCapture("Buy milk", origin, 1_000);
      takeCapture("Buy milk", 1_050);

      expect(takeCapture("Buy milk", 1_060)).toBeUndefined();
    });
  });

  it("when a row arrives under a title nobody captured, Then it is handed nothing", () => {
    rememberCapture("Buy milk", origin, 1_000);

    expect(takeCapture("Call the bank", 1_050)).toBeUndefined();
  });

  /**
   * A capture filed somewhere this list does not show never arrives here, and
   * a row with the same title showing up much later is not that capture.
   */
  it("when the row arrives after the window has passed, Then it is handed nothing", () => {
    rememberCapture("Buy milk", origin, 1_000);

    expect(
      takeCapture("Buy milk", 1_000 + CaptureFlightWindowMs + 1)
    ).toBeUndefined();
  });

  it("when the same title is captured twice, Then each row is handed its own", () => {
    const second = { ...origin, top: 300 };
    rememberCapture("Buy milk", origin, 1_000);
    rememberCapture("Buy milk", second, 1_010);

    expect([
      takeCapture("Buy milk", 1_050),
      takeCapture("Buy milk", 1_060),
    ]).toEqual([origin, second]);
  });
});
