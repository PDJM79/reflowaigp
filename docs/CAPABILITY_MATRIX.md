# ReflowAI GP — Capability Matrix

> **Generated from the real server-side middleware** in `server/routes.ts` — not aspirational.
> Regenerate after route changes. The Express middleware chain per route is the source of truth.

## Access tiers (from the middleware)

| Tier | Middleware | Who |
|------|-----------|-----|
| **Manager** | `requireManager` / `requireUserManager` | `isPracticeManager` **or** role &isin; {`practice_manager`, `cd_lead_gp`} |
| **Practice member** | `requireSamePractice` | any authenticated user whose session practice matches the URL practice (all roles) |
| **Authenticated** | `isAuthenticated` only | any signed-in user (not practice-scoped) |

Server enforcement is authoritative — a non-manager calling a Manager route gets **403** regardless of the client. Nav hiding is cosmetic only.

## Route groups &times; access  (count of guarded handlers per tier)

| Resource group | Manager-only | Practice-member | Auth-only |
|----------------|:---:|:---:|:---:|
| `ai` | — | 1 | — |
| `ai-tips` | — | 1 | — |
| `analytics` | — | 4 | — |
| `appraisals` | 2 | 1 | — |
| `audit-logs` | — | 1 | — |
| `auth` | — | 1 | 1 |
| `baseline-documents` | — | 2 | — |
| `baseline-snapshots` | — | 1 | — |
| `capabilities` | — | — | 1 |
| `claim-runs` | 1 | 5 | — |
| `cleaning-logs` | — | 2 | — |
| `cleaning-occurrences` | — | 1 | — |
| `cleaning-tasks` | — | 4 | — |
| `cleaning-zones` | — | 4 | — |
| `complaint-analysis` | — | 1 | — |
| `complaints` | — | 4 | — |
| `curated-logbooks` | — | 1 | — |
| `dbs-checks` | 3 | 1 | — |
| `employees` | — | 5 | — |
| `evidence` | — | 1 | — |
| `exports` | — | 2 | — |
| `fridge-occurrences` | — | 1 | — |
| `fridge-readings` | — | 3 | — |
| `fridge-units` | — | 3 | — |
| `governance-approvals` | 2 | 2 | — |
| `health` | — | — | 1 |
| `incidents` | — | 4 | — |
| `ipc-actions` | — | 1 | — |
| `ipc-audits` | — | 2 | — |
| `logbook-selections` | 3 | 1 | — |
| `medical-requests` | — | 3 | — |
| `month-end-scripts` | — | 2 | — |
| `my-day` | — | 1 | — |
| `notifications` | — | 2 | — |
| `overdue-count` | — | 1 | — |
| `policies` | — | 4 | — |
| `practice-roles` | 4 | 1 | — |
| `practices` | — | — | 4 |
| `process-instances` | — | 7 | — |
| `process-templates` | — | 4 | — |
| `review-queue` | 1 | — | — |
| `role-assignments` | 3 | 1 | — |
| `role-catalog` | — | — | 1 |
| `room-assessments` | 1 | 1 | — |
| `rooms` | — | 1 | — |
| `scheduling-settings` | 1 | 1 | — |
| `staff-roles` | — | 1 | — |
| `step-instances` | — | 3 | — |
| `tasks` | 2 | 7 | — |
| `training-analysis` | — | 1 | — |
| `training-records` | 1 | 5 | — |
| `training-types` | 2 | 1 | — |
| `unassigned-occurrences` | — | 1 | — |
| `user-practice-roles` | 2 | 1 | — |
| `users` | 2 | 5 | — |

## Kept-feature routes (this build) — applied tier per route

Registers/records follow the standard: **practice-member read, manager-or-owner write**.
Claim runs are the documented deviation — the month-end dispensing workflow is
practice-member write; only the governance **review** step is manager-gated.

| Feature | Route | Tier | Rationale |
|---------|-------|:---:|-----------|
| KF1 DBS | `GET /dbs-checks` | member | register read |
| KF1 DBS | `POST/PATCH/DELETE /dbs-checks` | manager | HR register write |
| KF2 Appraisal | `GET /appraisals` | member | history read |
| KF2 Appraisal | `POST/PATCH /appraisals` | manager | HR register write |
| KF3 Claim run | `GET/POST /claim-runs`, `PATCH /:id/submit`, `POST /:id/export` | member | dispensing workflow (deviation) |
| KF4 Training catalogue | `GET /training-types` | member | catalogue read |
| KF4 Training catalogue | `POST/PATCH /training-types`, `PATCH /training-records/:id/type` | manager | catalogue admin |
| KF5 Room assessment | `GET /room-assessments` | member | register read |
| KF5 Room assessment | `POST /room-assessments` | manager | register write (issue → remedial task) |
| KF6 Claim review | `GET /claim-runs/:id/reviews` | member | review history read |
| KF6 Claim review | `POST /claim-runs/:id/reviews` | manager | governance sign-off |

## Manager-only operations (staff &rarr; 403)

- `DELETE /api/practices/:id/dbs-checks/:id`
- `DELETE /api/practices/:id/governance-approvals/:id`
- `DELETE /api/practices/:id/logbook-selections/:id`
- `DELETE /api/practices/:id/practice-roles/:id/capabilities/:id`
- `DELETE /api/practices/:id/role-assignments/:id`
- `DELETE /api/practices/:id/user-practice-roles`
- `GET /api/practices/:id/review-queue`
- `PATCH /api/practices/:id/appraisals/:id`
- `PATCH /api/practices/:id/dbs-checks/:id`
- `PATCH /api/practices/:id/governance-approvals/:id`
- `PATCH /api/practices/:id/logbook-selections/:id`
- `PATCH /api/practices/:id/practice-roles/:id`
- `PATCH /api/practices/:id/scheduling-settings`
- `PATCH /api/practices/:id/training-records/:id/type`
- `PATCH /api/practices/:id/training-types/:id`
- `PATCH /api/practices/:id/users/:id`
- `POST /api/practices/:id/appraisals`
- `POST /api/practices/:id/claim-runs/:id/reviews`
- `POST /api/practices/:id/dbs-checks`
- `POST /api/practices/:id/logbook-selections`
- `POST /api/practices/:id/practice-roles`
- `POST /api/practices/:id/practice-roles/:id/capabilities`
- `POST /api/practices/:id/role-assignments`
- `POST /api/practices/:id/role-assignments/:id/contact`
- `POST /api/practices/:id/room-assessments`
- `POST /api/practices/:id/tasks/:id/approve`
- `POST /api/practices/:id/tasks/:id/reject`
- `POST /api/practices/:id/training-types`
- `POST /api/practices/:id/user-practice-roles`
- `POST /api/practices/:id/users`

_Totals: 152 guarded route handlers &mdash; 30 manager-only, 114 practice-member, 8 auth-only._
