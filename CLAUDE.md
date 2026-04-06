# CLAUDE.md — ReflowAI GP Engineering Standards

## Pre-Session Routine — Run Before Every Claude Code Session

### 1. Pack the repo
```bash
npm run pack
```
Generates `repomix-output.xml` — attach to your Claude Code session for full project context.

### 2. Run vibecop
```bash
vibecop scan src/ --format json > vibecop-report.json
```
Generates `vibecop-report.json` — attach alongside repomix-output.xml.

### 3. Start Claude Code with both files
Attach both files then describe what you want to work on.

### 4. Fix priority order (when doing quality work)
1. `unchecked-db-result` — silent data corruption risk
2. `insecure-defaults` / `token-in-localstorage` — security
3. `n-plus-one-query` — performance
4. `god-function` / `god-component` — maintainability
5. `empty-error-handler` — reliability
6. `debug-console-in-prod` — hygiene

### 5. Before every PR
```bash
vibecop scan src/
gh pr create --title "..." --body "..."
```
Always fix any errors before pushing.

---

## What This Project Is

ReflowAI GP is a CQC/HIW compliance platform for GP surgeries. It helps practices manage regulatory requirements, evidence collection, and audit readiness.

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Express.js
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Hosting: Render

## Critical Rules

### 1. Never commit hardcoded credentials
Test data generators must use randomly generated values, not fixed passwords.

### 2. Every Supabase mutation must check its result
Always destructure `{ error }` from Supabase calls and handle failures explicitly.

### 3. Every API route must have error handling
No silent catch blocks. Always log with context and return a useful error response.