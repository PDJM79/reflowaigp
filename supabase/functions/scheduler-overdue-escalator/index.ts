// supabase/functions/scheduler-overdue-escalator/index.ts
// CRON job: escalates missed work.
//   Pass 1: pending/in_progress past due_at            -> 'overdue'
//   Pass 2: logbook occurrences > 7-day grace past due -> 'missed'
// Requires X-Job-Token (verify_jwt=false). Idempotent.
// No email digest yet (Phase 6). Writes one audit event per affected practice.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCronSecret } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const GRACE_DAYS = 7;

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    requireCronSecret(req);

    const db = createServiceClient();
    const nowIso = new Date().toISOString();
    const graceCutoff = new Date(Date.now() - GRACE_DAYS * 86400000).toISOString();

    // Pass 1: overdue.
    const { data: overdue, error: e1 } = await db
      .from("tasks")
      .update({ status: "overdue" })
      .lt("due_at", nowIso)
      .in("status", ["pending", "in_progress"])
      .select("id, practice_id");
    if (e1) throw e1;

    // Pass 2: missed (logbook occurrences beyond the grace period).
    const { data: missed, error: e2 } = await db
      .from("tasks")
      .update({ status: "missed" })
      .lt("due_at", graceCutoff)
      .eq("source_type", "logbook")
      .in("status", ["overdue", "pending", "in_progress"])
      .select("id, practice_id");
    if (e2) throw e2;

    // Aggregate counts per practice and write one audit event each.
    const perPractice = new Map<string, { overdue: number; missed: number }>();
    for (const t of overdue ?? []) {
      const c = perPractice.get(t.practice_id) ?? { overdue: 0, missed: 0 };
      c.overdue++; perPractice.set(t.practice_id, c);
    }
    for (const t of missed ?? []) {
      const c = perPractice.get(t.practice_id) ?? { overdue: 0, missed: 0 };
      c.missed++; perPractice.set(t.practice_id, c);
    }
    for (const [practiceId, counts] of perPractice) {
      await db.from("audit_logs").insert({
        practice_id: practiceId,
        entity_type: "scheduler_run",
        entity_id: practiceId,
        action: "scheduler_escalate",
        after_data: { overdue: counts.overdue, missed: counts.missed },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      overdue: overdue?.length ?? 0,
      missed: missed?.length ?? 0,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
  }
});
