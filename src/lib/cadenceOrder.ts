// Frequency ordering for the compliance-floor warning. There is no
// compliance_floor column in the schema (Phase 1/2 didn't add one), so the
// warning is derived purely by comparing the chosen cadence against the
// logbook's curated cadence on approximate occurrences-per-year.

export type BaseCadence =
  | "daily" | "weekly" | "fortnightly" | "monthly" | "termly" | "quarterly"
  | "six_monthly" | "annual" | "biennial" | "triennial" | "five_yearly"
  | "periodic_review" | "ad_hoc";

// Approximate occurrences per year (higher = more frequent).
const PER_YEAR: Record<string, number> = {
  daily: 365,
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,       // note: quarterly (4/yr) is MORE frequent than termly (3/yr)
  termly: 3,
  six_monthly: 2,
  annual: 1,
  biennial: 0.5,
  triennial: 1 / 3,
  five_yearly: 0.2,
};

// periodic_review / ad_hoc are not on a fixed frequency and are excluded from
// the comparison (they return undefined -> no warning).
export function cadencePerYear(cadence: string): number | undefined {
  return PER_YEAR[cadence];
}

export const CADENCE_OPTIONS: { value: BaseCadence; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "termly", label: "Termly (every 4 months)" },
  { value: "quarterly", label: "Quarterly" },
  { value: "six_monthly", label: "Six-monthly" },
  { value: "annual", label: "Annual" },
  { value: "biennial", label: "Biennial (2-yearly)" },
  { value: "triennial", label: "Triennial (3-yearly)" },
  { value: "five_yearly", label: "Five-yearly" },
  { value: "periodic_review", label: "Periodic review (manual next date)" },
  { value: "ad_hoc", label: "Ad-hoc (event/on-change/onboarding)" },
];

export function cadenceLabel(cadence: string): string {
  return CADENCE_OPTIONS.find((c) => c.value === cadence)?.label ?? cadence;
}

/**
 * True when `chosen` is scheduled LESS often than `curated` (i.e. weaker
 * compliance). Returns false when either cadence is not on a fixed frequency
 * (periodic_review / ad_hoc) or when chosen is as/more frequent.
 */
export function isLessFrequent(chosen: string, curated: string): boolean {
  const c = cadencePerYear(chosen);
  const k = cadencePerYear(curated);
  if (c === undefined || k === undefined) return false;
  return c < k;
}
