import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { BaziInputError, calculateEquationOfTime, calculateTrueSolarTime } from "../src/index.js";

const exactTime = (hour: number, minute: number, second = 0) => ({ hour, minute, second });

describe("true solar time", () => {
  test("validates its standalone public input", () => {
    assert.throws(() => calculateTrueSolarTime({
      date: { year: 2023, month: 2, day: 29 },
      time: exactTime(12, 0),
      timeZone: "UTC",
      longitude: 0,
    }), BaziInputError);
    assert.throws(() => calculateTrueSolarTime({
      date: { year: 2024, month: 1, day: 1 },
      time: exactTime(12, 0),
      timeZone: "Invalid/Zone",
      longitude: 0,
    }), BaziInputError);
  });

  test("matches the Beijing reference calculation", () => {
    const result = calculateTrueSolarTime({
      date: { year: 1998, month: 12, day: 13 },
      time: exactTime(12, 0),
      timeZone: "Asia/Shanghai",
      longitude: 116.39,
    });
    assert.equal(result.trueSolarDateTime, "1998-12-13T11:51:34");
    assert.equal(result.standardMeridian, 120);
    assert.equal(result.dstOffsetMinutes, 0);
  });

  test("handles longitude correction across the international date line", () => {
    const result = calculateTrueSolarTime({
      date: { year: 2024, month: 11, day: 3 },
      time: exactTime(23, 55),
      timeZone: "Asia/Shanghai",
      longitude: 134,
    });
    assert.equal(result.trueSolarDateTime.slice(0, 10), "2024-11-04");
    assert.equal(result.dateChanged, true);
    assert.ok(result.corrections.longitudeMinutes > 50 && result.corrections.longitudeMinutes < 60);
  });

  test("distinguishes both occurrences in a DST overlap", () => {
    const base = {
      date: { year: 2023, month: 11, day: 5 },
      time: exactTime(1, 30),
      timeZone: "America/New_York",
      longitude: -74,
    } as const;
    const earlier = calculateTrueSolarTime({ ...base, disambiguation: "earlier" });
    const later = calculateTrueSolarTime({ ...base, disambiguation: "later" });
    assert.equal(earlier.utcOffsetMinutes, -240);
    assert.equal(later.utcOffsetMinutes, -300);
    assert.equal(earlier.dstOffsetMinutes, 60);
    assert.equal(later.dstOffsetMinutes, 0);
    assert.ok(Math.abs((later.corrections.totalMinutes - earlier.corrections.totalMinutes) - 60) < .01);
    assert.throws(() => calculateTrueSolarTime({ ...base, disambiguation: "reject" }), BaziInputError);
  });

  test("applies compatible and reject policies to a DST gap", () => {
    const base = {
      date: { year: 2024, month: 3, day: 10 },
      time: exactTime(2, 30),
      timeZone: "America/New_York",
      longitude: -74,
    } as const;
    const compatible = calculateTrueSolarTime(base);
    assert.equal(compatible.civilDateTime.slice(11, 16), "03:30");
    assert.throws(() => calculateTrueSolarTime({ ...base, disambiguation: "reject" }), BaziInputError);
  });

  test("supports fractional standard offsets", () => {
    const india = calculateTrueSolarTime({
      date: { year: 2024, month: 2, day: 11 }, time: exactTime(23, 30),
      timeZone: "Asia/Kolkata", longitude: 77.2,
    });
    const nepal = calculateTrueSolarTime({
      date: { year: 2024, month: 11, day: 3 }, time: exactTime(0, 15),
      timeZone: "Asia/Kathmandu", longitude: 85.3,
    });
    assert.equal(india.standardOffsetMinutes, 330);
    assert.equal(india.trueSolarTime.slice(0, 5), "22:54");
    assert.equal(nepal.standardOffsetMinutes, 345);
    assert.equal(nepal.trueSolarTime.slice(0, 5), "00:27");
  });

  test("equation of time stays within astronomical bounds", () => {
    for (let month = 0; month < 12; month += 1) {
      const minutes = calculateEquationOfTime(new Date(Date.UTC(2024, month, 15, 12)));
      assert.ok(minutes > -17 && minutes < 17);
    }
  });
});
