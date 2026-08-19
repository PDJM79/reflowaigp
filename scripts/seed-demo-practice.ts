/**
 * Seed a permanent, re-runnable DEMO practice on prod (doubles as the Stage-6 smoke data).
 *
 * Re-runnable: wipes ONLY the demo practice's own data (matched by name) then recreates it.
 * Touches nothing outside "Demo Medical Practice".
 *
 * Usage:
 *   DATABASE_URL=<prod pooler DSN> NODE_EXTRA_CA_CERTS=./cert.pem.crt npx tsx scripts/seed-demo-practice.ts
 *
 * Requires role_catalog to be seeded (migration 20260722100000_seed_role_catalog.sql).
 */
import pg from "pg";
import bcrypt from "bcryptjs";

const DEMO_NAME = "Demo Medical Practice";
const DEMO_EMAIL_DOMAIN = "demo-medical.example";
const PROJECT_REF = "fmixseikbpirsuuwxizw";
const FN_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1`;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

// ── connection (mirror server/db.ts: strip sslmode, provide Supabase CA) ───────────────
const dbUrl = DATABASE_URL.replace(/([?&])sslmode=[^&]*&/gi, "$1").replace(/[?&]sslmode=[^&]*$/gi, "");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const q = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;
const one = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows[0];
const rand = () => Math.random();
const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)];
function tempPassword(): string {
  // meets onboarding policy: lower+upper+digit+special, >=12
  const s = Math.random().toString(36).slice(2, 8);
  return `Demo!${s.charAt(0).toUpperCase()}${s.slice(1)}${Math.floor(rand() * 90 + 10)}`;
}
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };

// users.role enum -> role_catalog role_key (the two parallel role systems)
const ROSTER: { key: string; name: string; role: string; catalog: string; manager?: boolean }[] = [
  { key: "manager",   name: "Morgan Bailey",  role: "practice_manager", catalog: "practice_manager", manager: true },
  { key: "nurselead", name: "Priya Sharma",   role: "nurse_lead",       catalog: "practice_nurse" },
  { key: "nurse",     name: "Tom Fletcher",   role: "nurse",            catalog: "practice_nurse" },
  { key: "hca",       name: "Aisha Khan",     role: "hca",              catalog: "hca_phleb" },
  { key: "reception", name: "Dan Whitmore",   role: "reception_lead",   catalog: "receptionist" },
  { key: "cleaner",   name: "Elena Costa",    role: "cleaner",          catalog: "estates_cleaner" },
  { key: "estates",   name: "Raj Patel",      role: "estates_lead",     catalog: "deputy_pm" },
];

// keyword -> users.role for logbook/section default_assignee_role (sensible spread)
function assigneeForSection(code: string, name: string): string {
  const n = (name + " " + code).toLowerCase();
  if (/(cleaning|waste|decontamin|pest|environmental)/.test(n)) return "cleaner";
  if (/(fridge|cold)/.test(n)) return "estates_lead";
  if (/(fire|electric|gas|loler|pssr|height|radon|tree|premises|security|water|legionella|asbestos|coshh|vehicle|noise)/.test(n)) return "estates_lead";
  if (/(ipc|infection|medicine|cds|device|first.aid|occupational|clinical)/.test(n)) return "nurse";
  if (/(information|governance|regulatory|registration)/.test(n)) return "manager_role";
  if (/(manual|dse|lone|contractor|health.and.safety|first)/.test(n)) return "estates_lead";
  return "reception_lead";
}
const ROLE_ENUM: Record<string, string> = {
  manager_role: "practice_manager", nurse: "nurse", cleaner: "cleaner", estates_lead: "estates_lead", reception_lead: "reception_lead",
};

async function main() {
  await client.connect();
  const log = (m: string) => console.log(`  ${m}`);
  const creds: { role: string; name: string; email: string; password: string }[] = [];

  // ── Vault: pull edge_cron_secret for the scheduler call ──────────────────────────────
  let cronSecret: string | null = null;
  try {
    const r = await one(`select decrypted_secret v from vault.decrypted_secrets where name='edge_cron_secret'`);
    cronSecret = r?.v ?? null;
  } catch { /* vault may be inaccessible */ }

  // ── 1. WIPE existing demo practice data (idempotent) ─────────────────────────────────
  console.log("\n[1] Wipe existing demo data");
  const existing = await q(`select id from practices where name=$1`, [DEMO_NAME]);
  for (const p of existing) {
    const pid = p.id;
    // delete in FK-safe order
    await q(`delete from fridge_readings where practice_id=$1`, [pid]);
    await q(`delete from fridge_units where practice_id=$1`, [pid]);
    await q(`delete from cleaning_logs where practice_id=$1`, [pid]);
    await q(`delete from cleaning_tasks where practice_id=$1`, [pid]);
    await q(`delete from cleaning_zones where practice_id=$1`, [pid]);
    await q(`delete from step_instances si using process_instances pi where si.process_instance_id=pi.id and pi.practice_id=$1`, [pid]);
    await q(`delete from process_instances where practice_id=$1`, [pid]);
    await q(`delete from tasks where practice_id=$1`, [pid]);
    await q(`delete from practice_logbook_selections where practice_id=$1`, [pid]);
    await q(`delete from user_practice_roles where practice_id=$1`, [pid]);
    await q(`delete from practice_role_capabilities prc using practice_roles pr where prc.practice_role_id=pr.id and pr.practice_id=$1`, [pid]);
    await q(`delete from practice_roles where practice_id=$1`, [pid]);
    await q(`delete from role_assignments where practice_id=$1`, [pid]);
    await q(`delete from employees where practice_id=$1`, [pid]);
    await q(`delete from users where practice_id=$1`, [pid]);
    await q(`delete from practice_modules where practice_id=$1`, [pid]);
    await q(`delete from practices where id=$1`, [pid]);
    log(`removed prior demo practice ${pid}`);
  }

  // ── 2. Create practice (dispensing + branch + all scheduler flags) ───────────────────
  console.log("[2] Create practice + manager");
  const practice = await one(
    `insert into practices (name, country, regulator, is_dispensing, is_branch, timezone, is_active,
        onboarding_stage, onboarding_completed_at, address, postcode, contact_email, contact_name, metadata)
     values ($1,'england','cqc', true, true,'Europe/London', true,'completed', now(),
        '1 Demo Health Way, Testerton','TE5 7ER', $2, 'Morgan Bailey',
        '{"scheduler_enabled":true,"cleaning_scheduling_enabled":true,"fridge_scheduling_enabled":true}'::jsonb)
     returning id`, [DEMO_NAME, `manager@${DEMO_EMAIL_DOMAIN}`]);
  const pid = practice.id;
  log(`practice ${pid} (dispensing+branch, all scheduling flags on)`);

  const MODULES = ["compliance","fire_safety","ipc","hr_training","policies","complaints","cleaning","hr","fridge_temps"];
  for (const m of MODULES) await q(`insert into practice_modules (practice_id, module_name, is_enabled) values ($1,$2,true)`, [pid, m]);

  // ── 3. Staff roster (dual role systems + role_assignments with user_id) ──────────────
  console.log("[3] Staff roster + roles");
  const userIdByKey: Record<string, string> = {};
  const roleAssignmentUser: Record<string, string> = {}; // users.role enum -> user id
  for (const m of ROSTER) {
    const pw = tempPassword();
    const hash = await bcrypt.hash(pw, 10);
    const email = `${m.key}@${DEMO_EMAIL_DOMAIN}`;
    const u = await one(
      `insert into users (practice_id, name, email, password_hash, role, is_practice_manager, is_active)
       values ($1,$2,$3,$4,$5,$6,true) returning id`,
      [pid, m.name, email, hash, m.role, !!m.manager]);
    userIdByKey[m.key] = u.id;
    roleAssignmentUser[m.role] = u.id;
    creds.push({ role: m.role, name: m.name, email, password: pw });

    // RBAC: enable the catalog role for the practice + assign to the user
    const rc = await one(`select id from role_catalog where role_key=$1`, [m.catalog]);
    if (rc) {
      const pr = await one(
        `insert into practice_roles (practice_id, role_catalog_id, is_active) values ($1,$2,true)
         on conflict (practice_id, role_catalog_id) do update set is_active=true returning id`, [pid, rc.id]);
      await q(`insert into user_practice_roles (practice_id, user_id, practice_role_id) values ($1,$2,$3)
               on conflict do nothing`, [pid, u.id, pr.id]);
    }
    // role_assignments WITH user_id so the scheduler can resolve this role -> user
    await q(`insert into role_assignments (practice_id, role, user_id, assigned_name) values ($1,$2,$3,$4)`,
      [pid, m.role, u.id, m.name]);
    log(`${m.role.padEnd(16)} ${m.name} <${email}>`);
  }
  const assigneeUser = (roleEnum: string) => roleAssignmentUser[roleEnum] ?? userIdByKey["manager"];

  // ── 4. Enable the full curated estate (92 logbooks) with default_assignee_role ───────
  console.log("[4] Enable curated logbooks");
  const logbooks = await q(
    `select l.id, l.code, l.cadence::text as cadence, s.name as section, s.code as scode
       from curated_logbooks l join curated_sections s on s.id=l.section_id`);
  let enabled = 0;
  for (const lb of logbooks) {
    const roleTok = assigneeForSection(lb.scode, lb.section);
    const roleEnum = ROLE_ENUM[roleTok] ?? "reception_lead";
    const requiresReview = /(fire|ipc|legionella|medicine|cds)/i.test(lb.section); // some need manager sign-off
    await q(
      `insert into practice_logbook_selections
         (practice_id, curated_logbook_id, is_enabled, default_assignee_role, requires_review)
       values ($1,$2,true,$3,$4)
       on conflict (practice_id, curated_logbook_id) do update set is_enabled=true`,
      [pid, lb.id, roleEnum, requiresReview]);
    enabled++;
  }
  log(`${enabled} curated logbooks enabled`);

  // ── 5. Cleaning zones + tasks, and fridges ───────────────────────────────────────────
  console.log("[5] Cleaning + fridges");
  const zones = [
    ["Reception & Waiting", "public"], ["Consulting Room 1", "clinical"], ["Treatment Room", "clinical"],
    ["Staff Room", "staff"], ["Patient WC", "sanitary"], ["Dispensary", "clinical"],
  ];
  for (const [zn, zt] of zones) {
    const z = await one(`insert into cleaning_zones (practice_id, zone_name, zone_type, is_active) values ($1,$2,$3,true) returning id`, [pid, zn, zt]);
    const tasks: [string, string][] = [["Damp-dust surfaces", "daily"], ["Clean & disinfect floors", "daily"], ["Deep clean", "weekly"]];
    for (const [tn, fr] of tasks) {
      await q(`insert into cleaning_tasks (practice_id, zone_id, task_name, frequency, is_active, requires_photo, default_assignee_role)
               values ($1,$2,$3,$4,true,$5,'cleaner')`, [pid, z.id, tn, fr, fr === "weekly"]);
    }
  }
  await one(`insert into fridge_units (practice_id, name, location, min_temp, max_temp, is_active, reading_frequency)
             values ($1,'Vaccine Fridge A','Treatment Room','2.0','8.0',true,'daily') returning id`, [pid]);
  await one(`insert into fridge_units (practice_id, name, location, min_temp, max_temp, is_active, reading_frequency)
             values ($1,'Vaccine Fridge B','Dispensary','2.0','8.0',true,'twice_daily') returning id`, [pid]);
  log("6 cleaning zones (18 tasks), 2 fridges (daily + twice_daily)");

  // ── 6. Generate: backfill the last 7 days + today via the real scheduler edge fn ─────
  console.log("[6] Generate occurrences (scheduler edge function, 7-day backfill)");
  if (!cronSecret) {
    log("!! edge_cron_secret not in Vault — cannot call scheduler; generation SKIPPED");
  } else {
    const res = await fetch(`${FN_BASE}/scheduler-generate-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Job-Token": cronSecret },
      body: JSON.stringify({ practice_id: pid, from: isoDate(daysAgo(7)), to: isoDate(new Date()) }),
    });
    log(`scheduler-generate-tasks -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const genCount = (await one(`select count(*)::int n from tasks where practice_id=$1 and source_type in ('logbook','cleaning','fridge')`, [pid]))?.n ?? 0;
  log(`generated ${genCount} occurrences`);

  // ── 7. Back-dated realistic history (direct: the scheduler backfill only emits TODAY's
  //     occurrences, so the last ~14 days of logbook occurrences are inserted directly with
  //     authentic back-dated timestamps and a realistic status mix). ─────────────────────
  console.log("[7] Backfill shaped history (last 14 days)");
  const sels = await q(
    `select s.id sel_id, coalesce(s.default_assignee_role,'reception_lead') role, l.title, sec.name module
       from practice_logbook_selections s
       join curated_logbooks l on l.id = s.curated_logbook_id
       join curated_sections sec on sec.id = l.section_id
      where s.practice_id=$1 and s.is_enabled`, [pid]);
  let onTime = 0, late = 0, overdue = 0, missed = 0, hist = 0;
  for (const s of sels) {
    const n = 1 + (rand() < 0.4 ? 1 : 0); // 1-2 past occurrences per selection
    for (let k = 0; k < n; k++) {
      const sd = daysAgo(1 + Math.floor(rand() * 14));
      const due = new Date(`${isoDate(sd)}T12:00:00Z`);
      const assignee = assigneeUser(s.role);
      const r = rand();
      let status = "complete", completedAt: string | null = null;
      if (r < 0.75) { status = "complete"; completedAt = new Date(due.getTime() - 2 * 3600e3).toISOString(); onTime++; }
      else if (r < 0.85) { status = "complete"; completedAt = new Date(due.getTime() + 8 * 3600e3).toISOString(); late++; }
      else if (r < 0.95) { status = "overdue"; overdue++; }
      else { status = "missed"; missed++; }
      const ins = await q(
        `insert into tasks (practice_id, selection_id, source_type, title, module, scheduled_date, slot,
             due_at, visible_from, status, importance, assignee_id, completed_at, metadata)
         values ($1,$2,'logbook',$3,$4,$5,'',$6,$7,$8,'medium',$9,$10, jsonb_build_object('seed','history'))
         on conflict (selection_id, scheduled_date, slot) do nothing returning id`,
        [pid, s.sel_id, s.title, s.module, isoDate(sd), due.toISOString(),
         new Date(due.getTime() - 12 * 3600e3).toISOString(), status, assignee, completedAt]);
      if (ins[0]) hist++;
    }
  }
  log(`inserted ${hist} past occurrences: ${onTime} on-time, ${late} late, ${overdue} overdue, ${missed} missed`);

  // Review workflow: 2 submitted-for-review (today) + 1 rejected redo
  const todayPending = await q(
    `select id from tasks where practice_id=$1 and source_type in ('logbook','cleaning')
       and scheduled_date=current_date and status='pending' order by id limit 3`, [pid]);
  if (todayPending[0]) await q(`update tasks set status='submitted_for_review', submitted_for_review_at=now() - interval '2 hours' where id=$1`, [todayPending[0].id]);
  if (todayPending[1]) await q(`update tasks set status='submitted_for_review', submitted_for_review_at=now() - interval '1 hour' where id=$1`, [todayPending[1].id]);
  const rej = await q(`select id from tasks where practice_id=$1 and source_type='logbook' and status='complete' order by scheduled_date desc limit 1`, [pid]);
  if (rej[0]) await q(`update tasks set status='rejected', completed_at=null, rejected_reason='Photo evidence unclear — please re-check and resubmit.', reviewed_by=$2, reviewed_at=now() where id=$1`, [rej[0].id, userIdByKey["manager"]]);
  log(`review: 2 submitted-for-review, 1 rejected redo`);

  // ── 8. One out-of-range fridge reading -> open remedial task ─────────────────────────
  console.log("[8] Fridge breach + remedial");
  const fridgeA = await one(`select id, name from fridge_units where practice_id=$1 and name like 'Vaccine Fridge A%'`, [pid]);
  if (fridgeA) {
    await q(`insert into fridge_readings (practice_id, fridge_id, reading_date, temperature, recorded_by, is_out_of_range)
             values ($1,$2, now() - interval '3 hours', '11.4', $3, true)`, [pid, fridgeA.id, assigneeUser("estates_lead")]);
    await q(
      `insert into tasks (practice_id, title, module, source_type, status, importance, assignee_id, due_at, scheduled_date, metadata)
       values ($1, $2, 'fridge','adhoc','pending','high',$3, now() + interval '4 hours', current_date,
               jsonb_build_object('fridgeUnitId',$4::text,'reason','temperature_breach'))`,
      [pid, `Remedial: ${fridgeA.name} temperature breach (11.4°C)`, assigneeUser("estates_lead"), fridgeA.id]);
    log("Vaccine Fridge A: 11.4°C breach logged + open high-priority remedial task");
  }

  // ── Report ───────────────────────────────────────────────────────────────────────────
  const summary = await one(
    `select
       (select count(*) from practice_logbook_selections where practice_id=$1 and is_enabled) enabled_logbooks,
       (select count(*) from tasks where practice_id=$1) total_tasks,
       (select count(*) from tasks where practice_id=$1 and status='complete') completed,
       (select count(*) from tasks where practice_id=$1 and status='overdue') overdue,
       (select count(*) from tasks where practice_id=$1 and status='missed') missed,
       (select count(*) from tasks where practice_id=$1 and status='submitted_for_review') for_review,
       (select count(*) from tasks where practice_id=$1 and status='rejected') rejected,
       (select count(*) from tasks where practice_id=$1 and status='pending') pending`, [pid]);

  console.log("\n════════════ DEMO PRACTICE SEEDED ════════════");
  console.log(`practice_id : ${pid}`);
  console.log(`summary     : ${JSON.stringify(summary)}`);
  console.log("\nCREDENTIALS (record now — not stored in plaintext anywhere):");
  for (const c of creds) console.log(`  ${c.role.padEnd(17)} ${c.email.padEnd(34)} ${c.password}`);
  console.log("═══════════════════════════════════════════════\n");

  await client.end();
}
main().catch(async (e) => { console.error("SEED FAILED:", e); try { await client.end(); } catch {} process.exit(1); });
