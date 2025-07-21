import { zodAsFieldValidators } from "@/lib/validator";
import type { ValidateEachField } from "@/validators/validate-each";
import { describe, expect, expectTypeOf, it } from "vitest";
import * as z from "zod";

describe("build validate each from zod scheme", () => {
  const scheme = z.object({
    name: z.string().nonempty({ error: "name_required" }),
  });

  const validator = zodAsFieldValidators(scheme);

  it("when validate the field with invalid value, Then return error", () => {
    const result = validator.name({ name: "" });
    expect(result).eq("name_required");
  });

  it("when validate the field with valid value, Then return undefined", () => {
    expect(validator.name({ name: "1" })).undefined;
  });

  it("implements the Validate Each interface", () => {
    type schemeType = {
      name: string;
    };
    expectTypeOf(validator).toEqualTypeOf<ValidateEachField<schemeType>>();
  });
});
