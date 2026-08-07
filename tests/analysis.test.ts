import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeRelationship, calculateBaziChart } from "../src/index.js";

const chart = (year: number, month: number, day: number, hour?: number) => calculateBaziChart({
  date: { year, month, day },
  time: hour === undefined ? null : { hour, minute: 30 },
});

test("element analysis is normalized and exposes all intermediate scores", () => {
  const result = chart(1998, 12, 13, 12);
  assert.equal(Object.values(result.elementProfile.percentages).reduce((sum, value) => sum + value, 0), 100);
  assert.ok(Object.values(result.elementProfile.rawScores).some((value) => value > 0));
  assert.ok(Math.abs(result.pillars.year.branch.hiddenStems.reduce((sum, value) => sum + value.proportion, 0) - 1) < 1e-12);
  assert.equal(Object.values(result.roles).reduce((sum, value) => sum + value, 0), 100);
});

test("seasonal weighting materially affects a summer chart", () => {
  const result = chart(2026, 6, 15, 12);
  assert.equal(result.elementProfile.seasonalContext.dominantElement, "fire");
  assert.ok(result.elementProfile.percentages.fire >= 45);
  assert.equal(result.elementProfile.dayMasterSupport.level, "challenged");
});

test("relationship analysis is deterministic and propagates uncertainty", () => {
  const a = chart(1992, 3, 14, 9);
  const b = chart(1990, 11, 2);
  const first = analyzeRelationship(a, b, "communication");
  assert.deepEqual(first, analyzeRelationship(a, b, "communication"));
  assert.notEqual(first.confidence, "high");
  assert.ok(first.evidenceIds.length >= 6);
});
