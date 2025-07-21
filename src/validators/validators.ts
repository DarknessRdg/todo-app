import type { ValidateEachField } from "@/validators/validate-each";

export type ValidationError<T> = {
  [K in keyof T]?: string;
};

export function anyError<T>(errors: ValidationError<T>): boolean {
  return Object.keys(errors).some(
    (key) => errors[key as keyof T] !== undefined
  );
}

export class ValidationResult<T> {
  readonly obj: T;
  readonly validationError: ValidationError<T>;
  readonly isValid: boolean;

  constructor({
    obj,
    validationError,
  }: {
    obj: T;
    validationError: ValidationError<T>;
  }) {
    this.obj = obj;
    this.validationError = validationError;
    this.isValid = !anyError(validationError);
  }

  onValidAsync = async (action: (obj: T) => Promise<void>) => {
    if (this.isValid) {
      await action(this.obj);
    }

    return this;
  };
}

export interface IValidator<T> {
  validateField: (obj: T, fieldName: keyof T) => string | undefined;
  validateAll: (obj: T) => ValidationResult<T>;
}

export class Validator<T extends {}> implements IValidator<T> {
  private validateEach: ValidateEachField<T>;

  constructor(validateEach: ValidateEachField<T>) {
    this.validateEach = validateEach;
  }

  validateAll = (obj: T): ValidationResult<T> => {
    let validationError: ValidationError<T> = {};

    Object.keys(obj).forEach((it) => {
      const fieldName = it as keyof T;
      validationError[fieldName] = this.validateField(obj, fieldName);
    });

    return new ValidationResult({ obj, validationError });
  };

  validateField = (obj: T, fieldName: keyof T): string | undefined => {
    const fieldValidator = this.getValidator(fieldName);
    const validationErr = fieldValidator(obj);
    return validationErr;
  };

  getValidator = (fieldName: keyof T) => this.validateEach[fieldName];
}
