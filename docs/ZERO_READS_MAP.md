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
