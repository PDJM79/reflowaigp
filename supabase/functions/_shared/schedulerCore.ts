// =============================================================================
// ReflowAI GP — Phase 2 scheduler planner (pure, dependency-free)
// =============================================================================
// Given already-fetched data for ONE practice on ONE target day, decide which
// logbook occurrences to create. No DB access, no side effects — the Deno edge
// function and the Node integration harness both do their I/O around this.
//
// Idempotency is the DB's job: inserts use the (selection_id, scheduled_date, slot)
// partial-unique index with ON CONFLICT DO NOTHING, so a duplicate plan no-ops.
// slot is '' for single-occurrence cadences and 'am'/'pm' for twice_daily.
// =============================================================================

import {
  occursOn, parseISODate, toISODate, localMidnightUtc, addHours,
  type Cadence, type LocalDate,
} from "./cadence.ts";

export type ApplicableTo = "all" | "branch" | "dispensing";

export interface PracticeInfo {
  id: string;
  timezone: string;
  isDispensing: boolean;
  isBranch: boolean;
}

// A schedulable is a curated selection, a bespoke is_scheduled process_template,
// or (Phase 5) a cleaning_task or fridge_unit. The cadence maths are identical;
// only the identity/idempotency key differs (selection_id / template_id /
// cleaningTaskId / fridgeUnitId), so the planner tags each planned row.
export type SourceKind = "selection" | "template" | "cleaning" | "fridge";

export interface SelectionInput {
  id: string;
  sourceKind?: SourceKind;   // defaults to 'selection'
  curatedLogbookId: string;
  title: string;               // logbook title (task title)
  module: string;              // section name/slug (task module)
  cadence: Cadence;            // curated cadence
  cadenceOverride: Cadence | null;
  applicableTo: ApplicableTo[];
  preferredDay: number | null;
  preferredDate: number | null;
  dueWindowHours: number;
  earlyStartHours: number;
  importance: string | null;
  defaultAssigneeId: string | null;
  defaultAssigneeRole: string | null;
  anchorDate: string;          // ISO 'YYYY-MM-DD' — selection start/creation date
  isEnabled: boolean;
  adHocOnly: boolean;
  nextReviewDate: string | null; // for periodic_review
  zoneId?: string | null;        // cleaning source only — the cleaning zone
  fridgeUnitId?: string | null;  // fridge source only — the fridge unit
}

export interface RoleAssignment {
  role: string;
  userId: string | null;
}

export interface PlannedTask {
  practiceId: string;
  selectionId: string | null;  // set for curated-selection sources
  templateId: string | null;   // set for bespoke process_template sources
  title: string;
  module: string;
  scheduledDate: string;       // ISO
  dueAt: string;               // ISO timestamp
  visibleFrom: string;         // ISO timestamp
  importance: string;
  assigneeId: string | null;
  curatedLogbookId: string | null;
  slot: string | null;         // "am" | "pm" for twice_daily; null otherwise
  cleaningTaskId: string | null; // set for cleaning sources
  zoneId: string | null;         // set for cleaning sources
  fridgeUnitId: string | null;   // set for fridge sources
}

export interface PlanCounts {
  generated: number;
  skippedClosure: number;
  unassigned: number;
  periodicReviewReminders: number;
}

export interface PlanResult {
  rows: PlannedTask[];
  counts: PlanCounts;
  periodicReviewDue: { selectionId: string; nextReviewDate: string }[];
}

const DEFAULT_IMPORTANCE = "medium";

/** cadence_override wins over the curated cadence when set. */
export function effectiveCadence(sel: SelectionInput): Cadence {
  return sel.cadenceOverride ?? sel.cadence;
}

/** Applicability gating: 'dispensing' only if practice dispenses, 'branch' only
 *  if branch, 'all' always. A selection with multiple flags matches if ANY apply. */
export function isApplicable(applicableTo: ApplicableTo[], practice: PracticeInfo): boolean {
  return applicableTo.some((a) =>
    a === "all" ||
    (a === "dispensing" && practice.isDispensing) ||
    (a === "branch" && practice.isBranch)
  );
}

/** Resolve the assignee: explicit id -> first active holder of the role -> null. */
export function resolveAssignee(sel: SelectionInput, roleAssignments: RoleAssignment[]): string | null {
  if (sel.defaultAssigneeId) return sel.defaultAssigneeId;
  if (sel.defaultAssigneeRole) {
    const holder = roleAssignments.find((ra) => ra.role === sel.defaultAssigneeRole && ra.userId);
    return holder?.userId ?? null;
  }
  return null;
}

/** Add whole days to an ISO date (calendar arithmetic, tz-independent). */
export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  const ms = Date.UTC(d.year, d.month - 1, d.day) + days * 86400000;
  const nd = new Date(ms);
  return toISODate({ year: nd.getUTCFullYear(), month: nd.getUTCMonth() + 1, day: nd.getUTCDate(), weekday: nd.getUTCDay() });
}

/** Daily/weekly cadences skip closures; monthly+ shift to the next open day. */
function isDailyOrWeekly(c: Cadence): boolean {
  return c === "daily" || c === "twice_daily" || c === "weekly" || c === "fortnightly";
}

/**
 * Plan occurrences for one practice across [fromISO, toISO] inclusive (the
 * caller passes a single day for a normal run, or a back-window for backfill).
 * `closures` is the set of ISO closure dates for this practice.
 */
export function planGeneration(params: {
  practice: PracticeInfo;
  selections: SelectionInput[];
  roleAssignments: RoleAssignment[];
  closures: Set<string>;
  fromISO: string;
  toISO: string;
}): PlanResult {
  const { practice, selections, roleAssignments, closures } = params;
  const rows: PlannedTask[] = [];
  const counts: PlanCounts = { generated: 0, skippedClosure: 0, unassigned: 0, periodicReviewReminders: 0 };
  const periodicReviewDue: { selectionId: string; nextReviewDate: string }[] = [];

  // Iterate each day in the window.
  const days: string[] = [];
  for (let d = params.fromISO; d <= params.toISO; d = addDaysISO(d, 1)) days.push(d);

  for (const sel of selections) {
    if (!sel.isEnabled || sel.adHocOnly) continue;
    if (!isApplicable(sel.applicableTo, practice)) continue;

    const cadence = effectiveCadence(sel);

    // periodic_review: never a task; surface the review date as a reminder once.
    if (cadence === "periodic_review") {
      if (sel.nextReviewDate && sel.nextReviewDate >= params.fromISO && sel.nextReviewDate <= params.toISO) {
        periodicReviewDue.push({ selectionId: sel.id, nextReviewDate: sel.nextReviewDate });
        counts.periodicReviewReminders++;
      }
      continue;
    }
    if (cadence === "ad_hoc") continue;

    const anchor = parseISODate(sel.anchorDate);
    const assignee = resolveAssignee(sel, roleAssignments);

    for (const dayISO of days) {
      const today = parseISODate(dayISO);
      if (!occursOn({ cadence, anchor, today, preferredDay: sel.preferredDay, preferredDate: sel.preferredDate })) {
        continue;
      }

      // twice_daily emits two slots (am + pm) per open day; other cadences one.
      const slots: (string | null)[] = cadence === "twice_daily" ? ["am", "pm"] : [null];

      // Closure handling.
      let scheduledDate = dayISO;
      if (closures.has(dayISO)) {
        if (isDailyOrWeekly(cadence)) {
          counts.skippedClosure += slots.length; // both slots for twice_daily
          continue; // skip entirely
        }
        // monthly+: shift forward to the next open day
        let shifted = dayISO;
        let guard = 0;
        while (closures.has(shifted) && guard++ < 31) shifted = addDaysISO(shifted, 1);
        scheduledDate = shifted;
        counts.skippedClosure++; // counts as a closure-affected occurrence (shifted, still generated)
      }

      const occurrenceInstant = localMidnightUtc(scheduledDate, practice.timezone);
      const dueAt = addHours(occurrenceInstant, sel.dueWindowHours);
      const visibleFrom = addHours(dueAt, -sel.earlyStartHours);

      const isTemplate = sel.sourceKind === "template";
      const isCleaning = sel.sourceKind === "cleaning";
      const isFridge = sel.sourceKind === "fridge";
      const isLogbook = !isTemplate && !isCleaning && !isFridge;
      for (const slot of slots) {
        if (!assignee) counts.unassigned++;
        counts.generated++;
        rows.push({
          practiceId: practice.id,
          selectionId: isLogbook ? sel.id : null,
          templateId: isTemplate ? sel.id : null,
          title: sel.title,
          module: sel.module,
          scheduledDate,
          dueAt: dueAt.toISOString(),
          visibleFrom: visibleFrom.toISOString(),
          importance: sel.importance ?? DEFAULT_IMPORTANCE,
          assigneeId: assignee,
          curatedLogbookId: isLogbook ? sel.curatedLogbookId : null,
          slot,
          cleaningTaskId: isCleaning ? sel.id : null,
          zoneId: isCleaning ? (sel.zoneId ?? null) : null,
          fridgeUnitId: isFridge ? sel.id : null,
        });
      }
    }
  }

  return { rows, counts, periodicReviewDue };
}
