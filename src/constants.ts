import type { EarthlyBranch, FiveElement, HeavenlyStem, Polarity } from "./types.js";

export const ELEMENTS = ["wood", "fire", "earth", "metal", "water"] as const;
export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export const STEM_DATA: Record<HeavenlyStem, { pinyin: string; element: FiveElement; polarity: Polarity }> = {
  甲: { pinyin: "Jia", element: "wood", polarity: "yang" },
  乙: { pinyin: "Yi", element: "wood", polarity: "yin" },
  丙: { pinyin: "Bing", element: "fire", polarity: "yang" },
  丁: { pinyin: "Ding", element: "fire", polarity: "yin" },
  戊: { pinyin: "Wu", element: "earth", polarity: "yang" },
  己: { pinyin: "Ji", element: "earth", polarity: "yin" },
  庚: { pinyin: "Geng", element: "metal", polarity: "yang" },
  辛: { pinyin: "Xin", element: "metal", polarity: "yin" },
  壬: { pinyin: "Ren", element: "water", polarity: "yang" },
  癸: { pinyin: "Gui", element: "water", polarity: "yin" },
};

export const BRANCH_DATA: Record<EarthlyBranch, {
  pinyin: string;
  element: FiveElement;
  hidden: Array<{ stem: HeavenlyStem; role: "main" | "secondary" | "residual"; proportion: number }>;
}> = {
  子: { pinyin: "Zi", element: "water", hidden: [{ stem: "癸", role: "main", proportion: 1 }] },
  丑: { pinyin: "Chou", element: "earth", hidden: [{ stem: "己", role: "main", proportion: .6 }, { stem: "癸", role: "secondary", proportion: .3 }, { stem: "辛", role: "residual", proportion: .1 }] },
  寅: { pinyin: "Yin", element: "wood", hidden: [{ stem: "甲", role: "main", proportion: .6 }, { stem: "丙", role: "secondary", proportion: .3 }, { stem: "戊", role: "residual", proportion: .1 }] },
  卯: { pinyin: "Mao", element: "wood", hidden: [{ stem: "乙", role: "main", proportion: 1 }] },
  辰: { pinyin: "Chen", element: "earth", hidden: [{ stem: "戊", role: "main", proportion: .6 }, { stem: "乙", role: "secondary", proportion: .3 }, { stem: "癸", role: "residual", proportion: .1 }] },
  巳: { pinyin: "Si", element: "fire", hidden: [{ stem: "丙", role: "main", proportion: .6 }, { stem: "戊", role: "secondary", proportion: .3 }, { stem: "庚", role: "residual", proportion: .1 }] },
  午: { pinyin: "Wu", element: "fire", hidden: [{ stem: "丁", role: "main", proportion: .7 }, { stem: "己", role: "secondary", proportion: .3 }] },
  未: { pinyin: "Wei", element: "earth", hidden: [{ stem: "己", role: "main", proportion: .6 }, { stem: "丁", role: "secondary", proportion: .3 }, { stem: "乙", role: "residual", proportion: .1 }] },
  申: { pinyin: "Shen", element: "metal", hidden: [{ stem: "庚", role: "main", proportion: .6 }, { stem: "壬", role: "secondary", proportion: .3 }, { stem: "戊", role: "residual", proportion: .1 }] },
  酉: { pinyin: "You", element: "metal", hidden: [{ stem: "辛", role: "main", proportion: 1 }] },
  戌: { pinyin: "Xu", element: "earth", hidden: [{ stem: "戊", role: "main", proportion: .6 }, { stem: "辛", role: "secondary", proportion: .3 }, { stem: "丁", role: "residual", proportion: .1 }] },
  亥: { pinyin: "Hai", element: "water", hidden: [{ stem: "壬", role: "main", proportion: .7 }, { stem: "甲", role: "secondary", proportion: .3 }] },
};

export const GENERATES: Record<FiveElement, FiveElement> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};
export const CONTROLS: Record<FiveElement, FiveElement> = {
  wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire",
};

export const ELEMENT_LABELS: Record<FiveElement, string> = {
  wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water",
};

export const ARCHETYPES: Record<string, string> = {
  "Yang Wood": "The Steady Builder", "Yin Wood": "The Adaptive Creator",
  "Yang Fire": "The Radiant Catalyst", "Yin Fire": "The Quiet Flame",
  "Yang Earth": "The Grounded Guardian", "Yin Earth": "The Patient Cultivator",
  "Yang Metal": "The Principled Strategist", "Yin Metal": "The Refined Editor",
  "Yang Water": "The Restless Explorer", "Yin Water": "The Deep Listener",
};
