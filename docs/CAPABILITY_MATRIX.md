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
| `audit-logs` | — | 1 | — |
| `auth` | — | — | 2 |
| `baseline-documents` | — | 2 | — |
| `baseline-snapshots` | — | 1 | — |
| `capabilities` | — | — | 1 |
| `claim-runs` | — | 1 | — |
| `cleaning-logs` | — | 2 | — |
| `cleaning-occurrences` | — | 1 | — |
| `cleaning-tasks` | — | 4 | — |
| `cleaning-zones` | — | 4 | — |
| `complaint-analysis` | — | 1 | — |
| `complaints` | — | 4 | — |
| `curated-logbooks` | — | 1 | — |
| `dbs-checks` | — | 2 | — |
| `employees` | — | 5 | — |
| `evidence` | — | 1 | — |
| `exports` | — | 2 | — |
| `fridge-occurrences` | — | 1 | — |
| `fridge-readings` | — | 3 | — |
| `fridge-units` | — | 3 | — |
| `governance-approvals` | 2 | 2 | — |
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
| `practices` | — | — | 3 |
| `process-instances` | — | 7 | — |
| `process-templates` | — | 4 | — |
| `review-queue` | 1 | — | — |
| `role-assignments` | 3 | 1 | — |
| `role-catalog` | — | — | 1 |
| `rooms` | — | 1 | — |
| `scheduling-settings` | 1 | 1 | — |
| `setup` | — | — | 1 |
| `staff-roles` | — | 1 | — |
| `step-instances` | — | 3 | — |
| `tasks` | 2 | 7 | — |
| `training-analysis` | — | 1 | — |
| `training-records` | — | 5 | — |
| `unassigned-occurrences` | — | 1 | — |
| `user-practice-roles` | 2 | 1 | — |
| `users` | 2 | 5 | — |

## Manager-only operations (staff &rarr; 403)

- `DELETE /api/practices/:id/governance-approvals/:id`
- `DELETE /api/practices/:id/logbook-selections/:id`
- `DELETE /api/practices/:id/practice-roles/:id/capabilities/:id`
- `DELETE /api/practices/:id/role-assignments/:id`
- `DELETE /api/practices/:id/user-practice-roles`
- `GET /api/practices/:id/review-queue`
- `PATCH /api/practices/:id/governance-approvals/:id`
- `PATCH /api/practices/:id/logbook-selections/:id`
- `PATCH /api/practices/:id/practice-roles/:id`
- `PATCH /api/practices/:id/scheduling-settings`
- `PATCH /api/practices/:id/users/:id`
- `POST /api/practices/:id/logbook-selections`
- `POST /api/practices/:id/practice-roles`
- `POST /api/practices/:id/practice-roles/:id/capabilities`
- `POST /api/practices/:id/role-assignments`
- `POST /api/practices/:id/role-assignments/:id/contact`
- `POST /api/practices/:id/tasks/:id/approve`
- `POST /api/practices/:id/tasks/:id/reject`
- `POST /api/practices/:id/user-practice-roles`
- `POST /api/practices/:id/users`

_Totals: 135 guarded route handlers &mdash; 20 manager-only, 107 practice-member, 8 auth-only._
