import { BaziInputError } from "./errors.js";
import type { BirthInput, ValidationResult } from "./types.js";

const MIN_YEAR = 1800;
const MAX_YEAR = 2100;

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function validateBirthInput(input: BirthInput): ValidationResult {
  const errors: Extract<ValidationResult, { valid: false }>["errors"] = [];
  const { year, month, day } = input.date;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR ||
      !Number.isInteger(month) || !Number.isInteger(day) ||
      utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    errors.push({ code: "INVALID_DATE", field: "date", message: `Date must exist and be between ${MIN_YEAR} and ${MAX_YEAR}.` });
  }
  if (input.time) {
    const { hour, minute = 0, second = 0 } = input.time;
    if (![hour, minute, second].every(Number.isInteger) || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
      errors.push({ code: "INVALID_TIME", field: "time", message: "Time must be a valid 24-hour clock value." });
    }
  }
  if (input.location) {
    if (!validTimeZone(input.location.timeZone)) {
      errors.push({ code: "INVALID_TIMEZONE", field: "location.timeZone", message: "timeZone must be a valid IANA identifier." });
    }
    const { longitude, latitude } = input.location;
    if (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      errors.push({ code: "INVALID_LONGITUDE", field: "location.longitude", message: "Longitude must be between -180 and 180." });
    }
    if (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      errors.push({ code: "INVALID_LATITUDE", field: "location.latitude", message: "Latitude must be between -90 and 90." });
    }
    if (input.location.standardOffsetMinutes !== undefined &&
        (!Number.isFinite(input.location.standardOffsetMinutes) || Math.abs(input.location.standardOffsetMinutes) > 14 * 60)) {
      errors.push({ code: "INVALID_TIMEZONE", field: "location.standardOffsetMinutes", message: "Standard offset must be between -840 and 840 minutes." });
    }
  }
  if ((input.options?.solarTime ?? "civil") === "true" && input.time) {
    if (!input.location?.timeZone) errors.push({ code: "TRUE_SOLAR_TIME_REQUIRES_TIMEZONE", field: "location.timeZone", message: "True solar time requires an IANA time zone." });
    if (input.location?.longitude === undefined) errors.push({ code: "TRUE_SOLAR_TIME_REQUIRES_LONGITUDE", field: "location.longitude", message: "True solar time requires longitude." });
  }
  return errors.length ? { valid: false, errors } : { valid: true };
}

export function assertValidBirthInput(input: BirthInput): void {
  const result = validateBirthInput(input);
  if (!result.valid) {
    const first = result.errors[0]!;
    throw new BaziInputError(first.code, first.message, first.field);
  }
}
