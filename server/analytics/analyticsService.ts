// =============================================================================
// ReflowAI GP — Phase 6 analytics service (DB I/O around the pure core)
// =============================================================================
// Fetches task occurrences + evidence + issue signals for a practice/window and
// feeds them to complianceCore. All reads go through Drizzle (zero supabase.from).
// =============================================================================

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import {
  computeCompliance, computeModuleBreakdown, classifyOccurrence,
  type OccurrenceRow, type ComplianceInput, type ComplianceResult,
} from "./complianceCore";

const SCHEDULED_SOURCES = ["logbook", "cleaning", "fridge"] as const;

interface Window { from: string; to: string; module?: string }

/** Occurrence rows (generated, scheduled) for a practice in [from,to], optional module. */
async function fetchOccurrences(practiceId: string, w: Window): Promise<Array<OccurrenceRow & { assigneeId: string | null; sourceType: string }>> {
  const conds = [
    eq(schema.tasks.practiceId, practiceId),
    gte(schema.tasks.scheduledDate, w.from),
    lte(schema.tasks.scheduledDate, w.to),
    sql`${schema.tasks.sourceType} IN ('logbook','cleaning','fridge')`,
  ];
  if (w.module) conds.push(eq(schema.tasks.module, w.module));
  const rows = await db.select({
    status: schema.tasks.status,
    importance: schema.tasks.importance,
    module: schema.tasks.module,
    dueAt: schema.tasks.dueAt,
    completedAt: schema.tasks.completedAt,
    submittedForReviewAt: schema.tasks.submittedForReviewAt,
    assigneeId: schema.tasks.assigneeId,
    sourceType: schema.tasks.sourceType,
  }).from(schema.tasks).where(and(...conds));
  return rows.map((r) => ({
    status: r.status ?? "pending",
    importance: r.importance ?? "medium",
    module: r.module,
    dueAt: r.dueAt ? new Date(r.dueAt).toISOString() : null,
    completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
    submittedForReviewAt: r.submittedForReviewAt ? new Date(r.submittedForReviewAt).toISOString() : null,
    assigneeId: r.assigneeId,
    sourceType: r.sourceType,
  }));
}

/**
 * Evidence completeness signal. v1 basis (documented): photo-required CLEANING
 * occurrences (cleaning_tasks.requires_photo) and whether a cleaning_log with a
 * photo exists for that task on that date. Logbook step-level evidence is folded
 * in later; where no photo-required items exist the core scores this 100.
 */
async function fetchEvidence(practiceId: string, w: Window): Promise<{ photoRequiredDue: number; photoRequiredWithEvidence: number }> {
  if (w.module && w.module !== "cleaning") return { photoRequiredDue: 0, photoRequiredWithEvidence: 0 };
  const res: any = await db.execute(sql`
    WITH photo_occ AS (
      SELECT t.id, (t.metadata->>'cleaningTaskId') AS cleaning_task_id, t.scheduled_date
      FROM tasks t
      JOIN cleaning_tasks ct ON ct.id = (t.metadata->>'cleaningTaskId')::uuid
      WHERE t.practice_id = ${practiceId}
        AND t.source_type = 'cleaning'
        AND t.scheduled_date BETWEEN ${w.from} AND ${w.to}
        AND ct.requires_photo = true
    )
    SELECT
      count(*)::int AS due,
      count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM cleaning_logs cl
        WHERE cl.task_id = po.cleaning_task_id::uuid
          AND cl.photo_url IS NOT NULL
          AND cl.log_date::date = po.scheduled_date
      ))::int AS with_evidence
    FROM photo_occ po
  `);
  const row = (res.rows ?? res)[0] ?? { due: 0, with_evidence: 0 };
  return { photoRequiredDue: Number(row.due) || 0, photoRequiredWithEvidence: Number(row.with_evidence) || 0 };
}

/**
 * Issue-hygiene signal. Fridge breaches are fully modelled (the Phase 5 remedial
 * task); a breach is "resolved" when its linked remedial task is complete.
 * Cleaning-issue resolution is NOT modelled in the schema, so a cleaning issue is
 * counted resolved only if a later clean check exists for the same task
 * (best-effort, documented drift).
 */
async function fetchIssues(practiceId: string, w: Window): Promise<{
  cleaningIssuesTotal: number; cleaningIssuesResolved: number;
  fridgeBreachesTotal: number; fridgeBreachesRemedialClosed: number;
}> {
  const wantCleaning = !w.module || w.module === "cleaning";
  const wantFridge = !w.module || w.module === "fridge";

  let cleaningIssuesTotal = 0, cleaningIssuesResolved = 0;
  if (wantCleaning) {
    const res: any = await db.execute(sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM cleaning_logs later
          WHERE later.task_id = cl.task_id
            AND later.log_date > cl.log_date
            AND coalesce(later.has_issue, false) = false
        ))::int AS resolved
      FROM cleaning_logs cl
      WHERE cl.practice_id = ${practiceId}
        AND cl.has_issue = true
        AND cl.log_date::date BETWEEN ${w.from} AND ${w.to}
    `);
    const r = (res.rows ?? res)[0] ?? { total: 0, resolved: 0 };
    cleaningIssuesTotal = Number(r.total) || 0;
    cleaningIssuesResolved = Number(r.resolved) || 0;
  }

  let fridgeBreachesTotal = 0, fridgeBreachesRemedialClosed = 0;
  if (wantFridge) {
    const res: any = await db.execute(sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.practice_id = ${practiceId}
            AND t.source_type = 'adhoc'
            AND (t.metadata->>'fridgeReadingId') = fr.id::text
            AND t.status IN ('complete','closed')
        ))::int AS closed
      FROM fridge_readings fr
      WHERE fr.practice_id = ${practiceId}
        AND fr.is_out_of_range = true
        AND fr.reading_date::date BETWEEN ${w.from} AND ${w.to}
    `);
    const r = (res.rows ?? res)[0] ?? { total: 0, closed: 0 };
    fridgeBreachesTotal = Number(r.total) || 0;
    fridgeBreachesRemedialClosed = Number(r.closed) || 0;
  }
  return { cleaningIssuesTotal, cleaningIssuesResolved, fridgeBreachesTotal, fridgeBreachesRemedialClosed };
}

/** Build the pure-core input for a window, then a date-only sub-window for trends. */
async function buildInput(practiceId: string, w: Window, nowMs: number): Promise<ComplianceInput & { occ: Array<OccurrenceRow & { assigneeId: string | null }> }> {
  const [occ, evidence, issues] = await Promise.all([
    fetchOccurrences(practiceId, w),
    fetchEvidence(practiceId, w),
    fetchIssues(practiceId, w),
  ]);
  return { occurrences: occ, evidence, issues, nowMs, occ };
}

function isoDaysBefore(isoDate: string, days: number): string {
  return new Date(Date.parse(isoDate + "T00:00:00Z") - days * 86400000).toISOString().slice(0, 10);
}

/** GET /analytics/compliance — full score + breakdown + 7/30/90d trends. */
export async function getCompliance(practiceId: string, w: Window, nowMs: number): Promise<ComplianceResult & { window: Window; trends: Record<string, number | null> }> {
  const input = await buildInput(practiceId, w, nowMs);
  const result = computeCompliance(input);

  // Trends are the compliance score over the 7/30/90 days ending at the window's
  // `to` date (anchored to the window, not "now", so historical windows work too).
  const trendWindows: Array<[string, number]> = [["7d", 7], ["30d", 30], ["90d", 90]];
  const trends: Record<string, number | null> = {};
  for (const [key, days] of trendWindows) {
    const tw: Window = { from: isoDaysBefore(w.to, days), to: w.to, module: w.module };
    const ti = await buildInput(practiceId, tw, nowMs);
    trends[key] = computeCompliance(ti).compliance_score;
  }
  return { ...result, window: w, trends };
}

/** GET /analytics/module-breakdown — per-module expected/actual/score. */
export async function getModuleBreakdown(practiceId: string, w: Window, nowMs: number) {
  const input = await buildInput(practiceId, w, nowMs);
  return { window: w, modules: computeModuleBreakdown(input) };
}

/** GET /analytics/team — per-member scheduled vs adhoc load, on-time %, overdue. */
export async function getTeam(practiceId: string, w: Window, nowMs: number) {
  // Scheduled occurrences (for on-time %/overdue) + adhoc load, per assignee.
  const scheduled = await fetchOccurrences(practiceId, { from: w.from, to: w.to });
  const adhoc: any = await db.execute(sql`
    SELECT assignee_id, count(*)::int AS adhoc_load
    FROM tasks
    WHERE practice_id = ${practiceId} AND source_type = 'adhoc'
      AND created_at::date BETWEEN ${w.from} AND ${w.to}
    GROUP BY assignee_id
  `);
  const adhocByUser = new Map<string, number>();
  for (const r of (adhoc.rows ?? adhoc)) if (r.assignee_id) adhocByUser.set(r.assignee_id, Number(r.adhoc_load) || 0);

  const byUser = new Map<string, { scheduled: number; on_time: number; overdue: number }>();
  for (const r of scheduled) {
    if (!r.assigneeId) continue;
    const b = byUser.get(r.assigneeId) ?? { scheduled: 0, on_time: 0, overdue: 0 };
    const bucket = classifyOccurrence(r, nowMs);
    if (bucket !== "open_future") b.scheduled++;
    if (bucket === "on_time") b.on_time++;
    if (bucket === "overdue_open" || bucket === "missed") b.overdue++;
    byUser.set(r.assigneeId, b);
  }

  const userIds = Array.from(new Set([...byUser.keys(), ...adhocByUser.keys()]));
  const names = userIds.length
    ? await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users)
        .where(sql`${schema.users.id} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`)
    : [];
  const nameById = new Map(names.map((n) => [n.id, n.name]));

  const members = userIds.map((id) => {
    const b = byUser.get(id) ?? { scheduled: 0, on_time: 0, overdue: 0 };
    return {
      user_id: id,
      name: nameById.get(id) ?? null,
      scheduled_load: b.scheduled,
      adhoc_load: adhocByUser.get(id) ?? 0,
      on_time_rate: b.scheduled === 0 ? null : Math.round((b.on_time / b.scheduled) * 1000) / 10,
      overdue_count: b.overdue,
    };
  }).sort((a, b) => b.overdue_count - a.overdue_count || b.scheduled_load - a.scheduled_load);

  return { window: w, members };
}

/** GET /analytics/overdue-summary — banner + triage feed (no window: current state). */
export async function getOverdueSummary(practiceId: string, nowMs: number) {
  const rows = await db.select({
    id: schema.tasks.id, title: schema.tasks.title, module: schema.tasks.module,
    status: schema.tasks.status, dueAt: schema.tasks.dueAt, importance: schema.tasks.importance,
    assigneeId: schema.tasks.assigneeId,
  }).from(schema.tasks).where(and(
    eq(schema.tasks.practiceId, practiceId),
    sql`${schema.tasks.status} NOT IN ('complete','closed')`,
  ));

  let overdueOpen = 0, missed = 0;
  const byModule = new Map<string, number>();
  const top: Array<{ id: string; title: string; module: string | null; due_at: string | null; importance: string }> = [];
  for (const r of rows) {
    const pastDue = r.dueAt != null && new Date(r.dueAt).getTime() < nowMs;
    const isMissed = r.status === "missed";
    const isOverdue = r.status === "overdue" || r.status === "rejected" || (r.status !== "submitted_for_review" && pastDue);
    if (!isMissed && !isOverdue) continue;
    if (isMissed) missed++; else overdueOpen++;
    const m = r.module ?? "uncategorised";
    byModule.set(m, (byModule.get(m) ?? 0) + 1);
    top.push({ id: r.id, title: r.title, module: r.module, due_at: r.dueAt ? new Date(r.dueAt).toISOString() : null, importance: r.importance ?? "medium" });
  }
  top.sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
  return {
    overdue_open: overdueOpen,
    missed,
    total: overdueOpen + missed,
    by_module: Array.from(byModule.entries()).map(([module, count]) => ({ module, count })).sort((a, b) => b.count - a.count),
    top: top.slice(0, 10),
  };
}
