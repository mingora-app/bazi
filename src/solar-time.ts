import { BaziInputError } from "./errors.js";
import type { Disambiguation, TrueSolarTimeInput, TrueSolarTimeResult } from "./types.js";

type WallClock = { year: number; month: number; day: number; hour: number; minute: number; second: number };
type ResolvedCivilTime = WallClock & {
  instant: Date;
  totalOffsetMinutes: number;
  standardOffsetMinutes: number;
  dstOffsetMinutes: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function assertTrueSolarInput(input: TrueSolarTimeInput): void {
  const date = new Date(Date.UTC(input.date.year, input.date.month - 1, input.date.day));
  if (!Number.isInteger(input.date.year) || input.date.year < 1800 || input.date.year > 2100 ||
      date.getUTCFullYear() !== input.date.year || date.getUTCMonth() !== input.date.month - 1 || date.getUTCDate() !== input.date.day) {
    throw new BaziInputError("INVALID_DATE", "True-solar input date does not exist or is outside 1800–2100.", "date");
  }
  const { hour, minute, second } = input.time;
  if (![hour, minute, second].every(Number.isInteger) || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    throw new BaziInputError("INVALID_TIME", "True-solar input time is invalid.", "time");
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new BaziInputError("INVALID_LONGITUDE", "Longitude must be between -180 and 180.", "longitude");
  }
  if (input.standardOffsetMinutes !== undefined &&
      (!Number.isFinite(input.standardOffsetMinutes) || Math.abs(input.standardOffsetMinutes) > 14 * 60)) {
    throw new BaziInputError("INVALID_TIMEZONE", "Standard offset must be between -840 and 840 minutes.", "standardOffsetMinutes");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timeZone }).format(0);
  } catch {
    throw new BaziInputError("INVALID_TIMEZONE", "timeZone must be a valid IANA identifier.", "timeZone");
  }
}

function formatter(timeZone: string, offset = false): Intl.DateTimeFormat {
  const key = `${timeZone}:${offset}`;
  const existing = formatterCache.get(key);
  if (existing) return existing;
  const created = new Intl.DateTimeFormat("en-US", offset ? {
    timeZone,
    timeZoneName: "longOffset",
  } : {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  formatterCache.set(key, created);
  return created;
}

function parseOffset(value: string): number {
  if (value === "GMT" || value === "UTC") return 0;
  const match = /(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?(?::?(\d{2}))?/.exec(value);
  if (!match) throw new BaziInputError("INVALID_TIMEZONE", `Unable to read UTC offset from ${value}.`, "timeZone");
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0) + Number(match[4] ?? 0) / 60);
}

function offsetAt(instant: Date, timeZone: string): number {
  const name = formatter(timeZone, true).formatToParts(instant).find((part) => part.type === "timeZoneName")?.value;
  if (!name) throw new BaziInputError("INVALID_TIMEZONE", `Unable to resolve ${timeZone}.`, "timeZone");
  return parseOffset(name);
}

function wallClockAt(instant: Date, timeZone: string): WallClock {
  const values: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(instant)) {
    if (["year", "month", "day", "hour", "minute", "second"].includes(part.type)) values[part.type] = Number(part.value);
  }
  return {
    year: values.year!, month: values.month!, day: values.day!,
    hour: values.hour === 24 ? 0 : values.hour!, minute: values.minute!, second: values.second!,
  };
}

function sameWallClock(left: WallClock, right: WallClock): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day &&
    left.hour === right.hour && left.minute === right.minute && left.second === right.second;
}

function possibleOffsets(naiveTimestamp: number, timeZone: string): number[] {
  const found = new Set<number>();
  for (let minutes = -36 * 60; minutes <= 36 * 60; minutes += 15) {
    found.add(offsetAt(new Date(naiveTimestamp + minutes * 60_000), timeZone));
  }
  return [...found].sort((a, b) => a - b);
}

function inferStandardOffset(year: number, timeZone: string): number {
  const offsets = new Map<number, number>();
  for (let month = 0; month < 12; month += 1) {
    const value = offsetAt(new Date(Date.UTC(year, month, 15, 12)), timeZone);
    offsets.set(value, (offsets.get(value) ?? 0) + 1);
  }
  const values = [...offsets.keys()];
  if (values.length === 1) return values[0]!;
  // Legal DST convention advances the clock from standard time. The explicit
  // override exists for rare negative-DST or mid-year political changes.
  return Math.min(...values);
}

function resolveCivilTime(input: TrueSolarTimeInput): ResolvedCivilTime {
  const disambiguation = input.disambiguation ?? "compatible";
  const target: WallClock = {
    ...input.date,
    hour: input.time.hour,
    minute: input.time.minute,
    second: input.time.second,
  };
  const naive = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, target.second);
  const offsets = possibleOffsets(naive, input.timeZone);
  const candidates = offsets
    .map((offset) => new Date(naive - offset * 60_000))
    .filter((instant) => sameWallClock(wallClockAt(instant, input.timeZone), target))
    .sort((a, b) => a.getTime() - b.getTime());

  let instant: Date;
  if (candidates.length === 0) {
    if (disambiguation === "reject") {
      throw new BaziInputError("NONEXISTENT_CIVIL_TIME", `The civil time does not exist in ${input.timeZone} because of an offset transition.`, "time");
    }
    const chosenOffset = disambiguation === "earlier" ? Math.max(...offsets) : Math.min(...offsets);
    instant = new Date(naive - chosenOffset * 60_000);
  } else if (candidates.length > 1) {
    if (disambiguation === "reject") {
      throw new BaziInputError("AMBIGUOUS_CIVIL_TIME", `The civil time occurs twice in ${input.timeZone}.`, "time");
    }
    instant = disambiguation === "later" ? candidates.at(-1)! : candidates[0]!;
  } else {
    instant = candidates[0]!;
  }

  const resolvedWall = wallClockAt(instant, input.timeZone);
  const totalOffsetMinutes = offsetAt(instant, input.timeZone);
  const standardOffsetMinutes = input.standardOffsetMinutes ?? inferStandardOffset(resolvedWall.year, input.timeZone);
  return {
    ...resolvedWall,
    instant,
    totalOffsetMinutes,
    standardOffsetMinutes,
    dstOffsetMinutes: totalOffsetMinutes - standardOffsetMinutes,
  };
}

function julianCentury(date: Date): number {
  return (date.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545) / 36_525;
}

const radians = (degrees: number) => degrees * Math.PI / 180;

/** NOAA/Meeus-style equation of time, returned in clock minutes. */
export function calculateEquationOfTime(date: Date): number {
  const t = julianCentury(date);
  const meanLongitude = ((280.46646 + t * (36_000.76983 + 0.0003032 * t)) % 360 + 360) % 360;
  const meanAnomaly = 357.52911 + t * (35_999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - 0.001813 * t))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(radians(125.04 - 1934.136 * t));
  const y = Math.tan(radians(obliquity / 2)) ** 2;
  const angle = y * Math.sin(2 * radians(meanLongitude))
    - 2 * eccentricity * Math.sin(radians(meanAnomaly))
    + 4 * eccentricity * y * Math.sin(radians(meanAnomaly)) * Math.cos(2 * radians(meanLongitude))
    - 0.5 * y ** 2 * Math.sin(4 * radians(meanLongitude))
    - 1.25 * eccentricity ** 2 * Math.sin(2 * radians(meanAnomaly));
  return angle * 180 / Math.PI * 4;
}

const pad = (value: number) => String(value).padStart(2, "0");
function formatDateTime(value: WallClock): string {
  return `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}:${pad(value.second)}`;
}

function shortestLongitudeDelta(longitude: number, standardMeridian: number): number {
  return ((longitude - standardMeridian + 540) % 360) - 180;
}

export function calculateTrueSolarTime(input: TrueSolarTimeInput): TrueSolarTimeResult {
  assertTrueSolarInput(input);
  const resolved = resolveCivilTime(input);
  const standardMeridian = resolved.standardOffsetMinutes / 4;
  const longitudeMinutes = shortestLongitudeDelta(input.longitude, standardMeridian) * 4;
  const equationOfTimeMinutes = calculateEquationOfTime(resolved.instant);
  const totalMinutes = longitudeMinutes + equationOfTimeMinutes - resolved.dstOffsetMinutes;
  const civilWallTimestamp = Date.UTC(resolved.year, resolved.month - 1, resolved.day, resolved.hour, resolved.minute, resolved.second);
  const corrected = new Date(civilWallTimestamp + totalMinutes * 60_000);
  const solar: WallClock = {
    year: corrected.getUTCFullYear(), month: corrected.getUTCMonth() + 1, day: corrected.getUTCDate(),
    hour: corrected.getUTCHours(), minute: corrected.getUTCMinutes(), second: corrected.getUTCSeconds(),
  };
  const civil: WallClock = {
    year: resolved.year, month: resolved.month, day: resolved.day,
    hour: resolved.hour, minute: resolved.minute, second: resolved.second,
  };
  return {
    civilDateTime: formatDateTime(civil),
    trueSolarDateTime: formatDateTime(solar),
    trueSolarTime: `${pad(solar.hour)}:${pad(solar.minute)}:${pad(solar.second)}`,
    utcOffsetMinutes: resolved.totalOffsetMinutes,
    standardOffsetMinutes: resolved.standardOffsetMinutes,
    dstOffsetMinutes: resolved.dstOffsetMinutes,
    standardMeridian,
    corrections: { longitudeMinutes, equationOfTimeMinutes, totalMinutes },
    dateChanged: civil.year !== solar.year || civil.month !== solar.month || civil.day !== solar.day,
    disambiguation: input.disambiguation ?? "compatible",
  };
}
