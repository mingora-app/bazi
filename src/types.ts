export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";
export type Polarity = "yang" | "yin";
export type HeavenlyStem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type EarthlyBranch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";
export type PillarKey = "year" | "month" | "day" | "hour";
export type DayBoundary = "midnight" | "zi-hour";
export type Disambiguation = "compatible" | "earlier" | "later" | "reject";

export type LocalDate = { year: number; month: number; day: number };
export type LocalTime = { hour: number; minute?: number; second?: number };

export type BirthInput = {
  date: LocalDate;
  time?: LocalTime | null;
  location?: {
    timeZone: string;
    longitude?: number;
    latitude?: number;
    /** Overrides inferred legal standard time for unusual historical zones. */
    standardOffsetMinutes?: number;
  };
  calendar?: "gregorian";
  options?: {
    solarTime?: "civil" | "true";
    dayBoundary?: DayBoundary;
    disambiguation?: Disambiguation;
  };
};

export type StemInfo = {
  character: HeavenlyStem;
  pinyin: string;
  element: FiveElement;
  polarity: Polarity;
};

export type HiddenStem = StemInfo & {
  role: "main" | "secondary" | "residual";
  proportion: number;
};

export type BranchInfo = {
  character: EarthlyBranch;
  pinyin: string;
  element: FiveElement;
  hiddenStems: HiddenStem[];
};

export type TenGod =
  | "peer" | "rob_wealth" | "eating_god" | "hurting_officer"
  | "direct_wealth" | "indirect_wealth" | "direct_officer"
  | "seven_killings" | "direct_resource" | "indirect_resource";

export type Pillar = {
  role: PillarKey;
  ganZhi: `${HeavenlyStem}${EarthlyBranch}`;
  label: string;
  stem: StemInfo;
  branch: BranchInfo;
  tenGod: TenGod | "day_master";
  hiddenStemTenGods: Array<{ stem: HeavenlyStem; tenGod: TenGod }>;
};

export type CalculationWarningCode =
  | "BIRTH_TIME_UNKNOWN"
  | "HOUR_PILLAR_OMITTED"
  | "TRUE_SOLAR_TIME_SKIPPED"
  | "PILLAR_MAY_CHANGE_WITHIN_DAY"
  | "STANDARD_OFFSET_INFERRED";

export type CalculationWarning = {
  code: CalculationWarningCode;
  message: string;
  pillars?: PillarKey[];
};

export type TrueSolarTimeInput = {
  date: LocalDate;
  time: Required<LocalTime>;
  timeZone: string;
  longitude: number;
  standardOffsetMinutes?: number;
  disambiguation?: Disambiguation;
};

export type TrueSolarTimeResult = {
  civilDateTime: string;
  trueSolarDateTime: string;
  trueSolarTime: string;
  utcOffsetMinutes: number;
  standardOffsetMinutes: number;
  dstOffsetMinutes: number;
  standardMeridian: number;
  corrections: {
    longitudeMinutes: number;
    equationOfTimeMinutes: number;
    totalMinutes: number;
  };
  dateChanged: boolean;
  disambiguation: Disambiguation;
};

export type FourPillarsResult = {
  input: {
    civilDateTime: string | null;
    timeZone: string | null;
    longitude: number | null;
  };
  calculationTime: {
    mode: "civil" | "true-solar";
    dateTime: string | null;
    correctionMinutes: number | null;
    dayBoundary: DayBoundary;
  };
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  dayMaster: StemInfo;
  completeness: {
    birthTimeKnown: boolean;
    usedPillars: PillarKey[];
    missingPillars: Array<"hour">;
  };
  warnings: CalculationWarning[];
};

export type ElementScores = Record<FiveElement, number>;
export type SupportLevel = "supported" | "balanced" | "challenged";
export type ElementProfile = {
  model: "mingora-elements-v1";
  rawScores: ElementScores;
  seasonalScores: ElementScores;
  percentages: ElementScores;
  seasonalContext: {
    monthBranch: EarthlyBranch;
    dominantElement: FiveElement;
    label: string;
  };
  strongestElement: FiveElement;
  quietestElement: FiveElement;
  dayMasterSupport: {
    peerElement: FiveElement;
    resourceElement: FiveElement;
    supportPercent: number;
    level: SupportLevel;
  };
};

export type ChartRoles = {
  support: number;
  identity: number;
  expression: number;
  resources: number;
  structure: number;
};

export type BaziChart = FourPillarsResult & {
  version: "mingora-bazi-v1";
  source: {
    calendarEngine: "lunar-javascript";
    analysisModel: "mingora-elements-v1";
  };
  dayMasterProfile: StemInfo & { label: string; archetype: string };
  elementProfile: ElementProfile;
  roles: ChartRoles;
  confidence: { level: "high" | "medium" | "low"; reasons: string[] };
};

export type DaYunInput = {
  birth: BirthInput & { time: LocalTime };
  gender: "male" | "female";
  options?: { cycles?: number };
};

export type DaYunResult = {
  direction: "forward" | "reverse";
  directionBasis: { gender: "male" | "female"; yearStem: StemInfo };
  startOffset: { years: number; months: number; days: number; hours: number };
  startDateTime: string;
  cycles: Array<{
    index: number;
    ganZhi: `${HeavenlyStem}${EarthlyBranch}`;
    stem: StemInfo;
    branch: BranchInfo;
    startYear: number;
    endYear: number;
    startAge: number;
    endAge: number;
    stemTenGod: TenGod;
    branchTenGod: TenGod;
  }>;
  calculation: { sect: 2; trueSolarDateTime: string | null };
};

export type ValidationErrorCode =
  | "INVALID_DATE" | "INVALID_TIME" | "INVALID_TIMEZONE"
  | "INVALID_LONGITUDE" | "INVALID_LATITUDE"
  | "TRUE_SOLAR_TIME_REQUIRES_TIMEZONE" | "TRUE_SOLAR_TIME_REQUIRES_LONGITUDE";

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: Array<{ code: ValidationErrorCode; field: string; message: string }> };
