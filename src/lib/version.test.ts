import { describe, expect, it } from "vitest";

import { formatVersion } from "@/lib/version";

describe("app version", () => {
  it("when the build stamped a commit in, Then it reads back as it was stamped", () => {
    expect(formatVersion("21a7943")).toBe("21a7943");
  });

  it("when the stamp carries surrounding whitespace, Then it is trimmed off", () => {
    expect(formatVersion(" 21a7943\n")).toBe("21a7943");
  });

  it("when nothing was stamped in, Then it reads as a development build", () => {
    expect(formatVersion(undefined)).toBe("dev");
  });

  it("when the stamp is blank, Then it reads as a development build", () => {
    expect(formatVersion("   ")).toBe("dev");
  });
});
