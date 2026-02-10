# GP Practice Management System

## Overview
A comprehensive GP practice management system for NHS practices across Wales, England, and Scotland. The system manages healthcare compliance, policies, HR, training, incidents, complaints, and regulatory requirements.

## Current State
- **Framework**: Express.js backend with Vite/React frontend
- **Database**: Neon Postgres with Drizzle ORM
- **Status**: Fully migrated from Lovable/Supabase to Replit-native architecture
- **Auth**: Session-based username/password authentication (NOT OAuth)

## Recent Changes
- February 2026: Completed full Supabase-to-Express API migration across all ~90+ frontend files
- All frontend files now use fetch() to Express API endpoints instead of direct Supabase client calls
- Features without Express endpoints (cleaning, fire safety, IPC, COSHH, rooms, claims, medical requests) show stub/empty states with "coming soon" messages
- December 2024: Initial migration from Supabase to Neon Postgres
- Implemented practice-based multi-tenant isolation at storage layer
- All CRUD operations enforce practiceId boundaries
- Express routes restructured with /api/practices/:practiceId prefix pattern
- Added "Cleaner", "Estates Lead", and "IG Lead" roles to the system
- Converted all user-visible text from American English to British English (Organisation, Analyse, Customise, Acknowledgement, etc.)
- Added /setup route for direct access to Organisation Setup screen

## Project Architecture

### Backend (server/)
- **index.ts**: Main Express server entry point
- **auth.ts**: Session-based authentication with password hashing
- **routes.ts**: API route definitions with practice-scoped endpoints
- **storage.ts**: Database abstraction layer with tenant isolation
- **db.ts**: Drizzle database connection
- **vite.ts**: Vite dev server integration

### Shared (shared/)
- **schema.ts**: Drizzle ORM schema definitions for 30+ tables

### Frontend (src/)
- React with TypeScript
- Shadcn UI components
- TanStack Query for data fetching
- Wouter for routing
- All data fetching via fetch() to Express API (NO direct Supabase calls)
- All fetch calls use `credentials: 'include'` for session auth

## API Pattern
All practice-specific resources follow the pattern:
```
GET    /api/practices/:practiceId/[resource]
GET    /api/practices/:practiceId/[resource]/:id
POST   /api/practices/:practiceId/[resource]
PATCH  /api/practices/:practiceId/[resource]/:id
```

Available resources: users, employees, tasks, incidents, complaints, policies, training-records, process-templates, notifications

## Security
- Session-based authentication with express-session
- Multi-tenant isolation enforced at storage layer
- practiceId stripped from request bodies and derived from URL
- Updates constrained by both id AND practiceId
- Cookies configured for Replit iframe environment (sameSite: 'none', secure: true)

## Database Tables
Core tables include:
- practices, users, employees
- process_templates, process_instances, tasks
- incidents, complaints, policy_documents
- training_records, training_modules
- notifications, audit_logs
- compliance_scores, hiw_tracker, fire_coshh_reviews

## Environment Variables
- DATABASE_URL: Neon Postgres connection string (configured)
- SESSION_SECRET: Session encryption key (configured)

## Scripts
- `npm run dev`: Start development server
- `npm run db:push`: Push schema to database
- `npm run db:studio`: Open Drizzle Studio

## User Preferences
- Focus on NHS compliance requirements
- Multi-practice support essential
- Secure handling of patient and staff data
- Traditional username/password auth (NOT OAuth/Replit Auth)
- Keep original ReflowAI branding/logo
- Test credentials: admin@test.com / password123 for "Test Medical Centre"

## Pending Features (Stubbed)
These features show empty states and need Express endpoints added:
- Cleaning zones/tasks/weekly grid
- Fire safety assessments/risk wizard
- IPC audits/checks/actions
- COSHH assessments
- Room assessments
- Claims processing
- Medical requests
- Fridge temperature logging
- Month-end scripts
- Email logs/reports
- DBS tracking
- Feedback 360
- Appraisals
- AI compliance scoring
- AI task suggestions
