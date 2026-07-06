// =============================================================================
// ReflowAI GP — Phase 6 compliance analytics core (pure, dependency-free)
// =============================================================================
// Computes compliance + fit-for-audit scores from already-fetched task
// occurrences for one practice over one window. No DB access, no side effects —
// the Express endpoints do their I/O around this, and the unit tests feed it
// hand-computed fixtures. Every score has an explicit `basis` so a zero /
// no-high-importance window is honest, never a divide-by-zero.
// =============================================================================

export interface OccurrenceRow {
  status: string;                    // pending/in_progress/complete/closed/overdue/missed/submitted_for_review/rejected
  importance: string;                // 'high' | 'medium' | 'low'
  module: string | null;
  dueAt: string | null;              // ISO
  completedAt: string | null;        // ISO
  submittedForReviewAt?: string | null; // ISO
}

export interface EvidenceInput {
  photoRequiredDue: number;          // photo-required steps whose task is due in the window
  photoRequiredWithEvidence: number; // of those, how many have an evidence row
}

export interface IssueInput {
  cleaningIssuesTotal: number;
  cleaningIssuesResolved: number;
  fridgeBreachesTotal: number;
  fridgeBreachesRemedialClosed: number;
}

export interface ComplianceInput {
  occurrences: OccurrenceRow[];
  evidence: EvidenceInput;
  issues: IssueInput;
  nowMs: number;                     // reference instant for "past due"
}

export type Bucket = "on_time" | "late" | "overdue_open" | "missed" | "open_future";

export interface ComplianceResult {
  compliance_score: number | null;
  fit_for_audit_score: number | null;
  basis: {
    compliance: string;
    fit_for_audit: string;
    high_importance: string;
  };
  breakdown: {
    expected: number;
    completed_on_time: number;
    completed_late: number;
    overdue_open: number;
    missed: number;
    open_future: number;
    high_expected: number;
    overdue_high: number;
    high_importance_on_time_rate: number | null;
    overall_on_time_rate: number | null;
    evidence_completeness: number;
    issue_hygiene: number;
  };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
/** Round to 1 dp for stable, human-readable scores. */
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Classify one occurrence into exactly one bucket. open_future is not "expected". */
export function classifyOccurrence(row: OccurrenceRow, nowMs: number): Bucket {
  const dueMs = row.dueAt ? Date.parse(row.dueAt) : null;
  const done = row.status === "complete" || row.status === "closed";
  if (done) {
    const compMs = row.completedAt ? Date.parse(row.completedAt) : null;
    if (dueMs == null || compMs == null) return "on_time";
    return compMs <= dueMs ? "on_time" : "late";
  }
  // Assignee has submitted for manager review — their part is done; grade by submission.
  if (row.status === "submitted_for_review") {
    const subMs = row.submittedForReviewAt ? Date.parse(row.submittedForReviewAt) : null;
    if (dueMs == null || subMs == null) return "on_time";
    return subMs <= dueMs ? "on_time" : "late";
  }
  if (row.status === "missed") return "missed";
  // Rejected must be redone → treated as unfinished/overdue for compliance.
  if (row.status === "overdue" || row.status === "rejected") return "overdue_open";
  // pending / in_progress: past-due counts as overdue, otherwise still future work.
  if (dueMs != null && dueMs < nowMs) return "overdue_open";
  return "open_future";
}

interface Tally { on_time: number; late: number; overdue_open: number; missed: number; open_future: number; }
function tally(rows: OccurrenceRow[], nowMs: number): Tally {
  const t: Tally = { on_time: 0, late: 0, overdue_open: 0, missed: 0, open_future: 0 };
  for (const r of rows) t[classifyOccurrence(r, nowMs)]++;
  return t;
}
const expectedOf = (t: Tally) => t.on_time + t.late + t.overdue_open + t.missed;

/**
 * The compliance score rewards on-time completion fully and late completion at
 * half credit, over everything that was expected in the window.
 *   compliance = clamp( (on_time + 0.5*late) / expected * 100 )
 * expected == 0 → null (no scheduled work), never a divide-by-zero.
 */
export function computeCompliance(input: ComplianceInput): ComplianceResult {
  const { occurrences, evidence, issues, nowMs } = input;
  const all = tally(occurrences, nowMs);
  const expected = expectedOf(all);

  const hiRows = occurrences.filter((r) => r.importance === "high");
  const hi = tally(hiRows, nowMs);
  const highExpected = expectedOf(hi);
  const overdueHigh = hi.overdue_open + hi.missed; // past-due high-importance work

  const complianceScore = expected === 0
    ? null
    : round1(clamp(((all.on_time + 0.5 * all.late) / expected) * 100));

  const overallOnTimeRate = expected === 0 ? null : round1((all.on_time / expected) * 100);
  const highOnTimeRate = highExpected === 0 ? null : round1((hi.on_time / highExpected) * 100);

  // Evidence completeness: photo-required steps with evidence / due. None due → 100 (vacuously complete).
  const evidenceCompleteness = evidence.photoRequiredDue === 0
    ? 100
    : round1((evidence.photoRequiredWithEvidence / evidence.photoRequiredDue) * 100);

  // Issue hygiene: resolved cleaning issues + closed fridge breaches / total. None → 100 (no issues is clean).
  const issueDenom = issues.cleaningIssuesTotal + issues.fridgeBreachesTotal;
  const issueHygiene = issueDenom === 0
    ? 100
    : round1(((issues.cleaningIssuesResolved + issues.fridgeBreachesRemedialClosed) / issueDenom) * 100);

  // Fit-for-audit component 1 (weight 0.4): high-importance on-time rate. When a
  // practice has ZERO high-importance items in the window, redistribute that
  // weight to the overall on-time rate (documented basis).
  const noHighImportance = highExpected === 0;
  const comp1 = noHighImportance ? overallOnTimeRate : highOnTimeRate; // may be null iff expected===0
  const comp2 = 100 - Math.min(40, 5 * overdueHigh);

  let fitForAudit: number | null;
  let fitBasis: string;
  if (comp1 == null) {
    fitForAudit = null;
    fitBasis = "no scheduled work in window";
  } else {
    fitForAudit = round1(clamp(0.4 * comp1 + 0.2 * comp2 + 0.2 * evidenceCompleteness + 0.2 * issueHygiene));
    fitBasis = noHighImportance
      ? "high-importance component redistributed to overall on-time rate (no high-importance items configured)"
      : "standard weighting (0.4 high-importance on-time, 0.2 overdue-high, 0.2 evidence, 0.2 issue hygiene)";
  }

  return {
    compliance_score: complianceScore,
    fit_for_audit_score: fitForAudit,
    basis: {
      compliance: expected === 0 ? "no scheduled work in window" : "(on-time + 0.5x late) / expected",
      fit_for_audit: fitBasis,
      high_importance: noHighImportance
        ? "no high-importance items configured"
        : `${highExpected} high-importance item(s) in window`,
    },
    breakdown: {
      expected,
      completed_on_time: all.on_time,
      completed_late: all.late,
      overdue_open: all.overdue_open,
      missed: all.missed,
      open_future: all.open_future,
      high_expected: highExpected,
      overdue_high: overdueHigh,
      high_importance_on_time_rate: highOnTimeRate,
      overall_on_time_rate: overallOnTimeRate,
      evidence_completeness: evidenceCompleteness,
      issue_hygiene: issueHygiene,
    },
  };
}

/** Per-module expected/actual/score — reuses the compliance formula per module. */
export function computeModuleBreakdown(input: ComplianceInput): Array<{
  module: string; expected: number; completed_on_time: number; completed_late: number;
  overdue_open: number; missed: number; score: number | null;
}> {
  const byModule = new Map<string, OccurrenceRow[]>();
  for (const r of input.occurrences) {
    const m = r.module ?? "uncategorised";
    (byModule.get(m) ?? byModule.set(m, []).get(m)!).push(r);
  }
  const out: ReturnType<typeof computeModuleBreakdown> = [];
  for (const [module, rows] of byModule) {
    const t = tally(rows, input.nowMs);
    const expected = expectedOf(t);
    out.push({
      module,
      expected,
      completed_on_time: t.on_time,
      completed_late: t.late,
      overdue_open: t.overdue_open,
      missed: t.missed,
      score: expected === 0 ? null : round1(clamp(((t.on_time + 0.5 * t.late) / expected) * 100)),
    });
  }
  return out.sort((a, b) => a.module.localeCompare(b.module));
}
