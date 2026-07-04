/**
 * Phase 2 integration test (throwaway Postgres).
 *
 * Drives the SAME pure planner the edge function uses (planGeneration) against a
 * real database, mirroring the edge function's upsert, then exercises the
 * escalator SQL. Asserts exact rows, double-run idempotency, closure skip/shift,
 * applicability gating, overdue/missed escalation, and scheduler_enabled gating.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/phase2IntegrationTest.ts
 */
import pg from "pg";
import { planGeneration, type SelectionInput, type PracticeInfo, type RoleAssignment, type ApplicableTo } from "../supabase/functions/_shared/schedulerCore.ts";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL });
let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`  ${cond ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
}

// Mirror the edge function's upsert using pg (ON CONFLICT DO NOTHING via the unique index).
async function generateFor(practiceId: string, fromISO: string, toISO: string) {
  const p = (await pool.query(
    `SELECT id, timezone, is_dispensing, is_branch FROM practices WHERE id=$1 AND metadata->>'scheduler_enabled'='true'`, [practiceId]
  )).rows[0];
  if (!p) return { generated: 0, skipped: true }; // scheduler not enabled

  const practice: PracticeInfo = { id: p.id, timezone: p.timezone, isDispensing: p.is_dispensing, isBranch: p.is_branch };

  const sels = (await pool.query(`
    SELECT s.id, s.curated_logbook_id, s.is_enabled, s.ad_hoc_only, s.cadence_override,
           s.preferred_day, s.preferred_date, s.due_window_hours, s.early_start_hours,
           s.importance, s.default_assignee_id, s.default_assignee_role, s.next_review_date, s.created_at,
           cl.cadence, cl.applicable_to, cl.title, cs.name AS module
    FROM practice_logbook_selections s
    JOIN curated_logbooks cl ON cl.id = s.curated_logbook_id
    JOIN curated_sections cs ON cs.id = cl.section_id
    WHERE s.practice_id=$1 AND s.is_enabled=true`, [practiceId])).rows;

  const selections: SelectionInput[] = sels.map((s) => ({
    id: s.id, curatedLogbookId: s.curated_logbook_id, title: s.title, module: s.module,
    cadence: s.cadence, cadenceOverride: s.cadence_override,
    applicableTo: (s.applicable_to ?? ["all"]) as ApplicableTo[],
    preferredDay: s.preferred_day, preferredDate: s.preferred_date,
    dueWindowHours: s.due_window_hours, earlyStartHours: s.early_start_hours,
    importance: s.importance, defaultAssigneeId: s.default_assignee_id, defaultAssigneeRole: s.default_assignee_role,
    anchorDate: (s.created_at instanceof Date ? s.created_at.toISOString() : String(s.created_at)).slice(0, 10),
    isEnabled: s.is_enabled, adHocOnly: s.ad_hoc_only, nextReviewDate: s.next_review_date ? String(s.next_review_date).slice(0, 10) : null,
  }));

  // Bespoke is_scheduled process_templates (second source).
  const PF_TO_CADENCE: Record<string, string | null> = { daily: "daily", weekly: "weekly", monthly: "monthly", quarterly: "quarterly", six_monthly: "six_monthly", annually: "annual", twice_daily: null };
  const templates = (await pool.query(`SELECT id, name, module, frequency, due_window_hours, early_start_hours, importance, default_assignee_id, default_assignee_role, created_at FROM process_templates WHERE practice_id=$1 AND is_scheduled=true`, [practiceId])).rows;
  for (const t of templates) {
    const cadence = PF_TO_CADENCE[t.frequency];
    if (!cadence) continue;
    selections.push({
      id: t.id, sourceKind: "template", curatedLogbookId: "", title: t.name, module: t.module ?? "compliance",
      cadence: cadence as any, cadenceOverride: null, applicableTo: ["all"], preferredDay: null, preferredDate: null,
      dueWindowHours: t.due_window_hours ?? 24, earlyStartHours: t.early_start_hours ?? 12, importance: t.importance,
      defaultAssigneeId: t.default_assignee_id, defaultAssigneeRole: t.default_assignee_role,
      anchorDate: (t.created_at instanceof Date ? t.created_at.toISOString() : String(t.created_at)).slice(0, 10),
      isEnabled: true, adHocOnly: false, nextReviewDate: null,
    });
  }

  const roles: RoleAssignment[] = (await pool.query(`SELECT role, user_id FROM role_assignments WHERE practice_id=$1`, [practiceId])).rows
    .map((r) => ({ role: r.role, userId: r.user_id }));
  const closures = new Set<string>((await pool.query(`SELECT closure_date::text AS d FROM practice_closure_dates WHERE practice_id=$1`, [practiceId])).rows
    .map((c) => c.d));

  const { rows, counts } = planGeneration({ practice, selections, roleAssignments: roles, closures, fromISO, toISO });

  for (const r of rows) {
    if (r.selectionId) {
      await pool.query(`
        INSERT INTO tasks (practice_id, selection_id, source_type, title, module, scheduled_date, due_at, visible_from, status, importance, assignee_id, metadata)
        VALUES ($1,$2,'logbook',$3,$4,$5,$6,$7,'pending',$8,$9,$10)
        ON CONFLICT (selection_id, scheduled_date) WHERE selection_id IS NOT NULL AND scheduled_date IS NOT NULL DO NOTHING`,
        [r.practiceId, r.selectionId, r.title, r.module, r.scheduledDate, r.dueAt, r.visibleFrom, r.importance, r.assigneeId, JSON.stringify({ curated_logbook_id: r.curatedLogbookId })]);
    } else if (r.templateId) {
      await pool.query(`
        INSERT INTO tasks (practice_id, template_id, source_type, title, module, scheduled_date, due_at, visible_from, status, importance, assignee_id, metadata)
        VALUES ($1,$2,'logbook',$3,$4,$5,$6,$7,'pending',$8,$9,$10)
        ON CONFLICT (template_id, scheduled_date) WHERE template_id IS NOT NULL AND scheduled_date IS NOT NULL AND source_type='logbook' DO NOTHING`,
        [r.practiceId, r.templateId, r.title, r.module, r.scheduledDate, r.dueAt, r.visibleFrom, r.importance, r.assigneeId, JSON.stringify({ steps_source: "template" })]);
    }
  }
  return { generated: counts.generated, skipped: false, counts };
}

async function main() {
  const c = (code: string) => pool.query(`SELECT id FROM curated_logbooks WHERE code=$1`, [code]).then((r) => r.rows[0].id);

  // ── Seed: a dispensing practice with scheduler enabled ──────────────────────
  const PID = "33333333-3333-3333-3333-333333333333";
  const PID_OFF = "44444444-4444-4444-4444-444444444444";
  await pool.query(`DELETE FROM tasks WHERE practice_id IN ($1,$2)`, [PID, PID_OFF]);
  await pool.query(`DELETE FROM practice_logbook_selections WHERE practice_id IN ($1,$2)`, [PID, PID_OFF]);
  await pool.query(`DELETE FROM practice_closure_dates WHERE practice_id IN ($1,$2)`, [PID, PID_OFF]);
  await pool.query(`DELETE FROM practices WHERE id IN ($1,$2)`, [PID, PID_OFF]);
  await pool.query(`INSERT INTO practices (id,name,country,timezone,is_dispensing,metadata)
    VALUES ($1,'Sched Practice','england','Europe/London',true,'{"scheduler_enabled":true}'::jsonb)`, [PID]);
  await pool.query(`INSERT INTO practices (id,name,country,timezone,is_dispensing,metadata)
    VALUES ($1,'Disabled Practice','england','Europe/London',true,'{}'::jsonb)`, [PID_OFF]);

  // Selections spanning cadences. anchorDate comes from created_at; force it via update.
  const ANCHOR = "2026-01-05"; // Monday
  async function addSelection(logbookCode: string, cadenceOverride: string | null, opts: { day?: number; date?: number; practice?: string } = {}) {
    const clid = await c(logbookCode);
    const pid = opts.practice ?? PID;
    const row = (await pool.query(`
      INSERT INTO practice_logbook_selections (practice_id, curated_logbook_id, is_enabled, cadence_override, preferred_day, preferred_date, created_at)
      VALUES ($1,$2,true,$3,$4,$5, $6::timestamptz) RETURNING id`,
      [pid, clid, cadenceOverride, opts.day ?? null, opts.date ?? null, ANCHOR + "T00:00:00Z"])).rows[0];
    return row.id;
  }

  // Use real logbooks but override cadence to get deterministic coverage.
  await addSelection("GP-LB-001-001", "daily");                       // daily
  await addSelection("GP-LB-001-002", "weekly", { day: 1 });          // weekly Monday
  await addSelection("GP-LB-001-003", "monthly", { date: 6 });        // monthly 6th
  await addSelection("GP-LB-001-004", "quarterly", { date: 5 });      // quarterly from Jan (anchor)
  await addSelection("GP-LB-001-005", "annual", { date: 5 });         // annual Jan 5
  await addSelection("GP-LB-001-006", "termly", { date: 5 });         // termly Jan/May/Sep 5
  // A dispensing-only selection on the DISABLED practice would never run; also add one
  // dispensing-only to a NON-dispensing practice check below via a separate practice.

  console.log("\n=== Test 1: exact-rows generation for a fixed date (2026-05-05, a Tuesday) ===");
  // 2026-05-05: daily yes; weekly(Mon) no; monthly(6th) no; quarterly(Jan+3=Apr, +... ) -> May is anchor+4 (no, quarterly=every3: Jan,Apr,Jul); annual(Jan) no; termly(Jan,May,Sep 5th) YES on May 5.
  await generateFor(PID, "2026-05-05", "2026-05-05");
  let rows = (await pool.query(`SELECT title, scheduled_date::text, source_type, status FROM tasks WHERE practice_id=$1 ORDER BY title`, [PID])).rows;
  const titles = rows.map((r) => r.title).sort();
  check("daily + termly generate on 2026-05-05, nothing else", titles.length === 2, `got ${titles.length}: ${titles.join(" | ")}`);
  check("all rows are source_type=logbook, status=pending", rows.every((r) => r.source_type === "logbook" && r.status === "pending"));

  console.log("\n=== Test 2: double-run same date => zero new rows (idempotency) ===");
  const before = (await pool.query(`SELECT count(*)::int n FROM tasks WHERE practice_id=$1`, [PID])).rows[0].n;
  await generateFor(PID, "2026-05-05", "2026-05-05");
  const after = (await pool.query(`SELECT count(*)::int n FROM tasks WHERE practice_id=$1`, [PID])).rows[0].n;
  check("second run inserts 0 new rows", before === after, `before=${before} after=${after}`);

  console.log("\n=== Test 3: closure skip (daily) and shift (monthly) ===");
  await pool.query(`DELETE FROM tasks WHERE practice_id=$1`, [PID]);
  await pool.query(`INSERT INTO practice_closure_dates (practice_id, closure_date, reason) VALUES ($1,'2026-05-06','Bank holiday')`, [PID]);
  // 2026-05-06 is a Wednesday: daily would generate but is a closure -> skip; monthly(6th) -> shift to 05-07.
  await generateFor(PID, "2026-05-06", "2026-05-06");
  rows = (await pool.query(`SELECT title, scheduled_date::text FROM tasks WHERE practice_id=$1 ORDER BY scheduled_date`, [PID])).rows;
  const dailyOnClosure = rows.find((r) => r.scheduled_date === "2026-05-06" && r.title.includes("Fire Alarm"));
  const monthlyShifted = rows.find((r) => r.scheduled_date === "2026-05-07");
  check("daily is skipped on the closure day", !dailyOnClosure, `rows: ${rows.map(r=>r.scheduled_date).join(",")}`);
  check("monthly shifts to the next open day (2026-05-07)", !!monthlyShifted);

  console.log("\n=== Test 4: applicability gating — non-dispensing practice ===");
  // Add a dispensing-only selection to a NON-dispensing practice and confirm no rows.
  await pool.query(`UPDATE practices SET is_dispensing=false WHERE id=$1`, [PID_OFF]);
  await pool.query(`UPDATE practices SET metadata='{"scheduler_enabled":true}'::jsonb WHERE id=$1`, [PID_OFF]);
  // GP-LB-023-* medicines/CD are dispensing-relevant; but applicable_to is data-driven.
  // Pick a logbook whose applicable_to includes 'dispensing' only. Find one:
  const dispLb = (await pool.query(`SELECT code FROM curated_logbooks WHERE applicable_to = ARRAY['dispensing']::text[] LIMIT 1`)).rows[0];
  if (dispLb) {
    await addSelection(dispLb.code, "daily", { practice: PID_OFF });
    await generateFor(PID_OFF, "2026-05-05", "2026-05-05");
    const n = (await pool.query(`SELECT count(*)::int n FROM tasks WHERE practice_id=$1`, [PID_OFF])).rows[0].n;
    check("dispensing-only selection generates nothing for non-dispensing practice", n === 0, `rows=${n}`);
    // Now flip to dispensing and confirm it DOES generate.
    await pool.query(`UPDATE practices SET is_dispensing=true WHERE id=$1`, [PID_OFF]);
    await generateFor(PID_OFF, "2026-05-05", "2026-05-05");
    const n2 = (await pool.query(`SELECT count(*)::int n FROM tasks WHERE practice_id=$1`, [PID_OFF])).rows[0].n;
    check("same selection generates once practice is dispensing", n2 === 1, `rows=${n2}`);
  } else {
    check("found a dispensing-only curated logbook to test gating", false, "none with applicable_to = {dispensing}");
  }

  console.log("\n=== Test 5: scheduler_enabled=false => nothing generates ===");
  await pool.query(`UPDATE practices SET metadata='{}'::jsonb WHERE id=$1`, [PID_OFF]);
  await pool.query(`DELETE FROM tasks WHERE practice_id=$1`, [PID_OFF]);
  const res = await generateFor(PID_OFF, "2026-05-05", "2026-05-05");
  check("generation skips practice when scheduler_enabled is not true", res.skipped === true);
  const n3 = (await pool.query(`SELECT count(*)::int n FROM tasks WHERE practice_id=$1`, [PID_OFF])).rows[0].n;
  check("no rows created for disabled practice", n3 === 0, `rows=${n3}`);

  console.log("\n=== Test 6: overdue escalator (Pass 1) and missed (Pass 2) ===");
  await pool.query(`DELETE FROM tasks WHERE practice_id=$1`, [PID]);
  const nowIso = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
  // one overdue-eligible (pending, due yesterday), one missed-eligible (logbook, due 10d ago), one fresh (future due)
  const selId = (await pool.query(`SELECT id FROM practice_logbook_selections WHERE practice_id=$1 LIMIT 1`, [PID])).rows[0].id;
  await pool.query(`INSERT INTO tasks (practice_id, title, source_type, status, due_at, scheduled_date, selection_id) VALUES
    ($1,'overdue-me','logbook','pending',$2,'2026-05-01',$4),
    ($1,'missed-me','logbook','pending',$3,'2026-04-20',NULL),
    ($1,'fresh','logbook','pending', now() + interval '2 days','2026-05-30',NULL)`,
    [PID, yesterday, tenDaysAgo, selId]);
  // Pass 1
  await pool.query(`UPDATE tasks SET status='overdue' WHERE due_at < $1 AND status IN ('pending','in_progress')`, [nowIso]);
  // Pass 2
  const graceCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  await pool.query(`UPDATE tasks SET status='missed' WHERE due_at < $1 AND source_type='logbook' AND status IN ('overdue','pending','in_progress')`, [graceCutoff]);
  const st = (await pool.query(`SELECT title, status FROM tasks WHERE practice_id=$1 ORDER BY title`, [PID])).rows;
  const byTitle = Object.fromEntries(st.map((r) => [r.title, r.status]));
  check("recently-overdue task -> 'overdue'", byTitle["overdue-me"] === "overdue", `got ${byTitle["overdue-me"]}`);
  check("past-grace logbook task -> 'missed'", byTitle["missed-me"] === "missed", `got ${byTitle["missed-me"]}`);
  check("future-due task stays 'pending'", byTitle["fresh"] === "pending", `got ${byTitle["fresh"]}`);

  console.log("\n=== Test 7: is_scheduled process_template as a second source ===");
  await pool.query(`DELETE FROM tasks WHERE practice_id=$1`, [PID]);
  await pool.query(`DELETE FROM process_templates WHERE practice_id=$1 AND name='Scheduled PPM'`, [PID]);
  const tmpl = (await pool.query(`
    INSERT INTO process_templates (practice_id, name, module, frequency, responsible_role, is_scheduled, due_window_hours, early_start_hours, created_at)
    VALUES ($1,'Scheduled PPM','estates','daily','estates_lead',true,24,12,'2026-01-05T00:00:00Z') RETURNING id`, [PID])).rows[0].id;
  await generateFor(PID, "2026-05-05", "2026-05-05");
  const tRows = (await pool.query(`SELECT title, template_id, selection_id, source_type FROM tasks WHERE practice_id=$1 AND template_id=$2`, [PID, tmpl])).rows;
  check("scheduled template generates a task with template_id set, selection_id null", tRows.length === 1 && tRows[0].selection_id === null, `rows=${tRows.length}`);
  check("template task is source_type=logbook", tRows[0]?.source_type === "logbook");
  // idempotency on the template index
  await generateFor(PID, "2026-05-05", "2026-05-05");
  const tCount = (await pool.query(`SELECT count(*)::int n FROM tasks WHERE practice_id=$1 AND template_id=$2`, [PID, tmpl])).rows[0].n;
  check("template source is idempotent (double-run => 1 row)", tCount === 1, `count=${tCount}`);

  console.log(`\n${failures === 0 ? "\x1b[32mALL INTEGRATION CHECKS PASSED\x1b[0m" : `\x1b[31m${failures} CHECK(S) FAILED\x1b[0m`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error("Integration test error:", e.message); await pool.end(); process.exit(1); });
