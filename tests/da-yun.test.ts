import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calculateDaYun } from "../src/index.js";

describe("Da Yun", () => {
  test("uses precise Sect 2 start offsets", () => {
    const result = calculateDaYun({
      birth: {
        date: { year: 2022, month: 3, day: 9 },
        time: { hour: 20, minute: 51 },
      },
      gender: "male",
    });
    assert.deepEqual(result.startOffset, { years: 8, months: 9, days: 2, hours: 10 });
    assert.match(result.startDateTime, /^2030-12-12T/);
    assert.equal(result.calculation.sect, 2);
    assert.equal(result.cycles.length, 9);
  });

  test("direction follows gender and year-stem polarity", () => {
    const birth = { date: { year: 1998, month: 12, day: 13 }, time: { hour: 12, minute: 0 } } as const;
    assert.equal(calculateDaYun({ birth, gender: "male" }).direction, "forward");
    assert.equal(calculateDaYun({ birth, gender: "female" }).direction, "reverse");
  });

  test("preserves the established Beijing reference result", () => {
    const result = calculateDaYun({
      birth: {
        date: { year: 1998, month: 12, day: 13 }, time: { hour: 12 },
        location: { timeZone: "Asia/Shanghai", longitude: 116.39 },
        options: { solarTime: "true", dayBoundary: "zi-hour" },
      },
      gender: "female",
    });
    assert.equal(result.startDateTime, "2000-11-22T15:51:34");
    assert.deepEqual(result.startOffset, { years: 1, months: 11, days: 9, hours: 4 });
    assert.equal(result.cycles[0]?.ganZhi, "癸亥");
    assert.equal(result.cycles[0]?.stemTenGod, "direct_resource");
    assert.equal(result.cycles[0]?.branchTenGod, "indirect_resource");
  });
});
