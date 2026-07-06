# ReflowAI GP — Stub Disposition (Phase 7 Step 6)

Final sweep of user-visible stubs (`coming soon` / `not yet available` / disabled-without-explanation).
Each is either **fixed**, **disclosed** (non-silent — tells the user, doesn't pretend to work),
or an **honest empty state**. No stub fails silently.

## Fixed this phase
| Component | Was | Now |
|-----------|-----|-----|
| `dashboard/AIComplianceScores.tsx` | called an unwired `ai/compliance-scores` edge fn → "coming soon" | **Wired to `/analytics/compliance` + `/analytics/module-breakdown`** — shows real compliance, fit-for-audit, per-module scores; edge dependency retired; has a Retry affordance. |

## Disclosed feature stubs (non-silent — toast on interaction, feature deferred)
These entry points do **not** persist anything and **do not** fail silently — clicking shows a
"this feature will be available in a future update" toast. Each needs its own endpoint/table, so
building them is a dedicated feature effort beyond a polish phase. Listed for tracking:

- `coshh/COSHHAssessmentDialog.tsx` — COSHH assessment save
- `fire-safety/FireSafetyAssessmentDialog.tsx`, `FireSafetyActionDialog.tsx`, `FireRiskWizard.tsx` — fire assessments/actions
- `hr/AppraisalDialog.tsx`, `Feedback360Dialog.tsx`, `TrainingCatalogueDialog.tsx` — HR appraisals/360/catalogue seeding
- `ipc/IPCCheckDialog.tsx`, `IPCActionDialog.tsx` — IPC check/action recording
- `rooms/RoomAssessmentDialog.tsx`, `cleaning/RoomManagementDialog.tsx` — room assessment/management
- `claims/ClaimReviewDialog.tsx`, `scripts/ScriptClaimRunDialog.tsx` — claim review/run
- `modules/cleaning/CleaningWeeklyGrid.tsx` — cleaning grid PDF export (superseded by the Phase 6 CSV/PDF export engine)

## Honest empty states (kept — clearly labelled, not a broken control)
- `dashboards/ComplianceOverview.tsx` — "Framework-level scoring (HIW/CQC/QOF) is not yet available" — labelled future feature.
- `dashboards/EnvironmentalDashboard.tsx` — cleaning/fridge panels state "not yet available via API" (data now exists; wiring is a follow-up, not a silent failure).
- `pages/IPCAuditDetail.tsx`, `pages/RoomAssessments.tsx` — labelled future-feature notes.
- `pages/ResetPassword.tsx` — "email reset not yet available; contact your administrator" (actionable disclosure).
- `policies/PolicyAcknowledgmentDialog.tsx` — "document viewing not yet available through the API" (disclosure).

## Dead duplicates (not rendered — no user impact)
`src/components/cleaning/CleaningTaskLibrary.tsx`, `CleaningZoneEditor` and siblings are **not imported**
anywhere (the live copies are under `src/modules/cleaning/`, used by `CleaningDashboard`). Left in place
(removing dead files is out of scope for this phase); they are unreachable, so not user-visible.

## Verdict
Zero **silent** stubs remain. The one concrete build target the phase called out (AIComplianceScores) is
wired to the real analytics engine. Remaining items are disclosed feature deferrals or honest empty states,
each enumerated above with its decision.
