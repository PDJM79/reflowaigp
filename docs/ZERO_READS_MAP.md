# Batch (c) Step 0 — Zero direct-Supabase reads: reconciliation + work order

> Written before any code. Establishes what batch (a) actually finished vs left, and
> the **definitive** remaining `supabase.from()` surface with per-item fix size. This
> list — not the old reports/todo — is the work order for Step 1.

## Reconciliation: what batch (a) actually did

Batch (a) commits on `fix/deferred-pages` (verified via `git log`):
complaints (list), policies (list), HR (**partial** — staff + training core), fridge
(×2: readings + PDF export), incidents (list), task-templates dialog (→ process-templates),
removed legacy `/admin/calendar` + `/admin/reports`.

**It did NOT touch Claims, IPC, MedicalRequests, MonthEndScripts, GovernanceDashboard,
StepExecution, TaskDetail, Cleaning, Settings/MFA, or the cross-cutting hooks.** The old
todo item "New routes+migrate: … ipc, medical-requests, claims, month-end, processes,
governance dashboard" was marked done but the code shows otherwise — those files still
read Supabase directly. The batch-(b) RBAC report's "deferred" list was correct.

## Definitive remaining surface

`grep -rn "supabase.from(" src/` → **32 files**, plus 7 files using `supabase.rpc` /
`functions.invoke`. Grouped by **table cluster** (one route-set serves multiple files).
Drizzle coverage checked per table (`0` = needs a read-def added, batch-(b) technique;
no ALTER to the real table).

| # | Cluster / table(s) | Drizzle? | Route today? | Client files | Fix size |
|---|--------------------|----------|--------------|--------------|----------|
| 1 | `process_instances` | yes | **none** | ShowProcessDialog, useTaskData, UserDashboard, StepExecution(part), TaskDetail(part), OrganizationSetup(part) | routes+storage list/get/create/update; migrate readers — **M** |
| 2 | `step_instances`, `evidence` | yes | none | StepExecution, TaskDetail | new storage+routes; **StepExecution = logbook completion, round-trip verify** — **L** |
| 3 | `governance_approvals` | **no** | none | GovernanceDashboard, useGovernanceApprovals, BulkApprovalDialog | Drizzle def + routes + migrate — **M** |
| 4 | `medical_requests` | **no** | none | MedicalRequests, AssignGPDialog, MedicalRequestDialog, RequestDetailDialog | Drizzle def + routes + migrate — **M** |
| 5 | `script_claim_runs` | **no** | none | Claims | Drizzle def + route — **S** |
| 6 | `month_end_scripts` | **no** | none | MonthEndScripts | Drizzle def + route — **S** |
| 7 | `ipc_audits`, `ipc_actions` | yes (drift) | none | IPC | reconcile `period_month` drift + routes — **M** |
| 8 | `baseline_documents`, `baseline_snapshots` | **no** | none | BaselineCreateDialog, BaselineComparatorCard (+ rpc/functions) | Drizzle def + routes — **M** |
| 9 | `training_types` (no), `dbs_checks` (yes) | mixed | training-records ✓ | HR (remaining) | def training_types + routes — **S** |
| 10 | **phantom/wrong-table bugs** | — | target routes exist | EditFridgeDialog(`fridges`→fridge_units), RemedialActionDialog(`temp_logs`→fridge-readings), TaskDialog(`task_templates`→process-templates) | cheap swaps, fix real bug — **S** |
| 11 | cross-cutting reads | yes | mixed | usePracticeSelection(`practices` list), useAuditLogs(`audit_logs`), NotificationCenter(`notifications`✓), ViewComplaintsDialog(`complaints`✓), PracticeSwitcher(`practices`), ReadyForAudit, PracticeScoresCard | routes where missing; migrate — **M** |
| 12 | **MFA / security** | `user_auth_sensitive`(no) + rpc/functions | none | Settings, MFAVerificationDialog, MFASetupDialog, DisableMFADialog | security-sensitive; server path for MFA secrets — **M**, careful |
| 13 | scheduler `role_assignments`(✓) + `role_assignment_contacts`(no) | mixed | role-assignments ✓ | admin/RoleManagement | **access path only, zero behaviour change**; def contacts — **S** |
| 14 | **OrganizationSetup** (Step 2) | mixed | — | signup/provisioning flow | own part, own doc, signup-context server path — **L** |

Fix size: S ≈ one route + one client file; M ≈ route-set + 2–4 files; L ≈ new storage+routes + round-trip/signup verification.

## Execution order (Step 1, then Step 2)

1. **Cheap swaps / phantom-table bugs** (#10, #11 where routes exist) — fastest, fixes real bugs.
2. **In-Drizzle, need routes** (#1 process_instances, #2 step/evidence, #7 IPC, #9 dbs, audit_logs).
3. **Not-in-Drizzle, add read-defs + routes** (#3 governance, #4 medical, #5 claims, #6 month-end, #8 baseline, #9 training_types, #12 MFA, #13 contacts).
4. **#2 StepExecution** — after its routes exist, verify a full step-completion round trip.
5. **Step 2 — OrganizationSetup** (#14) — map writes, build signup-context server path (service-role **server-only**), migrate, full signup E2E. Stop-and-document if it needs an auth redesign.

## Notes / autonomous calls
- Tables absent from Drizzle are **described** (read-defs matching prod columns), never ALTERed — same rule as batch (b).
- Phantom-table reads (`fridges`, `temp_logs`, `task_templates`) are pre-existing **bugs** (client reads a table the API doesn't write); migrating them fixes the bug.
- Genuinely empty/unseedable tables get honest empty states, noted — no fabricated data.
- `admin/RoleManagement` scheduler migration must keep Phase-2 role-resolution tests green.

---

## RESULTS (interim — this batch)

**`supabase.from(` surface: 32 → 7 files** (25 migrated, ~78%). All migrations
typecheck-clean; every new route curl-verified against the throwaway DB returning
correct rows/counts; `/staff-roles` re-verified rendering live in-browser.

### Routes/storage added
`fridge-readings` PATCH; `audit-logs` (filtered/paginated/user-joined);
`process-instances` (list/get/create/update, `?details=1` join); `medical-requests`
(GET/POST/PATCH); `governance-approvals` (GET/POST/PATCH/DELETE, mutations manager-gated);
`month-end-scripts` (GET/POST); `claim-runs` (GET); `rooms` (GET); `ipc-audits`
(GET/POST) + `ipc-actions` (GET); `dbs-checks` (GET/POST). Drizzle **read-defs** added
(no ALTER): `medical_requests`, `governance_approvals`, `month_end_scripts`.

### Migrated (25): commits 3229dfe…45be8ee
Dialogs: EditFridge, RemedialAction, TaskDialog, ViewComplaints, AssignGP,
MedicalRequest, RequestDetail, BulkApproval. Pages: MedicalRequests, Claims,
MonthEndScripts, IPC, Settings, HR, GovernanceDashboard. Hooks: useAuditLogs,
usePracticeSelection, useTaskData, useGovernanceApprovals. Components:
PracticeSwitcher, NotificationCenter, ReadyForAudit, PracticeScoresCard,
UserDashboard, ShowProcessDialog, CleaningDashboard.

### Phantom-table bugs fixed (client read/wrote non-existent tables/columns)
`fridges`→fridge_units; `temp_logs`→fridge_readings (no outcome col → folded into
action_taken); `task_templates`→process_templates (name→title); `script_claim_runs`
→claim_runs; IPC `period_month/period_year`→audit_date (documented drift);
`training_types` (no migration anywhere) → exports pass empty set; `month_end_scripts.removed`
(no col) → degrades. All noted as autonomous calls.

### Browser-verify caveat (honest)
Server correctness is curl-proven (e.g. medical-requests returns 2 seeded rows) and
warm in-browser `fetch` returns the same. Under the **dev vite-proxy + fetch-login**
harness, data pages that fire many concurrent fetches on mount (e.g. MedicalRequests)
can lose a cookie-propagation race at first paint and render empty until warm — a
harness artifact, not a code defect (identical pattern to the live-verified `/staff-roles`).
A real single-origin login sets the cookie before any SPA fetch. Flagged for a
production-login recheck.

## REMAINING 7 files — deliberately deferred to focused work (per spec's own cautions)
1. `pages/StepExecution.tsx` — logbook completion flow; needs new `step_instances`
   + `evidence` storage/routes **and a full completion round-trip verification**. Sizable.
2. `pages/TaskDetail.tsx` — same step/evidence surface as (1); do together.
3. `components/baseline/BaselineCreateDialog.tsx`, `BaselineComparatorCard.tsx` —
   `baseline_documents`/`baseline_snapshots` (not in Drizzle) **+ `supabase.rpc`/functions**;
   needs read-defs + an RPC replacement.
4. `components/admin/RoleManagement.tsx` — scheduler `role_assignments` +
   `role_assignment_contacts`; **access-path only, zero behaviour change**, and Phase-2
   scheduler role-resolution tests must stay green — warrants its own verified commit.
5. `components/auth/MFAVerificationDialog.tsx` — `user_auth_sensitive` + MFA
   `rpc`/functions. **Security-sensitive**; must not weaken the MFA trust boundary.
6. `components/auth/OrganizationSetup.tsx` — **Step 2**: signup/provisioning flow with
   an explicit STOP condition (needs a server-only service-role signup path, not the
   manager-gated API). Highest-risk hotspot; its own part by design.

Plus `supabase.rpc`/`functions.invoke` (edge functions, distinct from the `.from(` gate)
remain in: OrganizationSetup, baseline×2, MFASetupDialog, DisableMFADialog,
useGovernanceNotifications, Policies.

---

## FINAL RESULTS — the remaining 7 completed (this session)

**Table-read gate: `grep -rn "supabase.from(" src/` → ZERO.** Every direct table
read/write in the app is gone. (StepExecution's 3 remaining `.from('evidence')` are
`supabase.storage.from('evidence')` — file buckets, not tables.)

### Per-item (commits 11f1460 … fb38769)
| Item | Before | After | Verified |
|------|--------|-------|----------|
| StepExecution + TaskDetail | step_instances/evidence/process_instances direct | new step-instances + evidence routes/storage (practice-scoped via parent PI); process-instances routes | **round-trip**: complete step w/ note → persists on reload → process auto-completes; evidence create/delete; cross-practice PATCH→403 |
| baseline ×2 | baseline_snapshots/documents direct + rpc | read-defs + routes; table reads migrated | typecheck; compute edge-fns deferred (documented) |
| admin/RoleManagement | role_assignments/contacts direct | access-path-only routes (?detailed=1, POST/DELETE, contact) | **scheduler suite 47/47 green** (behaviour unchanged) |
| MFA ×3 | client read `mfa_secret` + edge fn | server-only verify/enable/disable; secret never leaves server | enable→verify(valid)→wrong-code(invalid)→wrong-pw(401)→disable, audited |
| OrganizationSetup | 8 table writes + 3 provisioning edge fns | `POST /api/setup/provision` (signup-context) | **signup E2E**: register→provision→practice+manager+RBAC+templates+instances+setup_completed→manager logs in→reaches /logbooks |

### Gates
- **Table reads:** ZERO `supabase.from(`. ✓
- **Scheduler:** 47/47 (cadence 21 + schedulerCore 26). ✓
- **Round-trip:** logbook step completion persists + process completes. ✓
- **MFA:** secret server-only; verify/enable/disable proven. ✓
- **Signup:** full provisioning E2E; new practice appears in the login dropdown. ✓
- **Real-login recheck (cookie-race question):** RESOLVED. The empty-data pages seen
  under the vite-dev-proxy were a **dev-proxy artifact** — the proxy serves SPA-fallback
  HTML for the initial `/api` request burst, so `res.json()` throws. On **Express
  single-origin** (production-equivalent), `/api/practices` returns JSON and
  `/medical-requests` renders both seeded rows (New 1 / Assigned 1 / Total 2). Not a
  code defect. **No app-code retry/guard added** (per instruction — don't mask with retries).

### STOP-condition (OrganizationSetup): did NOT fire
Express session-auth signup (`/api/auth/register`) already exists, so provisioning moved
to a signup-context route with no auth-model redesign. Deliberate skips: `auto-provision-practice`
(best-effort edge seed), `user_contact_details` (absent from all migrations; email already on `users`).

## Remaining (NOT `supabase.from(` — separate concerns, honestly out of this gate)
- **`supabase.functions.invoke` (9):** email/AI-compute edge SERVICES — Policies review/
  escalation emails (4), governance approval emails (2), baseline create/process/compute (3).
  The Express server has **no email/AI/Supabase connectivity**; faithful replication needs
  that infra. **Not stubbed** — a no-op would silently break notifications. Separate edge-port effort.
- **`supabase.storage` (file buckets):** StepExecution/Cleaning/baseline photo+file uploads.
  File-storage infra, distinct from the DB-reads gate.
