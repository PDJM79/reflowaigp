# ReflowAI GP — Video Roadmap

> **Purpose:** Identify the highest-impact training videos to onboard GP practice staff quickly and reduce support load.
> **Selection criteria:** Each video must solve a specific friction point, unblock a role, or prevent a common mistake. No filler.

---

## Video 1 — Set Up Your Practice in Under 10 Minutes

**Target Audience:** Practice Manager (new customers, day one)
**Estimated Runtime:** 8–10 minutes
**Priority:** P0 — must exist before launch

### Why This Video
Practice Managers are time-pressured. If the initial setup requires more than one session to complete, they hand it off to an Administrator who lacks context, or they abandon it entirely. This video demonstrates that a practice can be fully configured — regulator selected, staff invited, first tasks live — in a single focused session.

### Script Outline
1. Create your practice account — what each field means, why the ODS code matters for compliance exports
2. Selecting your regulatory framework — CQC vs HIW vs HIS, why this cannot easily be changed later, and what changes in the platform depending on which you pick
3. Inviting your first team members — the four roles, who needs which one, and the one permission mistake that locks Administrators out of Claims
4. Reviewing the auto-configured task set — what gets created automatically based on your regulator, and which tasks to add or remove for your practice type
5. Confirming everything is live — Practice Manager and Nurse Lead views side by side, AI compliance score baseline

### What to Show on Screen
- Signup → Create Practice — highlight ODS Code and CQC Provider ID fields explicitly
- Settings → Regulatory Framework — show the dropdown, show the template differences between CQC and HIW after selection
- Settings → Team → Invite Member — walk through all four roles, pause on the Claims permission row in the table
- Dashboard after setup — show the compliance score starting at a realistic baseline (not a misleading 100)
- Split screen: Practice Manager dashboard vs Nurse Lead dashboard of the same practice

### Call-to-Action
> "Your practice is live. Next: watch Video 2 to run your first IPC audit — the single most important compliance activity before any CQC inspection."

---

## Video 2 — Running an IPC Audit End-to-End

**Target Audience:** Nurse Lead / Practice Manager
**Estimated Runtime:** 8–10 minutes
**Priority:** P0 — the most inspection-critical workflow in the platform

### Why This Video
IPC audits are due every six months and are the first evidence CQC inspectors request. Nurse Leads who have never used the module either rush through it without meaningful evidence or avoid it and fall back to paper. This video walks the entire workflow — start to submitted PDF — so there is no ambiguity about what a complete audit looks like.

### Script Outline
1. When IPC audits are due and what happens if you miss the six-month window — the platform reminder system and what a lapsed audit does to your compliance score
2. Starting an audit — navigating the seven sections, how progress saves automatically so you can pause and return
3. The room-by-room check in detail — what Satisfactory vs Requires Attention vs Fail means, and why choosing the right rating matters for the action list
4. How actions are created automatically from failed questions — severity, due dates, and why the Nurse Lead is the default assignee
5. Exporting the audit as a PDF — what the regulatory mapping appendix is and why inspectors specifically look for it

### What to Show on Screen
- IPC → Audits → Start New Audit — confirm site and date, first section opens
- Slow walkthrough of the Hand Hygiene section — demonstrate answering Yes, No, and Partial with notes on each
- Room Checks section — select a room, answer questions, rate as Requires Attention, show the action being created in real time
- IPC → Actions — the newly created action with its severity badge, due date, and regulatory standard tag
- Export PDF → download → open the PDF — scroll to the regulatory mapping appendix and explain each column

### Call-to-Action
> "Run this audit every six months, export the PDF immediately, and save it. When an inspector arrives, you can hand them this document in under 30 seconds. Next: watch Video 3 to set up your fire safety module — the second most common inspection request."

---

## Video 3 — Fire Safety, COSHH, and the Risk Register

**Target Audience:** Practice Manager / Administrator
**Estimated Runtime:** 7–8 minutes
**Priority:** P1 — commonly skipped at setup, then urgent when inspection is announced

### Why This Video
Fire Safety and COSHH are almost always set up under time pressure — either during a CQC preparation sprint or after a Premises Assurance Model review flags gaps. Practices that watch this video during initial onboarding have everything in place before it becomes urgent. Practices that don't watch it until an inspection is booked spend a stressful week backfilling records.

### Script Outline
1. The three components — Fire Risk Assessment, COSHH Register, and Risk Register — what each covers and who is responsible
2. Creating the Fire Risk Assessment — working through the five sections, how to rate a risk, how signing off the FRA locks it as a dated record
3. The annual review reminder — where to find it on the dashboard, what happens if you dismiss it without completing the review
4. Building the COSHH register — adding a substance, uploading the Safety Data Sheet, setting the review date, what happens when a substance goes overdue
5. The Risk Register — adding a manual handling risk as a worked example, understanding the risk score calculation, what a score above 10 triggers

### What to Show on Screen
- Fire Safety & HSE module overview — three tiles: FRA, COSHH, Risk Register
- Fire Safety → Fire Risk Assessment → Create New — walk through Premises Details and Ignition Sources sections, create one action for a medium risk
- Sign Off FRA → name and role field → saved record with timestamp
- COSHH Register → Add Substance — all fields, upload a sample SDS PDF, set a review date 12 months out
- Risk Register → Add Risk — Manual Handling example, set Likelihood 3 and Impact 4, show score auto-calculates to 12 (High), see the escalation prompt

### Call-to-Action
> "Set these up once and the platform reminds you when reviews are due. You won't need to remember. Next: watch Video 4 to learn how to track complaints and never miss an NHS SLA deadline again."

---

## Video 4 — Complaint SLA Tracking and the 30-Day Response Workflow

**Target Audience:** Practice Manager / Administrator / Reception
**Estimated Runtime:** 6–7 minutes
**Priority:** P0 — SLA breaches are a direct CQC finding

### Why This Video
Missed complaint SLA deadlines are one of the most common and most avoidable CQC findings. The 2-day acknowledgement and 30-day response windows sound generous until a busy week passes and neither has been done. This video makes the SLA tracking system concrete — what the counters mean, who needs to act, and exactly what to record at each stage.

### Script Outline
1. Logging a complaint correctly — the patient reference field vs the free-text summary, why personal identifiers must never go in the description field
2. The SLA countdown explained — how working days are calculated, what happens on bank holidays, and where to find the SLA start date if the received date was entered incorrectly
3. Recording the acknowledgement — what counts as a valid acknowledgement, where to upload the letter, what the SLA status shows after it is recorded
4. Recording the formal response — uploading the response letter, entering the outcome summary, moving the complaint to Awaiting Closure
5. Closing a complaint — lessons learned field, why this matters for the AI theme analysis that runs after three or more complaints

### What to Show on Screen
- Complaints → Log Complaint — focus on Patient Reference field vs Summary field, demonstrate the warning that appears if a common identifier pattern is typed in the free-text area
- Complaint record — SLA countdown clock, SLA Start Date field, working-day calculation note
- Record Acknowledgement → date, method, upload letter → SLA stage marked green
- Record Response → upload letter, outcome summary → status moves to Awaiting Closure
- Close Complaint → lessons learned field → status moves to Closed → confirmation that this complaint will now feed the AI theme analysis

### Call-to-Action
> "Log every complaint the same day it is received — that is when the SLA clock starts, not when you get around to entering it. Next: watch Video 5 to learn how to use the AI improvement suggestions to close compliance gaps before an inspector finds them."

---

## Video 5 — Using AI Improvement Suggestions

**Target Audience:** Practice Manager
**Estimated Runtime:** 5–6 minutes
**Priority:** P1 — the feature that differentiates ReflowAI GP from generic compliance tools

### Why This Video
AI suggestions are the feature most likely to drive renewal — practices that act on them consistently improve their compliance score and arrive at inspections better prepared. But the feature is also the most commonly misunderstood: Practice Managers either ignore the suggestions (treating them as noise) or over-rely on them (acting without reviewing the underlying records). This video establishes the right mental model.

### Script Outline
1. What the AI compliance score is and what it is not — a prompt to investigate, not a regulatory rating or CQC prediction
2. How to read the score breakdown — the five components, what drags the score down most, why HR and Complaints together account for 30%
3. The suggestions panel — priority levels, what Critical means vs High, how to tell a genuine gap from a data quality issue
4. Turning a suggestion into an action — one click to create an assigned task with a pre-populated due date, how to edit before saving
5. The one thing AI cannot catch — context behind records that only the Practice Manager knows, why human review of suggestions is mandatory not optional

### What to Show on Screen
- AI → Compliance Score — score dial, five-component breakdown, click IPC to drill into what is dragging that component
- AI → Improvement Suggestions — list view with priority badges, click a Critical suggestion to expand the detail panel
- Suggestion detail — specific issue described, regulatory standard at risk, recommended action with suggested due date
- Click Create Action → action detail screen pre-populated → edit assignee and due date → Save Action
- Navigate to the module the action was created in and confirm it appears in the action list

### Call-to-Action
> "Review AI suggestions every Monday morning — it takes five minutes and gives you a prioritised list of exactly what to fix. Next: watch Video 6 to run a full claims cycle from month-end script to FPPS submission."

---

## Video 6 — Running a Claims Cycle End-to-End

**Target Audience:** Practice Manager / Administrator
**Estimated Runtime:** 8–9 minutes
**Priority:** P0 — revenue-critical; mistakes here cost the practice money

### Why This Video
Claims are the highest-stakes module in ReflowAI GP. A missed QOF submission or an incorrectly excluded claim line is direct revenue loss. Administrators who have never seen the full workflow tend to run the script and submit without completing the manual review step — which is where edge cases and errors live. This video makes every step of the cycle explicit and explains why skipping any of them is risky.

### Script Outline
1. The claims workflow overview — script → review → claim run → manual review → FPPS export → mark as submitted — why each step exists
2. Running the month-end script — selecting the right claim type and period, what "clinical system feed not connected" looks like and how to fix it before running the script
3. Approving script output — what to look for in the summary, the two most common data errors (wrong code, activity against a closed patient record)
4. The manual review step — what flagged lines mean, how to Include, Exclude, or Amend, and why every decision is logged in the audit trail
5. Exporting to FPPS and marking as submitted — what the submission file contains, where to upload it in the NHSBSA portal, what to do when a claim comes back queried

### What to Show on Screen
- Claims → Month-End Scripts → New Script — claim type dropdown, period selector, Run Script
- Script summary screen — total activity, calculated value, any data warnings highlighted in amber
- Claims → Claim Runs → [Claim] → Manual Review — flagged line list, click one line, select Amend, enter corrected value and note
- Audit trail of manual review decisions — name, timestamp, reason all visible
- Export Submission File → download → open NHSBSA portal (blurred) → return to platform → Mark as Submitted → enter reference number
- Claims → Claim Runs — status moves from Submitted to Paid after entering payment date

### Call-to-Action
> "Run this workflow the same way every month — script, review, submit, mark as paid. The audit trail protects you if any claim is ever queried. Next: watch Video 7 to learn how to run HR appraisals and keep your training matrix inspection-ready."

---

## Video 7 — HR Appraisals, Training Tracking, and the Compliance Matrix

**Target Audience:** Practice Manager / Administrator
**Estimated Runtime:** 7–8 minutes
**Priority:** P1 — the HR module is the most data-intensive and the most commonly incomplete at inspection

### Why This Video
CQC inspectors routinely request the training matrix and appraisal records for all clinical staff. Practices that manage HR in spreadsheets almost always have gaps — lapsed DBS checks, training expiries that nobody noticed, appraisals recorded as done but never signed off. This video shows how ReflowAI GP surfaces those gaps automatically and how to close them before they become findings.

### Script Outline
1. The HR module overview — staff records, training matrix, DBS checks, appraisals, and leave — and how they connect to the AI compliance score
2. Recording a mandatory training completion — selecting the training type, uploading the certificate, setting the expiry date, why the expiry date is the critical field
3. The training matrix — how to read it, what amber means vs red, how to export it as a PDF for an inspector in under 30 seconds
4. Running an appraisal with 360 feedback — initiating feedback requests, reviewing the anonymised summary, completing the appraisal form, getting the staff member to countersign digitally
5. DBS checks — what to record and what not to record (the certificate belongs to the individual, never retain a copy beyond verification)

### What to Show on Screen
- HR → Staff Records → [Staff Member] → Training → Add Training Record — all fields, upload a sample certificate PDF, set expiry date
- HR → Training Matrix — full matrix view, hover over an amber cell to show the expiry date and days remaining
- Export Training Matrix PDF → download → open — show how it looks when handed to an inspector
- HR → Appraisals → New Appraisal → 360 Feedback → Request Feedback — colleague selection, deadline setting, confirmation email sent
- 360 Feedback → View Summary — anonymised themes, no names visible
- Appraisal form submission → staff member countersign notification → digital signature appended to record

### Call-to-Action
> "Export the training matrix every quarter and save it — it takes 30 seconds and means you always have an up-to-date record ready. Use Settings → Help → Chat if you need support with any of these modules."

---

## Production Notes

**Recommended order of production:**
1. Video 1 (Practice Setup) — nothing else is accessible until this is done
2. Video 2 (IPC Audit) — the most inspection-critical workflow; highest anxiety for Nurse Leads
3. Video 4 (Complaint SLA) — SLA breaches are direct CQC findings; high urgency for Practice Managers
4. Video 6 (Claims) — revenue-critical; Administrators need this before their first month-end
5. Video 5 (AI Suggestions) — differentiating feature; best shown after users have enough data for suggestions to appear
6. Video 3 (Fire Safety & COSHH) — important but lower daily-use frequency; record after core workflows
7. Video 7 (HR Appraisals) — detailed and data-intensive; most effective after users are comfortable with the platform

**Format recommendations:**
- Screen recording with voiceover — no talking head required
- Captions on all videos (accessibility, and GP practice offices are often noisy)
- Chapter markers at each script section — Practice Managers will skip to the specific step they need
- 1080p minimum — HR matrix and claims tables contain small text that must be legible
- Host on a platform that supports in-app embedding (Loom, Wistia, or Vimeo)

**What to avoid:**
- Don't record Video 2 (IPC) with a practice that has zero rooms configured — add at least four realistic clinical rooms before recording
- Don't record Video 4 (Complaints) using dummy patient data — use clearly fictional names (e.g., "Test Patient A") and blur any field that looks like real patient information
- Don't skip the manual review step in Video 6 (Claims) — this is where most claim errors occur and where Administrators need the most guidance
- Don't record the AI suggestions panel with an empty or perfect-score practice — suggestions only appear when there are genuine gaps, so use a demo account with realistic compliance history
- Don't end the claims video without showing the "Mark as Submitted" step — Administrators who export the file and close the tab without marking it as submitted lose the submission audit trail
