# RBAC Surface Map — Batch (b) Step 0

> Written **before** any code, per the batch (b) contract. Purpose: map where role
> data lives, who reads it, and — critically — **where the 403 enforcement actually
> reads role data from**, so we can prove the client migration cannot regress it.
> No schema changes: we are moving the **access path**, not redesigning RBAC.

## 1. The tables (real columns, from `supabase/migrations/`)

| Table | Scope | Columns | Notes |
|-------|-------|---------|-------|
| `role_catalog` | **Global** (not practice-scoped) | `id, role_key (unique), display_name, category (clinical\|admin\|governance\|it\|support\|pcn), default_capabilities capability[], description, created_at, updated_at` | Master list of granular roles. Read-only from the UI (no metadata editing anywhere). |
| `practice_roles` | Practice | `id, practice_id→practices, role_catalog_id→role_catalog, is_active, created_at, updated_at` — UNIQUE(practice_id, role_catalog_id) | A practice "enabling" a catalog role. Toggled active/inactive. |
| `practice_role_capabilities` | Practice-role | `id, practice_role_id→practice_roles, capability, created_at` — UNIQUE(practice_role_id, capability) | Per-practice capability **overrides** on top of catalog defaults. |
| `user_practice_roles` | User×practice-role | `id, practice_id→practices, user_id→users, practice_role_id→practice_roles, created_at, updated_at` — UNIQUE(user_id, practice_role_id) | Assigns a user to an enabled practice role. |

**Row counts:** These four tables are **not** in the Drizzle schema, so the push-built
throwaway DB does not contain them until this batch adds Drizzle definitions (matching
the existing prod shape — a *description*, not an ALTER). Prod row counts are not
observable from this environment. Under session-auth the browser Supabase client is
RLS-dead against them (no policies for session users), which is exactly why both pages
show empty/throwaway data today.

The `capability` type is a Postgres enum with 37 values, mirrored on the client as
`Capability` / `ALL_CAPABILITIES` in `src/types/roles.ts`. The server models the columns
as `text` (reads return the same strings; no enum needed for a read path).

## 2. Every client `supabase.from()` reader of these tables (8 files)

| File | Tables touched | Role in the app | Reads / Mutations |
|------|----------------|-----------------|-------------------|
| `src/hooks/useCapabilities.tsx` | `user_practice_roles`, `practice_role_capabilities` | **App-wide client nav gating** | Read only. Managers bypass entirely (static `ALL_CAPABILITIES`); only **non-managers** hit the DB → today they get an empty set under session-auth, so staff nav is silently blank. |
| `src/hooks/useRoleCatalog.tsx` | `role_catalog`, `practice_roles`, `practice_role_capabilities`, `user_practice_roles` | Powers **/role-management** + `useUserRoleAssignment` sub-hook | Read catalog + practice roles; mutate `practice_roles.is_active` (enable/disable), add/remove capability overrides; assign/unassign `user_practice_roles`. |
| `src/components/admin/StaffRoleAssignmentTable.tsx` | `users`(nested), `practice_roles`, `user_practice_roles` | Powers **/staff-roles** | Read staff + their roles + practice roles; insert/delete `user_practice_roles`. |
| `src/components/admin/UserManagementDialog.tsx` | `user_practice_roles` | Add/edit user dialog | Read + insert/delete role assignments (Phase 0 already falls back to core roles when catalog unavailable). |
| `src/components/auth/OrganizationSetup.tsx` | `role_catalog`, `practice_roles`, `user_practice_roles` | **Onboarding** | Read catalog; insert practice_roles + user_practice_roles when a practice is created. |
| `src/components/dashboard/UserDashboard.tsx` | `user_practice_roles` | Dashboard role display | Read only. |
| `src/components/roles/RolePicker.tsx` | `role_catalog` | Reusable role picker | Read only. |
| `src/hooks/useTaskData.tsx` | `user_practice_roles` | Task assignee role display | Read only. |

## 3. Where the 403s actually come from — the make-or-break check ✅ CONFIRMED SAFE

**Enforcement does NOT read the RBAC catalog tables at all.**

- Server middleware `requireManager` and `requireUserManager` (`server/routes.ts:43-68`)
  both compute permission as:
  `currentUser.isPracticeManager || USER_MANAGER_ROLES.has(currentUser.role)`
  where `currentUser` comes from `storage.getUser(session.userId, session.practiceId)` —
  i.e. the **`users` table** (`users.role` enum + `users.is_practice_manager` boolean),
  the session-auth identity.
- `grep -rn "practice_roles|role_catalog|user_practice_roles" server/` returns **nothing**.
  The server never touches these tables.

**Conclusion:** the RBAC catalog is a **parallel, client-only display/config system**.
Server 403 enforcement rides entirely on `users.role` / `users.is_practice_manager`.
Therefore migrating the *client access path* of the role-catalog pages **cannot regress
the 403s** — enforcement doesn't read the tables we're moving. No enforcement path reads
through the client. Proceeding is safe. (`useCapabilities` gates *nav visibility* on the
client only; it is cosmetic, not a security boundary.)

## 4. `role_assignments` vs `user_practice_roles` — **PARALLEL SYSTEMS** (decision for Phil)

These are two disjoint systems that both associate users with "roles":

| | `role_assignments` (Phase 2) | `user_practice_roles` (RBAC catalog) |
|--|------------------------------|--------------------------------------|
| In Drizzle? | Yes | No (added this batch as a read description) |
| Keyed by | `user_role` enum (`practice_manager`, `gp`, `nurse`, …) | `practice_role_id` → `role_catalog.role_key` (37 granular roles) |
| Payload | `assignedName, assignedEmail, userId` | just the FK triple |
| Consumed by | Phase 2 scheduler default-assignee resolution (role → user) | `useCapabilities` nav gating + the two role pages |
| Purpose | "who is *the* nurse for auto-assigning tasks" | "which granular capability-roles does this user hold" |

They use **different key spaces** (coarse `user_role` enum vs granular catalog `role_key`)
and serve **different purposes** (scheduler assignee vs capability/nav gating). They are
**parallel systems, not the same data**. 

**⚠️ Consolidation decision flagged for Phil — NOT actioned in this batch:** whether to
unify these into one role model. This batch deliberately does **not** touch
`role_assignments` and does **not** unify them. Moving access path only.

## 5. Plan (no schema changes; PATCH-metadata intentionally omitted)

Because **no UI edits `role_catalog` metadata** (RoleManagement only toggles
`practice_roles.is_active`), the spec's optional "PATCH role metadata" route is **not
built** ("only if the UI genuinely edits it today" — it does not).

1. **Server foundation:** add Drizzle read-descriptions for the 4 tables (columns as
   `text`/arrays, matching prod), storage methods, and Express routes:
   - `GET  /api/role-catalog` (auth) — global catalog
   - `GET  /api/practices/:pid/practice-roles` (auth+samePractice) — enabled roles + catalog join
   - `POST /api/practices/:pid/practice-roles` (manager) — enable a catalog role
   - `PATCH /api/practices/:pid/practice-roles/:id` (manager) — set `is_active`
   - `POST/DELETE /api/practices/:pid/practice-roles/:id/capabilities` (manager) — overrides
   - `GET  /api/practices/:pid/user-practice-roles?userId=` (auth+samePractice)
   - `POST/DELETE /api/practices/:pid/user-practice-roles` (manager) — assign/unassign
   - `GET  /api/practices/:pid/staff-roles` (auth+samePractice) — users + their roles for the table
   - `GET  /api/capabilities` (auth) — current session user's computed capabilities + roles
2. **Migrate the 8 readers** onto the routes with loading/empty/error states. Role
   assign/unassign gets a **confirmation dialog** + an **audit event** (existing pattern).
3. **Verification gate + zero-direct-reads grep proof.**

---

## 6. RESULTS (post-implementation)

### Routes added (all under the existing `requireManager`/`requireSamePractice` gates)
`GET /api/role-catalog` · `GET/POST /api/practices/:pid/practice-roles` ·
`PATCH /api/practices/:pid/practice-roles/:id` ·
`POST/DELETE /api/practices/:pid/practice-roles/:id/capabilities` ·
`GET/POST/DELETE /api/practices/:pid/user-practice-roles` ·
`GET /api/practices/:pid/staff-roles` · `GET /api/capabilities`.
PATCH-role-metadata was **not** built (no UI edits catalog metadata).

### Files migrated (7 of 8 readers)
`useCapabilities`, `useRoleCatalog` (+`useUserRoleAssignment`),
`StaffRoleAssignmentTable`, `UserManagementDialog`, `RolePicker` — moved to the API.
`useTaskData` / `UserDashboard` — the RLS-dead `user_practice_roles` PM lookup was
removed (always fell through to the `is_practice_manager` flag; behaviour unchanged).

### 1 reader deliberately NOT migrated — **OrganizationSetup.tsx**
It is the **signup/provisioning** flow: it writes `practice_roles` / `user_practice_roles`
as part of an atomic practice-creation transaction that runs **before any manager
session exists** and is coupled to Supabase edge functions + non-RBAC tables. Routing
its RBAC writes through the manager-gated API would **403 during signup**. It is also
the repo's #1 churn hotspot / prior-defect biomarker. Migrating it belongs to a dedicated
onboarding effort, not role-catalog recovery. **It retains its `role_catalog` /
`practice_roles` / `user_practice_roles` reads** (documented, deliberate).

### Enforcement regression check — PASS
`requireManager`/`requireUserManager` read `users.role`/`is_practice_manager` via
`storage.getUser`; they never touched the RBAC tables, so the migration cannot regress
them. Verified live: GP → **403** on assign/unassign and on `POST /practice-roles`
and `POST /users`; GP reads (`GET /role-catalog`) → 200; existing `POST /logbook-selections`
→ **403** (unchanged). Manager assign/unassign write DB rows **and** audit rows
(via the existing `auditLogger` middleware — assign/unassign now return an `id` so the
middleware records them). Phase-2 scheduler `GET /role-assignments` route untouched → 200.

### Browser verification (fresh bundle `index-Bltq-dYU.js`, throwaway DB)
`/staff-roles`: all staff + role badges + capability coverage from the API; role edit →
**confirmation dialog** ("Add: Reception … recorded in the audit log") → confirm → DB row
+ audit row + UI badge. `/role-management`: "3 roles enabled / 5 available", categories
correct. GP visiting `/role-management` is **redirected home** (client nav gating via the
migrated `useCapabilities`, caps=0).

### Zero-direct-reads status — HONEST
- **RBAC catalog tables** (`role_catalog`, `practice_roles`, `practice_role_capabilities`,
  `user_practice_roles`): **zero** direct client reads remain **except** the documented
  OrganizationSetup signup skip. Both target pages (`/staff-roles`, `/role-management`) are
  fully clean.
- **App-wide "zero `supabase.from()` anywhere"** is **NOT** achieved and was not achievable
  in this batch: a large **non-RBAC** direct-read surface remains, outside role-catalog
  scope. It includes the batch-(a) deferred pages (`Claims`, `IPC`, `MedicalRequests`,
  `MonthEndScripts`, `GovernanceDashboard`, `Settings`/MFA, `StepExecution`, `TaskDetail`,
  `HR` mutations) plus `Cleaning`, `usePracticeSelection` (`practices`), `useAuditLogs`,
  `NotificationCenter`, various dialogs, and `admin/RoleManagement.tsx` (the **scheduler**
  `role_assignments` system — see §4). These read non-RBAC tables and are a separate
  migration.

### §4 follow-up flagged for Phil (unchanged, not actioned)
`role_assignments` (scheduler) vs `user_practice_roles` (RBAC) remain **parallel systems**.
`src/components/admin/RoleManagement.tsx` still drives the scheduler `role_assignments`
table directly — a candidate to fold into the same consolidation decision.
