import { Solar, type EightChar } from "lunar-javascript";
import { calculateTrueSolarTime } from "./solar-time.js";
import { assertValidBirthInput } from "./validation.js";
import { getBranchInfo, getStemInfo, getTenGod, isEarthlyBranch, isHeavenlyStem } from "./ganzhi.js";
import type {
  BirthInput, CalculationWarning, EarthlyBranch, FourPillarsResult,
  HeavenlyStem, Pillar, PillarKey,
} from "./types.js";

type CalendarDateTime = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const pad = (value: number) => String(value).padStart(2, "0");
const format = (value: CalendarDateTime) => `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}:${pad(value.second)}`;

function parseSolarDateTime(value: string): CalendarDateTime {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Unexpected solar datetime: ${value}`);
  return { year: +match[1]!, month: +match[2]!, day: +match[3]!, hour: +match[4]!, minute: +match[5]!, second: +match[6]! };
}

function readStem(value: string): HeavenlyStem {
  if (!isHeavenlyStem(value)) throw new Error(`Unsupported heavenly stem returned by calendar engine: ${value}`);
  return value;
}

function readBranch(value: string): EarthlyBranch {
  if (!isEarthlyBranch(value)) throw new Error(`Unsupported earthly branch returned by calendar engine: ${value}`);
  return value;
}

function makePillar(role: PillarKey, stemValue: string, branchValue: string, dayMaster: HeavenlyStem): Pillar {
  const stem = readStem(stemValue);
  const branch = readBranch(branchValue);
  const stemInfo = getStemInfo(stem);
  const branchInfo = getBranchInfo(branch);
  return {
    role,
    ganZhi: `${stem}${branch}`,
    label: `${stemInfo.pinyin} ${branchInfo.pinyin}`,
    stem: stemInfo,
    branch: branchInfo,
    tenGod: role === "day" ? "day_master" : getTenGod(dayMaster, stem),
    hiddenStemTenGods: branchInfo.hiddenStems.map((hidden) => ({
      stem: hidden.character,
      tenGod: getTenGod(dayMaster, hidden.character),
    })),
  };
}

function eightCharAt(value: CalendarDateTime, boundary: "midnight" | "zi-hour"): EightChar {
  const eightChar = Solar.fromYmdHms(value.year, value.month, value.day, value.hour, value.minute, value.second).getLunar().getEightChar();
  eightChar.setSect(boundary === "zi-hour" ? 1 : 2);
  return eightChar;
}

function pillarKeysAt(value: CalendarDateTime, boundary: "midnight" | "zi-hour"): Record<"year" | "month" | "day", string> {
  const eight = eightCharAt(value, boundary);
  return {
    year: `${eight.getYearGan()}${eight.getYearZhi()}`,
    month: `${eight.getMonthGan()}${eight.getMonthZhi()}`,
    day: `${eight.getDayGan()}${eight.getDayZhi()}`,
  };
}

export function calculateFourPillars(input: BirthInput): FourPillarsResult {
  assertValidBirthInput(input);
  const boundary = input.options?.dayBoundary ?? "midnight";
  const hasTime = input.time != null;
  const civil: CalendarDateTime = {
    ...input.date,
    hour: input.time?.hour ?? 12,
    minute: input.time?.minute ?? 0,
    second: input.time?.second ?? 0,
  };
  let calculation = civil;
  let mode: "civil" | "true-solar" = "civil";
  let correctionMinutes: number | null = null;
  const warnings: CalculationWarning[] = [];

  if ((input.options?.solarTime ?? "civil") === "true" && hasTime) {
    const location = input.location!;
    const solar = calculateTrueSolarTime({
      date: input.date,
      time: { hour: civil.hour, minute: civil.minute, second: civil.second },
      timeZone: location.timeZone,
      longitude: location.longitude!,
      ...(location.standardOffsetMinutes === undefined ? {} : { standardOffsetMinutes: location.standardOffsetMinutes }),
      disambiguation: input.options?.disambiguation ?? "compatible",
    });
    calculation = parseSolarDateTime(solar.trueSolarDateTime);
    mode = "true-solar";
    correctionMinutes = solar.corrections.totalMinutes;
    if (location.standardOffsetMinutes === undefined) {
      warnings.push({ code: "STANDARD_OFFSET_INFERRED", message: "The legal standard offset was inferred from IANA time-zone history." });
    }
  } else if ((input.options?.solarTime ?? "civil") === "true") {
    warnings.push({ code: "TRUE_SOLAR_TIME_SKIPPED", message: "True solar time cannot be applied without an exact birth time." });
  }

  if (!hasTime) {
    warnings.push(
      { code: "BIRTH_TIME_UNKNOWN", message: "A representative noon time is used only to resolve date-based pillars." },
      { code: "HOUR_PILLAR_OMITTED", message: "The hour pillar is omitted because birth time is unknown." },
    );
    const start = pillarKeysAt({ ...civil, hour: 0, minute: 0, second: 0 }, boundary);
    const end = pillarKeysAt({ ...civil, hour: 23, minute: 59, second: 59 }, boundary);
    const uncertain = (Object.keys(start) as Array<"year" | "month" | "day">).filter((key) => start[key] !== end[key]);
    if (uncertain.length) warnings.push({
      code: "PILLAR_MAY_CHANGE_WITHIN_DAY",
      message: `The ${uncertain.join(", ")} pillar may change during the recorded date; exact birth time is required.`,
      pillars: uncertain,
    });
  }

  const eight = eightCharAt(calculation, boundary);
  const dayMaster = readStem(eight.getDayGan());
  const pillars = {
    year: makePillar("year", eight.getYearGan(), eight.getYearZhi(), dayMaster),
    month: makePillar("month", eight.getMonthGan(), eight.getMonthZhi(), dayMaster),
    day: makePillar("day", eight.getDayGan(), eight.getDayZhi(), dayMaster),
    hour: hasTime ? makePillar("hour", eight.getTimeGan(), eight.getTimeZhi(), dayMaster) : null,
  };
  const result: FourPillarsResult = {
    input: {
      civilDateTime: hasTime ? format(civil) : null,
      timeZone: input.location?.timeZone ?? null,
      longitude: input.location?.longitude ?? null,
    },
    calculationTime: {
      mode,
      dateTime: hasTime ? format(calculation) : null,
      correctionMinutes,
      dayBoundary: boundary,
    },
    pillars,
    dayMaster: getStemInfo(dayMaster),
    completeness: {
      birthTimeKnown: hasTime,
      usedPillars: hasTime ? ["year", "month", "day", "hour"] : ["year", "month", "day"],
      missingPillars: hasTime ? [] : ["hour"],
    },
    warnings,
  };
  return result;
}
