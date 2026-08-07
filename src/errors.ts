import type { ValidationErrorCode } from "./types.js";

export class BaziInputError extends RangeError {
  readonly code: ValidationErrorCode | "AMBIGUOUS_CIVIL_TIME" | "NONEXISTENT_CIVIL_TIME";
  readonly field: string | undefined;

  constructor(code: BaziInputError["code"], message: string, field?: string) {
    super(message);
    this.name = "BaziInputError";
    this.code = code;
    this.field = field;
  }
}
