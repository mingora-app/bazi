import { buildBaziChart } from "./analysis.js";
import { calculateFourPillars } from "./pillars.js";
import type { BaziChart, BirthInput } from "./types.js";

export function calculateBaziChart(input: BirthInput): BaziChart {
  return buildBaziChart(calculateFourPillars(input));
}
