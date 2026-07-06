// supabase/functions/send-overdue-digest/index.ts
// Phase 6 — daily manager digest of overdue/missed compliance occurrences.
// CRON-triggered (X-Job-Token). Follows the existing send-email-reports pattern:
// Resend + RESEND_API_KEY, createServiceClient, getPracticeManagersForPractice.
// Practices with zero overdue/missed are skipped (no noise).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { requireCronSecret } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getPracticeManagersForPractice } from "../_shared/capabilities.ts";

interface DigestRequest { practiceId?: string }

interface OverdueRow {
  id: string;
  title: string;
  module: string | null;
  status: string;
  due_at: string | null;
  importance: string | null;
}

const FROM = Deno.env.get("EMAIL_FROM") ?? "ReflowAI GP <compliance@fitforaudit.app>";

function classify(rows: OverdueRow[], nowMs: number) {
  let overdue = 0;
  let missed = 0;
  const items: OverdueRow[] = [];
  for (const r of rows) {
    const pastDue = r.due_at != null && new Date(r.due_at).getTime() < nowMs;
    const isMissed = r.status === "missed";
    const isOverdue = r.status === "overdue" || r.status === "rejected" ||
      (r.status !== "submitted_for_review" && pastDue);
    if (!isMissed && !isOverdue) continue;
    if (isMissed) missed++; else overdue++;
    items.push(r);
  }
  items.sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
  return { overdue, missed, items };
}

function renderHtml(practiceName: string, overdue: number, missed: number, items: OverdueRow[]): string {
  const rows = items.slice(0, 25).map((i) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(i.title)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(i.module ?? "")}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-transform:capitalize">${escapeHtml(i.status)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${i.due_at ? new Date(i.due_at).toLocaleDateString("en-GB") : ""}</td>
    </tr>`).join("");
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:640px">
    <h2 style="margin:0 0 4px">Daily compliance digest — ${escapeHtml(practiceName)}</h2>
    <p style="color:#6b7280;margin:0 0 16px">${overdue} overdue · ${missed} missed occurrence(s) need attention.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead><tr style="text-align:left;color:#6b7280">
        <th style="padding:6px 10px">Task</th><th style="padding:6px 10px">Module</th>
        <th style="padding:6px 10px">Status</th><th style="padding:6px 10px">Due</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${items.length > 25 ? `<p style="color:#6b7280">…and ${items.length - 25} more.</p>` : ""}
    <p style="color:#9ca3af;font-size:12px;margin-top:16px">Open My Day or the Review Queue in ReflowAI GP to action these.</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  try {
    requireCronSecret(req);
    const db = createServiceClient();
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const nowMs = Date.now();

    let target: string | null = null;
    if (req.body) {
      try { const b: DigestRequest = await req.json(); target = b.practiceId ?? null; } catch { /* body optional */ }
    }

    let pq = db.from("practices").select("id, name").eq("is_active", true);
    if (target) pq = pq.eq("id", target);
    const { data: practices, error: pErr } = await pq;
    if (pErr) throw pErr;

    const summary: Array<Record<string, unknown>> = [];
    for (const p of practices ?? []) {
      const { data: rows, error } = await db
        .from("tasks")
        .select("id, title, module, status, due_at, importance")
        .eq("practice_id", p.id)
        .not("status", "in", "(complete,closed)");
      if (error) throw error;

      const { overdue, missed, items } = classify((rows ?? []) as OverdueRow[], nowMs);
      if (overdue + missed === 0) { summary.push({ practice_id: p.id, skipped: "nothing overdue" }); continue; }

      const managers = await getPracticeManagersForPractice(db, p.id);
      const to = managers.map((m) => m.email).filter((e): e is string => !!e);
      if (to.length === 0) { summary.push({ practice_id: p.id, overdue, missed, skipped: "no manager email" }); continue; }

      const { error: sendErr } = await resend.emails.send({
        from: FROM,
        to,
        subject: `Compliance digest — ${overdue} overdue, ${missed} missed`,
        html: renderHtml(p.name ?? "Your practice", overdue, missed, items),
      });
      summary.push({ practice_id: p.id, overdue, missed, recipients: to.length, sent: !sendErr, error: sendErr?.message });
    }

    return new Response(JSON.stringify({ ok: true, practices: summary.length, summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

serve(handler);
