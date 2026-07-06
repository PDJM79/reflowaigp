# ReflowAI GP — Stub Triage (coming-soon dialogs vs curated coverage)

Coverage verified against the **real imported curated content** (29 sections / 92 logbooks)
in the DB, not filenames. Verdicts: **COVERED** (a curated logbook does the job once the
practice enables it → delete the dialog + entry point) · **PARTIAL** (curated covers the
recurring check; the dialog adds a register/record the engine lacks → keep, build the delta) ·
**NOT COVERED** (no curated equivalent → build candidate).

## Verdict table

| # | Dialog | Compliance need | Curated coverage | Verdict |
|---|--------|-----------------|------------------|---------|
| 1 | COSHH Assessment | Assess hazardous substances + storage | **GP-MOD-003 COSHH**: `GP-LB-003-001` Annual COSHH Assessment Review, `-002` Monthly COSHH Storage Inspection, `-003` Clinical Disinfectant/Chemical Audit, `-005` Health Surveillance | **COVERED → delete** |
| 2 | Fire Safety Assessment | Fire risk assessment | **GP-MOD-001**: `GP-LB-001-007` Annual Fire Risk Assessment Review (+ 8 fire logbooks: alarm/door/extinguisher/emergency-lighting/drill/services) | **COVERED → delete** |
| 3 | Fire Safety Action | Remediate a fire finding | Fire checks are curated (GP-MOD-001); ad-hoc remediation is the platform's generic adhoc-task / remedial pattern (same shape as the Phase 5 fridge-breach remedial task) | **COVERED → delete** |
| 4 | IPC Check | Record an IPC audit | **GP-MOD-022 IPC**: `GP-LB-022-001` Monthly Hand Hygiene Audit, `-002` Monthly Clinical Environment Cleanliness Audit, `-003` Annual IPC Audit | **COVERED → delete** (also dead: no entry point) |
| 5 | IPC Action | Remediate an IPC finding | IPC checks curated (GP-MOD-022) + `GP-LB-022-004` Outbreak/Significant Infection Incident Log + generic adhoc remedial task | **COVERED → delete** (also dead) |
| 6 | Room Management (cleaning) | Manage cleaning rooms/zones | **Live Cleaning zone/task management** (Phase 5 `/cleaning/manage`, `cleaning-zones`/`cleaning-tasks` routes) — the real, working path | **COVERED → delete** |
| 7 | Room Assessment | Annual per-room assessment | Recurring room-type checks are curated (`GP-LB-022-002` cleanliness, `GP-LB-013-001` Weekly Premises/Security Check, `GP-LB-029-004` Quarterly Decontamination-Room Inspection) but there is **no single per-room annual assessment register**; `/room-assessments` page is itself a stub | **PARTIAL → build** (dead stub; delta = per-room assessment register) |
| 8 | Appraisal | Annual staff appraisals done | `GP-LB-028-004` Annual Appraisal & Revalidation Confirmation Log covers the **compliance confirmation**; a per-employee appraisal **record/history** is the delta | **PARTIAL → build** |
| 9 | DBS Tracking | Track staff DBS checks | `GP-LB-028-001` DBS Check Register (triennial) covers the recurring **register review**; the DBS **record CRUD** is the delta — a `/dbs-checks` route already exists (GET) to back it | **PARTIAL → build** |
| 10 | Training Catalogue | Manage training **types** | No curated training module exists in the 29 sections; `training-records` route exists but not a training-**type** catalogue | **NOT COVERED → build** |
| 11 | Claim Review | Manual claim-review checklist | No claims/reimbursement section in the curated library (compliance ≠ claims) | **NOT COVERED → build** (dead stub) |
| 12 | Script Claim Run | Create a month-end claim run | No curated claims/dispensing-reimbursement content; `claim-runs` route exists (GET only) | **NOT COVERED → build** |

## Summary
- **COVERED → DELETE (6):** COSHH, Fire Safety Assessment, Fire Safety Action, IPC Check, IPC Action, Room Management.
- **PARTIAL → BUILD (3):** Room Assessment, Appraisal, DBS Tracking.
- **NOT COVERED → BUILD (3):** Training Catalogue, Claim Review, Script Claim Run.

## Build list (NOT-COVERED + PARTIAL), recommended priority

| Priority | Item | Verdict | Minimal build spec | Size |
|----------|------|---------|--------------------|------|
| 1 | **DBS Tracking** | PARTIAL | Wire the register to the **existing** `/dbs-checks` route (add POST/PATCH); add/edit records with expiry; the curated register-review logbook already drives the recurring prompt | **S** |
| 2 | **Appraisal** | PARTIAL | Per-employee appraisal record + history view (dates, outcome, next-due); reuse `employees`; add an `appraisals` read/write path; curated logbook already confirms cadence | **M** |
| 3 | **Script Claim Run** | NOT COVERED | Claim-run creation: add POST to `claim-runs` (period, type, totals) + PDF via the Phase 6 export engine; a dispensing-workflow feature, not compliance | **M** |
| 4 | **Training Catalogue** | NOT COVERED | `training_types` table (currently phantom — no migration) + routes; catalogue CRUD; then wire `training-records` to typed entries | **M** |
| 5 | **Room Assessment** | PARTIAL | Per-room annual assessment register on the (currently-stub) `/room-assessments` page + `room-assessments` routes; recurring room checks stay curated | **M** |
| 6 | **Claim Review** | NOT COVERED | Manual claim-review checklist/workflow tied to a claim run (depends on #3); lowest priority — reimbursement QA, not a compliance gate | **L** |

**Reasoning for order:** DBS/Appraisal first — they have curated compliance prompts *and* partial backing routes, so they close a real audit gap cheaply. Script Claim Run + Training Catalogue next — genuine missing features with a partial route/table story. Room Assessment mid — needs a page rebuild. Claim Review last — depends on the claims workflow and is QA rather than a compliance requirement.
