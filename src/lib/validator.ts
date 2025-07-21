import type { ValidateEachField } from "@/validators/validate-each";
import { Validator, type IValidator } from "@/validators/validators";
import * as z from "zod";

export function zodAsFieldValidators<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): ValidateEachField<z.infer<typeof schema>> {
  const shape = schema.shape;
  const validators = {} as ValidateEachField<schemaType>;

  type schemaType = z.infer<typeof schema>;

  for (const key in shape) {
    const fieldName = key as keyof schemaType;
    const fieldSchema = shape[key] as unknown as z.ZodType;

    validators[fieldName] = (obj: schemaType) => {
      const result = fieldSchema.safeParse(obj[fieldName]);

      if (!result.success) {
        const issue = result.error.issues[0];
        return issue.message;
      }
      return undefined;
    };
  }

  return validators;
}

export function zodAsValidator<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): IValidator<z.infer<typeof schema>> {
  return new Validator(zodAsFieldValidators(schema));
}
