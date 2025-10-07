# Master User Guide - Healthcare Practice Management System

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Master User Functionality](#master-user-functionality)
5. [Dashboard & Scoring](#dashboard--scoring)
6. [Task Management](#task-management)
7. [Process Management](#process-management)
8. [Evidence Collection](#evidence-collection)
9. [HR Management](#hr-management)
10. [Incident Reporting](#incident-reporting)
11. [Complaints Management](#complaints-management)
12. [Medical Requests](#medical-requests)
13. [Fridge Temperature Monitoring](#fridge-temperature-monitoring)
14. [Month-End Scripts](#month-end-scripts)
15. [Claims Management](#claims-management)
16. [Policy Documents](#policy-documents)
17. [Risk Register](#risk-register)
18. [Fire Safety](#fire-safety)
19. [Infection Control](#infection-control)
20. [Cleaning Management](#cleaning-management)
21. [Reports & Analytics](#reports--analytics)
22. [Calendar & Schedule](#calendar--schedule)
23. [Settings & Configuration](#settings--configuration)
24. [Security Best Practices](#security-best-practices)

---

## Introduction

This Healthcare Practice Management System is designed to help medical practices manage compliance, operations, and quality improvement across multiple regulatory frameworks (CQC for England, HIW for Wales, HIS for Scotland).

### Key Features
- Country-specific audit compliance tracking
- Task and process management with SLA monitoring
- Evidence collection with photo capture
- HR management (appraisals, training, leave)
- Incident and complaint tracking
- Medical request workflow
- Temperature monitoring for medication storage
- Comprehensive reporting and analytics
- AI-powered improvement suggestions

---

## Getting Started

### Initial Setup

#### 1. Account Creation
1. Navigate to the application URL
2. Click "Sign Up" on the authentication page
3. Enter your email address and create a secure password
4. Verify your email address (check spam folder if not received)

#### 2. Organization Setup (Practice Managers Only)
After first login, you'll be prompted to complete organization setup:

**Required Information:**
- **Practice Name**: Official name of your medical practice
- **Country**: Select Wales, England, or Scotland
  - Wales: Follows HIW (Healthcare Inspectorate Wales) standards
  - England: Follows CQC (Care Quality Commission) standards
  - Scotland: Follows HIS (Healthcare Improvement Scotland) standards
- **Practice Address**: Full postal address
- **Contact Phone**: Main practice phone number
- **Contact Email**: Primary practice email

**Important:** The country selection determines which regulatory standards and processes are applied to your practice.

#### 3. First Login
After setup completion:
- You'll be directed to the dashboard
- Default password users must change their password on first login
- Enable two-factor authentication (MFA) for enhanced security

---

## User Roles & Permissions

### Role Hierarchy

#### Master User
- **Access**: All practices across the system
- **Permissions**: Full administrative access to any practice
- **Use Case**: System administrators and ReflowAI support team
- **Key Functions**:
  - Switch between practices
  - Create and manage users across all practices
  - View all data across the system
  - Emergency access for support and troubleshooting

#### Practice Manager
- **Access**: Single practice (their assigned practice)
- **Permissions**: Full administrative control within their practice
- **Use Case**: Practice managers, senior partners
- **Key Functions**:
  - Manage all users and role assignments
  - Create and modify task templates
  - Approve leave requests
  - Generate reports
  - Configure practice settings
  - Manage all data within the practice

#### Administrator
- **Access**: Single practice
- **Permissions**: Elevated permissions for operational management
- **Use Case**: Practice administrators, office managers
- **Key Functions**:
  - Manage tasks and processes
  - Assign tasks to users
  - View all practice data
  - Create medical requests
  - Manage task templates

#### Specialized Roles

**IG Lead (Information Governance Lead)**
- Manage policy documents
- Handle complaints and redactions
- Oversee data protection compliance
- Create and manage policies

**Estates Lead**
- Manage fridges and temperature monitoring
- Oversee facility-related tasks
- Handle fire safety compliance

**Nurse Lead**
- Manage clinical processes
- Oversee infection control
- Access fridge temperature logs
- Manage clinical tasks

**Reception Lead**
- View and create complaints
- Manage front-desk tasks
- Oversee reception team

**Reception**
- Create complaints
- Submit basic forms
- Complete assigned tasks

**Group Manager**
- Manage groups across practices
- Oversee multi-practice operations

#### Standard User
- **Access**: Limited to assigned tasks and relevant data
- **Permissions**: View and complete assigned tasks
- **Use Case**: General practice staff
- **Key Functions**:
  - View assigned tasks
  - Submit task evidence
  - View relevant practice information
  - Update own profile

---

## Master User Functionality

### Creating the Master User Account

**Initial Setup:**
1. Access the admin panel during initial system setup
2. Use the "Create Master User" component
3. Default credentials are provided for phil@reflowai.co.uk
4. Change password immediately after first login

### Accessing Practices as Master User

#### Practice Selection
1. After login, you'll see the Practice Selector screen
2. View all practices in the system with user counts
3. Select a practice from the dropdown
4. Click "Enter Practice" to access that practice's data

#### Switching Between Practices
1. The current practice name is displayed in the header
2. Click on the practice name to return to practice selector
3. Select a different practice to switch contexts
4. All data and actions will apply to the currently selected practice

#### Master User Capabilities
- **View All Data**: Access to all tasks, processes, and records across practices
- **Create Users**: Set up accounts for any practice
- **Emergency Access**: Override permissions when needed for support
- **System Configuration**: Modify system-wide settings
- **Audit Trail**: All master user actions are logged

**Best Practices:**
- Always verify you're in the correct practice before making changes
- Document any changes made as master user
- Use master access only when necessary
- Regular users should never be given master permissions

---

## Dashboard & Scoring

### Understanding the Dashboard

#### Score Overview
The dashboard displays your practice's current audit readiness score:

**Score Components:**
- **Overall Score**: 0-100 scale representing total compliance
- **Section Scores**: Individual scores for each audit domain
- **Target Score**: Your practice's goal (customizable)
- **Gap Analysis**: Difference between current and target scores

#### Regulatory Framework Display
Based on your country selection:
- **Wales**: Healthcare Inspectorate Wales (HIW) standards
- **England**: Care Quality Commission (CQC) standards
- **Scotland**: Healthcare Improvement Scotland (HIS) standards

### Score Calculation

**Contributing Factors:**
1. **Task Completion Rate**: Percentage of tasks completed on time
2. **Process Adherence**: Compliance with defined processes
3. **Evidence Quality**: Completeness of evidence collection
4. **Training Compliance**: Staff training up-to-date
5. **Policy Management**: Policies reviewed and current
6. **Incident Management**: Incidents properly documented and resolved

**Gates (Minimum Requirements):**
- Certain tasks or processes are "gates" - mandatory for score progression
- Red gates (0 points) must be addressed immediately
- Amber gates (partial credit) should be prioritized
- Green gates (full credit) maintain your score

### Areas of Concern

**Low-Scoring Sections:**
- Dashboard highlights sections scoring below target
- View contributors: See specific tasks or processes affecting the score
- Access gap analysis: Understand what's needed to reach target

**AI Improvement Tips:**
1. Click "Get AI Improvement Tips" on any area of concern
2. System analyzes your specific situation (score, country, contributors)
3. Provides two actionable suggestions for improvement
4. Tips are context-aware and practical

### Score History
- **Score Snapshot**: Daily snapshots of your score
- **Trend Analysis**: View score changes over time
- **Section Breakdown**: Track improvement in specific areas
- **Contributor History**: See what changed and when

---

## Task Management

### Understanding Tasks

**Task Types:**
- **Template-Based**: Created from predefined templates
- **Ad-Hoc**: Manually created for specific needs
- **Recurring**: Automatically generated based on schedule
- **Process-Linked**: Part of a larger process workflow

### Creating Tasks

#### From Templates (Administrators & Practice Managers)
1. Navigate to "Task Templates"
2. Browse available templates by module
3. Click "Create Task from Template"
4. Configure:
   - **Due Date**: When task must be completed
   - **Assigned To**: User or role responsible
   - **Priority**: High, Medium, or Low
   - **Notes**: Additional context
5. Click "Create Task"

#### Ad-Hoc Tasks (Administrators & Practice Managers)
1. Go to "Tasks List"
2. Click "Create New Task"
3. Fill in:
   - **Title**: Brief description
   - **Description**: Detailed instructions
   - **Module**: Category (HR, Compliance, Clinical, etc.)
   - **Due Date**: Deadline
   - **Priority**: Urgency level
   - **Assigned To**: User or role
   - **Requires Photo**: Toggle if evidence photo needed
4. Save task

### Working with Tasks

#### Viewing Your Tasks
1. Navigate to "Tasks List" or Dashboard
2. Filter by:
   - **Status**: Open, In Progress, Completed, Overdue, Returned
   - **Priority**: High, Medium, Low
   - **Module**: Category filter
   - **Assigned To**: Your tasks or team tasks
3. Sort by due date, priority, or creation date

#### Completing a Task
1. Open the task from the list
2. Review task description and requirements
3. Complete the required actions
4. **Submit Evidence**:
   - Upload photos if required
   - Add notes and observations
   - Fill out any forms
5. Click "Mark as Complete"
6. Task is submitted for review

#### Task Returns
If a task is returned by an administrator:
1. You'll see "Returned" status
2. View return reason and notes
3. Review feedback
4. Make corrections
5. Resubmit task

### Task Templates

#### Viewing Templates
1. Navigate to "Task Templates"
2. Browse by module
3. View template details:
   - JSON schema (form structure)
   - UI schema (form appearance)
   - Default assignee role
   - Evidence requirements
   - SLA rules

#### Creating Templates (Practice Managers)
1. Click "Create New Template"
2. Configure:
   - **Title & Description**
   - **Module**: Category
   - **Default Assignee Role**: Who typically completes this
   - **SLA Type**: None, Fixed Duration, or Business Hours
   - **Due Rule**: When task becomes due
   - **Requires Photo**: Yes/No
   - **Allowed Roles**: Who can complete this task
   - **JSON Schema**: Form field definitions
   - **UI Schema**: Form layout and widgets
   - **Evidence Tags**: Categories for evidence collection
3. Save template

#### Editing Templates
1. Open existing template
2. Modify fields as needed
3. Save changes
4. New tasks will use updated template (existing tasks unchanged)

### Task Statuses

- **Open**: Newly created, not yet started
- **In Progress**: User is working on the task
- **Completed**: Task finished and submitted
- **Overdue**: Past due date and not completed
- **Returned**: Sent back for corrections

### Priority Levels

- **High**: Urgent, immediate attention required
- **Medium**: Important, complete within normal timeframe
- **Low**: Can be completed when time permits

---

## Process Management

### Understanding Processes

**Processes** are multi-step workflows that create scheduled task instances based on defined templates and schedules.

**Key Concepts:**
- **Process Template**: Master definition of a recurring workflow
- **Process Instance**: Individual occurrence of the process
- **Period**: Time range the process covers (e.g., monthly, quarterly)
- **Due Date**: When the process must be completed
- **Assignee**: User or role responsible

### Process Lifecycle

#### 1. Pending
- Process instance created but not started
- Assignee notified
- Shows in schedule and calendar

#### 2. In Progress
- Assignee has started work
- Evidence being collected
- Forms being completed

#### 3. Completed
- All steps finished
- Evidence submitted
- Signed off by authorized user

### Viewing Processes

#### All Processes Page
1. Navigate to "All Processes"
2. View all process templates:
   - Title and description
   - Module category
   - Frequency (Daily, Weekly, Monthly, etc.)
   - Responsible role
   - Process steps

#### Your Process Instances
1. Go to "Tasks List"
2. Filter by process-linked tasks
3. Or view in Dashboard under assigned processes

### Working with Process Instances

#### Starting a Process
1. Open pending process instance
2. Review process template and steps
3. Click "Start Process"
4. Status changes to "In Progress"

#### Completing Process Steps
1. Follow each step in sequence
2. Collect evidence for each step
3. Complete required forms
4. Add notes and observations

#### Submitting Completed Process
1. Verify all steps completed
2. Review collected evidence
3. Click "Submit for Sign-Off"
4. Authorized user must approve

### Process Scheduling

**Frequency Options:**
- **Daily**: Every day
- **Weekly**: Once per week
- **Fortnightly**: Every two weeks
- **Monthly**: Once per month
- **Quarterly**: Every three months
- **Biannually**: Twice per year
- **Annually**: Once per year

**Auto-Generation:**
- Process instances are automatically created based on schedule
- Created in advance so assignees can plan
- Due dates calculated based on frequency and rules

### Creating Process Templates (Practice Managers)

1. Navigate to "All Processes"
2. Click "Create New Process Template"
3. Configure:
   - **Title**: Process name
   - **Description**: What this process achieves
   - **Module**: Category
   - **Frequency**: How often it occurs
   - **Default Assignee Role**: Who typically does this
   - **Steps**: Define each step with instructions
   - **Evidence Requirements**: What proof is needed
   - **SLA Rules**: How due dates are calculated
4. Save template

---

## Evidence Collection

### Types of Evidence

#### Photo Evidence
- **Use Case**: Visual proof of completion, conditions, issues
- **Requirements**: Clear, well-lit, identifiable
- **Storage**: Secure Supabase storage with encryption

#### Document Evidence
- **Use Case**: Certificates, reports, signed forms
- **Formats**: PDF, images, Word documents
- **Metadata**: Automatically captured (date, time, user)

#### Link Evidence
- **Use Case**: Reference to external resources
- **Examples**: SharePoint documents, policy links
- **Verification**: URL validation

### Capturing Evidence

#### Camera Capture
1. Open task or form requiring evidence
2. Click "Add Photo Evidence"
3. Options:
   - **Take Photo**: Use device camera
   - **Upload File**: Select from device
4. Photo is captured with:
   - Timestamp
   - GPS location (if permitted)
   - Device information
   - User ID
5. Add description or notes
6. Submit evidence

#### File Upload
1. Click "Upload Evidence"
2. Select file from device
3. System captures:
   - File size
   - MIME type
   - SHA256 hash (for integrity)
   - Upload timestamp
4. Add tags for categorization
5. Link to task or submission
6. Upload complete

### Evidence Metadata

**Automatically Captured:**
- **Server Timestamp**: When evidence was uploaded
- **Device Timestamp**: When photo was taken/file created
- **Created By**: User who submitted evidence
- **Location Data**: GPS coordinates (if available)
- **File Hash**: SHA256 for tamper detection
- **Tags**: Categories for organization

### Evidence Security

**Access Control:**
- Evidence linked to practice - only practice users can access
- RLS policies enforce practice boundaries
- Audit trail of all evidence access

**Storage:**
- Encrypted at rest in Supabase Storage
- Secure URLs with time-limited access
- Optional SharePoint integration for policy documents

**Integrity:**
- SHA256 hashing detects tampering
- Immutable once submitted (can't be edited)
- Full audit trail of evidence lifecycle

### Viewing Evidence

#### In Tasks
1. Open completed task
2. View "Evidence" section
3. Click thumbnails to view full size
4. Download if needed
5. View metadata

#### In Reports
1. Generate evidence report
2. Filter by date range, type, tags
3. Export report with evidence links

---

## HR Management

### Employee Records

#### Creating Employee Records
1. Navigate to "HR" section
2. Click "Add Employee"
3. Enter:
   - **Name**: Full legal name
   - **Email**: Work email
   - **Role**: Job role (from enum)
   - **Start Date**: Employment start date
   - **Manager**: Reporting line manager
   - **User Account**: Link to system user (optional)
4. Save employee

#### Managing Employees
- **View All**: List of all employees
- **Edit**: Update employee information
- **Set Manager**: Establish reporting structure
- **Link User**: Connect to system login account
- **End Employment**: Set end date (keeps record)

### Appraisals

#### Scheduling Appraisals
1. Go to "HR" > "Appraisals"
2. Click "Schedule New Appraisal"
3. Select:
   - **Employee**: Who is being appraised
   - **Reviewer**: Manager conducting appraisal
   - **Period**: Time period covered (e.g., "2024 Q1")
   - **Scheduled Date**: When appraisal will occur
4. Save appraisal

#### Conducting Appraisals
1. Open scheduled appraisal
2. Complete appraisal form:
   - Performance review
   - Goals and objectives
   - Development needs
   - Rating or grade
3. Link to form submission if using structured form
4. Mark as completed
5. Set completion date

#### Employee Acknowledgment
1. Employee receives notification
2. Employee reviews appraisal
3. Employee clicks "Acknowledge"
4. Timestamp recorded as proof of review

#### Appraisal Status
- **Scheduled**: Not yet conducted
- **Completed**: Finished by reviewer
- **Acknowledged**: Employee has reviewed

### Training Records

#### Adding Training
1. Navigate to "HR" > "Training"
2. Click "Add Training Record"
3. Enter:
   - **Employee**: Who completed training
   - **Course Name**: Training title
   - **Completion Date**: When completed
   - **Expiry Date**: When renewal needed (optional)
   - **Certificate**: Upload evidence
4. Save record

#### Training Tracking
- **Upcoming Expirations**: Dashboard shows training due for renewal
- **Compliance Reporting**: Generate training compliance reports
- **Certificate Storage**: Evidence linked to training records

#### Training Compliance
- System flags expired training
- Alerts when training approaching expiry
- Training status affects audit scores

### Leave Management

#### Leave Policies
**Practice Managers Set:**
1. Go to "HR" > "Leave Policies"
2. Create policy with:
   - **Policy Name**: e.g., "Standard Leave Policy"
   - **Annual Days**: Number of leave days per year
3. Assign to employees

#### Requesting Leave (Employees)
1. Navigate to "HR" > "Leave Requests"
2. Click "Request Leave"
3. Enter:
   - **Start Date**: First day of leave
   - **End Date**: Last day of leave
   - **Reason**: Optional explanation
4. System calculates days count
5. Submit request

#### Approving Leave (Managers)
1. View pending leave requests
2. Review:
   - Employee details
   - Leave dates
   - Days count
   - Current leave balance
   - Team coverage
3. Options:
   - **Approve**: Grant leave
   - **Deny**: Decline with reason
4. Employee notified of decision

#### Leave Status
- **Pending**: Awaiting manager approval
- **Approved**: Leave granted
- **Denied**: Request declined

#### Leave Balances
- System tracks used and remaining leave days
- Based on policy allocation
- Adjusts with approvals
- Resets annually

---

## Incident Reporting

### Creating Incidents

#### New Incident Report
1. Navigate to "Incidents"
2. Click "Report New Incident"
3. Fill in:
   - **Incident Date/Time**: When it occurred
   - **Location**: Where in practice
   - **Description**: Detailed account
   - **RAG Status**: Red (serious), Amber (moderate), Green (minor)
   - **Themes**: Categories (patient safety, equipment, etc.)
4. **Add Photos**: Capture evidence
5. **Reported By**: Automatically set to current user
6. Submit incident

### RAG Status

**Red (High Severity):**
- Serious patient harm
- Major safety breach
- Immediate action required
- Escalate to management

**Amber (Medium Severity):**
- Potential for harm
- Requires investigation
- Action needed but not urgent

**Green (Low Severity):**
- Near miss
- Minor issue
- For learning and improvement

### Incident Themes

Common categories:
- Patient Safety
- Staff Safety
- Equipment Failure
- Medication Error
- Communication Breakdown
- Policy Non-Compliance
- Facility Issue

### Managing Incidents

#### Incident Workflow
1. **Open**: Newly reported
2. **Under Investigation**: Being reviewed
3. **Action Required**: Corrective measures needed
4. **Closed**: Resolved and documented

#### Adding Actions
1. Open incident
2. Click "Add Action"
3. Record:
   - **Action Description**: What needs to be done
   - **Responsible Person**: Who will do it
   - **Due Date**: Completion deadline
   - **Status**: Planned, In Progress, Complete
4. Save action

#### Tracking Actions
- View all actions associated with incident
- Monitor completion status
- Update progress
- Mark as complete when done

### Incident Reports

**Generate Reports:**
- Filter by date range, RAG status, themes
- Export for review meetings
- Analyze trends
- Identify recurring issues

---

## Complaints Management

### Receiving Complaints

#### Creating a Complaint
1. Navigate to "Complaints"
2. Click "Register New Complaint"
3. Enter:
   - **Received At**: Date/time received
   - **Channel**: Email, phone, letter, in person
   - **Description**: Full details of complaint
   - **EMIS Hash**: Patient identifier (optional)
4. System auto-calculates:
   - **Acknowledgment Due**: 3 working days
   - **Final Response Due**: 10 working days (configurable)
5. Save complaint

### Complaint Workflow

#### Status Progression
1. **New**: Just received
2. **Acknowledged**: Acknowledgment sent to complainant
3. **Investigating**: Gathering information
4. **Response Sent**: Final response provided
5. **Closed**: Matter resolved

#### Key Dates
- **Received At**: When complaint came in
- **Ack Due**: Deadline for acknowledgment (3 working days)
- **Ack Sent At**: When acknowledgment was sent
- **Final Due**: Deadline for full response (10-20 working days)
- **Final Sent At**: When response was sent

### Managing Complaints

#### Assigning Complaints
1. Open complaint
2. Click "Assign"
3. Select user (typically IG Lead or Practice Manager)
4. Assignee notified

#### Sending Acknowledgment
1. Open complaint
2. Click "Send Acknowledgment"
3. Draft acknowledgment letter
4. Send to complainant
5. Record as sent

#### Investigating
1. Gather information from relevant staff
2. Review patient records (with proper access)
3. Document findings
4. Attach files and evidence

#### Final Response
1. Complete investigation
2. Draft final response
3. Address all complaint points
4. Offer resolution or explanation
5. Send to complainant
6. Record as sent
7. Close complaint

### Redactions (IG Leads Only)

**For Data Protection:**
1. Open complaint
2. Access "Redactions" section
3. Apply redactions to protect:
   - Third-party names
   - Sensitive information
   - Patient identifiable data
4. Save redacted version
5. Use for reports and reviews

### File Attachments
- Attach correspondence
- Link to evidence
- Store investigation notes
- Keep audit trail

---

## Medical Requests

### Request Types

Common medical request types:
- Insurance Report
- Solicitor Report
- Court Report
- Medical Summary
- Fit Note
- Referral Letter
- Test Results
- Other

### Logging Medical Requests

#### New Request
1. Navigate to "Medical Requests"
2. Click "Log New Request"
3. Enter:
   - **Request Type**: From dropdown
   - **Received At**: Date/time received
   - **EMIS Hash**: Patient identifier
   - **Notes**: Additional details
4. Save request

### Workflow

#### Status Flow
1. **Received**: Just logged
2. **Assigned to GP**: Doctor allocated
3. **In Progress**: GP working on it
4. **Sent**: Response provided
5. **Complete**: Closed

#### Assigning to GP
1. Open request
2. Click "Assign GP"
3. Select from list of GPs
4. GP notified
5. Request moves to their queue

#### GP Completion
1. GP opens request
2. Reviews patient records
3. Completes report/documentation
4. Uploads evidence (PDF report, etc.)
5. Marks as sent
6. Records sent date

### Evidence Tracking
- Attach generated reports
- Link to outgoing correspondence
- Track when sent
- Maintain audit trail

### Reporting
- Track request volumes
- Monitor turnaround times
- Identify delays
- Generate compliance reports

---

## Fridge Temperature Monitoring

### Setting Up Fridges

#### Creating Fridge Records
1. Navigate to "Fridge Temps"
2. Click "Add New Fridge"
3. Enter:
   - **Fridge Name**: Identifier (e.g., "Vaccine Fridge 1")
   - **Location**: Where in practice
   - **Min Temp**: Minimum acceptable temperature (°C)
   - **Max Temp**: Maximum acceptable temperature (°C)
4. Save fridge

### Recording Temperatures

#### Daily Temperature Log
1. Go to "Fridge Temps"
2. Select fridge
3. Click "Log Temperature"
4. Enter:
   - **Date**: Today's date (auto-filled)
   - **Time**: Time of reading
   - **Temperature**: Current reading
   - **Recorded By**: Auto-set to current user
5. Submit log

#### Breach Detection
- System automatically flags if temperature outside min/max range
- **Breach Flag**: Automatically set if out of range
- Alert shown to relevant staff

### Handling Temperature Breaches

#### When Breach Occurs
1. Temperature log shows breach flag
2. Open the breach log
3. Document:
   - **Remedial Action**: What you did (e.g., "Checked door seal, adjusted thermostat")
   - **Outcome**: Result of action (e.g., "Temperature returned to normal range within 30 minutes")
4. Save breach record

#### Escalation
- Red breaches (severe): Immediate action required
- May need to isolate medications
- Notify pharmacy/clinical lead
- Follow vaccine storage protocols

### Temperature Reports
- View temperature trends over time
- Identify problem fridges
- Export for audit purposes
- Demonstrate compliance

---

## Month-End Scripts

### Purpose
Track controlled drugs and high-risk medications prescribed each month for audit and governance.

### Recording Scripts

#### Adding Month-End Script Entry
1. Navigate to "Month End Scripts"
2. Click "Add Script Entry"
3. Enter:
   - **Month**: Month being recorded
   - **Issue Date**: When prescription issued
   - **Drug Code**: Code from formulary
   - **Drug Name**: Medication name
   - **Quantity**: Amount prescribed
   - **Prescriber**: Doctor who prescribed
   - **EMIS Hash**: For deduplication
   - **Notes**: Additional context
4. Save entry

### Deduplication
- EMIS Hash prevents duplicate entries
- System checks before saving
- Ensures accurate counts

### Bulk Import
- Import from EMIS or other system
- CSV upload capability
- Automated data entry

### Month-End Reports
- Generate monthly script report
- Filter by drug type, prescriber
- Track controlled drug usage
- Compliance reporting

---

## Claims Management

### Understanding Claims

**Claims** are submissions to commissioning bodies for funded services (e.g., immunizations, enhanced services).

### Creating Claim Runs

#### New Claim Run
1. Navigate to "Claims"
2. Click "Create Claim Run"
3. Set:
   - **Period Start**: Beginning of claim period
   - **Period End**: End of claim period
4. System aggregates claimable activities
5. Status: "Draft"

### Managing Claim Runs

#### Draft Stage
- Review activities included
- Verify counts and values
- Add/remove items as needed
- Calculate totals

#### Generating Claim
1. Open draft claim run
2. Click "Generate Claim"
3. System creates claim document
4. Review for accuracy
5. Export for submission

#### Submission
- Export claim file
- Submit to commissioning body
- Update status to "Submitted"
- Record submission date

#### Claim Status
- **Draft**: Being prepared
- **Generated**: Ready for submission
- **Submitted**: Sent to commissioner
- **Paid**: Payment received

### Claim Reporting
- Track claim values by period
- Monitor payment status
- Identify missed claims
- Revenue reporting

---

## Policy Documents

### Policy Management (IG Leads)

#### Adding Policies

**From SharePoint:**
1. Navigate to "Policies"
2. Click "Link from SharePoint"
3. Enter:
   - **Title**: Policy name
   - **SharePoint URL**: Link to document
   - **SharePoint Item ID**: Document ID
   - **Version**: Policy version
4. Save link

**Upload to Storage:**
1. Click "Upload New Policy"
2. Select PDF/document
3. System uploads to secure storage
4. Enter metadata:
   - **Title**
   - **Version**
   - **Effective From**
   - **Review Due**
   - **Owner Role**: Who is responsible
5. Save policy

### Policy Metadata

**Key Fields:**
- **Effective From**: When policy takes effect
- **Review Due**: When policy must be reviewed
- **Version**: Version number
- **Owner Role**: Responsible role
- **Status**: Active, Under Review, Archived

### Policy Reviews

#### Review Process
1. System alerts when review due
2. Owner role reviews and updates
3. Upload new version
4. Set new effective date and review due date
5. Old version archived

#### Version Control
- Keep historical versions
- Track changes over time
- Audit trail of revisions

### Accessing Policies
- All staff can view policies
- Search by title or category
- Download for reference
- Filter by owner role, status

---

## Risk Register

### Creating Risks

#### New Risk Entry
1. Navigate to "Risk Register"
2. Click "Add New Risk"
3. Enter:
   - **Risk Description**: What is the risk
   - **Category**: Type of risk
   - **Impact**: Severity if occurs (1-5)
   - **Likelihood**: Probability (1-5)
   - **Risk Score**: Auto-calculated (Impact × Likelihood)
   - **Current Controls**: What's in place
   - **Actions Needed**: Additional mitigations
   - **Owner**: Who is responsible
4. Save risk

### Risk Scoring

**Impact Levels (1-5):**
- 1: Negligible
- 2: Minor
- 3: Moderate
- 4: Major
- 5: Catastrophic

**Likelihood (1-5):**
- 1: Rare
- 2: Unlikely
- 3: Possible
- 4: Likely
- 5: Almost Certain

**Risk Score = Impact × Likelihood**
- 1-5: Low (Green)
- 6-12: Medium (Amber)
- 15-25: High (Red)

### Managing Risks

#### Risk Review
1. Regular review of all risks
2. Update scores as controls implemented
3. Add new controls
4. Close risks when mitigated

#### Risk Status
- **Active**: Current risk
- **Monitoring**: Under observation
- **Closed**: Mitigated or no longer relevant

### Risk Reports
- View high-priority risks
- Track risk reduction over time
- Generate risk register for governance meetings
- Demonstrate risk management

---

## Fire Safety

### Fire Safety Checks

#### Recording Checks
1. Navigate to "Fire Safety"
2. Select check type:
   - Fire alarm test
   - Emergency lighting test
   - Fire extinguisher check
   - Fire drill
   - Exit route check
3. Complete form with findings
4. Add photo evidence
5. Record any issues
6. Submit check

### Fire Drills

#### Conducting Fire Drill
1. Schedule fire drill
2. Notify relevant staff
3. Conduct evacuation
4. Time the evacuation
5. Record:
   - Time taken
   - Any issues
   - Assembly point status
   - Roll call results
6. Debrief and learning points

### Fire Safety Compliance
- Schedule regular checks
- Track completion
- Flag overdue checks
- Maintain audit trail

---

## Infection Control

### Infection Control Audits

#### IPC Audit
1. Navigate to "Infection Control"
2. Select audit type:
   - Hand hygiene audit
   - Cleaning audit
   - Decontamination audit
   - PPE compliance check
3. Complete checklist
4. Score compliance
5. Add photos of issues
6. Record actions needed
7. Submit audit

### Monitoring Compliance
- Track audit scores over time
- Identify problem areas
- Action plans for improvement
- Demonstrate IPC standards

---

## Cleaning Management

### Cleaning Schedules

#### Daily Cleaning
1. Navigate to "Cleaning"
2. View today's tasks
3. Complete checklist for each area
4. Record time cleaned
5. Note any issues
6. Submit completion

### Deep Cleaning
- Schedule periodic deep cleans
- Assign to cleaning staff
- Verify completion
- Photo evidence

### Cleaning Standards
- Maintain cleaning logs
- Track completion rates
- Flag missed cleans
- Audit trail for inspectors

---

## Reports & Analytics

### Available Reports

#### Compliance Reports
- Overall audit readiness
- Section scores breakdown
- Task completion rates
- Overdue tasks
- Training compliance

#### Operational Reports
- Task throughput
- Average completion time
- User productivity
- Evidence collection stats

#### HR Reports
- Staff training matrix
- Leave balances
- Appraisal completion
- Training expiries

#### Safety Reports
- Incident analysis
- Complaint trends
- Risk register summary
- Temperature compliance

### Generating Reports

#### Standard Reports
1. Navigate to "Reports"
2. Select report type
3. Set parameters:
   - **Date Range**
   - **Filters** (user, module, etc.)
   - **Export Format** (PDF, Excel)
4. Click "Generate Report"
5. View or download

#### Custom Reports (Practice Managers)
1. Access "Admin Reports"
2. Build custom query
3. Select data fields
4. Apply filters
5. Save as template
6. Generate on demand

### Exporting Data
- Export to Excel for analysis
- PDF for printing/sharing
- CSV for data import elsewhere
- Automated scheduled exports

---

## Calendar & Schedule

### Calendar View

#### Monthly Calendar
1. Navigate to "Schedule" or "Calendar"
2. View month grid with:
   - Tasks due
   - Process instances
   - Leave requests
   - Training sessions
   - Appraisals
3. Click date to see details
4. Click item to open

### 12-Month Schedule Overview

#### Schedule Page Features
1. **Calendar View**: Visual monthly calendar
2. **List View**: Tabular task list
3. **Navigation**: Move between months
4. **Filters**:
   - Module
   - Assigned user
   - Status
   - Priority

#### Task Categories in Schedule
- **Recurring Tasks**: Regular processes
- **One-off Tasks**: Ad-hoc assignments
- **Process Instances**: Scheduled workflows
- **Reviews**: Policy and training reviews
- **Appraisals**: Staff reviews
- **Leave**: Approved time off

### Planning Ahead
- View upcoming 12 months
- Identify busy periods
- Plan resource allocation
- Schedule tasks efficiently

---

## Settings & Configuration

### User Settings

#### Profile Management
1. Click your name in header
2. Select "Settings"
3. Update:
   - **Display Name**
   - **Email**
   - **Phone Number**
   - **Notification Preferences**
4. Save changes

#### Password Change
1. Go to Settings
2. Click "Change Password"
3. Enter:
   - Current password
   - New password
   - Confirm new password
4. Save new password

#### Multi-Factor Authentication (MFA)
1. Settings > Security
2. Click "Enable MFA"
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes
6. MFA now required for login

### Practice Settings (Practice Managers)

#### Organization Details
1. Settings > Organization
2. Update:
   - Practice name
   - Address
   - Contact details
   - Country (affects regulatory standards)
3. Save changes

#### Role Assignments
1. Settings > Role Management
2. View current assignments
3. Add new assignment:
   - **Name**
   - **Email**
   - **Role**
4. Delete assignments as needed

#### Target Scores
1. Settings > Targets
2. Set target score for each section
3. Used for gap analysis
4. Affects dashboard display

### Theme Settings

#### Dark/Light Mode
1. Toggle theme in header
2. Or Settings > Appearance
3. System automatically saves preference

---

## Security Best Practices

### Password Security

**Requirements:**
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers
- Special characters recommended
- No common passwords

**Best Practices:**
- Change password regularly
- Never share passwords
- Use password manager
- Enable MFA

### Multi-Factor Authentication

**Why MFA?**
- Adds second layer of security
- Protects against password theft
- Required for sensitive roles

**Setup:**
- Use authenticator app (Google Authenticator, Authy)
- Store backup codes securely
- Keep phone number updated

### Data Protection

#### Access Control
- Only access data you need for your role
- Don't share login credentials
- Log out when finished
- Lock screen when away

#### Patient Data
- Handle with care
- Follow data protection policies
- Use EMIS hash for deidentification
- Apply redactions when needed

#### Evidence Security
- Photos may contain sensitive information
- Review before uploading
- Apply appropriate tags
- Follow retention policies

### Audit Trail

**All actions are logged:**
- User who performed action
- What was changed
- When it occurred
- Before and after states

**Why it matters:**
- Accountability
- Compliance
- Investigation capability
- Security monitoring

### Reporting Security Issues

**If you suspect:**
- Unauthorized access
- Data breach
- Security vulnerability
- Suspicious activity

**Take action:**
1. Report to Practice Manager immediately
2. Don't attempt to investigate yourself
3. Document what you observed
4. Follow incident reporting procedure

---

## Common Workflows

### Weekly Task Management Workflow

**Monday Morning:**
1. Review dashboard for overdue tasks
2. Check tasks due this week
3. Prioritize high-priority items
4. Start tasks requiring evidence collection

**Throughout Week:**
5. Complete and submit tasks
6. Collect evidence as you go
7. Update task progress

**Friday Afternoon:**
8. Review what's completed
9. Note any blockers
10. Plan for next week

### Monthly Compliance Workflow

**Week 1:**
- Review last month's scores
- Identify areas of concern
- Get AI improvement tips
- Create action plan

**Week 2:**
- Execute improvement actions
- Complete overdue tasks
- Schedule upcoming processes

**Week 3:**
- Monitor progress
- Adjust plans as needed
- Collect missing evidence

**Week 4:**
- Month-end reports
- Review achievements
- Set next month's priorities

### Audit Preparation Workflow

**3 Months Before:**
1. Review overall score
2. Identify gaps
3. Create improvement plan
4. Schedule missing processes

**2 Months Before:**
5. Execute improvement plan
6. Complete all overdue tasks
7. Collect missing evidence
8. Update policies

**1 Month Before:**
9. Review all documentation
10. Practice presenting evidence
11. Complete final tasks
12. Run compliance reports

**Week Before:**
13. Final evidence check
14. Print key reports
15. Organize documentation
16. Brief team

---

## Troubleshooting

### Common Issues

#### Can't Log In
- Verify email and password
- Check for typos
- Try password reset
- Ensure MFA code is correct (if enabled)
- Contact Practice Manager if still issues

#### Can't See Tasks
- Check you're assigned to tasks
- Verify practice selection (master users)
- Check filters applied
- Ensure you have correct role permissions

#### Evidence Upload Fails
- Check file size (max limits)
- Verify file format supported
- Check internet connection
- Try different browser
- Contact support if persistent

#### Score Not Updating
- Scores recalculate periodically
- Allow time for system update
- Complete pending tasks
- Submit evidence
- Refresh page

### Getting Help

#### In-App Help
- Click "?" icon for context help
- Tooltips on form fields
- Help chat for specific tasks

#### Contact Support
- Email: support@reflowai.co.uk
- Include:
  - Your practice name
  - User email
  - Description of issue
  - Screenshots if relevant
  - Steps to reproduce

#### Practice Manager Assistance
- First point of contact for most issues
- Can manage permissions
- Can reset passwords
- Can provide training

---

## Glossary

**Audit Readiness:** How prepared your practice is for regulatory inspection

**CQC:** Care Quality Commission (England's health regulator)

**Evidence:** Proof that tasks or processes were completed (photos, documents)

**Gate:** Mandatory requirement that must be met for score progression

**HIW:** Healthcare Inspectorate Wales (Wales' health regulator)

**HIS:** Healthcare Improvement Scotland (Scotland's health regulator)

**IG Lead:** Information Governance Lead (data protection officer)

**Instance:** Individual occurrence of a process

**Master User:** System administrator with access to all practices

**MFA:** Multi-Factor Authentication (extra security layer)

**Practice Manager:** Senior user with full practice administrative rights

**Process:** Multi-step workflow that repeats on schedule

**RAG Status:** Red/Amber/Green risk or severity rating

**RLS:** Row-Level Security (database access control)

**SLA:** Service Level Agreement (time limit for completion)

**Task:** Individual unit of work to be completed

**Template:** Predefined structure for tasks or forms

---

## Quick Reference

### Common Tasks

| What You Want to Do | Where to Go | Permission Needed |
|---------------------|-------------|-------------------|
| Complete a task | Tasks List | Assigned user |
| Report an incident | Incidents | Any user |
| Log a complaint | Complaints | Reception+ |
| Add employee | HR | Practice Manager |
| Create task template | Task Templates | Practice Manager |
| Generate report | Reports | Practice Manager |
| View audit score | Dashboard | Any user |
| Upload policy | Policies | IG Lead |
| Record temperature | Fridge Temps | Any user |
| Request leave | HR > Leave | Employee |
| Approve leave | HR > Leave | Manager |

### Keyboard Shortcuts

- **Ctrl/Cmd + K:** Search
- **Esc:** Close dialog
- **Tab:** Next field
- **Shift + Tab:** Previous field

### Support Contacts

- **Technical Support:** support@reflowai.co.uk
- **Practice Manager:** [Your practice manager's email]
- **Master User:** phil@reflowai.co.uk

---

## Appendix A: User Roles Permission Matrix

| Feature | Master User | Practice Manager | Administrator | IG Lead | Estates Lead | Nurse Lead | Reception Lead | Reception | User |
|---------|-------------|------------------|---------------|---------|--------------|------------|----------------|-----------|------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Tasks | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Own only |
| Create Tasks | ✓ | ✓ | ✓ | - | - | - | - | - | - |
| Manage Task Templates | ✓ | ✓ | ✓ | - | - | - | - | - | - |
| Report Incidents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Incidents | ✓ | ✓ | - | - | - | - | - | - | - |
| Create Complaints | ✓ | ✓ | - | ✓ | - | - | ✓ | ✓ | - |
| Manage Complaints | ✓ | ✓ | - | ✓ | - | - | - | - | - |
| Manage HR | ✓ | ✓ | - | - | - | - | - | - | - |
| Approve Leave | ✓ | ✓ | - | - | - | - | - | - | Manager only |
| Manage Policies | ✓ | ✓ | - | ✓ | - | - | - | - | - |
| Manage Fridges | ✓ | ✓ | - | - | ✓ | ✓ | - | - | - |
| Log Temperatures | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generate Reports | ✓ | ✓ | - | - | - | - | - | - | - |
| Manage Users | ✓ | ✓ | - | - | - | - | - | - | - |
| Configure Practice | ✓ | ✓ | - | - | - | - | - | - | - |

---

## Appendix B: Regulatory Standards by Country

### Wales (HIW - Healthcare Inspectorate Wales)

**Key Standards:**
- Health and Care Standards (2015)
- Staying Healthy
- Safe Care
- Effective Care
- Dignified Care
- Timely Care
- Individual Care
- Staff and Resources

### England (CQC - Care Quality Commission)

**Key Questions:**
- Safe: Are patients protected from abuse and avoidable harm?
- Effective: Are treatments evidence-based and do they achieve good outcomes?
- Caring: Are staff kind and treat patients with dignity?
- Responsive: Are services organized to meet patient needs?
- Well-led: Is there good leadership and governance?

### Scotland (HIS - Healthcare Improvement Scotland)

**Quality Standards:**
- Patient Focus
- Safe and Effective Practice
- Effective Communication
- Staff Governance
- Clinical Governance

---

## Document Version

**Version:** 1.0  
**Last Updated:** 2025  
**Next Review:** Annually or upon major system updates

**Document Owner:** ReflowAI  
**Contact:** phil@reflowai.co.uk

---

*This guide is intended to be comprehensive but should be used alongside practice-specific policies and procedures. Always follow your local protocols and escalation procedures.*
