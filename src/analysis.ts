import { ARCHETYPES, CONTROLS, ELEMENT_LABELS, ELEMENTS, GENERATES } from "./constants.js";
import type {
  BaziChart, ChartRoles, ElementProfile, ElementScores, FiveElement,
  FourPillarsResult, Pillar, StemInfo,
} from "./types.js";

const SEASON_MULTIPLIERS = {
  dominant: 1.35,
  generated: 1.15,
  source: 0.95,
  controller: 0.8,
  controlled: 0.7,
} as const;

function blankScores(): ElementScores {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}

function generatedBy(element: FiveElement): FiveElement {
  return ELEMENTS.find((candidate) => GENERATES[candidate] === element)!;
}

function controlledBy(element: FiveElement): FiveElement {
  return ELEMENTS.find((candidate) => CONTROLS[candidate] === element)!;
}

function seasonMultiplier(element: FiveElement, season: FiveElement): number {
  if (element === season) return SEASON_MULTIPLIERS.dominant;
  if (GENERATES[season] === element) return SEASON_MULTIPLIERS.generated;
  if (GENERATES[element] === season) return SEASON_MULTIPLIERS.source;
  if (CONTROLS[element] === season) return SEASON_MULTIPLIERS.controller;
  return SEASON_MULTIPLIERS.controlled;
}

function roundedPercentages(scores: ElementScores): ElementScores {
  const total = ELEMENTS.reduce((sum, element) => sum + scores[element], 0);
  if (!total) return blankScores();
  const exact = ELEMENTS.map((element, index) => ({ element, index, value: scores[element] / total * 100 }));
  const result = Object.fromEntries(exact.map(({ element, value }) => [element, Math.floor(value)])) as ElementScores;
  let remaining = 100 - ELEMENTS.reduce((sum, element) => sum + result[element], 0);
  const order = exact.sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)) || a.index - b.index);
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) result[order[index]!.element] += 1;
  return result;
}

function extreme(scores: ElementScores, strongest: boolean): FiveElement {
  return ELEMENTS.reduce((selected, candidate) => {
    const better = strongest ? scores[candidate] > scores[selected] : scores[candidate] < scores[selected];
    return better ? candidate : selected;
  });
}

export function analyzeElements(
  input: Pick<FourPillarsResult, "pillars" | "dayMaster">,
): ElementProfile {
  const available = Object.values(input.pillars).filter((pillar): pillar is Pillar => pillar !== null);
  const rawScores = blankScores();
  for (const pillar of available) {
    rawScores[pillar.stem.element] += 1;
    const branchWeight = pillar.role === "month" ? 1.5 : 1;
    for (const hidden of pillar.branch.hiddenStems) rawScores[hidden.element] += hidden.proportion * branchWeight;
  }
  const dominantElement = input.pillars.month.branch.element;
  const seasonalScores = Object.fromEntries(ELEMENTS.map((element) => [
    element,
    rawScores[element] * seasonMultiplier(element, dominantElement),
  ])) as ElementScores;
  const percentages = roundedPercentages(seasonalScores);
  const peerElement = input.dayMaster.element;
  const resourceElement = generatedBy(peerElement);
  const supportPercent = percentages[peerElement] + percentages[resourceElement];
  return {
    model: "mingora-elements-v1",
    rawScores,
    seasonalScores,
    percentages,
    seasonalContext: {
      monthBranch: input.pillars.month.branch.character,
      dominantElement,
      label: `${ELEMENT_LABELS[dominantElement]} season`,
    },
    strongestElement: extreme(percentages, true),
    quietestElement: extreme(percentages, false),
    dayMasterSupport: {
      peerElement,
      resourceElement,
      supportPercent,
      level: supportPercent >= 48 ? "supported" : supportPercent <= 32 ? "challenged" : "balanced",
    },
  };
}

export function getChartRoles(input: { dayMaster: StemInfo; elementProfile: ElementProfile }): ChartRoles {
  const element = input.dayMaster.element;
  const scores = input.elementProfile.percentages;
  return {
    support: scores[generatedBy(element)],
    identity: scores[element],
    expression: scores[GENERATES[element]],
    resources: scores[CONTROLS[element]],
    structure: scores[controlledBy(element)],
  };
}

export function buildBaziChart(fourPillars: FourPillarsResult): BaziChart {
  const elementProfile = analyzeElements(fourPillars);
  const polarityLabel = fourPillars.dayMaster.polarity === "yang" ? "Yang" : "Yin";
  const label = `${polarityLabel} ${ELEMENT_LABELS[fourPillars.dayMaster.element]}`;
  const uncertain = fourPillars.warnings.some((warning) => warning.code === "PILLAR_MAY_CHANGE_WITHIN_DAY");
  const reasons = fourPillars.completeness.birthTimeKnown
    ? ["Exact birth time is available."]
    : ["Birth time is unknown, so the hour pillar is omitted."];
  if (uncertain) reasons.push("One or more date-based pillars may change during the recorded date.");
  const chart = {
    ...fourPillars,
    version: "mingora-bazi-v1" as const,
    source: { calendarEngine: "lunar-javascript" as const, analysisModel: "mingora-elements-v1" as const },
    dayMasterProfile: { ...fourPillars.dayMaster, label, archetype: ARCHETYPES[label]! },
    elementProfile,
    roles: getChartRoles({ dayMaster: fourPillars.dayMaster, elementProfile }),
    confidence: {
      level: fourPillars.completeness.birthTimeKnown ? "high" as const : uncertain ? "low" as const : "medium" as const,
      reasons,
    },
  };
  return chart;
}
