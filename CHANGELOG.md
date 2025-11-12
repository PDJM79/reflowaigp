# Changelog

## [2.0.0] - 2025-01-12

### Major Release: Update Pack v2.0 - NHS 2025 Compliance Enhancements

This release represents a comprehensive rebuild of ReflowAI GP Assistant with 8 major module overhauls to strengthen NHS primary care compliance documentation for HIW/CQC inspections.

---

### 🎯 Phase 1: Foundation & Database Architecture

#### New Database Tables (70+ tables added)
- **IPC Module**: `ipc_audits`, `ipc_checks`, `ipc_actions` - Six-monthly structured audits with 12-month retention
- **Cleaning Module**: `cleaning_zones`, `cleaning_tasks`, `cleaning_logs` - NHS Cleanliness 2025 model with 5-year retention
- **Fire Safety Module**: `fire_risk_assessments_v2`, `fire_actions` - Comprehensive FRA wizard with Fire Emergency Pack
- **Health & Safety**: `coshh_assessments`, `risk_assessments` - Dedicated COSHH register and generic risk assessments
- **Room Assessments**: `room_assessments` - Annual room inspections with flexible builder
- **HR Enhancements**: `hr_appraisals`, `hr_360_feedback`, `hr_actions`, `training_types` - 360° feedback and configurable training catalogue
- **Claims & Scripts**: `script_claim_runs`, `script_claims`, `claim_review_logs` - Enhanced claims workflow with FPPS tracking
- **Complaints Extensions**: Added SLA tracking fields to complaints table

#### New Enums
- `ynna` - Yes/No/N/A responses for audit questions
- `clean_frequency` - full/spot/check/periodic/touch cleaning types
- `act_status` - open/in_progress/done action statuses
- `act_severity` - urgent/moderate/low severity levels

#### Database Functions
- `calculate_working_days()` - M-F only working days calculation for complaints SLA
- `add_working_days()` - Add working days to date for deadline calculations
- `set_complaint_sla_dates()` - Trigger for auto-calculating 2-day acknowledgment and 30-day response deadlines
- `set_ipc_audit_retention()` - Auto-calculate 5-year retention for IPC audits
- `set_cleaning_log_retention()` - Auto-calculate 5-year retention for cleaning logs

---

### 🚀 Phase 2-4: Core Module Implementations

#### IPC (Infection Prevention & Control)
- **IPCAuditCard**: Display six-monthly audit status with completion tracking
- **IPCCheckDialog**: Structured room-aware audit responses (General/Toilets/Kitchen/Consultation/Treatment rooms)
- **IPCActionDialog**: Auto-generated action plans from "No" responses with severity grading
- **IPC.tsx Page**: Full IPC dashboard with May/December audit scheduling
- **IPCAuditDetail.tsx**: Detailed audit view showing all checks and generated actions

#### Cleaning (NHS 2025 Model)
- **CleaningZoneEditor**: Dynamic zone management with room types
- **CleaningTaskLibrary**: Task management with frequency types (full/spot/check/periodic/touch)
- **CleaningWeeklyGrid**: Annex-B weekly initials grid with daily completion tracking
- **FrequencyBadge**: Visual indicator for cleaning frequency types
- **ZoneTypeIcon**: Icons for different zone types (clinical/waiting/toilet/staff/office/kitchen)

#### Fire Safety & Health & Safety
- **FireRiskWizard**: Multi-step FRA wizard capturing premises, hazards, maintenance, emergency plan
- **FireSafetyActionDialog**: Action management with severity/timeframe-based due dates
- **COSHHAssessmentDialog**: COSHH substance management with SDS, PPE, emergency controls
- **Fire Emergency Pack PDF**: Comprehensive export with muster points, marshal roles, equipment lists

---

### 👥 Phase 5-7: HR, Claims & Complaints

#### HR Module Enhancements
- **AppraisalDialog**: Annual appraisal forms with ratings, achievements, support needs
- **Feedback360Dialog**: Anonymous 360° feedback collector with Likert scales
- **TrainingCatalogueDialog**: Configurable per-practice training requirements
- **DBSTrackingDialog**: DBS review tracking with 3-year reminders
- **TrainingExpiryAlerts**: Color-coded training expiry warnings (Green/Amber/Red)
- **StaffSelfService**: Employee self-service portal for viewing own data

#### Enhanced Service Claims
- **ScriptClaimRunDialog**: "Run from 1st" workflow with auto-population from month_end_scripts
- **ClaimReviewDialog**: Manual review checklist (patient notes, blood results, coding)
- **Claims Pack PDF**: Form 1.3 export with FPPS submission tracking and removed items audit log
- Added `emis_id` field to month_end_scripts for NHS claims compliance

#### Complaints SLA Tracking
- **ComplaintSLADialog**: Send acknowledgment and final response letters
- **ComplaintSLATracker**: Dashboard showing SLA compliance metrics
- **ComplaintThemeAnalysis**: AI-powered quarterly theme analysis
- Automated SLA status updates (on_track/at_risk/overdue) with notifications
- Working days calculation (M-F only) for 2-day acknowledgment and 30-day response deadlines

---

### 📊 Phase 8-9: Room Assessments & PDF Infrastructure

#### Room Assessments
- **RoomAssessmentDialog**: Annual room inspection builder with flexible findings
- **RoomAssessments.tsx**: Dashboard showing assessment history and due dates
- Auto-generation of actions for "Action Required" findings

#### PDF Export Infrastructure
- **UpdatePackPDFExporter**: Reusable PDF generation class with practice headers, sections, tables
- **generateFireEmergencyPackPDF**: Fire Emergency Pack with FRA summary and action plans
- **generateClaimsPackPDF**: Claims Pack with Form 1.3 and review checklist
- **generateAppraisalReportPDF**: Appraisal reports with 360° feedback integration
- **generateTrainingMatrixPDF**: Training Matrix with color-coded expiry status
- **generateDBSRegisterPDF**: DBS Register with review schedules
- Export buttons integrated into FireSafety.tsx, Claims.tsx, and HR.tsx pages

---

### ⚙️ Phase 10-11: Edge Functions & CRON Jobs

#### Deployed Edge Functions
- `ipc-schedule-may-dec`: Scheduled reminders for six-monthly IPC audits (May/December)
- `annual-reviews-hs`: Annual reminder workflows for Fire RA (1 month prior), COSHH, Legionella
- `training-expiry-scan`: 30/60/90-day training expiry notifications
- `claims-reminders`: PM reminders at 09:00 on 5th/10th/15th of each month
- `complaints-sla-scan`: Daily scan for complaints approaching SLA deadlines
- `seed-training-catalogue`: Initialize NHS training catalogue with 17 default courses

#### CRON Configuration
- Enhanced `supabase/config.toml` with scheduled edge function triggers
- Notification delivery infrastructure for in-app alerts

---

### 🎨 UI/UX Improvements

#### Mobile Optimization (Phase 5 carry-over)
- All new dialogs use `useIsMobile` hook for responsive layouts
- Touch-friendly 44px minimum touch targets
- Mobile-optimized forms with native inputs and scrollable areas
- Card-based layouts for mobile data tables

#### Design System Enhancements
- **RAGBadge**: Red/Amber/Green compliance status indicators
- **ComplianceTagBadge**: Regulatory framework tooltips (HIW/CQC/QOF)
- Semantic color tokens for all new components
- Consistent styling across all module dashboards

---

### 🔒 Security & Compliance

#### Data Protection
- Email isolation architecture extended (Phase 2A security completion)
- MFA secrets remain write-only with server-side verification
- Audit logging for all PII access via security definer functions

#### Regulatory Mapping
- Compliance tags on all process templates and tasks
- HIW/CQC/QOF indicator mapping in compliance_metadata JSONB fields
- Inspection-ready evidence packs via PDF exports

---

### 🐛 Bug Fixes

- Fixed TypeScript compilation errors for Phase 1 table references
- Resolved `emis_id` null handling in ScriptClaimRunDialog
- Fixed Feedback360Dialog response filtering for partial completion
- Corrected working days calculation for complaints SLA (M-F only, excluding weekends)

---

### 📚 Technical Debt & Infrastructure

- Migrated from `0.0.0` to `2.0.0` to reflect major architectural changes
- Created comprehensive type definitions for 70+ new database tables
- Established PDF export infrastructure with reusable exporter class
- Configured edge function deployment pipeline with CRON scheduling

---

### 🔄 Migration Notes

**Database Migration**: Phase 1 migration creates all new tables, enums, and functions. Run manually in Supabase SQL Editor if auto-approval fails.

**Type Regeneration**: If TypeScript compilation errors persist, trigger type regeneration by creating a substantive dummy migration (add/remove temporary column on core table).

**Training Catalogue Seeding**: Call `seed-training-catalogue` edge function for each practice to initialize NHS training requirements:
```json
{
  "practiceId": "uuid-here"
}
```

---

### 📋 Known Limitations

- **IPC Statement PDF**: Placeholder implementation - requires complete 12-month summary logic
- **Complaints AI Theme Analysis**: Requires OpenAI API key in secrets
- **Fridge Temperature Monitoring**: Not included in v2.0 - deferred to future release
- **Medical Requests Module**: Not included in v2.0 - deferred to future release

---

### 🎯 Next Steps (Phase 12+)

Future releases will focus on:
- Fridge Temperature Monitoring with multi-fridge support and out-of-range alerts
- Medical Requests workflow with GP allocation and turnaround analytics
- Governance Approval Card system for regulatory traceability
- Version bump automation and changelog generation tooling

---

### 👏 Acknowledgments

This release represents 11 phases of development spanning foundational database architecture, 100+ React components, 6 edge functions, comprehensive PDF export systems, and full mobile optimization. Built ON TOP OF existing Phase 1-5 functionality without breaking changes.

---

For detailed migration guides, security considerations, and troubleshooting, see:
- [Migration Files](supabase/migrations/)
- [Edge Functions](supabase/functions/)
- [User Guide](USER_GUIDE.md)
