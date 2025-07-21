/**
 * Function that takes a generic object, and return a validation result.
 * @returns undefined: when validation passed;
 * @returns string: error message why the validation failed;
 */
type EachValidationCaller<T> = (object: T) => EachValidationResult;

type EachValidationResult = string | undefined;

/**
 * ValidateEachField type contains a validator method for each key
 * of the given model. This allows granular validation on 
 *  each field, for instance:
 *
 * ```ts
 * const validate = new ValidateEachField<Model>()
 * validate[fieldName](obj)
 * ```
 */
export type ValidateEachField<T> = {
  [K in keyof T]: EachValidationCaller<T>;
};