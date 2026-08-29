# ReflowAI GP Assistant (GP Practice Management System) Audit Report

**Repository:** pdjm79/reflowaigp  
**Status:** Public repo | Production v2.0 | Comprehensive NHS compliance system  
**Primary Purpose:** NHS GP Practice Management System with country-specific regulatory compliance (CQC/HIW/HIS)  
**Deployment:** Replit, Railway

---

## 1. Architecture & Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **UI Library:** shadcn/ui + Radix UI primitives
- **Styling:** Tailwind CSS
- **State Management:** TanStack React Query
- **Form Management:** React Hook Form + Zod validation
- **Charting & Visualization:** Recharts
- **Internationalization:** i18next + react-i18next
- **Build Tool:** Vite (`vite.config.ts`)
- **Testing:** Vitest (`vitest.config.ts`)

### Backend
- **Runtime:** Node.js 20.x
- **Framework:** Express.js v5
- **Language:** TypeScript
- **Database:** Neon Postgres
- **ORM:** Drizzle ORM (`drizzle.config.ts`)
- **Authentication:** express-session + bcryptjs
- **Security:** helmet, express-rate-limit
- **AI Integration:** Anthropic SDK (@anthropic-ai/sdk)

### Key Integrations
- **PDF Generation:** jsPDF + jsPDF-autotable (7 specialized exporters)
- **Scheduling:** rrule (recurring rule engine)
- **Cryptography:** CryptoJS
- **OTP/MFA:** otpauth
- **Forms:** JSON Schema + UI Schema (Drizzle Zod)
- **Database Sessions:** connect-pg-simple
- **Emoji/Icons:** Lucide React
- **Diagrams:** Mermaid

### Deployment Infrastructure
- **Primary:** Replit (`.replit` config)
- **Alternative:** Railway (`.railwayignore`)
- **Database:** Neon Postgres (serverless)
- **Edge Functions:** Supabase (6 deployed + 3 enhanced)
- **Containerization:** Docker support

---

## 2. System Overview

### Core Purpose
Comprehensive NHS GP practice management system for managing healthcare compliance, policies, HR, training, incidents, complaints, and regulatory requirements across multi-country standards (CQC for England, HIW for Wales, HIS for Scotland).

### Regulatory Framework
- **England:** CQC (Care Quality Commission) standards
- **Wales:** HIW (Healthcare Inspectorate Wales) standards
- **Scotland:** HIS (Healthcare Improvement Scotland) standards
- Dynamic regulatory framework selection on practice setup

### Version & Maturity
1. **Version 2.0.0:** Complete with governance approval
2. **Integration Testing:** V2_INTEGRATION_TEST_REPORT.md documents 92% completion
3. **Governance Approval:** V2_GOVERNANCE_APPROVAL.md (20 KB)
4. **Release Documentation:** V2_RELEASE_NOTES.md with phase-by-phase changes

### Key Indicators
- **Production-Ready:** v2.0 governance approved with comprehensive test report
- **Extensive Testing:** Module-by-module verification (IPC, Cleaning, Fire Safety, Claims, HR, Complaints, Rooms)
- **Rich Documentation:** 45 KB user guide covering 24 sections + specialized module docs
- **Advanced Features:** 70+ database tables, 100+ React components, AI-powered suggestions
- **Edge Functions:** 6 deployed functions + 3 enhanced (scheduling, reminders, AI analysis)

---

## 3. Features (By Module)

### A. Dashboard & Scoring
- **Audit Readiness Score:** 0-100 scale showing compliance status
- **Section Scores:** Individual scoring for each regulatory domain
- **Score Calculation:** Weighted factors (task completion, process adherence, evidence quality, training, policies, incidents)
- **Gates System:** Red (mandatory), Amber (partial), Green (complete)
- **AI Improvement Tips:** Context-aware suggestions from Claude API
- **Score History:** Daily snapshots and trend analysis

### B. Task Management
- **Task Types:** Template-based, ad-hoc, recurring, process-linked
- **Task Lifecycle:** Open -> In Progress -> Completed/Overdue/Returned
- **Task Templates:** Customizable with JSON/UI schemas, evidence requirements, SLA rules
- **Priority Levels:** High, Medium, Low
- **SLA Monitoring:** Fixed duration or business hour-based deadlines

### C. Process Management
- **Multi-Step Workflows:** Recurring processes with scheduled instances
- **Auto-Generation:** Based on frequency (daily, weekly, monthly, quarterly, annually)
- **Process Statuses:** Pending -> In Progress -> Completed -> Signed Off
- **Evidence Integration:** Multi-step evidence collection per process
- **Period-Based:** Task scheduling linked to academic/fiscal periods

### D. IPC (Infection Prevention & Control) - Module 1
- **May/December Audits:** Six-monthly constraint with automated scheduling
- **Room-Based Checks:** General, Toilets, Kitchen, Consultation, Treatment areas
- **Yes/No/N/A Responses:** Granular response tracking per room
- **Auto-Generated Actions:** Severity grading (Red/Amber/Green) with timeframes
- **IPC Audit Cards:** Dashboard display with completion status
- **PDF Export:** IPC Statement generation (pending full integration)

### E. Cleaning (NHS 2025 Model) - Module 2
- **Zone Management:** Dynamic room type configuration
- **Cleaning Tasks:** Frequency types (full/spot/check/periodic/touch)
- **Weekly Grid:** Annex-B style with initials tracking
- **5-Year Retention:** Automated data retention calculation
- **Zone Types:** Clinical, toilet, kitchen, reception, corridor, other
- **Compliance Logs:** Weekly cleaning documentation with signatures

### F. Fire Safety & Health & Safety - Module 3
- **Fire Risk Assessment (FRA):** JSONB structure for premises, hazards, maintenance, emergency plan
- **Multi-Step Wizard:** Comprehensive FRA builder with visual guidance
- **COSHH Register:** Substance safety data with SDS/PPE/routes tracking
- **Risk Assessments:** Generic HSE risk assessment framework
- **Fire Actions:** Severity-based action tracking with due dates
- **Annual Reminders:** Edge function triggers for FRA/COSHH/Legionella reviews
- **Fire Emergency Pack:** PDF export with emergency procedures and signatures

### G. Claims Management - Module 4
- **Script Claims:** Month-end prescription claims with EMIS tracking
- **Claim Runs:** Period-based claims aggregation (1st to last day)
- **Manual Review:** Checklist workflow (patient notes, blood results, clinical coding, Form 1.3)
- **FPPS Tracking:** Submission status and reference management
- **Script Entry:** Medication tracking with quantity and prescriber info
- **Audit Trail:** Script removal with reason documentation
- **Claim Reminders:** Edge function notifications at 5th/10th/15th of month
- **Export:** Claims Pack PDF with Form 1.3, checklist, signature sections

### H. HR Management - Module 5
- **Employee Records:** Full lifecycle tracking with manager relationships
- **Appraisals:** Annual appraisals with ratings, achievements, challenges, objectives
- **360-degree Feedback:** Anonymous Likert-scale responses linked to appraisals
- **Training Tracking:** Per-practice training catalogue with 3-year expiry management
- **Training Alerts:** Color-coded notifications (30/60/90 day warnings)
- **DBS Checks:** 3-year review tracking for background verification
- **Leave Management:** Leave request workflow with manager approval
- **HR Actions:** Auto-generated from appraisals, training gaps, 360 feedback
- **Staff Self-Service:** Employee portal at `/staff-self-service` route
- **PDF Exports:** Appraisal reports, training matrix, DBS register

### I. Incident Reporting
- **RAG Status:** Red (high severity), Amber (medium), Green (low)
- **Incident Themes:** Patient safety, staff safety, equipment, medication, communication, policy, facility
- **Workflow:** Open -> Under Investigation -> Action Required -> Closed
- **Action Tracking:** Responsible person, due date, status monitoring
- **Evidence Capture:** Photo and document attachment capability

### J. Complaints Management
- **SLA Tracking:** Automated working-day calculations (M-F only)
- **Acknowledgment Due:** Auto-calculated 2-day deadline
- **Final Response Due:** Auto-calculated 30-working-day deadline
- **Complaint Workflow:** New -> Acknowledged -> Investigating -> Response Sent -> Closed
- **Themes Analysis:** Quarterly AI pattern extraction via edge function
- **Redactions:** GDPR-compliant data masking for sensitive information
- **File Attachments:** Evidence document storage with audit trail

### K. Medical Requests
- **Request Types:** Insurance report, solicitor report, court report, medical summary, fit note, referral letter, test results
- **Assignment to GP:** Queue management with notification system
- **Status Tracking:** Received -> Assigned -> In Progress -> Sent -> Complete
- **Evidence Management:** Report uploads and outgoing correspondence tracking

### L. Fridge Temperature Monitoring
- **Fridge Configuration:** Min/max temperature thresholds per fridge
- **Daily Logging:** Temperature readings with auto-timestamp
- **Breach Detection:** Automatic flagging of out-of-range readings
- **Breach Documentation:** Remedial actions and outcomes recorded
- **Compliance Reports:** Temperature trend analysis and audit trail

### M. Supporting Features
- **Month-End Scripts:** Controlled drug tracking with EMIS deduplication
- **Policy Documents:** SharePoint integration + local storage with versioning
- **Risk Register:** Impact/likelihood scoring with mitigation tracking
- **Calendar & Schedule:** 12-month visual planning with filter/sort capability
- **Reports & Analytics:** Compliance, operational, HR, safety reports with export capability

---

## 4. Data Model

### Core Tables (70+ total)
- **practices** - Multi-tenant organization records with country selection
- **users** - User accounts with role assignments and permissions
- **roles** - 9-tier RBAC system
- **tasks** - Task definitions with templates, due dates, evidence requirements
- **task_templates** - Reusable task schemas with JSON/UI configurations
- **task_entries** - Task completion records with evidence references
- **processes** - Process definitions with frequency and auto-generation rules
- **process_instances** - Scheduled workflow occurrences

### Specialized Module Tables
- **ipc_audits** - Six-monthly audit records with May/December constraints
- **ipc_checks** - Room/area-specific check responses (Yes/No/N/A)
- **ipc_actions** - Auto-generated actions from "No" responses
- **cleaning_zones** - Practice-specific room classification
- **cleaning_tasks** - Task library with frequency types
- **cleaning_logs** - Daily cleaning records with 5-year retention
- **fire_risk_assessments_v2** - FRA with JSONB (premises, hazards, maintenance, emergency_plan)
- **fire_actions** - Severity-based action tracking
- **coshh_assessments** - Hazard/PPE/route data with JSONB fields
- **script_claim_runs** - Period-based claims aggregation
- **script_claims** - Individual medication claim entries
- **claim_review_logs** - Manual review checklists
- **month_end_scripts** - Controlled drug prescriptions
- **hr_employees** - Staff records with manager relationships
- **hr_appraisals** - Annual reviews with JSONB ratings/achievements/objectives
- **hr_360_feedback** - Anonymous peer feedback responses
- **training_records** - Course completion with expiry tracking
- **training_types** - Per-practice training catalogue
- **dbs_checks** - Background verification with 3-year review dates
- **leave_requests** - Leave tracking with approval workflow
- **hr_actions** - Generated action plans from appraisals/training
- **incidents** - Safety event reporting with RAG status
- **complaints** - SLA-tracked complaint records
- **complaints_themes** - Quarterly AI analysis storage
- **medical_requests** - Document request queue and tracking
- **fridges** - Equipment records with temperature thresholds
- **fridge_temps** - Daily temperature logging with breach detection
- **risk_register** - Risk tracking with impact/likelihood scores
- **policies** - Document management with versioning
- **rooms** - Practice facility inventory
- **room_assessments** - Annual room condition audits

### Relationships & Constraints
- Practice isolation via RLS policies (`get_current_user_practice_id()`)
- Task -> Evidence (1:N) with secure storage
- Process -> Process Instance (1:N) with auto-generation
- IPC Audit -> IPC Checks (1:N) with May/December constraints
- Cleaning Zone -> Cleaning Tasks (N:M) frequency mapping
- HR Appraisal -> HR 360 Feedback (1:N)
- Complaint -> Complaint Themes (1:N) for quarterly analysis

---

## 5. User Roles & Permissions

### Role Hierarchy

| Role | Access | Primary Functions | Scope |
|------|--------|-------------------|-------|
| **Master User** | All practices | System admin, user creation, emergency access | Cross-practice |
| **Practice Manager** | Single practice | Full administrative control, user management, templates, reports | Practice-level |
| **Administrator** | Single practice | Operational management, task assignment, settings | Practice-level |
| **IG Lead** | Single practice | Policy management, complaint redactions, GDPR compliance | Practice-level |
| **Estates Lead** | Single practice | Fridge/fire safety/facilities management | Practice-level |
| **Nurse Lead** | Single practice | Clinical processes, infection control, fridge access | Practice-level |
| **Reception Lead** | Single practice | Front-desk oversight, complaint creation, reception team management | Practice-level |
| **Reception** | Single practice | Complaint creation, basic form submission, assigned tasks | Practice-level |
| **Standard User** | Single practice | Assigned task completion, own profile updates, relevant data viewing | Practice-level |

### Permission Matrix (From USER_GUIDE.md Appendix A)
- Master User: All features
- Practice Manager: All features
- Administrator: Tasks, incidents, medical requests, temperatures
- IG Lead: Policies, complaints, redactions
- Estates Lead: Fridges, fire safety, facilities
- Nurse Lead: Clinical processes, IPC, fridges
- Reception Lead: Complaints, reception management
- Reception: Complaint creation only
- Standard User: Assigned tasks and own data only

---

## 6. Key User Journeys

### A. Weekly Compliance Task Workflow
1. **Monday Morning:** Review dashboard overdue tasks
2. **Throughout Week:** Complete assigned tasks with evidence collection
3. **Evidence Submission:** Photo captures, document uploads, form completion
4. **Friday Afternoon:** Task status review and next week planning

### B. Six-Monthly IPC Audit Cycle
1. **May/December (Auto-Scheduled):** IPC audit instance created by edge function
2. **Audit Setup:** Configure checks per room/area (General, Toilets, Kitchen, etc.)
3. **Room Inspection:** Record Yes/No/N/A responses for each area
4. **Action Generation:** "No" responses auto-create ipc_actions with severity
5. **Remediation:** Track action completion with due dates
6. **PDF Export:** Generate IPC Statement for inspections

### C. Monthly Claims Submission
1. **1st-15th:** Add month-end scripts to `month_end_scripts` table (EMIS deduplication)
2. **Month-End:** System creates `script_claim_run` from active entries
3. **Manual Review:** IG Lead completes checklist (patient notes, clinical coding, Form 1.3)
4. **FPPS Submission:** Submit claim with reference tracking
5. **Payment Tracking:** Update submission status when payment received
6. **Reminder Notifications:** Edge function sends reminders 5th/10th/15th @ 09:00

### D. Annual Fire Risk Assessment
1. **Year 1, Month 1:** FRA wizard starts multi-step collection
2. **Premises:** Document building structure and layouts
3. **Hazards:** Identify fire risks and combustibles
4. **Maintenance:** Record testing and servicing schedules
5. **Emergency Plan:** Document muster points and procedures
6. **Export:** Generate Fire Emergency Pack PDF with signatures
7. **Auto-Reminder:** Next FRA due = 1 year from completion

### E. Staff Appraisal & Development
1. **Annual Cycle:** Practice Manager schedules appraisal
2. **Form Completion:** Document achievements, challenges, objectives, ratings
3. **360 Feedback:** Anonymous peer feedback collection (6 Likert questions)
4. **Action Plans:** Auto-generate HR actions from support needs
5. **Training Needs:** Link to training catalogue
6. **Export Reports:** Appraisal summary + training matrix

### F. Incident to Completion
1. **Report Creation:** Staff reports incident with RAG status and themes
2. **Evidence Capture:** Photos of damage/hazards/conditions
3. **Investigation:** Supervisor gathers facts and documentation
4. **Actions:** Add corrective measures with due dates
5. **Status Tracking:** Open -> Under Investigation -> Action Required -> Closed

### G. Complaint SLA Management
1. **Received:** System auto-calculates 2-day ACK + 30-day response due dates (working days only)
2. **Holding Letter:** Send acknowledgment within 2 days
3. **Investigation:** Gather evidence and prepare response
4. **Final Letter:** Send full response within 30 working days
5. **Closure:** Mark as closed with outcome documented
6. **AI Analysis:** Edge function extracts quarterly themes for pattern identification

---

## 7. Authentication & Authorization

**Authentication Method:**
- Express-session based authentication
- bcryptjs password hashing (min 8 chars, mixed case/numbers/special)
- Multi-Factor Authentication (MFA) via otpauth with authenticator apps
- Password reset/recovery flows available

**Authorization:**
- Role-Based Access Control (RBAC) with 9-tier hierarchy
- Row-Level Security (RLS) policies in Supabase
- Practice-level isolation via `get_current_user_practice_id()`
- Master user override capability for emergency access
- Self-access policies for sensitive data (appraisals, training records, DBS checks)

**Security Features:**
- Helmet.js for HTTP headers hardening
- express-rate-limit for API protection
- Session timeout management
- Audit trail of all master user actions
- MFA backup codes for account recovery
- No password sharing policies

---

## 8. Testing & Quality Assurance

### V2.0 Integration Testing
**Test Report:** V2_INTEGRATION_TEST_REPORT.md documents comprehensive testing

| Module | Database | Components | Workflow | PDF Export | Edge Functions | Status |
|--------|----------|------------|----------|------------|----------------|--------|
| IPC | OK | OK | OK | Partial | OK | 90% |
| Cleaning | OK | OK | Partial | Partial | OK | 80% |
| Fire Safety | OK | OK | OK | OK | OK | 100% |
| Claims | OK | OK | OK | OK | OK | 100% |
| HR | OK | OK | OK | OK | OK | 100% |
| Complaints | OK | OK | OK | N/A | OK | 100% |
| Rooms | OK | OK | Partial | Partial | - | 75% |

**Overall Completion: 92%**

### Test Coverage
- **Vitest Setup:** Unit testing configured
- **Module-by-Module Verification:** Database, components, workflows tested per module
- **Edge Function Testing:** 6 deployed functions verified
- **PDF Export Testing:** 7 specialized exporters with integration validation
- **Mobile Responsiveness:** All new dialogs verified for mobile using `useIsMobile` hook
- **Security Scan:** RLS policy coverage (pending formal linter scan)

### Pending Verifications
- Full end-to-end testing with real practice data
- IPC Statement PDF export integration in UI
- Cleaning logs PDF export integration
- Room assessment PDF export integration
- Action auto-generation from room assessment findings
- CRON job execution for scheduled edge functions

---

## 9. Deployment & Infrastructure

### Deployment Platforms
- **Primary:** Replit (`.replit` config with full-stack setup)
- **Alternative:** Railway (`.railwayignore` configuration)
- **Container Support:** Dockerfile for Docker deployments

### Database Infrastructure
- **Database:** Neon Postgres (serverless PostgreSQL)
- **Connection Pooling:** Via connect-pg-simple sessions table
- **Migrations:** Drizzle Kit migrations with schema versioning
- **Edge Functions:** 6 Supabase edge functions deployed:
  - `ipc-schedule-may-dec` - Schedule six-monthly IPC audits
  - `annual-reviews-hs` - Fire/COSHH/Legionella annual reminders
  - `training-expiry-scan` - 30/60/90 day training notifications
  - `claims-reminders` - 5th/10th/15th @ 09:00 in-app notifications
  - `analyze-complaint-themes` - Quarterly AI pattern extraction
  - `suggest-tasks` - AI-powered priority task generation
  - `calculate-compliance-scores` - Automated HIW/CQC/QOF scoring

### Build & Deployment Process
- **Frontend Build:** Vite build with production optimizations
- **Backend Build:** esbuild bundling to Node.js CJS format
- **Start Command:** `npm run start` launches Node.js server
- **Environment Variables:** `.env.example` template provided
- **Development:** `npm run dev` starts Vite dev server + backend

---

## 10. Documentation Quality

### Comprehensive Documentation (8+ files)
1. **USER_GUIDE.md** (45 KB) - Master user guide covering 24 sections
2. **V2_INTEGRATION_TEST_REPORT.md** (17 KB) - Technical verification
3. **V2_GOVERNANCE_APPROVAL.md** (20 KB) - Executive approval documentation
4. **V2_RELEASE_NOTES.md** (5 KB) - Executive summary for stakeholders
5. **OFFLINE_SYNC_USAGE.md** (6 KB) - Offline functionality documentation
6. **CHANGELOG.md** (9 KB) - Phase-by-phase changes with migration references
7. **TESTING.md** - Test framework and procedures
8. **replit.md** - Replit-specific development setup

---

## 11. Distinguishing Factors vs LogBooksHub & New-School

### Regulatory Focus
- **ReflowAI GP:** NHS GP practices (England/Wales/Scotland with country-specific standards)
- **LogBooksHub:** Care facilities (generic multi-facility compliance)
- **New-School:** Schools (academic calendar and facilities management)

### Complexity & Feature Breadth
- **ReflowAI GP:** Highest complexity - 70+ tables, 100+ components, 7 PDF exporters, AI integration
- **LogBooksHub:** Moderate - HACCP compliance, photo evidence, multi-format reports
- **New-School:** Moderate - calendar integration, task scheduling, compliance tracking

### AI Integration
- **ReflowAI GP:** Claude API integrated for improvement suggestions + edge functions
- **LogBooksHub:** PDF generation and data sync only
- **New-School:** Documentation-driven maturity indicators

### Module Specialization
- **ReflowAI GP:** Highly specialized (IPC audits, COSHH, fire safety, claims, DBS)
- **LogBooksHub:** Generalized compliance (HACCP, task management, evidence)
- **New-School:** Education-focused (calendar, academic periods, school facilities)

### SLA & Regulatory Tracking
- **ReflowAI GP:** Working-day SLA calculations, complaint tracking, claims submission
- **LogBooksHub:** Simple task deadlines
- **New-School:** Calendar-based scheduling

---

## 12. Known Strengths

- **Comprehensive Feature Set** - 70+ database tables covering NHS compliance domains
- **Production v2.0 Approved** - Governance approval with integration test report
- **Advanced AI Integration** - Claude API for context-aware improvement suggestions
- **Multi-Country Compliance** - Dynamic regulatory framework (CQC/HIW/HIS)
- **Specialized PDF Exports** - 7 custom exporters (Fire, Claims, HR, IPC, Appraisals, Training, DBS)
- **Extensive Documentation** - 45 KB user guide + technical test reports
- **Edge Function Automation** - 6 scheduled functions for reminders, scheduling, AI analysis
- **Role-Based Access** - 9-tier RBAC with practice isolation
- **Mobile Responsive** - All v2.0 components use responsive design patterns
- **Working-Day SLA Calculation** - Complaint SLA tracking with M-F only logic
- **Evidence Management** - Secure storage with metadata capture and audit trails
- **Scalable Database** - 70+ tables with proper indexing and RLS policies

---

## 13. Areas for Further Investigation

1. **Component Inventory** - Full React component structure across all modules
2. **API Endpoint Mapping** - Complete Express.js route documentation
3. **Edge Function Logic** - Detailed implementation of AI suggestion algorithm and compliance scoring
4. **PDF Export Pipeline** - UpdatePackPDFExporter class and specialized exporters
5. **RLS Policy Audit** - Formal security scan of all RLS policies
6. **Performance Testing** - Load testing on large datasets (cleaning_logs, IPC audits)
7. **Mobile App Strategy** - Hybrid vs PWA deployment considerations
8. **Offline Sync Implementation** - IndexedDB strategy and sync mechanisms
9. **Analytics Dashboard** - Practice insights and performance metrics
10. **Integration Completions** - IPC Statement, Cleaning Logs, Room Assessment PDF exports
11. **Action Auto-Generation** - Room assessment finding -> fire_actions logic
12. **CQC/HIW/HIS Alignment** - Verification of regulatory standard implementations

---

## Summary

**ReflowAI GP Assistant (v2.0.0)** is a production-grade NHS GP practice management system with:

- Comprehensive feature set covering compliance, HR, safety, claims, and evidence management
- Multi-country regulatory support (CQC/HIW/HIS) with dynamic framework selection
- Advanced AI integration (Claude API) for context-aware improvement suggestions
- Governance-approved v2.0 release with 92% integration test completion
- Specialized PDF export infrastructure (7 custom exporters)
- Automated edge function scheduling for audits, reminders, and analysis
- Extensive user documentation (45 KB guide covering all features)
- Production-ready deployment (Replit, Railway, Docker supported)
- Role-based access control with practice isolation via RLS
- Mobile-responsive UI with proper accessibility patterns

The system demonstrates higher complexity and feature specialization compared to LogBooksHub and New-School, with dedicated modules for IPC audits, COSHH/fire safety, pharmaceutical claims, and NHS-specific compliance workflows.

**Next Phase:** Complete remaining 3 PDF export integrations (IPC Statement, Cleaning Logs, Room Assessments) and conduct end-to-end testing with real practice data before final production deployment.
