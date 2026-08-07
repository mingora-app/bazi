import { BRANCHES, BRANCH_DATA, GENERATES, STEMS, STEM_DATA } from "./constants.js";
import { BaziInputError } from "./errors.js";
import type { BranchInfo, EarthlyBranch, HeavenlyStem, StemInfo, TenGod } from "./types.js";

export function isHeavenlyStem(value: string): value is HeavenlyStem {
  return (STEMS as readonly string[]).includes(value);
}

export function isEarthlyBranch(value: string): value is EarthlyBranch {
  return (BRANCHES as readonly string[]).includes(value);
}

export function getStemInfo(stem: HeavenlyStem): StemInfo {
  const data = STEM_DATA[stem];
  if (!data) throw new BaziInputError("INVALID_DATE", `Unsupported heavenly stem: ${stem}.`);
  return { character: stem, ...data };
}

export function getBranchInfo(branch: EarthlyBranch): BranchInfo {
  const data = BRANCH_DATA[branch];
  if (!data) throw new BaziInputError("INVALID_DATE", `Unsupported earthly branch: ${branch}.`);
  return {
    character: branch,
    pinyin: data.pinyin,
    element: data.element,
    hiddenStems: data.hidden.map(({ stem, role, proportion }) => ({ ...getStemInfo(stem), role, proportion })),
  };
}

export function getTenGod(dayMaster: HeavenlyStem, targetStem: HeavenlyStem): TenGod {
  const source = getStemInfo(dayMaster);
  const target = getStemInfo(targetStem);
  const samePolarity = source.polarity === target.polarity;
  if (source.element === target.element) return samePolarity ? "peer" : "rob_wealth";
  if (GENERATES[source.element] === target.element) return samePolarity ? "eating_god" : "hurting_officer";
  if (GENERATES[target.element] === source.element) return samePolarity ? "indirect_resource" : "direct_resource";
  const sourceControlsTarget = ({ wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" } as const)[source.element] === target.element;
  if (sourceControlsTarget) return samePolarity ? "indirect_wealth" : "direct_wealth";
  return samePolarity ? "seven_killings" : "direct_officer";
}
