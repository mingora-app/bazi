import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getBranchInfo, getStemInfo, getTenGod } from "../src/index.js";

describe("Ganzhi reference data", () => {
  test("covers all stems and branches with normalized hidden-stem proportions", () => {
    for (const stem of ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const) {
      const info = getStemInfo(stem);
      assert.equal(info.character, stem);
      assert.ok(info.pinyin.length > 0);
    }
    for (const branch of ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const) {
      const info = getBranchInfo(branch);
      assert.equal(info.hiddenStems[0]?.role, "main");
      assert.ok(Math.abs(info.hiddenStems.reduce((sum, item) => sum + item.proportion, 0) - 1) < 1e-12);
    }
  });

  test("maps all ten gods from a Jia day master", () => {
    assert.deepEqual(
      (["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const).map((stem) => getTenGod("甲", stem)),
      ["peer", "rob_wealth", "eating_god", "hurting_officer", "indirect_wealth", "direct_wealth", "seven_killings", "direct_officer", "indirect_resource", "direct_resource"],
    );
  });
});
