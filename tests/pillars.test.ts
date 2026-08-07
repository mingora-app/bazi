import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Solar } from "lunar-javascript";
import { BaziInputError, calculateBaziChart, calculateFourPillars, validateBirthInput } from "../src/index.js";

describe("four pillars", () => {
  test("calculates a known Beijing chart after true-solar correction", () => {
    const chart = calculateFourPillars({
      date: { year: 1998, month: 12, day: 13 },
      time: { hour: 12, minute: 0 },
      location: { timeZone: "Asia/Shanghai", longitude: 116.39 },
      options: { solarTime: "true", dayBoundary: "zi-hour" },
    });
    assert.deepEqual(
      [chart.pillars.year.ganZhi, chart.pillars.month.ganZhi, chart.pillars.day.ganZhi, chart.pillars.hour?.ganZhi],
      ["戊寅", "甲子", "甲午", "庚午"],
    );
    assert.equal(chart.calculationTime.dateTime, "1998-12-13T11:51:34");
    assert.equal(chart.pillars.year.tenGod, "indirect_wealth");
  });

  test("handles the Li Chun year and month boundary", () => {
    const before = calculateFourPillars({
      date: { year: 2024, month: 2, day: 4 }, time: { hour: 16, minute: 20 },
      options: { dayBoundary: "zi-hour" },
    });
    const after = calculateFourPillars({
      date: { year: 2024, month: 2, day: 4 }, time: { hour: 16, minute: 30 },
      options: { dayBoundary: "zi-hour" },
    });
    assert.equal(before.pillars.year.ganZhi, "癸卯");
    assert.equal(before.pillars.month.ganZhi, "乙丑");
    assert.equal(after.pillars.year.ganZhi, "甲辰");
    assert.equal(after.pillars.month.ganZhi, "丙寅");
  });

  test("supports both day-boundary conventions at late Zi hour", () => {
    const input = { date: { year: 2024, month: 6, day: 1 }, time: { hour: 23, minute: 30 } } as const;
    const midnight = calculateFourPillars({ ...input, options: { dayBoundary: "midnight" } });
    const ziHour = calculateFourPillars({ ...input, options: { dayBoundary: "zi-hour" } });
    assert.notEqual(midnight.pillars.day.ganZhi, ziHour.pillars.day.ganZhi);
    assert.equal(midnight.pillars.hour?.branch.character, "子");
    assert.equal(ziHour.pillars.hour?.branch.character, "子");
  });

  test("does not invent an hour pillar and flags intra-day ambiguity", () => {
    const ordinary = calculateFourPillars({ date: { year: 1998, month: 12, day: 13 }, time: null });
    assert.equal(ordinary.pillars.hour, null);
    assert.ok(ordinary.warnings.some((warning) => warning.code === "HOUR_PILLAR_OMITTED"));
    const boundary = calculateFourPillars({ date: { year: 2024, month: 2, day: 4 }, time: null });
    assert.ok(boundary.warnings.some((warning) => warning.code === "PILLAR_MAY_CHANGE_WITHIN_DAY"));
    assert.equal(calculateBaziChart({ date: { year: 2024, month: 2, day: 4 }, time: null }).confidence.level, "low");
  });

  test("matches lunar-javascript directly across a deterministic date corpus", () => {
    let state = 0x12345678;
    const random = () => (state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32;
    for (let index = 0; index < 500; index += 1) {
      const year = 1901 + Math.floor(random() * 198);
      const month = 1 + Math.floor(random() * 12);
      const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const day = 1 + Math.floor(random() * maxDay);
      const hour = Math.floor(random() * 24);
      const minute = Math.floor(random() * 60);
      const boundary = random() < .5 ? "midnight" as const : "zi-hour" as const;
      const ours = calculateFourPillars({ date: { year, month, day }, time: { hour, minute }, options: { dayBoundary: boundary } });
      const direct = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar().getEightChar();
      direct.setSect(boundary === "zi-hour" ? 1 : 2);
      assert.deepEqual(
        [ours.pillars.year.ganZhi, ours.pillars.month.ganZhi, ours.pillars.day.ganZhi, ours.pillars.hour?.ganZhi],
        [`${direct.getYearGan()}${direct.getYearZhi()}`, `${direct.getMonthGan()}${direct.getMonthZhi()}`, `${direct.getDayGan()}${direct.getDayZhi()}`, `${direct.getTimeGan()}${direct.getTimeZhi()}`],
      );
    }
  });
});

describe("validation", () => {
  test("returns structured errors and throws from calculators", () => {
    const invalid = { date: { year: 2023, month: 2, day: 29 } };
    assert.equal(validateBirthInput(invalid).valid, false);
    assert.throws(() => calculateFourPillars(invalid), BaziInputError);
    assert.throws(() => calculateFourPillars({
      date: { year: 2024, month: 1, day: 1 }, time: { hour: 12 },
      location: { timeZone: "Not/AZone", longitude: 0 }, options: { solarTime: "true" },
    }), BaziInputError);
  });
});
