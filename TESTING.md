# Manual Smoke Testing Checklist

Use this checklist to validate the global `AppLayout` navigation and spacing updates.

## Prerequisites
- Run the app locally (`npm run dev`) and sign in with a valid test user.
- Test once as a manager/admin-capable user and once as a standard user.

## Navigation and layout smoke checks
1. Open `/` and confirm:
   - Sidebar is visible on desktop.
   - Global header/controls appear only once (no duplicated page-level header).
2. Open `/processes` and confirm:
   - Sidebar remains present.
   - Content is padded correctly within the main layout area.
3. Open `/tasks` and confirm:
   - Sidebar remains present.
   - Main content spacing is consistent with `/` and `/processes`.
4. Open `/team` with a manager/admin user and confirm the route renders from sidebar navigation.

## Quick Actions removal checks
1. Navigate to the dashboard (`/`) for manager/admin user.
2. Confirm no "Quick Actions" panel/card appears.
3. Repeat for a standard user dashboard view and confirm no quick-actions UI appears.

## Mobile spacing check
1. Switch to mobile viewport.
2. Confirm the bottom navigation is visible.
3. Scroll dashboard/tasks content and verify the last card/section is not hidden behind bottom nav.

## Route sanity checks
- Public routes are reachable without authenticated layout shell:
  - `/login`
  - `/reset-password`
- Authenticated routes render with layout shell:
  - `/`
  - `/processes`
  - `/tasks`
  - `/team`
