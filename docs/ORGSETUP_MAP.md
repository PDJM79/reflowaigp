# OrganizationSetup — signup/provisioning migration map (batch c, Step 6)

> Mapped before code. STOP-condition assessment: **does not fire.** The Express app
> already has native session-auth signup (`POST /api/auth/register` → `storage.createUser`
> with bcrypt). Provisioning can move to an Express signup-context route using the
> existing trust boundary — **no auth-model redesign needed.**

## Auth context
OrganizationSetup runs **after** the user has registered and holds a live session
(`useAuth().user` is set). So the provisioning route can require `isAuthenticated`
and act as the session user, who becomes the practice's first manager. It cannot use
`requireSamePractice` (the user has no practice yet) — it is a dedicated signup route.

## Exact writes (in order), and their new home
| # | Current (client, Supabase) | New (server) |
|---|-----------------------------|--------------|
| 1 | `functions.invoke('create-practice-during-setup')` (security-definer) | `storage.createPractice({name, country})` — server has no RLS, no definer needed |
| 2 | update/insert `users` (current user: practice_id, role, is_practice_manager) | `storage.updateUser(session.userId, …)` + set `req.session.practiceId` |
| 3 | `functions.invoke('create-user-accounts')` per teammate (email, name, role, password) | `storage.createUser({…, passwordHash})` — same as /api/auth/register |
| 4 | per role: read `role_catalog` → get/create `practice_roles` → upsert `user_practice_roles` | `getRoleCatalog` (find by key) → `enablePracticeRole` → `assignUserPracticeRole` (all exist, batch b) |
| 5 | insert `process_templates` from schedules | `storage.createProcessTemplate` (exists) |
| 6 | insert `process_instances` (first occurrence per responsible user) | `storage.createProcessInstance` (exists) |
| 7 | insert `organization_setup {setup_completed:true}` | `storage.createOrganizationSetup(practiceId)` (new) |
| 8 | `functions.invoke('auto-provision-practice')` (best-effort seed) | **deferred** — best-effort edge seed; documented, non-blocking |
| — | insert `user_contact_details {user_id, email}` (best-effort) | **skipped** — table absent from all migrations (phantom); email already stored on `users`. Documented. |

## Plan
One atomic-ish endpoint `POST /api/setup/provision` (isAuthenticated), body:
`{ organizationName, country, assignments:[{email,name,roles[],password}], taskSchedules:[…] }`.
It runs steps 1–7 server-side and returns `{ practiceId }`. Client `role_catalog`
dropdown load → existing `GET /api/role-catalog`. The whole submit handler → one call.

## Verification (E2E)
Register a fresh user → call provision → assert: practice created; session user is
manager with practice_id; RBAC rows (practice_roles + user_practice_roles) correct;
templates + first instances created; organization_setup.setup_completed=true; the
manager can log in and reach /logbooks.

## Edge functions left (documented, out of the data-reads gate)
`auto-provision-practice`, plus the app-wide email/compute edge functions
(create-baseline, process-baseline-documents, compute-delta, send-*-emails):
they need email/AI/Supabase infra the Express server does not have. Separate
edge-function-port effort. The client no longer does direct **table** reads.
