# GP Practice Management System

## Overview
A comprehensive GP practice management system for NHS practices across Wales, England, and Scotland. The system manages healthcare compliance, policies, HR, training, incidents, complaints, and regulatory requirements.

## Current State
- **Framework**: Express.js backend with Vite/React frontend
- **Database**: Neon Postgres with Drizzle ORM
- **Status**: Migrated from Lovable/Supabase to Replit-native architecture

## Recent Changes
- December 2024: Completed migration from Supabase to Neon Postgres
- Implemented practice-based multi-tenant isolation at storage layer
- All CRUD operations enforce practiceId boundaries
- Express routes restructured with /api/practices/:practiceId prefix pattern

## Project Architecture

### Backend (server/)
- **index.ts**: Main Express server entry point
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

## API Pattern
All practice-specific resources follow the pattern:
```
GET    /api/practices/:practiceId/[resource]
GET    /api/practices/:practiceId/[resource]/:id
POST   /api/practices/:practiceId/[resource]
PATCH  /api/practices/:practiceId/[resource]/:id
```

## Security
- Multi-tenant isolation enforced at storage layer
- practiceId stripped from request bodies and derived from URL
- Updates constrained by both id AND practiceId

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

## Scripts
- `npm run dev`: Start development server
- `npm run db:push`: Push schema to database
- `npm run db:studio`: Open Drizzle Studio

## User Preferences
- Focus on NHS compliance requirements
- Multi-practice support essential
- Secure handling of patient and staff data
