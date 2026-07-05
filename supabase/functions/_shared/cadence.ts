// =============================================================================
// ReflowAI GP — Phase 2 cadence engine (pure, dependency-free)
// =============================================================================
// Decides whether a logbook selection generates an occurrence on a given day,
// in the practice's timezone, DST-aware. No Deno/Node-specific imports so it is
// importable by both the Deno edge function and vitest/tsx.
//
// All matching is done on LOCAL CALENDAR DATES (year/month/day/weekday). A date
// is a date regardless of DST, so cadence matching is inherently DST-immune —
// the only DST-sensitive step is turning "now" into a local date, which we do
// via Intl (DST-aware). due_at/visible_from instants are computed separately.
// =============================================================================

export type Cadence =
  | "daily" | "twice_daily" | "weekly" | "fortnightly" | "monthly" | "termly" | "quarterly"
  | "six_monthly" | "annual" | "biennial" | "triennial" | "five_yearly"
  | "periodic_review" | "ad_hoc";

export interface LocalDate {
  year: number;   // e.g. 2026
  month: number;  // 1-12
  day: number;    // 1-31
  weekday: number; // 0=Sun .. 6=Sat
}

// ── Timezone helpers (Intl-based, work in Node + Deno) ────────────────────────

/** The local calendar date + weekday for an instant in a timezone (DST-aware). */
export function localDateInTz(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    weekday: weekdayMap[get("weekday")],
  };
}

/** Parse an ISO 'YYYY-MM-DD' into a LocalDate (weekday computed via UTC noon to avoid tz drift). */
export function parseISODate(iso: string): LocalDate {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  // Weekday from a UTC-noon anchor (no tz, no DST ambiguity for a pure date).
  const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return { year: y, month: m, day: d, weekday };
}

export function toISODate(d: LocalDate): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.year}-${p(d.month)}-${p(d.day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** preferred_date clamped to the last day of the target month (month-length edge). */
export function resolvePreferredDate(preferredDate: number, year: number, month: number): number {
  return Math.min(preferredDate, daysInMonth(year, month));
}

/** Whole months between two (year,month) pairs, anchor -> target. */
function monthsBetween(anchorYear: number, anchorMonth: number, year: number, month: number): number {
  return (year - anchorYear) * 12 + (month - anchorMonth);
}

/** Whole years between anchor and target (calendar years). */
function yearsBetween(anchorYear: number, year: number): number {
  return year - anchorYear;
}

/** ISO week index relative to an anchor date, for fortnightly parity. Counts
 *  Monday-based weeks from the anchor's week start. */
function weeksSinceAnchor(anchor: LocalDate, today: LocalDate): number {
  const anchorMs = Date.UTC(anchor.year, anchor.month - 1, anchor.day);
  const todayMs = Date.UTC(today.year, today.month - 1, today.day);
  // Shift both back to their Monday (weekday 1). weekday 0=Sun.
  const toMonday = (wd: number) => (wd === 0 ? 6 : wd - 1);
  const anchorMonday = anchorMs - toMonday(anchor.weekday) * 86400000;
  const todayMonday = todayMs - toMonday(today.weekday) * 86400000;
  return Math.round((todayMonday - anchorMonday) / (7 * 86400000));
}

// ── Core: does this cadence generate on `today`? ──────────────────────────────

export interface OccurrenceInput {
  cadence: Cadence;
  anchor: LocalDate;       // selection start/creation date (month + preferred_date basis)
  today: LocalDate;        // the day being evaluated, in practice tz
  preferredDay?: number | null;   // 0-6 (weekly/fortnightly); default Monday=1
  preferredDate?: number | null;  // 1-31 (monthly+); default 1
}

const DEFAULT_PREFERRED_DAY = 1;   // Monday
const DEFAULT_PREFERRED_DATE = 1;  // 1st

/**
 * True iff `today` is an occurrence day for the cadence per the Phase 2 rules.
 * Closure handling (skip/shift) is applied separately by the planner.
 * periodic_review and ad_hoc NEVER generate here.
 */
export function occursOn(input: OccurrenceInput): boolean {
  const { cadence, anchor, today } = input;
  const preferredDay = input.preferredDay ?? DEFAULT_PREFERRED_DAY;
  const preferredDate = input.preferredDate ?? DEFAULT_PREFERRED_DATE;

  // Never before the anchor date.
  const anchorMs = Date.UTC(anchor.year, anchor.month - 1, anchor.day);
  const todayMs = Date.UTC(today.year, today.month - 1, today.day);
  if (todayMs < anchorMs) return false;

  // The effective "preferred date" for today's month, clamped to month length.
  const dom = resolvePreferredDate(preferredDate, today.year, today.month);

  switch (cadence) {
    case "daily":
    case "twice_daily":
      return true; // every day (twice_daily emits two slots per day in the planner)

    case "weekly":
      return today.weekday === (preferredDay % 7);

    case "fortnightly": {
      if (today.weekday !== (preferredDay % 7)) return false;
      // Even number of weeks since the anchor week => on-cycle.
      return weeksSinceAnchor(anchor, today) % 2 === 0;
    }

    case "monthly":
      return today.day === dom;

    case "termly": {
      // Evenly-spaced 4-month intervals from the anchor (anchor, +4, +8, +12, …),
      // which naturally yields 3 occurrences per year. On preferred_date.
      if (today.day !== dom) return false;
      const mb = monthsBetween(anchor.year, anchor.month, today.year, today.month);
      return mb >= 0 && mb % 4 === 0;
    }

    case "quarterly": {
      if (today.day !== dom) return false;
      const mb = monthsBetween(anchor.year, anchor.month, today.year, today.month);
      return mb >= 0 && mb % 3 === 0;
    }

    case "six_monthly": {
      if (today.day !== dom) return false;
      const mb = monthsBetween(anchor.year, anchor.month, today.year, today.month);
      return mb >= 0 && mb % 6 === 0;
    }

    case "annual": {
      if (today.day !== dom) return false;
      return today.month === anchor.month;
    }

    case "biennial":
      return anniversaryMatch(anchor, today, dom, 2);

    case "triennial":
      return anniversaryMatch(anchor, today, dom, 3);

    case "five_yearly":
      return anniversaryMatch(anchor, today, dom, 5);

    case "periodic_review":
    case "ad_hoc":
      return false; // never scheduled

    default:
      return false;
  }
}

/** Anniversary cadence: same month as anchor, on preferred date, every N years. */
function anniversaryMatch(anchor: LocalDate, today: LocalDate, dom: number, everyNYears: number): boolean {
  if (today.month !== anchor.month) return false;
  if (today.day !== dom) return false;
  const yb = yearsBetween(anchor.year, today.year);
  return yb >= 0 && yb % everyNYears === 0;
}

// ── Instant computation for due_at / visible_from (DST-aware zoned->UTC) ───────

/**
 * The UTC instant of local midnight (00:00) on `isoDate` in `timeZone`.
 * Uses the standard two-pass zoned-time-to-UTC correction so DST transition
 * days resolve to the correct instant.
 */
export function localMidnightUtc(isoDate: string, timeZone: string): Date {
  const [y, m, d] = isoDate.split("-").map((n) => parseInt(n, 10));
  // Target wall time (00:00 on isoDate) expressed as if it were UTC.
  const wallAsUtc = Date.UTC(y, m - 1, d, 0, 0, 0);
  // Solve U such that format(U) == wall time. offset(U) = format(U)_as_utc - U,
  // and U = wallAsUtc - offset(U). Iterate from wallAsUtc; converges in <=2 steps
  // (a second step only near a DST boundary). Always subtract the offset from the
  // ORIGINAL wall time, not from the running guess.
  let guess = wallAsUtc;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(new Date(guess));
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
    let hour = get("hour");
    if (hour === 24) hour = 0; // some engines emit 24 for midnight
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
    const offset = asUtc - guess;
    const next = wallAsUtc - offset;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

/** Add whole hours to an instant. */
export function addHours(instant: Date, hours: number): Date {
  return new Date(instant.getTime() + hours * 3600000);
}
