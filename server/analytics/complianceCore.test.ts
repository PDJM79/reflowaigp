import { describe, it, expect } from "vitest";
import {
  computeCompliance, computeModuleBreakdown, classifyOccurrence,
  type OccurrenceRow, type ComplianceInput,
} from "./complianceCore";

const NOW = Date.parse("2026-07-06T12:00:00Z");
const DUE_PAST = "2026-07-05T12:00:00Z";   // 1 day before NOW
const DUE_FUTURE = "2026-07-08T12:00:00Z"; // 2 days after NOW

function occ(over: Partial<OccurrenceRow>): OccurrenceRow {
  return { status: "complete", importance: "medium", module: "cleaning", dueAt: DUE_PAST, completedAt: DUE_PAST, ...over };
}
function input(occurrences: OccurrenceRow[], over: Partial<ComplianceInput> = {}): ComplianceInput {
  return {
    occurrences,
    evidence: { photoRequiredDue: 0, photoRequiredWithEvidence: 0 },
    issues: { cleaningIssuesTotal: 0, cleaningIssuesResolved: 0, fridgeBreachesTotal: 0, fridgeBreachesRemedialClosed: 0 },
    nowMs: NOW,
    ...over,
  };
}

describe("classifyOccurrence", () => {
  it("complete before due => on_time", () => {
    expect(classifyOccurrence(occ({ completedAt: "2026-07-05T09:00:00Z" }), NOW)).toBe("on_time");
  });
  it("complete after due => late", () => {
    expect(classifyOccurrence(occ({ dueAt: DUE_PAST, completedAt: "2026-07-06T09:00:00Z" }), NOW)).toBe("late");
  });
  it("status missed => missed", () => {
    expect(classifyOccurrence(occ({ status: "missed", completedAt: null }), NOW)).toBe("missed");
  });
  it("status overdue => overdue_open", () => {
    expect(classifyOccurrence(occ({ status: "overdue", completedAt: null }), NOW)).toBe("overdue_open");
  });
  it("rejected => overdue_open (must redo)", () => {
    expect(classifyOccurrence(occ({ status: "rejected", completedAt: null }), NOW)).toBe("overdue_open");
  });
  it("pending past-due => overdue_open", () => {
    expect(classifyOccurrence(occ({ status: "pending", dueAt: DUE_PAST, completedAt: null }), NOW)).toBe("overdue_open");
  });
  it("pending not-yet-due => open_future (excluded from expected)", () => {
    expect(classifyOccurrence(occ({ status: "pending", dueAt: DUE_FUTURE, completedAt: null }), NOW)).toBe("open_future");
  });
  it("submitted_for_review before due => on_time", () => {
    expect(classifyOccurrence(occ({ status: "submitted_for_review", completedAt: null, submittedForReviewAt: "2026-07-05T08:00:00Z" }), NOW)).toBe("on_time");
  });
});

describe("computeCompliance — the gate fixture (10 expected: 7 on-time, 1 late, 1 overdue, 1 missed)", () => {
  // Hand-computed:
  //   compliance = (7 + 0.5*1) / 10 * 100 = 75.0
  //   no high-importance items -> comp1 = overall on-time = 7/10*100 = 70
  //   fit = 0.4*70 + 0.2*100(overdue_high=0) + 0.2*100(evidence) + 0.2*100(issues) = 88.0
  const occs: OccurrenceRow[] = [
    ...Array.from({ length: 7 }, () => occ({ status: "complete", completedAt: "2026-07-05T09:00:00Z" })),
    occ({ status: "complete", completedAt: "2026-07-06T09:00:00Z" }), // late (after due)
    occ({ status: "overdue", completedAt: null }),
    occ({ status: "missed", completedAt: null }),
  ];
  const r = computeCompliance(input(occs));

  it("compliance_score = 75.0", () => expect(r.compliance_score).toBe(75.0));
  it("fit_for_audit_score = 88.0", () => expect(r.fit_for_audit_score).toBe(88.0));
  it("breakdown buckets match", () => {
    expect(r.breakdown).toMatchObject({
      expected: 10, completed_on_time: 7, completed_late: 1, overdue_open: 1, missed: 1, open_future: 0,
      high_expected: 0, overdue_high: 0, evidence_completeness: 100, issue_hygiene: 100,
    });
  });
  it("basis flags the no-high-importance redistribution", () => {
    expect(r.basis.high_importance).toBe("no high-importance items configured");
    expect(r.basis.fit_for_audit).toContain("redistributed to overall on-time rate");
  });
});

describe("computeCompliance — zero expected (no scheduled work)", () => {
  it("no occurrences => null scores + basis, no divide-by-zero", () => {
    const r = computeCompliance(input([]));
    expect(r.compliance_score).toBeNull();
    expect(r.fit_for_audit_score).toBeNull();
    expect(r.basis.compliance).toBe("no scheduled work in window");
    expect(r.basis.fit_for_audit).toBe("no scheduled work in window");
    expect(r.breakdown.expected).toBe(0);
  });
  it("only future-open occurrences also => null (nothing due yet)", () => {
    const r = computeCompliance(input([occ({ status: "pending", dueAt: DUE_FUTURE, completedAt: null })]));
    expect(r.compliance_score).toBeNull();
    expect(r.breakdown.open_future).toBe(1);
  });
});

describe("computeCompliance — high-importance present (standard weighting)", () => {
  // 3 high (2 on-time, 1 overdue) + 2 medium on-time.
  //   expected=5, on_time=4, late=0 -> compliance = 4/5*100 = 80.0
  //   high_on_time_rate = 2/3*100 = 66.7 ; overdue_high = 1 -> comp2 = 100-5 = 95
  //   fit = 0.4*66.7 + 0.2*95 + 0.2*100 + 0.2*100 = 85.7
  const occs: OccurrenceRow[] = [
    occ({ importance: "high", status: "complete", completedAt: "2026-07-05T09:00:00Z" }),
    occ({ importance: "high", status: "complete", completedAt: "2026-07-05T09:00:00Z" }),
    occ({ importance: "high", status: "overdue", completedAt: null }),
    occ({ importance: "medium", status: "complete", completedAt: "2026-07-05T09:00:00Z" }),
    occ({ importance: "medium", status: "complete", completedAt: "2026-07-05T09:00:00Z" }),
  ];
  const r = computeCompliance(input(occs));
  it("compliance_score = 80.0", () => expect(r.compliance_score).toBe(80.0));
  it("high_importance_on_time_rate = 66.7, overdue_high = 1", () => {
    expect(r.breakdown.high_importance_on_time_rate).toBe(66.7);
    expect(r.breakdown.overdue_high).toBe(1);
  });
  it("fit_for_audit_score = 85.7 (standard weighting)", () => {
    expect(r.fit_for_audit_score).toBe(85.7);
    expect(r.basis.fit_for_audit).toContain("standard weighting");
  });
});

describe("computeCompliance — evidence completeness edge", () => {
  it("no photo-required steps => 100 (vacuously complete)", () => {
    const r = computeCompliance(input([occ({})], { evidence: { photoRequiredDue: 0, photoRequiredWithEvidence: 0 } }));
    expect(r.breakdown.evidence_completeness).toBe(100);
  });
  it("3 of 5 photo-required have evidence => 60.0", () => {
    const r = computeCompliance(input([occ({})], { evidence: { photoRequiredDue: 5, photoRequiredWithEvidence: 3 } }));
    expect(r.breakdown.evidence_completeness).toBe(60.0);
  });
});

describe("computeCompliance — issue hygiene (open vs closed)", () => {
  // 1 on-time medium (compliance 100, evidence 100). Issues: 4 cleaning (3 resolved) + 2 breaches (1 closed)
  //   issue_hygiene = (3+1)/(4+2)*100 = 66.7
  //   fit (no high) = 0.4*100 + 0.2*100 + 0.2*100 + 0.2*66.7 = 93.3
  const r = computeCompliance(input([occ({})], {
    issues: { cleaningIssuesTotal: 4, cleaningIssuesResolved: 3, fridgeBreachesTotal: 2, fridgeBreachesRemedialClosed: 1 },
  }));
  it("issue_hygiene = 66.7", () => expect(r.breakdown.issue_hygiene).toBe(66.7));
  it("fit_for_audit reflects the open remedials = 93.3", () => expect(r.fit_for_audit_score).toBe(93.3));
});

describe("computeModuleBreakdown", () => {
  it("per-module expected/actual/score, sorted by module", () => {
    const occs: OccurrenceRow[] = [
      occ({ module: "cleaning", status: "complete", completedAt: "2026-07-05T09:00:00Z" }),
      occ({ module: "cleaning", status: "overdue", completedAt: null }),
      occ({ module: "fridge", status: "complete", completedAt: "2026-07-05T09:00:00Z" }),
    ];
    const rows = computeModuleBreakdown(input(occs));
    expect(rows.map((r) => r.module)).toEqual(["cleaning", "fridge"]);
    expect(rows[0]).toMatchObject({ module: "cleaning", expected: 2, completed_on_time: 1, overdue_open: 1, score: 50.0 });
    expect(rows[1]).toMatchObject({ module: "fridge", expected: 1, score: 100.0 });
  });
});
