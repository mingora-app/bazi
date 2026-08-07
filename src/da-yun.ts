import { Solar } from "lunar-javascript";
import { calculateFourPillars } from "./pillars.js";
import { getBranchInfo, getStemInfo, getTenGod, isEarthlyBranch, isHeavenlyStem } from "./ganzhi.js";
import type { DaYunInput, DaYunResult, EarthlyBranch, HeavenlyStem } from "./types.js";

function stem(value: string): HeavenlyStem {
  if (!isHeavenlyStem(value)) throw new Error(`Invalid Da Yun stem returned by calendar engine: ${value}`);
  return value;
}
function branch(value: string): EarthlyBranch {
  if (!isEarthlyBranch(value)) throw new Error(`Invalid Da Yun branch returned by calendar engine: ${value}`);
  return value;
}

export function calculateDaYun(input: DaYunInput): DaYunResult {
  if (!input.birth.time) throw new Error("Da Yun requires an exact birth time.");
  const chart = calculateFourPillars(input.birth);
  const dateTime = chart.calculationTime.dateTime;
  if (!dateTime) throw new Error("Da Yun requires a resolved calculation time.");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(dateTime);
  if (!match) throw new Error(`Unexpected calculation time: ${dateTime}`);
  const eight = Solar.fromYmdHms(+match[1]!, +match[2]!, +match[3]!, +match[4]!, +match[5]!, +match[6]!)
    .getLunar().getEightChar();
  eight.setSect(chart.calculationTime.dayBoundary === "zi-hour" ? 1 : 2);
  const yun = eight.getYun(input.gender === "male" ? 1 : 0, 2);
  const count = Math.max(1, Math.min(12, input.options?.cycles ?? 9));
  const dayMaster = chart.dayMaster.character;
  const raw = yun.getDaYun();
  const cycles: DaYunResult["cycles"] = [];
  for (let index = 1; index <= count && index < raw.length; index += 1) {
    const item = raw[index]!;
    const ganZhi = item.getGanZhi();
    const cycleStem = stem(ganZhi.slice(0, 1));
    const cycleBranch = branch(ganZhi.slice(1, 2));
    const startYear = item.getStartYear();
    const endYear = item.getEndYear();
    const mainQi = getBranchInfo(cycleBranch).hiddenStems[0]!.character;
    cycles.push({
      index,
      ganZhi: `${cycleStem}${cycleBranch}`,
      stem: getStemInfo(cycleStem),
      branch: getBranchInfo(cycleBranch),
      startYear,
      endYear,
      // Western-facing elapsed-age convention; precise offset remains available below.
      startAge: startYear - input.birth.date.year,
      endAge: endYear - input.birth.date.year,
      stemTenGod: getTenGod(dayMaster, cycleStem),
      branchTenGod: getTenGod(dayMaster, mainQi),
    });
  }
  if (!cycles.length) throw new Error("The calendar engine returned no Da Yun cycles.");
  return {
    direction: yun.isForward() ? "forward" : "reverse",
    directionBasis: { gender: input.gender, yearStem: chart.pillars.year.stem },
    startOffset: {
      years: yun.getStartYear(), months: yun.getStartMonth(),
      days: yun.getStartDay(), hours: yun.getStartHour(),
    },
    startDateTime: yun.getStartSolar().toYmdHms().replace(" ", "T"),
    cycles,
    calculation: {
      sect: 2,
      trueSolarDateTime: chart.calculationTime.mode === "true-solar" ? chart.calculationTime.dateTime : null,
    },
  };
}
