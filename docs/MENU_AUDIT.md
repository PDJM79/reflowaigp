# ReflowAI GP — Full Menu Audit

**Date:** 2026-07-04
**Method:** Real-user walk as practice manager against a seeded throwaway DB (full
Phase 0–3 stack). Each route navigated; rendered `innerText` + console errors
inspected. Note: the browser Supabase client points at the **real** Supabase
project, not the throwaway Postgres — so any page doing a direct
`supabase.from('table')` read hits RLS with no session-auth policy and returns
empty/errors, while Express-API pages show the seeded throwaway data. This is the
Phase 0 root cause and the discriminator used below.

## Legend
- **WORKS** — renders real data (or a legitimate empty state) via the Express API.
- **EMPTY** — renders but shows no data because of an RLS-dead direct-Supabase read
  (silent) — should have shown data.
- **ERROR** — direct-Supabase read fails with a visible error toast.
- **CRASHES** — blank/white render (React throw, no error boundary).
- **STUB** — deliberately unfinished feature.
- Fix size: **S** (client-only swap, route exists) · **M** (needs a new server
  route + storage) · **L** (larger feature).

## Audit table

| Route | Label | Manager | Status | Root cause | Fix |
|---|---|---|---|---|---|
| `/` | Home / Dashboard | ✓ | **WORKS** | API (Phase 0) — shows overdue/seeded tasks | — |
| `/tasks` | My Tasks | ✓ | **WORKS** | API (Phase 0) — seeded task visible | — |
| `/logbooks` | Logbooks | ✓ | **WORKS** | API (Phase 3) | — |
| `/schedule` | Schedule | ✓ | **WORKS** | API (Phase 3) — calendar renders | — |
| `/task-templates` | Task Templates | ✓ | **ERROR** "Failed to load templates" | direct `supabase.from('task_templates')` | S — GET process-templates exists |
| `/team` | Team | ✓ | **WORKS** | API (Phase 0/3) | — |
| `/reports` | Reports | ✓ | **WORKS** | API (Phase 0) | — |
| `/settings` | Settings | ✓ | **WORKS** | API (Phase 1 practice settings) | — |
| `/user-management` | User Management | ✓ | **WORKS** | API (Phase 0) — seeded users visible | — |
| `/cleaning` | Cleaning | ✓ | **WORKS** | API — seeded zone visible | — |
| `/cleaning/manage` | Manage Zones | ✓ | **WORKS** | API | — |
| `/dashboards/compliance` | Compliance | ✓ | **WORKS** | API (Phase 0) | — |
| `/dashboards/clinical` | Clinical Gov | ✓ | **WORKS** | API (Phase 0) | — |
| `/dashboards/patient-experience` | Patient Exp | ✓ | **WORKS** | API (Phase 0 fixed userData crash) | — |
| `/staff-self-service` | My Information | ✓ | **WORKS (empty state)** + STUB | legit "no employee record"; "My Documents" is a stub | S (empty ok) / hide docs stub |
| `/fridge-temps` | Fridge Temps | ✓ | **ERROR** "Failed to load logs" | direct-Supabase reading readings | S — fridge routes exist |
| `/medical-requests` | Medical Requests | ✓ | **ERROR** "Error loading requests" | direct-Supabase | M — no route yet |
| `/ipc` | IPC Audits | ✓ | **ERROR** "Failed to load IPC data" | direct-Supabase (ipc_audits) | M — no route yet |
| `/staff-roles` | Staff Roles | ✓ | **ERROR** "Failed to load staff data" | direct-Supabase | S — employees route exists |
| `/admin/reports` | (legacy) | url-only | **ERROR** "Failed to load report data" | direct-Supabase; duplicates `/reports` | remove (legacy dup, not in nav) |
| `/admin/calendar` | (legacy) | url-only | **ERROR** "Failed to load processes" | direct-Supabase; duplicates `/schedule` | remove (legacy dup, not in nav) |
| `/dashboards/workforce` | Workforce | ✓ | **CRASHES** (blank) | `workforceData.dbsChecks/employees` undefined at render; no loading guard | S — guard + real API data |
| `/month-end` | Month-End | ✓ | **EMPTY** | direct-Supabase (scripts) | M — no route yet |
| `/claims` | Claims | ✓ | **EMPTY** | direct-Supabase | M — no route yet |
| `/incidents` | Incidents | ✓ | **EMPTY** | direct-Supabase; incidents route exists | S |
| `/complaints` | Complaints | ✓ | **EMPTY** | direct-Supabase; complaints route exists | S |
| `/policies` | Policies | ✓ | **EMPTY** | direct-Supabase; policies route exists | S |
| `/policies/review-history` | Review History | ✓ | **EMPTY** | direct-Supabase | S |
| `/hr` | HR | ✓ | **EMPTY** | direct-Supabase (13 reads); employees+training routes exist | S/M |
| `/role-management` | Role Management | ✓ | **EMPTY** | direct-Supabase (role_catalog) | M — no route yet |
| `/risk-register` | Risk Register | ✓ | **EMPTY** | direct-Supabase | M — no route yet |
| `/room-assessments` | Room Assessments | ✓ | **EMPTY** | direct-Supabase | M — no route yet |
| `/processes` | Processes | ✓ | **EMPTY** | direct-Supabase via useTaskData (process_instances) | M |
| `/fire-safety` | Fire Safety | ✓ | **WORKS (renders)** | uses hooks; renders structure | verify |
| `/dashboards/environmental` | Environmental | ✓ | **EMPTY/renders** | GovernanceDashboard sibling; some direct-Supabase | verify |
| `/dashboards/governance` | Governance | ✓ | **EMPTY/renders** | direct-Supabase | M |
| `/dashboards` | Dashboards hub | ✓ | **WORKS** | static nav hub | — |
| `/email-logs` | Email Logs | ✓ | renders | to verify | verify |
| `/audit-logs` | Audit Logs | ✓ | renders | to verify | verify |
| `/email-reports-settings` | Email Reports | ✓ | to verify | — | verify |
| `/dashboards/compliance` PDF export | — | ✓ | WORKS (Phase 0 fixed hardcoded metrics) | — | — |

## Fix plan (priority order per brief)

**1. CRASH (fix outright):** `/dashboards/workforce` — add loading guard + drive
all cards from the employees/training API it already calls; remove undefined refs.

**2. ERROR pages with existing routes (S — client-only swap to API):**
`/task-templates`, `/fridge-temps`, `/staff-roles`, `/incidents`, `/complaints`,
`/policies` (+ review-history), `/hr`.

**3. DEAD/legacy (remove):** `/admin/reports`, `/admin/calendar` — legacy
duplicates of `/reports` and `/schedule`, not in the nav, both error. Remove routes
+ page files.

**4. Pages needing NEW server routes (M) — deferred this pass, documented:**
`/medical-requests`, `/ipc`, `/month-end`, `/claims`, `/role-management`,
`/risk-register`, `/room-assessments`, `/processes`, `/dashboards/governance`.
Each needs a new Express route + storage method before the client can be migrated;
batched as a follow-up to keep commits small and verifiable. They currently show a
visible error or empty state (no crash), so they are not user-trapping.

**5. STUB:** StaffSelfService "My Documents — coming soon" — hide the stub block
(document-upload is L; no dead-end).

## Decisions made autonomously
- **Scope:** fix the crash + all direct-Supabase pages whose Express route already
  exists (cheap, high-confidence) + remove the two legacy admin dupes, this pass.
  Pages requiring brand-new server routes are documented and deferred rather than
  half-built, to keep each commit small and verified (per the brief's "small
  commits" rule).
- **Legacy admin routes removed** rather than repaired: they duplicate working
  pages and aren't linked in the nav.

## Post-fix status + corrections (verified against a fresh bundle)

**Correction:** `/dashboards/workforce` is **NOT a crash** — the initial blank
reading was a 2-second-wait timing false positive. With a proper wait it renders a
real empty state via the employees/training API (WORKS). No fix needed.

**Fixed and verified in-browser (manager, seeded data):**
| Route | Before | After |
|---|---|---|
| `/task-templates` | ERROR "Failed to load templates"; creation silently failed (title/name) | WORKS — both seeded templates listed; create/edit/delete/duplicate via process-templates API |
| `/fridge-temps` (logs) | ERROR "Failed to load logs" (phantom temp_logs) | WORKS — logs section renders readings via fridge-readings API |
| `/incidents` | EMPTY (RLS-dead) | WORKS — seeded incident shown (Open 1 / Amber 1) |
| `/admin/reports`, `/admin/calendar` | ERROR (legacy dupes) | REMOVED (routes + pages) |

**Staff (GP) walk — no leakage:** GP nav shows only permitted items; **Logbooks**
and **User Management** are hidden; a GP `POST logbook-selections` returns **403**
(server-side gate), confirming manager-only enforcement beyond nav gating.

**Deferred (documented, not user-trapping — visible empty/error state, no crash).**
All are direct-Supabase reads; each needs a **new Express route + storage method**
(no existing endpoint) before the client can be migrated, so they were batched out
of this pass to keep commits small and verified:
- `/medical-requests`, `/ipc` (ipc_audits), `/month-end` (scripts), `/claims`,
  `/risk-register`, `/room-assessments`, `/processes`, `/dashboards/governance`.
- **Role-catalog system** (`/staff-roles`, `/role-management`): backed by
  `practice_roles`/`role_catalog`/`user_practice_roles` (Supabase-native RBAC) —
  needs a dedicated routes+storage layer; larger (M/L).
- `/complaints`, `/policies` (+review-history), `/hr`: existing routes exist
  (complaints/policies/employees/training) — cheap client-only swaps, next batch.
- `/fridge-temps` PDF **export** still reads `temp_logs` (export-only, not page load).

## Batch (a) recovery — deferred-page migration (fix/deferred-pages)

**Migrated to the Express API and verified in-browser with seeded data** (fresh
bundle `index-Czgtez8Y`, manager; GP spot-check = no leakage):
| Route | Before | After | Commit | Proof |
|---|---|---|---|---|
| `/complaints` | EMPTY (RLS-dead `complaints`) | WORKS — "Jane Doe" complaint shown; error state + retry | `bf389c6` | browser innerText |
| `/policies` | EMPTY (RLS-dead `policy_documents`) | WORKS — "Infection Control Policy" shown; acks degrade (no route) | `663deaa` | browser innerText |
| `/hr` | EMPTY (13 RLS-dead reads) | WORKS (core) — "Alice Nurse" staff + training via API; appraisals/leave/DBS degrade | `718bc80` | browser innerText |
| `/fridge-temps` (PDF export) | export read phantom `temp_logs` | export reads fridge-readings API; page now fully Supabase-free | `ceca00b` | code + page verified |

**Audit corrections (already working — over-flagged in the first walk):**
- `/risk-register` — uses the tasks + users API; renders (High Risk view). WORKS.
- `/room-assessments` — static page, no data reads. WORKS.
- `/processes` — uses the process-templates API. WORKS.

**Deferred with reasons (genuine blockers, per the "no schema changes" rule):**
- `/ipc` — **page↔Drizzle drift**: the page reads `period_month`/`period_year`/
  `location_scope` but the Drizzle `ipc_audits` defines `audit_date`/`audit_type`/
  `sections`. Needs a canonical-schema decision or a full page+detail rewrite —
  not a clean swap. **Needs your decision** on which shape is authoritative.
- `/medical-requests`, `/month-end`, `/dashboards/governance` — underlying tables
  (`medical_requests`, `month_end_scripts`, `governance_approvals`) exist in the
  live Supabase migrations but are **absent from the Drizzle schema**, so they
  don't exist in a `drizzle-kit push` DB and can't get storage methods without
  adding Drizzle table definitions = a schema-layer change (out of scope).
- `/claims` — reads `script_claim_runs`, not present in the Drizzle schema nor
  found in the migrations grep; same blocker.
- Governance additionally needs a `governance_approvals` **aggregation API**
  (its `useGovernanceApprovals` hook cross-reads several tables) — M/L.
- `/hr` mutations (DBS import, appraisal/training create) still use Supabase —
  they need `dbs_checks`/`appraisals`/`training_types` routes (those tables also
  absent from Drizzle). Page-load is migrated; write-paths deferred.

**Out of this batch's scope (not in the deferred-11, still direct-Supabase):**
`/settings` (MFA status read), `TaskDetail`/`StepExecution` (task-execution flow,
`process_instances`/`step_instances`), and the role-catalog batch
(`/staff-roles`, `/role-management`).

**Recommendation:** the remaining pages are blocked on schema-layer work (adding
Drizzle definitions for existing live tables) + one IPC schema decision. Suggest a
follow-up that (1) adds Drizzle defs for `medical_requests`, `month_end_scripts`,
`script_claim_runs`, `governance_approvals`, `dbs_checks`, `appraisals`,
`training_types` (describing existing live tables), then (2) builds their routes.
