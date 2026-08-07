import { CONTROLS, ELEMENTS, GENERATES } from "./constants.js";
import type { BaziChart, ChartRoles, FiveElement, PillarKey, SupportLevel } from "./types.js";

export type RelationshipFocus = "overall" | "communication" | "emotional_connection" | "conflict_repair" | "long_term";

export type PersonRelationshipSummary = {
  dayMasterLabel: string;
  archetype: string;
  strongestElement: FiveElement;
  quietestElement: FiveElement;
  supportLevel: SupportLevel;
  roles: ChartRoles;
};

export type RelationshipAnalysis = {
  version: "relationship-analysis-v1";
  confidence: "high" | "medium" | "low";
  focusArea: RelationshipFocus;
  people: [PersonRelationshipSummary, PersonRelationshipSummary];
  dayMasterRelation: {
    type: "same" | "generates" | "is_generated_by" | "controls" | "is_controlled_by";
    direction: "balanced" | "a_to_b" | "b_to_a";
    evidenceId: string;
  };
  polarityRelation: "same" | "different";
  elementExchange: Array<{
    element: FiveElement;
    contribution: "mutual" | "a_supports_b" | "b_supports_a" | "shared_gap";
    aPercent: number;
    bPercent: number;
    evidenceId: string;
  }>;
  rhythm: {
    similarities: Array<{ role: keyof ChartRoles; difference: number; evidenceId: string }>;
    differences: Array<{ role: keyof ChartRoles; strongerPerson: "a" | "b"; difference: number; evidenceId: string }>;
  };
  crossChartInteractions: Array<{
    type: "combination" | "clash" | "harm" | "destruction";
    aPillar: PillarKey;
    bPillar: PillarKey;
    evidenceId: string;
  }>;
  evidenceIds: string[];
};

const INTERACTIONS = [
  { type: "combination" as const, pairs: [["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]] },
  { type: "clash" as const, pairs: [["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]] },
  { type: "harm" as const, pairs: [["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]] },
  { type: "destruction" as const, pairs: [["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["未", "戌"]] },
] as const;

function summary(chart: BaziChart): PersonRelationshipSummary {
  return {
    dayMasterLabel: chart.dayMasterProfile.label,
    archetype: chart.dayMasterProfile.archetype,
    strongestElement: chart.elementProfile.strongestElement,
    quietestElement: chart.elementProfile.quietestElement,
    supportLevel: chart.elementProfile.dayMasterSupport.level,
    roles: chart.roles,
  };
}

function dayMasterRelation(a: FiveElement, b: FiveElement): RelationshipAnalysis["dayMasterRelation"] {
  if (a === b) return { type: "same", direction: "balanced", evidenceId: `day-master:${a}:same` };
  if (GENERATES[a] === b) return { type: "generates", direction: "a_to_b", evidenceId: `day-master:${a}:generates:${b}` };
  if (GENERATES[b] === a) return { type: "is_generated_by", direction: "b_to_a", evidenceId: `day-master:${b}:generates:${a}` };
  if (CONTROLS[a] === b) return { type: "controls", direction: "a_to_b", evidenceId: `day-master:${a}:controls:${b}` };
  return { type: "is_controlled_by", direction: "b_to_a", evidenceId: `day-master:${b}:controls:${a}` };
}

function elementExchange(a: BaziChart, b: BaziChart): RelationshipAnalysis["elementExchange"] {
  return ELEMENTS.map((element) => {
    const aPercent = a.elementProfile.percentages[element];
    const bPercent = b.elementProfile.percentages[element];
    let contribution: RelationshipAnalysis["elementExchange"][number]["contribution"] = "mutual";
    if (aPercent <= 15 && bPercent <= 15) contribution = "shared_gap";
    else if (aPercent >= 24 && bPercent <= 15) contribution = "a_supports_b";
    else if (aPercent <= 15 && bPercent >= 24) contribution = "b_supports_a";
    return { element, contribution, aPercent, bPercent, evidenceId: `element:${element}:a${aPercent}:b${bPercent}:${contribution}` };
  });
}

function rhythm(a: ChartRoles, b: ChartRoles): RelationshipAnalysis["rhythm"] {
  const similarities: RelationshipAnalysis["rhythm"]["similarities"] = [];
  const differences: RelationshipAnalysis["rhythm"]["differences"] = [];
  for (const role of Object.keys(a) as Array<keyof ChartRoles>) {
    const difference = Math.abs(a[role] - b[role]);
    if (difference <= 6) similarities.push({ role, difference, evidenceId: `role:${role}:similar:${difference}` });
    else if (difference >= 12) differences.push({ role, strongerPerson: a[role] > b[role] ? "a" : "b", difference, evidenceId: `role:${role}:${a[role] > b[role] ? "a" : "b"}:${difference}` });
  }
  return {
    similarities: similarities.sort((a, b) => a.difference - b.difference).slice(0, 3),
    differences: differences.sort((a, b) => b.difference - a.difference).slice(0, 3),
  };
}

function pairMatches(a: string, b: string, pair: readonly [string, string]): boolean {
  return (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]);
}

function crossInteractions(a: BaziChart, b: BaziChart): RelationshipAnalysis["crossChartInteractions"] {
  const left = Object.values(a.pillars).filter((value): value is NonNullable<typeof value> => value !== null);
  const right = Object.values(b.pillars).filter((value): value is NonNullable<typeof value> => value !== null);
  const result: RelationshipAnalysis["crossChartInteractions"] = [];
  for (const aPillar of left) for (const bPillar of right) for (const interaction of INTERACTIONS) {
    if (interaction.pairs.some((pair) => pairMatches(aPillar.branch.character, bPillar.branch.character, pair))) {
      result.push({
        type: interaction.type,
        aPillar: aPillar.role,
        bPillar: bPillar.role,
        evidenceId: `branch:${interaction.type}:a-${aPillar.role}:b-${bPillar.role}`,
      });
    }
  }
  return result.slice(0, 12);
}

export function analyzeRelationship(
  chartA: BaziChart,
  chartB: BaziChart,
  focusArea: RelationshipFocus = "overall",
): RelationshipAnalysis {
  const people: RelationshipAnalysis["people"] = [summary(chartA), summary(chartB)];
  const relation = dayMasterRelation(chartA.dayMaster.element, chartB.dayMaster.element);
  const exchange = elementExchange(chartA, chartB);
  const roleRhythm = rhythm(chartA.roles, chartB.roles);
  const interactions = crossInteractions(chartA, chartB);
  const evidenceIds = [relation.evidenceId, ...exchange.map((item) => item.evidenceId),
    ...roleRhythm.similarities.map((item) => item.evidenceId), ...roleRhythm.differences.map((item) => item.evidenceId),
    ...interactions.map((item) => item.evidenceId)];
  const levels = [chartA.confidence.level, chartB.confidence.level];
  const confidence = levels.includes("low") ? "low" : levels.includes("medium") ? "medium" : "high";
  return {
    version: "relationship-analysis-v1",
    confidence,
    focusArea,
    people,
    dayMasterRelation: relation,
    polarityRelation: chartA.dayMaster.polarity === chartB.dayMaster.polarity ? "same" : "different",
    elementExchange: exchange,
    rhythm: roleRhythm,
    crossChartInteractions: interactions,
    evidenceIds,
  };
}
