import { describe, it, expect } from "vitest";
import {
  planGeneration, isApplicable, resolveAssignee, effectiveCadence, addDaysISO,
  type PracticeInfo, type SelectionInput, type RoleAssignment,
} from "./schedulerCore";

const PRACTICE: PracticeInfo = { id: "p1", timezone: "Europe/London", isDispensing: false, isBranch: false };

function sel(overrides: Partial<SelectionInput>): SelectionInput {
  return {
    id: "s1", curatedLogbookId: "cl1", title: "Weekly Fire Alarm Test", module: "Fire Safety",
    cadence: "weekly", cadenceOverride: null, applicableTo: ["all"],
    preferredDay: null, preferredDate: null, dueWindowHours: 24, earlyStartHours: 12,
    importance: null, defaultAssigneeId: null, defaultAssigneeRole: null,
    anchorDate: "2026-01-05", isEnabled: true, adHocOnly: false, nextReviewDate: null,
    ...overrides,
  };
}

describe("effectiveCadence (override wins)", () => {
  it("uses cadence_override when set, else curated cadence", () => {
    expect(effectiveCadence(sel({ cadence: "weekly", cadenceOverride: null }))).toBe("weekly");
    expect(effectiveCadence(sel({ cadence: "weekly", cadenceOverride: "monthly" }))).toBe("monthly");
  });
});

describe("isApplicable (dispensing/branch/all gating)", () => {
  const disp: PracticeInfo = { ...PRACTICE, isDispensing: true };
  const branch: PracticeInfo = { ...PRACTICE, isBranch: true };
  it("'all' always applies", () => {
    expect(isApplicable(["all"], PRACTICE)).toBe(true);
  });
  it("'dispensing' only when practice dispenses", () => {
    expect(isApplicable(["dispensing"], PRACTICE)).toBe(false);
    expect(isApplicable(["dispensing"], disp)).toBe(true);
  });
  it("'branch' only when practice is a branch", () => {
    expect(isApplicable(["branch"], PRACTICE)).toBe(false);
    expect(isApplicable(["branch"], branch)).toBe(true);
  });
  it("multi-flag matches if ANY applies", () => {
    expect(isApplicable(["all", "dispensing", "branch"], PRACTICE)).toBe(true); // all
    expect(isApplicable(["dispensing", "branch"], PRACTICE)).toBe(false);       // neither
    expect(isApplicable(["dispensing", "branch"], disp)).toBe(true);            // dispensing
  });
});

describe("resolveAssignee (id -> role -> null)", () => {
  const ras: RoleAssignment[] = [
    { role: "estates_lead", userId: "u-estates" },
    { role: "nurse_lead", userId: null },        // role exists but no active holder
  ];
  it("prefers explicit default_assignee_id", () => {
    expect(resolveAssignee(sel({ defaultAssigneeId: "u-direct", defaultAssigneeRole: "estates_lead" }), ras)).toBe("u-direct");
  });
  it("falls back to first active holder of the role", () => {
    expect(resolveAssignee(sel({ defaultAssigneeRole: "estates_lead" }), ras)).toBe("u-estates");
  });
  it("returns null when role has no active holder", () => {
    expect(resolveAssignee(sel({ defaultAssigneeRole: "nurse_lead" }), ras)).toBe(null);
  });
  it("returns null when neither id nor role set", () => {
    expect(resolveAssignee(sel({}), ras)).toBe(null);
  });
});

function plan(selections: SelectionInput[], dayISO: string, opts: { practice?: PracticeInfo; closures?: string[]; roles?: RoleAssignment[]; from?: string } = {}) {
  return planGeneration({
    practice: opts.practice ?? PRACTICE,
    selections,
    roleAssignments: opts.roles ?? [],
    closures: new Set(opts.closures ?? []),
    fromISO: opts.from ?? dayISO,
    toISO: dayISO,
  });
}

describe("planGeneration — basic generation", () => {
  it("generates a weekly occurrence on its preferred day with due/visible windows", () => {
    // 2026-07-06 is Monday; weekly default Monday.
    const r = plan([sel({ cadence: "weekly" })], "2026-07-06");
    expect(r.rows).toHaveLength(1);
    const row = r.rows[0];
    expect(row.scheduledDate).toBe("2026-07-06");
    // BST: local midnight 2026-07-06 == 2026-07-05T23:00Z; +24h due; visible = due -12h
    expect(row.dueAt).toBe("2026-07-06T23:00:00.000Z");
    expect(row.visibleFrom).toBe("2026-07-06T11:00:00.000Z");
    expect(row.importance).toBe("medium");
    expect(r.counts.generated).toBe(1);
  });
  it("does not generate off-cadence days", () => {
    expect(plan([sel({ cadence: "weekly" })], "2026-07-07").rows).toHaveLength(0); // Tuesday
  });
});

describe("planGeneration — disabled / ad_hoc_only skipped", () => {
  it("skips is_enabled=false", () => {
    expect(plan([sel({ isEnabled: false })], "2026-07-06").rows).toHaveLength(0);
  });
  it("skips ad_hoc_only", () => {
    expect(plan([sel({ adHocOnly: true })], "2026-07-06").rows).toHaveLength(0);
  });
});

describe("planGeneration — applicability gating end to end", () => {
  it("dispensing-only selection does NOT generate for a non-dispensing practice", () => {
    const r = plan([sel({ cadence: "daily", applicableTo: ["dispensing"] })], "2026-07-06");
    expect(r.rows).toHaveLength(0);
  });
  it("dispensing-only selection generates for a dispensing practice", () => {
    const disp = { ...PRACTICE, isDispensing: true };
    const r = plan([sel({ cadence: "daily", applicableTo: ["dispensing"] })], "2026-07-06", { practice: disp });
    expect(r.rows).toHaveLength(1);
  });
});

describe("planGeneration — assignee counts", () => {
  it("counts unassigned when no assignee resolves", () => {
    const r = plan([sel({ cadence: "daily" })], "2026-07-06");
    expect(r.counts.unassigned).toBe(1);
    expect(r.rows[0].assigneeId).toBe(null);
  });
  it("resolves role assignee onto the row", () => {
    const r = plan([sel({ cadence: "daily", defaultAssigneeRole: "estates_lead" })], "2026-07-06",
      { roles: [{ role: "estates_lead", userId: "u-estates" }] });
    expect(r.rows[0].assigneeId).toBe("u-estates");
    expect(r.counts.unassigned).toBe(0);
  });
});

describe("planGeneration — closures", () => {
  it("daily skips generation on a closure day", () => {
    const r = plan([sel({ cadence: "daily" })], "2026-07-06", { closures: ["2026-07-06"] });
    expect(r.rows).toHaveLength(0);
    expect(r.counts.skippedClosure).toBe(1);
  });
  it("monthly shifts to next open day on a closure", () => {
    // monthly on the 6th; 2026-07-06 closed -> shift to 07-07
    const r = plan([sel({ cadence: "monthly", preferredDate: 6, anchorDate: "2026-01-06" })], "2026-07-06",
      { closures: ["2026-07-06"] });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].scheduledDate).toBe("2026-07-07");
  });
  it("monthly shifts across consecutive closure days", () => {
    const r = plan([sel({ cadence: "monthly", preferredDate: 6, anchorDate: "2026-01-06" })], "2026-07-06",
      { closures: ["2026-07-06", "2026-07-07"] });
    expect(r.rows[0].scheduledDate).toBe("2026-07-08");
  });
});

describe("planGeneration — periodic_review and ad_hoc create no task rows", () => {
  it("periodic_review surfaces a reminder, no task row", () => {
    const r = plan([sel({ cadence: "periodic_review", nextReviewDate: "2026-07-06" })], "2026-07-06");
    expect(r.rows).toHaveLength(0);
    expect(r.counts.periodicReviewReminders).toBe(1);
    expect(r.periodicReviewDue).toEqual([{ selectionId: "s1", nextReviewDate: "2026-07-06" }]);
  });
  it("ad_hoc generates nothing at all", () => {
    const r = plan([sel({ cadence: "ad_hoc" })], "2026-07-06");
    expect(r.rows).toHaveLength(0);
    expect(r.counts.periodicReviewReminders).toBe(0);
  });
});

describe("planGeneration — backfill window", () => {
  it("generates occurrences across a multi-day window", () => {
    // daily over a 3-day backfill window
    const r = plan([sel({ cadence: "daily" })], "2026-07-08", { from: "2026-07-06" });
    expect(r.rows.map((x) => x.scheduledDate)).toEqual(["2026-07-06", "2026-07-07", "2026-07-08"]);
  });
});

describe("planGeneration — template source tagging", () => {
  it("selection source sets selectionId, null templateId", () => {
    const r = plan([sel({ cadence: "daily" })], "2026-07-06");
    expect(r.rows[0].selectionId).toBe("s1");
    expect(r.rows[0].templateId).toBe(null);
    expect(r.rows[0].curatedLogbookId).toBe("cl1");
  });
  it("template source sets templateId, null selectionId + curatedLogbookId", () => {
    const r = plan([sel({ id: "tmpl-1", sourceKind: "template", cadence: "daily", curatedLogbookId: "" })], "2026-07-06");
    expect(r.rows[0].templateId).toBe("tmpl-1");
    expect(r.rows[0].selectionId).toBe(null);
    expect(r.rows[0].curatedLogbookId).toBe(null);
  });
});

describe("addDaysISO helper", () => {
  it("crosses month boundaries", () => {
    expect(addDaysISO("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysISO("2026-02-28", 1)).toBe("2026-03-01"); // non-leap
    expect(addDaysISO("2024-02-28", 1)).toBe("2024-02-29"); // leap
  });
});

describe("planGeneration — twice_daily (Phase 5)", () => {
  it("generates two rows (am + pm) per open day, same date", () => {
    const r = plan([sel({ cadence: "twice_daily" })], "2026-07-06");
    expect(r.rows).toHaveLength(2);
    expect(r.rows.map((x) => x.slot).sort()).toEqual(["am", "pm"]);
    expect(r.rows.every((x) => x.scheduledDate === "2026-07-06")).toBe(true);
    expect(r.counts.generated).toBe(2);
  });
  it("closure skips BOTH slots", () => {
    const r = plan([sel({ cadence: "twice_daily" })], "2026-07-06", { closures: ["2026-07-06"] });
    expect(r.rows).toHaveLength(0);
    expect(r.counts.skippedClosure).toBe(2);
  });
  it("DST spring-forward day still generates exactly two", () => {
    // 2026-03-29 is the Europe/London BST transition (clocks forward).
    const r = plan([sel({ cadence: "twice_daily" })], "2026-03-29", { from: "2026-03-29" });
    expect(r.rows).toHaveLength(2);
    expect(r.rows.map((x) => x.slot).sort()).toEqual(["am", "pm"]);
  });
  it("multi-day open range: exactly 2 per open day", () => {
    const r = plan([sel({ cadence: "twice_daily" })], "2026-07-07", { from: "2026-07-06" });
    expect(r.rows).toHaveLength(4);
  });
  it("non-twice_daily cadences carry slot=null", () => {
    const r = plan([sel({ cadence: "weekly" })], "2026-07-06");
    expect(r.rows[0].slot ?? null).toBeNull();
  });
});

describe("planGeneration — cleaning source (Phase 5)", () => {
  it("cleaning source sets cleaningTaskId + zoneId, null selectionId/templateId/curatedLogbookId", () => {
    const r = plan([sel({ id: "ct-1", sourceKind: "cleaning", cadence: "daily", zoneId: "zone-1", curatedLogbookId: "" })], "2026-07-06");
    expect(r.rows).toHaveLength(1);
    const row = r.rows[0];
    expect(row.cleaningTaskId).toBe("ct-1");
    expect(row.zoneId).toBe("zone-1");
    expect(row.selectionId).toBe(null);
    expect(row.templateId).toBe(null);
    expect(row.curatedLogbookId).toBe(null);
  });
  it("cleaning twice_daily reuses am/pm slots", () => {
    const r = plan([sel({ id: "ct-2", sourceKind: "cleaning", cadence: "twice_daily", zoneId: "zone-2", curatedLogbookId: "" })], "2026-07-06");
    expect(r.rows).toHaveLength(2);
    expect(r.rows.map((x) => x.slot).sort()).toEqual(["am", "pm"]);
    expect(r.rows.every((x) => x.cleaningTaskId === "ct-2" && x.zoneId === "zone-2")).toBe(true);
  });
  it("cleaning resolves assignee from default_assignee_role", () => {
    const r = plan([sel({ id: "ct-3", sourceKind: "cleaning", cadence: "daily", defaultAssigneeRole: "cleaner", curatedLogbookId: "" })], "2026-07-06",
      { roles: [{ role: "cleaner", userId: "u-clean" }] });
    expect(r.rows[0].assigneeId).toBe("u-clean");
  });
  it("cleaning source with null zoneId carries zoneId=null", () => {
    const r = plan([sel({ id: "ct-4", sourceKind: "cleaning", cadence: "daily", curatedLogbookId: "" })], "2026-07-06");
    expect(r.rows[0].zoneId ?? null).toBeNull();
  });
  it("non-cleaning sources carry cleaningTaskId=null and zoneId=null", () => {
    const r = plan([sel({ cadence: "daily" })], "2026-07-06");
    expect(r.rows[0].cleaningTaskId ?? null).toBeNull();
    expect(r.rows[0].zoneId ?? null).toBeNull();
  });
});

describe("planGeneration — fridge source (Phase 5)", () => {
  it("fridge source sets fridgeUnitId, null selectionId/templateId/cleaningTaskId", () => {
    const r = plan([sel({ id: "fu-1", sourceKind: "fridge", cadence: "daily", fridgeUnitId: "fu-1", curatedLogbookId: "" })], "2026-07-06");
    expect(r.rows).toHaveLength(1);
    const row = r.rows[0];
    expect(row.fridgeUnitId).toBe("fu-1");
    expect(row.selectionId).toBe(null);
    expect(row.templateId).toBe(null);
    expect(row.cleaningTaskId).toBe(null);
    expect(row.curatedLogbookId).toBe(null);
  });
  it("fridge twice_daily reuses am/pm slots", () => {
    const r = plan([sel({ id: "fu-2", sourceKind: "fridge", cadence: "twice_daily", fridgeUnitId: "fu-2", curatedLogbookId: "" })], "2026-07-06");
    expect(r.rows).toHaveLength(2);
    expect(r.rows.map((x) => x.slot).sort()).toEqual(["am", "pm"]);
    expect(r.rows.every((x) => x.fridgeUnitId === "fu-2")).toBe(true);
  });
  it("fridge resolves assignee from default_assignee_role (estates_lead)", () => {
    const r = plan([sel({ id: "fu-3", sourceKind: "fridge", cadence: "daily", defaultAssigneeRole: "estates_lead", curatedLogbookId: "" })], "2026-07-06",
      { roles: [{ role: "estates_lead", userId: "u-estates" }] });
    expect(r.rows[0].assigneeId).toBe("u-estates");
  });
  it("non-fridge sources carry fridgeUnitId=null", () => {
    const r = plan([sel({ cadence: "daily" })], "2026-07-06");
    expect(r.rows[0].fridgeUnitId ?? null).toBeNull();
  });
});
