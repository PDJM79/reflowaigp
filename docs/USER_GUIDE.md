# ReflowAI GP — User Guide

> **Who this guide is for:** Practice Managers, Administrators, Nurse Leads, and Reception staff using ReflowAI GP.
> **How to use it:** Jump to the module relevant to your task. Each section is self-contained.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Practice Setup](#2-practice-setup)
3. [IPC Module](#3-ipc-module)
4. [Cleaning Module](#4-cleaning-module)
5. [Fire Safety & HSE](#5-fire-safety--hse)
6. [Claims Management](#6-claims-management)
7. [HR Management](#7-hr-management)
8. [Complaints & Incidents](#8-complaints--incidents)
9. [AI Features](#9-ai-features)
10. [Reporting & Exports](#10-reporting--exports)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Getting Started

### 1.1 Logging In

1. Open your browser and go to the ReflowAI GP URL provided by your practice, or open the mobile app.
2. Enter your **email address** and **password** and click **Sign In**.

> **First login:** You will receive an invitation email from your Practice Manager. Click the link to verify your account and set a password. Invitation links expire after 48 hours — ask your Practice Manager to resend if needed.

**Forgotten password:**
1. Click **Forgot Password** on the login screen.
2. Enter your email address and click **Send Reset Link**.
3. Open the email and follow the link within 30 minutes to set a new password.

---

### 1.2 First Login Experience

After signing in for the first time, a short guided setup flow runs:

| Step | What happens |
|------|-------------|
| Welcome screen | Confirms your name, role, and practice assignment |
| Notification preferences | Choose how to receive alerts (email, push, both) |
| Module tour | Optional walkthrough of your role's key modules |

Click **Skip** at any point to go directly to your dashboard.

---

### 1.3 Dashboard Overview

The dashboard is tailored to your role.

**Practice Manager dashboard:**
- Practice compliance score (AI-calculated — see [Section 9](#9-ai-features))
- Module status cards: IPC, Cleaning, Fire Safety, Claims, HR, Complaints
- Open action items across all modules
- Staff with overdue HR requirements (DBS, appraisal, mandatory training)
- Recent AI suggestions and their priority rating

**Administrator dashboard:**
- Task list for assigned modules
- Upcoming deadlines (IPC audit due date, claim run date, complaint SLA countdown)
- Staff leave calendar for the next two weeks
- Quick links to Claims and HR

**Nurse Lead dashboard:**
- IPC audit status (last completed, next due)
- Open IPC actions from previous audits
- Cleaning compliance rate for the current week
- COSHH register alerts (substances approaching review date)

**Reception dashboard:**
- My Tasks — administrative tasks assigned today
- Open complaints I have logged (status and SLA countdown)
- Staff notice board

**Main navigation:**

| Icon | Module |
|------|--------|
| Home | Dashboard |
| Clipboard | IPC |
| Droplet | Cleaning |
| Flame | Fire Safety & HSE |
| Pound sign | Claims |
| People | HR |
| Speech bubble | Complaints & Incidents |
| Sparkle | AI Features |
| Chart | Reports |
| Cog | Settings |

---

## 2. Practice Setup

### 2.1 Creating Your Practice

If you are the first person from your practice to sign up:

1. Click **Create Practice** on the signup screen.
2. Enter your **Practice Name**, **ODS Code**, **Address**, and **Phone Number**.
3. Select your **Country** — this determines which regulatory framework is applied (see [2.2](#22-selecting-your-regulatory-framework)).
4. Upload your **practice logo** (optional — appears on PDF exports and reports).
5. Click **Create Practice**.

You are now the Practice Owner with full Practice Manager privileges.

---

### 2.2 Selecting Your Regulatory Framework

ReflowAI GP applies different compliance templates, audit criteria, and evidence standards based on your regulator. Select carefully — changing it later requires re-mapping your compliance records.

| Country | Regulator | Key framework applied |
|---------|-----------|----------------------|
| England | CQC (Care Quality Commission) | CQC Key Questions: Safe, Effective, Caring, Responsive, Well-Led |
| Wales | HIW (Healthcare Inspectorate Wales) | HIW Standards for Health Services in Wales |
| Scotland | HIS (Healthcare Improvement Scotland) | HIS Quality Framework for Primary Care |

**To set or change the regulatory framework:**
1. Go to **Settings → Regulatory Framework**.
2. Select your regulator.
3. Click **Save**. Audit templates and compliance mappings update automatically.

> **Multi-site practices:** If your PCN or group operates across England and Wales, add each practice as a separate site and assign a different regulator to each. Both sites can be managed from one account.

---

### 2.3 Adding Practice Sites

For groups or PCNs managing multiple practices:

1. Go to **Settings → Practice Sites**.
2. Click **Add Site**.
3. Enter the **Site Name**, **ODS Code**, **Address**, and **Regulator**.
4. Click **Save**.

Each site has its own compliance records, staff, and reports while sharing one subscription.

---

### 2.4 Inviting Staff and Configuring Roles

**To invite a staff member:**
1. Go to **Settings → Team**.
2. Click **Invite Member**.
3. Enter their **email address**, select their **role**, and assign them to one or more practice sites.
4. Click **Send Invitation**.

**Role permissions summary:**

| Permission | Practice Manager | Administrator | Nurse Lead | Reception |
|------------|-----------------|--------------|-----------|-----------|
| Manage settings and billing | ✓ | — | — | — |
| Add/remove users and roles | ✓ | — | — | — |
| Select regulatory framework | ✓ | — | — | — |
| Run IPC audits | ✓ | ✓ | ✓ | — |
| Manage cleaning zones and tasks | ✓ | ✓ | ✓ | — |
| Manage Fire Safety and COSHH | ✓ | ✓ | — | — |
| Run claim scripts and submit claims | ✓ | ✓ | — | — |
| Manage HR records and appraisals | ✓ | ✓ | — | — |
| Log and track complaints | ✓ | ✓ | — | ✓ |
| Complete assigned administrative tasks | ✓ | ✓ | ✓ | ✓ |
| Export reports | ✓ | ✓ | — | — |

**To change a user's role:**
1. Go to **Settings → Team**, click the user's name.
2. Update the **Role** field and click **Save**. The change takes effect immediately.

**To remove a staff member:**
1. Go to **Settings → Team**, click the user's name, then **Remove from Practice**.
2. Their submitted records and HR data are retained; they can no longer log in.

---

### 2.5 Billing

1. Go to **Settings → Billing**.
2. Click **Set Up Billing** and enter payment details via the Stripe-hosted form.
3. Choose your plan (per practice site per month).
4. Click **Confirm Subscription**.

Invoices are available under **Settings → Billing → Invoices**. To update your payment method, go to **Settings → Billing → Payment Method → Update Card**.

---

## 3. IPC Module

### 3.1 Overview

The IPC (Infection Prevention and Control) module manages six-monthly audits, room-level checks, and action tracking. Templates are pre-configured to match your selected regulator (CQC, HIW, or HIS).

> **Who runs IPC audits:** Nurse Leads are the primary owners of IPC audits. Practice Managers and Administrators can also run or review them.

---

### 3.2 Running a Six-Monthly IPC Audit

IPC audits are due every six months. ReflowAI GP tracks the due date and sends reminders 30 days and 7 days before it falls.

**To start an IPC audit:**
1. Go to **IPC → Audits**.
2. Click **Start New Audit**.
3. Confirm the **practice site** and **audit date** (defaults to today).
4. The audit opens at the first section.

**Audit structure:**
IPC audits are divided into sections. Each section maps to a regulatory standard:

| Section | What it covers |
|---------|---------------|
| Hand Hygiene | Handwash basin provision, soap and PPE availability, signage |
| PPE and Waste | Glove/apron stocks, sharps disposal, clinical waste segregation |
| Equipment Decontamination | Cleaning and sterilisation procedures and records |
| Environment | General cleanliness of clinical and non-clinical areas |
| Room-by-Room Checks | Condition of individual clinical rooms (see [3.3](#33-room-by-room-checks)) |
| Staff Competency | IPC training records and induction evidence |
| Policies and Procedures | IPC policy currency and accessibility |

**Completing a section:**
1. Read each question and select the appropriate response (Yes / No / Partial / N/A).
2. Add a **note** to any question if context is needed.
3. Attach a **photo** to any question by tapping the camera icon.
4. When all questions in a section are answered, click **Next Section**.
5. After the final section, click **Submit Audit**.

> **Saving progress:** The audit saves automatically after every question. If you close the app mid-audit, it resumes where you left off.

---

### 3.3 Room-by-Room Checks

The Room Checks section is the most detailed part of the IPC audit. Each clinical room is assessed individually.

**To configure which rooms are included:**
1. Go to **IPC → Settings → Rooms**.
2. Add each clinical room by name (e.g., "Consulting Room 1", "Treatment Room", "Nurse Room").
3. Rooms added here appear automatically in every future audit.

**During the audit — completing a room check:**
1. In the Room Checks section, select the first room from the list.
2. Answer the room-specific questions (surfaces, sink condition, equipment, waste bin, couch roll).
3. Rate the room's overall IPC condition: **Satisfactory**, **Requires Attention**, or **Fail**.
4. If the room is rated **Requires Attention** or **Fail**, an **action** is created automatically (see [3.4](#34-action-tracking)).
5. Move to the next room and repeat.

---

### 3.4 Action Tracking

When an audit question is answered **No**, **Partial**, or a room is rated **Requires Attention** or **Fail**, an action is created automatically.

**Actions contain:**
- Description of the issue
- The audit question or room it relates to
- Regulatory standard it maps to (e.g., "CQC Safe — Infection Control")
- Suggested resolution (AI-generated — see [Section 9](#9-ai-features))
- Assigned to (defaults to Nurse Lead; can be reassigned)
- Due date (set automatically based on severity: critical = 7 days, standard = 30 days)

**To manage open actions:**
1. Go to **IPC → Actions**.
2. Open actions are listed by due date, with overdue items in red.
3. Click an action to view its detail, update progress, add notes, and mark it as **Resolved**.

**To reassign an action:**
1. Open the action.
2. Click **Reassign**, select the new assignee, add a note, and click **Confirm**.

> **Gotcha:** Resolved actions are retained in the audit record permanently. Do not delete an action even if it was logged in error — mark it as resolved and add a note explaining the reason.

---

### 3.5 Exporting an IPC Audit as PDF

1. Go to **IPC → Audits**, click the completed audit.
2. Click **Export PDF**.
3. The PDF includes: cover page (practice, date, auditor), section-by-section results, room check summaries, open and resolved actions, and a regulatory mapping appendix.
4. Click **Download** to save to your device.

> **When to use:** Before a CQC/HIW/HIS inspection, share the most recent IPC audit PDF as part of your evidence pack. The regulatory mapping appendix makes it easy for inspectors to see how each finding maps to their framework.

---

## 4. Cleaning Module

### 4.1 Overview

The Cleaning module manages zone-based cleaning schedules, assigns tasks to staff, and logs compliance against a weekly cleaning grid. Cleaning records are included in inspection evidence packs.

---

### 4.2 Setting Up Cleaning Zones

Zones group rooms or areas into manageable cleaning units.

**To create a zone:**
1. Go to **Cleaning → Zones**.
2. Click **Add Zone**.
3. Enter the **Zone Name** (e.g., "Clinical Zone A", "Reception and Waiting", "Staff Areas").
4. Add the rooms or areas that belong to this zone.
5. Set the **Cleaning Frequency** (daily, twice-daily, weekly, etc.).
6. Set the **Required Evidence** (signature only, photo, or photo + notes).
7. Click **Save**.

**Zone types and suggested frequencies:**

| Zone type | Recommended frequency |
|-----------|-----------------------|
| Clinical rooms | Daily (twice-daily if high patient throughput) |
| Treatment room | After each use + daily deep clean |
| Reception and waiting | Daily |
| Toilets | Daily minimum; twice-daily recommended |
| Staff areas and kitchen | Daily |
| External areas | Weekly |

---

### 4.3 The Weekly Cleaning Grid

The cleaning grid is the primary compliance view for the Cleaning module. It shows every zone mapped against the days of the week, colour-coded by completion status.

**To view the cleaning grid:**
1. Go to **Cleaning → Weekly Grid**.
2. The current week is shown by default. Use the arrow buttons to navigate to previous or future weeks.
3. Each cell shows the cleaning status for that zone on that day:
   - **Green:** Completed and approved
   - **Amber:** Completed, awaiting approval
   - **Red:** Missed or overdue
   - **Grey:** Not scheduled on this day

**To view the detail of any cell:**
1. Click the cell.
2. The submission detail opens: who completed the task, at what time, any notes, and any attached photo.

---

### 4.4 Assigning Cleaning Tasks

**To assign a zone to a staff member:**
1. Go to **Cleaning → Zones**, click the zone.
2. Click **Edit Zone → Assigned To**.
3. Select a named staff member or the **Cleaning Staff** role group.
4. Click **Save**. The zone task appears on the assignee's dashboard each day it is scheduled.

**To reassign a task for a specific day:**
1. On the Weekly Grid, click the red or unassigned cell.
2. Click **Reassign for Today**.
3. Select the staff member and confirm.

---

### 4.5 Completing a Cleaning Task (Staff)

1. Open the **My Tasks** screen.
2. Tap the cleaning task (e.g., "Clinical Zone A — Daily Clean").
3. Confirm you have completed all cleaning activities for that zone.
4. Add any notes (e.g., items needing restocking, maintenance issues spotted).
5. Attach a photo if required by the zone's evidence setting.
6. Tap **Submit**.

---

### 4.6 Reviewing and Approving Cleaning Submissions

1. Go to **Cleaning → Weekly Grid** and click any amber (pending approval) cell.
2. Review the submission details and photo.
3. Click **Approve** or **Flag for Follow-Up**.
4. Flagged submissions generate a cleaning action and notify the assignee.

---

## 5. Fire Safety & HSE

### 5.1 Overview

The Fire Safety & HSE module manages the practice's Fire Risk Assessment, COSHH register, general risk tracking, and annual compliance reminders. It is owned by the Practice Manager or Administrator.

---

### 5.2 Fire Risk Assessment

The Fire Risk Assessment (FRA) is a legally required document that must be reviewed and updated annually (or after significant premises changes).

**To create or update the Fire Risk Assessment:**
1. Go to **Fire Safety → Fire Risk Assessment**.
2. If no FRA exists, click **Create New FRA**. If one exists, click **Review and Update**.
3. Work through the assessment sections:
   - Premises details (building type, occupancy, escape routes)
   - Ignition sources and fuel loads
   - People at risk (staff, patients, visitors)
   - Existing fire controls (detection, suppression, signage, extinguishers)
   - Emergency procedures and training
4. For each risk identified, set the **Risk Level** (Low, Medium, High) and create an **action** if mitigation is needed.
5. On completion, click **Sign Off FRA**. Enter your name and role as the responsible person.
6. Click **Save**. The signed FRA is stored and can be exported as a PDF.

**Annual FRA reminder:**
ReflowAI GP sends a reminder 60 days before the FRA's annual review date. The reminder appears on the Practice Manager dashboard and triggers an email alert.

---

### 5.3 Fire Safety Task Schedule

Routine fire safety checks are managed as scheduled tasks.

**Default fire safety task schedule (auto-generated at setup):**

| Task | Frequency |
|------|-----------|
| Fire alarm panel visual check | Weekly |
| Fire alarm test (zone rotation) | Weekly |
| Emergency lighting test | Monthly |
| Fire extinguisher visual inspection | Monthly |
| Fire door check | Monthly |
| Full evacuation drill | Annually |
| Fire extinguisher service (contractor) | Annually |
| Emergency lighting full test | Annually |

**To edit the schedule:**
1. Go to **Fire Safety → Tasks**.
2. Click any task to edit its frequency, assignee, or evidence requirement.

---

### 5.4 COSHH Register

The COSHH (Control of Substances Hazardous to Health) register lists all hazardous substances used at the practice, their associated risk assessments, and safe use instructions.

**To add a substance:**
1. Go to **Fire Safety & HSE → COSHH Register**.
2. Click **Add Substance**.
3. Enter the **Substance Name**, **Supplier**, **Location where used**, **Hazard Type** (flammable, corrosive, toxic, etc.), and **Review Date**.
4. Upload the **Safety Data Sheet (SDS)** as a PDF attachment.
5. Set the **Risk Level** and add any handling notes.
6. Click **Save**.

**COSHH review reminders:**
Each substance has a review date. ReflowAI GP sends a reminder 30 days before any substance is due for review. Overdue reviews are flagged on the Fire Safety & HSE dashboard.

**To update a substance record:**
1. Go to **COSHH Register**, click the substance.
2. Update any fields and set the new **Review Date**.
3. Click **Save**. The update is logged with a timestamp in the substance's history.

---

### 5.5 General Risk Register

Beyond fire and COSHH, the risk register tracks any other HSE risks identified at the practice.

**To add a risk:**
1. Go to **Fire Safety & HSE → Risk Register**.
2. Click **Add Risk**.
3. Enter the **Risk Description**, **Category** (manual handling, lone working, slips/trips, etc.), **Likelihood** (1–5), and **Impact** (1–5).
4. The platform calculates a **Risk Score** (Likelihood × Impact) automatically.
5. Add **Mitigation Actions** and set a **Review Date**.
6. Click **Save**.

**Risk score colour coding:**

| Score | Level | Action required |
|-------|-------|----------------|
| 1–4 | Low | Review annually |
| 5–9 | Medium | Review six-monthly; ensure mitigations in place |
| 10–16 | High | Immediate action required; escalate to Practice Manager |
| 17–25 | Critical | Stop activity; implement controls before resuming |

---

## 6. Claims Management

### 6.1 Overview

The Claims module manages NHS payment claims including QOF, Enhanced Services, and local incentive schemes. It provides month-end scripts, claim run workflows, manual review tools, and FPPS submission support.

> **Who manages claims:** Practice Managers and Administrators. Claims data is not visible to Nurse Lead or Reception roles.

---

### 6.2 Configuring Claim Types

Before running claims, set up the claim types relevant to your practice.

**To add a claim type:**
1. Go to **Claims → Settings → Claim Types**.
2. Click **Add Claim Type**.
3. Enter the **Name** (e.g., "QOF", "Extended Hours Enhanced Service", "Childhood Immunisations"), **Payment Code**, **Submission Frequency** (monthly, quarterly, annually), and **Submission Deadline** (day of the month or specific date).
4. Click **Save**.

Claim types appear in the claim run workflow once configured.

---

### 6.3 Month-End Claim Scripts

Month-end scripts extract the data needed to support your claim submission. Run scripts at the end of each relevant month before the submission deadline.

**To run a month-end script:**
1. Go to **Claims → Month-End Scripts**.
2. Select the **Claim Month** and **Claim Type**.
3. Click **Run Script**. The script compiles activity data (appointment counts, recall invitations, completed care plans, etc.) from your configured data sources.
4. When the script completes, a summary screen shows the extracted data.
5. Review the output for obvious errors or missing entries.
6. Click **Approve Script Output** to confirm the data is accurate and move to the manual review stage.

> **Gotcha:** Scripts extract data from connected systems. If your clinical system integration is not configured or the feed has lapsed, script output will be incomplete. Check **Settings → Integrations** if data appears missing.

---

### 6.4 Running a Claim

**To run a claim:**
1. Go to **Claims → Claim Runs**.
2. Click **New Claim Run**.
3. Select the **Claim Type**, **Practice Site**, and **Claim Period**.
4. The system pre-populates the claim with the most recent approved script output.
5. Review the claim summary: total activity, calculated value, and any lines flagged for manual review.
6. Click **Proceed to Manual Review** for any flagged items.

---

### 6.5 Manual Review

Some claim lines require a human decision before submission — for example, edge-case patients or activity that the script could not automatically categorise.

**To complete manual review:**
1. Go to **Claims → Claim Runs → [Claim] → Manual Review**.
2. Each flagged line is listed with the reason it requires review (e.g., "Patient registered after period start", "Activity recorded against incorrect code").
3. For each line, select **Include**, **Exclude**, or **Amend**.
4. If amending, enter the corrected value and a note explaining the change.
5. When all flagged lines are resolved, click **Complete Review**.

> **Audit trail:** Every manual review decision is logged with the reviewer's name, timestamp, and reason. This log is included in claim exports.

---

### 6.6 FPPS Submission

After the claim run and manual review are complete, submit to the Family Practitioner Payment System (FPPS).

**To submit a claim:**
1. Go to **Claims → Claim Runs → [Claim] → Submit to FPPS**.
2. Review the final claim summary and confirm the total value.
3. Click **Export Submission File**. The file is generated in the format required by FPPS.
4. Log in to your NHSBSA/FPPS portal and upload the file following your commissioner's submission process.
5. Return to ReflowAI GP and click **Mark as Submitted** with the submission date and reference number.

**Tracking submission status:**
- Go to **Claims → Claim Runs** to see all claims and their status (Draft, In Review, Submitted, Paid, Queried).
- When a payment is received, click the claim and click **Mark as Paid**, entering the payment date and amount for reconciliation.

---

## 7. HR Management

### 7.1 Overview

The HR module manages staff records, appraisals, 360 feedback, mandatory training, DBS checks, and leave requests in one place. It alerts the Practice Manager before any credential or check lapses.

---

### 7.2 Staff Records

Each staff member has a profile containing their employment and compliance information.

**To view or edit a staff record:**
1. Go to **HR → Staff Records**.
2. Click the staff member's name.
3. The record is divided into tabs: Personal Details, Employment, Credentials, Training, Appraisals, and Leave.

**Key fields in each tab:**

| Tab | Key fields |
|-----|-----------|
| Personal Details | Name, contact, emergency contact, NI number |
| Employment | Role, start date, contract type, notice period |
| Credentials | DBS check date and level, NMC/GMC pin, indemnity expiry |
| Training | Mandatory training completion dates |
| Appraisals | Appraisal history, next appraisal due date |
| Leave | Annual leave entitlement, requests, and balances |

---

### 7.3 DBS Checks

**To record a DBS check:**
1. Go to **HR → Staff Records → [Staff Member] → Credentials**.
2. Click **Add DBS Check**.
3. Enter the **Check Date**, **DBS Level** (Basic, Standard, Enhanced, Enhanced with Barred List), **Certificate Number**, and **Outcome** (Clear or Disclosed — do not enter details of any disclosure).
4. Set the **Review Date** (typically three years from check date, or per your practice policy).
5. Click **Save**.

ReflowAI GP sends a reminder 60 days before a DBS review date falls. The Practice Manager dashboard flags any staff member with a lapsed or expiring DBS.

> **Gotcha:** DBS certificates belong to the individual, not the practice. If a staff member moves roles or leaves, the certificate is theirs. Record the check date and outcome; do not retain a copy of the certificate beyond the verification step.

---

### 7.4 Mandatory Training Tracking

**To record a completed training course:**
1. Go to **HR → Staff Records → [Staff Member] → Training**.
2. Click **Add Training Record**.
3. Select the **Training Type** from the list (or add a custom type), enter the **Completion Date**, **Provider**, and **Expiry Date** (if applicable).
4. Upload the **certificate** as a PDF or image.
5. Click **Save**.

**Mandatory training types (auto-configured to your regulator):**

| Training | Typical renewal |
|----------|----------------|
| Basic Life Support | Annual |
| Fire Safety Awareness | Annual |
| Information Governance | Annual |
| Safeguarding Adults (Level 2+) | 3 years |
| Safeguarding Children (Level 2+) | 3 years |
| IPC Awareness | Annual |
| Conflict Resolution | 3 years |
| Manual Handling | 3 years |

**Training matrix view:**
1. Go to **HR → Training Matrix**.
2. All staff are listed against all mandatory training types.
3. Green cells = current; amber = due within 30 days; red = expired or never completed.
4. Export the matrix as a PDF for inspection evidence.

---

### 7.5 Appraisals

**To create an appraisal:**
1. Go to **HR → Appraisals**.
2. Click **New Appraisal**.
3. Select the **Staff Member** and **Appraisal Date**.
4. Complete the appraisal form:
   - Performance review (against objectives set at the previous appraisal)
   - Strengths and development areas
   - New objectives for the coming year
   - Training needs identified
   - Staff member's own comments
5. Click **Save Draft** to return to it later, or **Submit Appraisal** to finalise.
6. The staff member receives a notification to review and countersign the appraisal digitally.

**To view appraisal history:**
1. Go to **HR → Staff Records → [Staff Member] → Appraisals**.
2. All past appraisals are listed chronologically. Click any to view the full record.

---

### 7.6 360 Feedback

360 feedback collects anonymous input from a staff member's peers before or as part of an appraisal.

**To initiate 360 feedback:**
1. Go to **HR → Appraisals → [Appraisal] → 360 Feedback**.
2. Click **Request Feedback**.
3. Select the colleagues you want to invite to provide feedback (minimum 3 recommended).
4. Set the **Response Deadline**.
5. Click **Send Requests**. Each invitee receives an email with a link to a short anonymous feedback form.

**When feedback is received:**
1. Go to **HR → Appraisals → [Appraisal] → 360 Feedback** to see how many responses have been submitted (names are never shown).
2. Once the deadline passes, click **View Summary**. Feedback is presented as anonymised themes and quotes.
3. Include the 360 summary in the appraisal record before the appraisal meeting.

---

### 7.7 Leave Requests

**For staff — submitting a leave request:**
1. Go to **Profile → Leave Requests**.
2. Click **New Request**.
3. Select the **Leave Type** (Annual Leave, Sick Leave, Study Leave, Compassionate Leave, etc.).
4. Enter the **Start Date** and **End Date**.
5. Add any supporting notes.
6. Click **Submit**. The Practice Manager or Administrator receives a notification to review the request.

**For Practice Managers — reviewing leave requests:**
1. Go to **HR → Leave Requests**.
2. Open requests are listed. Click any request to view the staff member's remaining balance and the leave calendar showing other staff already approved for those dates.
3. Click **Approve** or **Decline** (with a mandatory note if declining).
4. The staff member receives a notification of the decision.

---

## 8. Complaints & Incidents

### 8.1 Overview

The Complaints & Incidents module tracks formal complaints and clinical/non-clinical incidents, enforces NHS SLA timelines, and uses AI to identify recurring themes across multiple complaints.

**NHS complaints SLA (England — CQC):**
- **Acknowledgement:** Within 2 working days of receipt
- **Full response:** Within 30 working days of receipt (or an agreed extension communicated in writing)

HIW (Wales) and HIS (Scotland) apply similar timelines — ReflowAI GP applies the correct SLA automatically based on your selected regulator.

---

### 8.2 Logging a Complaint

> **Who can log complaints:** Practice Managers, Administrators, and Reception staff.

**To log a complaint:**
1. Go to **Complaints → Log Complaint**.
2. Enter the **Date Received**, **Received By** (name or role), and **Received Via** (letter, email, in person, telephone).
3. Enter a **Complaint Summary** — describe the nature of the complaint without including patient-identifiable details in free text. Use the **Patient Reference** field for the patient identifier.
4. Select the **Complaint Category** (clinical care, communication, waiting times, staff attitude, etc.).
5. Click **Submit**. The complaint record is created, a reference number assigned, and the Practice Manager notified immediately.

> **Important:** Free-text fields are not encrypted for patient-identifiable information. Use the dedicated **Patient Reference** field for any NHS number or date of birth. Never enter patient names or identifiers in the summary or notes fields.

---

### 8.3 Tracking Complaint SLA

Once logged, each complaint displays an SLA countdown on its record and on the Complaints dashboard.

**SLA stages:**

| Stage | Deadline | Status colour |
|-------|----------|--------------|
| Acknowledgement sent | 2 working days | Red if missed |
| Formal response sent | 30 working days | Amber within 5 days; red if missed |

**To record the acknowledgement:**
1. Open the complaint record.
2. Click **Record Acknowledgement**.
3. Enter the **Date Sent** and **Method** (letter, email).
4. Upload the acknowledgement letter (optional but recommended).
5. Click **Save**. The acknowledgement SLA is marked as met.

**To record the formal response:**
1. Open the complaint record.
2. Click **Record Response**.
3. Enter the **Date Sent**, upload the response letter, and enter a brief **Outcome Summary**.
4. Click **Save**. The response SLA is marked as met and the complaint status moves to **Awaiting Closure**.

**To close a complaint:**
1. Open the complaint, click **Close Complaint**.
2. Enter any lessons learned or improvement actions.
3. Click **Confirm Closure**.

---

### 8.4 SLA Working Day Calculation

The SLA timer counts **working days**, not calendar days. ReflowAI GP excludes weekends and public holidays from the countdown automatically.

> **Gotcha:** The platform uses the public holiday calendar for your selected country. If your practice closes for an additional local day (e.g., a training closure), this is not automatically excluded from the SLA count. Contact support if you need to add a custom exclusion date.

---

### 8.5 Managing Incidents

Incidents (clinical near-misses, significant events, non-clinical accidents) are logged separately from complaints but follow a similar workflow.

**To log an incident:**
1. Go to **Complaints & Incidents → Incidents**.
2. Click **Log Incident**.
3. Enter the **Date and Time**, **Incident Type** (clinical, non-clinical, near-miss, significant event), **Location**, and **Description**.
4. Set the **Severity** (No Harm, Low, Moderate, Severe, Catastrophic).
5. Assign the incident to a **Lead Investigator**.
6. Click **Submit**.

**Incident investigation workflow:**
1. The Lead Investigator receives a notification and opens the incident record.
2. They complete a root cause analysis, adding findings, contributing factors, and recommended actions.
3. Actions are created and assigned to team members with due dates.
4. When all actions are resolved, the investigator clicks **Close Investigation**.
5. The Practice Manager reviews and signs off the closure.

---

### 8.6 AI Theme Analysis (Complaints)

When three or more complaints are logged, the AI analysis feature becomes available.

**To run theme analysis:**
1. Go to **Complaints → AI Analysis**.
2. Select a date range (minimum 3 months recommended for meaningful results).
3. Click **Analyse Themes**.
4. The AI reviews complaint categories and summaries and identifies recurring themes (e.g., "5 complaints in 6 months relate to telephone access").
5. Themes are presented with their frequency, a suggested contributing factor, and a recommended improvement action.

> **Important:** AI theme analysis is a prompt to investigation, not a diagnosis. Review the themes with your team before acting on them.

---

## 9. AI Features

### 9.1 Compliance Score

The AI Compliance Score is a 0–100 rating of your practice's overall compliance health, updated daily.

**Score components:**

| Module | Weighting |
|--------|----------|
| IPC | 25% |
| Cleaning | 15% |
| Fire Safety & HSE | 20% |
| HR (training, DBS, appraisals) | 20% |
| Complaints (SLA adherence) | 10% |
| Claims (submission timeliness) | 10% |

**To view score breakdown:**
1. Go to **AI → Compliance Score**.
2. The score dial is shown with a breakdown by module.
3. Click any module to see the specific factors dragging the score down.

---

### 9.2 Improvement Suggestions

ReflowAI GP continuously analyses your compliance data and surfaces specific improvement suggestions.

**To view suggestions:**
1. Go to **AI → Improvement Suggestions** (or see the suggestions panel on the Practice Manager dashboard).
2. Each suggestion shows:
   - **Priority:** Critical, High, Medium, Low
   - **Module** it relates to
   - **Specific issue** identified (e.g., "3 staff members have IPC training expiring within 14 days")
   - **Recommended action** (e.g., "Book refresher training before [date]")
   - **Regulatory risk** (which CQC/HIW/HIS standard is at risk if not addressed)

**To act on a suggestion:**
1. Click **Create Action** next to the suggestion.
2. The action is added to the relevant module's action list with the suggested description, assignee, and due date pre-populated.
3. Edit if needed, then click **Save Action**.

---

### 9.3 Task Recommendations

When a new staff member is added or a module is set up for the first time, the AI suggests a starter task list based on your practice type and regulator.

**To view task recommendations:**
1. Go to **AI → Task Recommendations**.
2. Review the suggested tasks. Each one shows its regulatory basis and suggested frequency.
3. Click **Add Task** next to any recommendation to create it immediately.
4. Click **Add All** to create all recommended tasks in one step.

---

## 10. Reporting & Exports

### 10.1 Compliance Report

**To generate a compliance report:**
1. Go to **Reports → Compliance Report**.
2. Select the **Practice Site** and **Date Range**.
3. Optionally filter by **Module** (IPC, Cleaning, Fire Safety, etc.).
4. Click **Generate**.
5. Preview on screen, then click **Download PDF**.

**Report contents:**
- Cover page: practice name, ODS code, site, date range, logo
- AI Compliance Score with module breakdown
- Module-by-module summary (completion rates, open actions, flagged items)
- Regulatory standard mapping (which standards are met, partially met, or at risk)
- Open and resolved actions across all modules

---

### 10.2 Inspection Evidence Pack

The inspection evidence pack compiles documents from all modules into a single, inspection-ready PDF.

**To generate an inspection evidence pack:**
1. Go to **Reports → Inspection Evidence Pack**.
2. Select the **Practice Site** and **Inspection Type** (CQC, HIW, or HIS).
3. Set the **Date Range** to cover at least 12 months.
4. Click **Generate Pack**.

**Evidence pack contents:**
- Most recent IPC audit with actions
- Cleaning compliance summary and grid
- Fire Risk Assessment (current signed version)
- COSHH register summary
- HR training matrix (all staff)
- Complaints log with SLA performance
- AI Compliance Score trend

---

### 10.3 HR Reports

**To generate an HR report:**
1. Go to **Reports → HR Report**.
2. Select the **Report Type**:
   - **Training Matrix:** All staff vs all mandatory training (PDF or CSV)
   - **DBS Status:** Current DBS check status for all staff
   - **Appraisal Summary:** Completion rate and upcoming appraisals
   - **Leave Summary:** Leave taken and balances per staff member
3. Set the date range if applicable.
4. Click **Generate** and download.

---

### 10.4 Claims Reports

**To generate a claims report:**
1. Go to **Reports → Claims**.
2. Select the **Claim Type** and **Period**.
3. Choose **Summary** (totals and submission status) or **Detailed** (line-by-line claim data with manual review notes).
4. Click **Generate** and download as PDF or CSV.

---

### 10.5 Exporting Data

For raw data export across any module:
1. Go to **Reports → Data Export**.
2. Select the **Module** and **Data Type**.
3. Apply filters (date range, site, status).
4. Choose **CSV** or **PDF**.
5. Click **Export**.

CSV exports are suitable for importing into Excel, EMIS reporting tools, or your PCN's data warehouse.

---

## 11. Troubleshooting

### 11.1 SLA Calculation Issues

**Symptom:** SLA countdown appears incorrect — complaint shows overdue when it should still be within time, or vice versa.

**Steps:**
1. Confirm the **Received Date** on the complaint is correct. The SLA starts from this date, not the date it was logged in the system.
2. Check that public holidays are correctly configured for your country: go to **Settings → Working Days → Public Holidays** and verify the list for the current year.
3. Confirm your **Regulatory Framework** is set correctly under **Settings → Regulatory Framework**. Different regulators apply slightly different SLA rules.
4. If a complaint was received on a weekend, the SLA clock starts from the next working day. Verify this is being applied by checking the **SLA Start Date** field on the complaint record.

---

### 11.2 Working Day Issues

**Symptom:** SLA timers are counting weekends, or a public holiday was counted as a working day.

**Steps:**
1. Go to **Settings → Working Days**.
2. Confirm that **Saturday** and **Sunday** are marked as non-working days.
3. Go to **Public Holidays** and verify that the public holiday in question is listed for the correct year.
4. If a holiday is missing, click **Add Holiday**, enter the date and name, and click **Save**. Existing complaint SLA countdowns will recalculate automatically.

---

### 11.3 PDF Export Problems

**Symptom:** PDF export fails, downloads a blank document, or the logo does not appear.

**Steps:**
1. Ensure your browser allows pop-ups and file downloads from the ReflowAI GP domain. PDF generation opens a new tab briefly during processing.
2. Try a different browser (Chrome or Edge are recommended for PDF exports).
3. If the logo is missing: go to **Settings → Branding**, re-upload the logo (PNG or SVG, minimum 300 × 100 px), click **Save**, and regenerate the report.
4. For large reports (full-year inspection packs), generation can take up to 60 seconds. Do not click **Generate** a second time — wait for the spinner to complete.
5. If a report generates successfully but the download does not start, check your browser's Downloads folder — the file may have been saved silently.

---

### 11.4 Permission Issues

**Symptom:** A module, button, or record is not visible, or you see "You do not have permission for this action."

**Steps:**
1. Go to **Profile → My Details** and confirm your current role and practice site assignment.
2. Check you are viewing the correct site — some modules are site-specific and switching sites changes what is visible.
3. Confirm with your Practice Manager that your role should include access to the module in question (see the permissions table in [Section 2.4](#24-inviting-staff-and-configuring-roles)).
4. Log out and back in — role changes apply server-side immediately but require a fresh session in the app or browser.

---

### 11.5 Claims Script Failures

**Symptom:** Month-end script runs but returns no data, incomplete data, or an error.

**Steps:**
1. Go to **Settings → Integrations** and check the status of your clinical system connection (EMIS, SystmOne, Vision, etc.). A red **"Disconnected"** badge means the data feed has lapsed and needs to be reconnected.
2. Confirm the **Claim Period** selected in the script matches the period your clinical system has finalised. Running a script against a month that is not yet closed in your clinical system will return partial data.
3. Check that the **Claim Type** is configured correctly under **Claims → Settings → Claim Types** — missing payment codes cause scripts to return empty results for those lines.
4. If the script errors mid-run, click **View Error Log** on the script result screen and share the error code with support.

---

### 11.6 Getting Support

| Method | When to use |
|--------|------------|
| In-app chat (Settings → Help → Chat) | Questions and general issues — fastest response |
| Email support | Complex issues requiring investigation |
| Your Practice Manager | Permissions, user access, billing |
| Status page (Settings → Help → Status) | Check for platform outages before contacting support |

When contacting support, include:
- Your **practice name** and **ODS code**
- The **module** where the issue occurred
- **Browser and device** (or app version)
- A **screenshot** of any error message
- The **date and time** the issue occurred

---

*Last updated: May 2026*
