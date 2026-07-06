// supabase/functions/scheduler-generate-tasks/index.ts
// CRON job: materialises logbook task occurrences from active practice_logbook_
// selections (and is_scheduled process_templates are reserved for a later pass).
// Requires X-Job-Token (verify_jwt=false). Idempotent — safe to re-run.
//
// Feature-flagged: only practices with metadata->>'scheduler_enabled' = 'true'
// are processed. No practice has selections on ship, so live impact is zero.
//
// Body (all optional):
//   { practice_id?: string, from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }
// Default run = today (practice timezone). Manual/backfill runs pass from/to;
// backfill is capped at 7 days back (older is left for the escalator to miss).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCronSecret } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { localDateInTz, toISODate } from "../_shared/cadence.ts";
import {
  planGeneration, type SelectionInput, type PracticeInfo, type RoleAssignment, type ApplicableTo, type PlannedTask,
} from "../_shared/schedulerCore.ts";
import type { Cadence } from "../_shared/cadence.ts";

const BACKFILL_MAX_DAYS = 7;

// process_templates.frequency (process_frequency enum) -> base_cadence.
// Phase 5: twice_daily now generates two slot-aware occurrences per open day.
const PROCESS_FREQUENCY_TO_CADENCE: Record<string, Cadence | null> = {
  daily: "daily", twice_daily: "twice_daily", weekly: "weekly", monthly: "monthly",
  quarterly: "quarterly", six_monthly: "six_monthly", annually: "annual",
};

// clean_frequency enum -> base_cadence. 'periodic' stays manual (no auto-gen).
const CLEAN_FREQUENCY_TO_CADENCE: Record<string, Cadence | null> = {
  daily: "daily", twice_daily: "twice_daily", weekly: "weekly", monthly: "monthly",
  periodic: null,
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    requireCronSecret(req);

    const body = await req.json().catch(() => ({}));
    const onlyPractice: string | undefined = body.practice_id;
    const overrideFrom: string | undefined = body.from;
    const overrideTo: string | undefined = body.to;

    const db = createServiceClient();

    // Feature-flagged practices only — any of the per-module scheduling toggles.
    let pq = db.from("practices")
      .select("id, timezone, is_dispensing, is_branch, metadata")
      .or("metadata->>scheduler_enabled.eq.true,metadata->>cleaning_scheduling_enabled.eq.true,metadata->>fridge_scheduling_enabled.eq.true");
    if (onlyPractice) pq = pq.eq("id", onlyPractice);
    const { data: practices, error: pErr } = await pq;
    if (pErr) throw pErr;

    const summary: Record<string, unknown>[] = [];

    for (const p of practices ?? []) {
      const practice: PracticeInfo = {
        id: p.id, timezone: p.timezone ?? "Europe/London",
        isDispensing: !!p.is_dispensing, isBranch: !!p.is_branch,
      };

      // Per-module opt-in flags (jsonb value may be boolean true or string "true").
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      const isOn = (v: unknown) => v === true || v === "true";
      const schedulerEnabled = isOn(meta.scheduler_enabled);
      const cleaningEnabled = isOn(meta.cleaning_scheduling_enabled);

      // Determine the run window (in practice tz).
      const todayISO = toISODate(localDateInTz(new Date(), practice.timezone));
      let fromISO = overrideFrom ?? todayISO;
      const toISO = overrideTo ?? todayISO;
      // Cap backfill at 7 days back.
      const floorISO = addDaysLocal(todayISO, -BACKFILL_MAX_DAYS);
      if (fromISO < floorISO) fromISO = floorISO;

      // Load enabled selections joined to their curated logbook + section.
      const { data: sels, error: sErr } = await db
        .from("practice_logbook_selections")
        .select(`
          id, curated_logbook_id, is_enabled, ad_hoc_only, cadence_override,
          preferred_day, preferred_date, due_window_hours, early_start_hours,
          importance, default_assignee_id, default_assignee_role, next_review_date, created_at,
          curated_logbooks:curated_logbook_id (
            cadence, applicable_to, title,
            curated_sections:section_id ( name )
          )
        `)
        .eq("practice_id", p.id)
        .eq("is_enabled", true);
      if (sErr) throw sErr;

      const selections: SelectionInput[] = (schedulerEnabled ? (sels ?? []) : []).map((s: Record<string, any>) => ({
        id: s.id,
        curatedLogbookId: s.curated_logbook_id,
        title: s.curated_logbooks?.title ?? "Logbook task",
        module: s.curated_logbooks?.curated_sections?.name ?? "compliance",
        cadence: s.curated_logbooks?.cadence,
        cadenceOverride: s.cadence_override,
        applicableTo: (s.curated_logbooks?.applicable_to ?? ["all"]) as ApplicableTo[],
        preferredDay: s.preferred_day,
        preferredDate: s.preferred_date,
        dueWindowHours: s.due_window_hours ?? 24,
        earlyStartHours: s.early_start_hours ?? 12,
        importance: s.importance,
        defaultAssigneeId: s.default_assignee_id,
        defaultAssigneeRole: s.default_assignee_role,
        anchorDate: (s.created_at ?? todayISO).slice(0, 10),
        isEnabled: s.is_enabled,
        adHocOnly: s.ad_hoc_only,
        nextReviewDate: s.next_review_date,
      }));

      // Bespoke is_scheduled process_templates (second source). Mapped from
      // process_frequency to base_cadence (twice_daily now supported via slots).
      if (schedulerEnabled) {
        const { data: templates, error: tErr } = await db
          .from("process_templates")
          .select("id, name, module, frequency, due_window_hours, early_start_hours, importance, default_assignee_id, default_assignee_role, created_at")
          .eq("practice_id", p.id)
          .eq("is_scheduled", true);
        if (tErr) throw tErr;
        for (const t of templates ?? []) {
          const cadence = PROCESS_FREQUENCY_TO_CADENCE[t.frequency as string];
          if (!cadence) continue; // unmapped/unschedulable frequency
          selections.push({
            id: t.id, sourceKind: "template", curatedLogbookId: "",
            title: t.name, module: t.module ?? "compliance",
            cadence, cadenceOverride: null, applicableTo: ["all"],
            preferredDay: null, preferredDate: null,
            dueWindowHours: t.due_window_hours ?? 24, earlyStartHours: t.early_start_hours ?? 12,
            importance: t.importance, defaultAssigneeId: t.default_assignee_id, defaultAssigneeRole: t.default_assignee_role,
            anchorDate: (t.created_at ?? todayISO).slice(0, 10),
            isEnabled: true, adHocOnly: false, nextReviewDate: null,
          });
        }
      }

      // Cleaning tasks (third source, Phase 5) — opt-in per practice. Each active
      // cleaning_task generates occurrences on its own frequency. Idempotency is
      // handled in-app below (tasks.selection_id is FK-bound to logbook selections,
      // so cleaning occurrences carry the cleaning_task id in metadata instead).
      if (cleaningEnabled) {
        const { data: cleaningTasks, error: cErr } = await db
          .from("cleaning_tasks")
          .select("id, task_name, zone_id, frequency, default_assignee_role, created_at")
          .eq("practice_id", p.id)
          .eq("is_active", true);
        if (cErr) throw cErr;
        for (const ct of cleaningTasks ?? []) {
          const cadence = CLEAN_FREQUENCY_TO_CADENCE[ct.frequency as string];
          if (!cadence) continue; // 'periodic' (and unknowns) stay manual — no auto-gen
          selections.push({
            id: ct.id, sourceKind: "cleaning", curatedLogbookId: "",
            title: ct.task_name ?? "Cleaning task", module: "cleaning",
            cadence, cadenceOverride: null, applicableTo: ["all"],
            preferredDay: null, preferredDate: null,
            dueWindowHours: 24, earlyStartHours: 12,
            importance: null, // cleaning_tasks has no importance — planner defaults to 'medium'
            defaultAssigneeId: null, defaultAssigneeRole: ct.default_assignee_role,
            anchorDate: (ct.created_at ?? todayISO).slice(0, 10),
            isEnabled: true, adHocOnly: false, nextReviewDate: null,
            zoneId: ct.zone_id ?? null,
          });
        }
      }

      // Role assignments + closures for this practice.
      const { data: roles } = await db.from("role_assignments")
        .select("role, user_id").eq("practice_id", p.id);
      const roleAssignments: RoleAssignment[] = (roles ?? []).map((r: Record<string, any>) => ({ role: r.role, userId: r.user_id }));

      const { data: closureRows } = await db.from("practice_closure_dates")
        .select("closure_date").eq("practice_id", p.id);
      const closures = new Set<string>((closureRows ?? []).map((c: Record<string, any>) => String(c.closure_date).slice(0, 10)));

      const { rows, counts, periodicReviewDue } = planGeneration({
        practice, selections, roleAssignments, closures, fromISO, toISO,
      });

      // Bulk upsert — the slot-aware partial-unique indexes make duplicate
      // occurrences no-op. Split by source: selection rows conflict on
      // (selection_id, scheduled_date, slot); template rows on (template_id,
      // scheduled_date, slot). twice_daily writes 'am'/'pm'; others ''.
      const toRow = (r: PlannedTask) => ({
        practice_id: r.practiceId,
        selection_id: r.selectionId,
        template_id: r.templateId,
        source_type: "logbook",
        title: r.title,
        module: r.module,
        scheduled_date: r.scheduledDate,
        slot: r.slot ?? "",
        due_at: r.dueAt,
        visible_from: r.visibleFrom,
        status: "pending",
        importance: r.importance,
        assignee_id: r.assigneeId,
        metadata: { curated_logbook_id: r.curatedLogbookId, steps_source: r.curatedLogbookId ? "curated" : "template" },
      });
      const selectionRows = rows.filter((r) => r.selectionId).map(toRow);
      const templateRows = rows.filter((r) => r.templateId).map(toRow);
      if (selectionRows.length > 0) {
        const { error } = await db.from("tasks").upsert(selectionRows, { onConflict: "selection_id,scheduled_date,slot", ignoreDuplicates: true });
        if (error) throw error;
      }
      if (templateRows.length > 0) {
        const { error } = await db.from("tasks").upsert(templateRows, { onConflict: "template_id,scheduled_date,slot", ignoreDuplicates: true });
        if (error) throw error;
      }

      // Cleaning occurrences: no functional idempotency index (metadata-keyed), so
      // de-dupe in-app against existing cleaning tasks in the window. Single-run
      // cron → no concurrent-insert race.
      const cleaningPlanned = rows.filter((r) => r.cleaningTaskId);
      let cleaningGenerated = 0;
      if (cleaningPlanned.length > 0) {
        const { data: existing, error: exErr } = await db
          .from("tasks")
          .select("scheduled_date, slot, metadata")
          .eq("practice_id", p.id)
          .eq("source_type", "cleaning")
          .gte("scheduled_date", fromISO)
          .lte("scheduled_date", toISO);
        if (exErr) throw exErr;
        const seen = new Set<string>(
          (existing ?? []).map((e: Record<string, any>) =>
            `${(e.metadata as any)?.cleaningTaskId ?? ""}|${e.scheduled_date}|${e.slot ?? ""}`),
        );
        const cleaningRows = cleaningPlanned
          .filter((r) => !seen.has(`${r.cleaningTaskId}|${r.scheduledDate}|${r.slot ?? ""}`))
          .map((r) => ({
            practice_id: r.practiceId,
            source_type: "cleaning",
            title: r.title,
            module: r.module,
            scheduled_date: r.scheduledDate,
            slot: r.slot ?? "",
            due_at: r.dueAt,
            visible_from: r.visibleFrom,
            status: "pending",
            importance: r.importance,
            assignee_id: r.assigneeId,
            metadata: { cleaningTaskId: r.cleaningTaskId, zoneId: r.zoneId },
          }));
        if (cleaningRows.length > 0) {
          const { error } = await db.from("tasks").insert(cleaningRows);
          if (error) throw error;
          cleaningGenerated = cleaningRows.length;
        }
      }

      // One audit event per practice per run (audit_logs is practice-scoped).
      await db.from("audit_logs").insert({
        practice_id: p.id,
        entity_type: "scheduler_run",
        entity_id: p.id,
        action: "scheduler_generate",
        after_data: {
          window: { from: fromISO, to: toISO },
          generated: counts.generated,
          cleaning_generated: cleaningGenerated,
          skipped_closure: counts.skippedClosure,
          unassigned: counts.unassigned,
          periodic_review_reminders: counts.periodicReviewReminders,
          periodic_review_due: periodicReviewDue,
        },
      });

      summary.push({ practice_id: p.id, ...counts, cleaning_generated: cleaningGenerated });
    }

    return new Response(JSON.stringify({ ok: true, practices: summary.length, summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
  }
});

// Local calendar-date arithmetic (no tz needed for pure date shift).
function addDaysLocal(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const nd = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return toISODate({ year: nd.getUTCFullYear(), month: nd.getUTCMonth() + 1, day: nd.getUTCDate(), weekday: nd.getUTCDay() });
}
