import { pgTable, text, timestamp, uuid, boolean, jsonb, integer, decimal, pgEnum, varchar, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql, relations } from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', [
  'practice_manager', 'nurse_lead', 'cd_lead_gp', 'estates_lead', 'ig_lead', 
  'reception_lead', 'nurse', 'hca', 'gp', 'reception', 'auditor'
]);

export const processFrequencyEnum = pgEnum('process_frequency', [
  'daily', 'twice_daily', 'weekly', 'monthly', 'quarterly', 'six_monthly', 'annually'
]);

export const processStatusEnum = pgEnum('process_status', [
  'pending', 'in_progress', 'complete', 'blocked'
]);

export const stepStatusEnum = pgEnum('step_status', [
  'pending', 'complete', 'not_complete'
]);

export const issueStatusEnum = pgEnum('issue_status', [
  'open', 'in_progress', 'resolved'
]);

export const evidenceTypeEnum = pgEnum('evidence_type', [
  'photo', 'note', 'signature', 'document', 'link'
]);

export const countryCodeEnum = pgEnum('country_code', [
  'wales', 'england', 'scotland'
]);

export const cleanFrequencyEnum = pgEnum('clean_frequency', [
  'daily', 'twice_daily', 'weekly', 'monthly', 'periodic'
]);

export const actSeverityEnum = pgEnum('act_severity', [
  'low', 'medium', 'high', 'critical'
]);

export const actStatusEnum = pgEnum('act_status', [
  'pending', 'in_progress', 'completed', 'overdue'
]);

export const practices = pgTable("practices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  theme: jsonb("theme").default({}),
  country: countryCodeEnum("country").default('wales'),
  isActive: boolean("is_active").default(true),
  onboardingStage: text("onboarding_stage").default('pending'),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  authUserId: uuid("auth_user_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default('reception'),
  isPracticeManager: boolean("is_practice_manager").default(false),
  isActive: boolean("is_active").default(true),
  mfaEnabled: boolean("mfa_enabled").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => [index("IDX_session_expire").on(table.expire)]);

export const authUsers = pgTable("auth_users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AuthUser = typeof authUsers.$inferSelect;
export type UpsertAuthUser = typeof authUsers.$inferInsert;

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  role: userRoleEnum("role"),
  managerId: uuid("manager_id"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const processTemplates = pgTable("process_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  module: text("module"),
  description: text("description"),
  frequency: processFrequencyEnum("frequency").notNull().default('daily'),
  responsibleRole: userRoleEnum("responsible_role").notNull().default('reception'),
  slaHours: integer("sla_hours").default(24),
  steps: jsonb("steps").default([]),
  remedials: jsonb("remedials").default({}),
  evidenceHint: text("evidence_hint"),
  storageHints: jsonb("storage_hints").default({}),
  regulatoryStandards: jsonb("regulatory_standards").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const processInstances = pgTable("process_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => processTemplates.id, { onDelete: "cascade" }).notNull(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  status: processStatusEnum("status").default('pending'),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  dueAt: timestamp("due_at").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stepInstances = pgTable("step_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  processInstanceId: uuid("process_instance_id").references(() => processInstances.id, { onDelete: "cascade" }).notNull(),
  stepIndex: integer("step_index").notNull(),
  title: text("title").notNull(),
  status: stepStatusEnum("status").default('pending'),
  notes: text("notes"),
  deviceTimestamp: timestamp("device_timestamp"),
  serverTimestamp: timestamp("server_timestamp").defaultNow(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  threeWords: text("three_words"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  stepInstanceId: uuid("step_instance_id").references(() => stepInstances.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  type: evidenceTypeEnum("type").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"),
  width: integer("width"),
  height: integer("height"),
  exifData: jsonb("exif_data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const evidenceV2 = pgTable("evidence_v2", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  taskId: uuid("task_id"),
  submissionId: uuid("submission_id"),
  type: text("type").notNull(),
  storagePath: text("storage_path"),
  linkUrl: text("link_url"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  sha256: text("sha256"),
  tags: text("tags").array(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  locationAccuracy: decimal("location_accuracy", { precision: 10, scale: 2 }),
  deviceTimestamp: timestamp("device_timestamp"),
  serverTimestamp: timestamp("server_timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  processInstanceId: uuid("process_instance_id").references(() => processInstances.id, { onDelete: "cascade" }).notNull(),
  stepInstanceId: uuid("step_instance_id").references(() => stepInstances.id, { onDelete: "cascade" }),
  raisedById: uuid("raised_by_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  status: issueStatusEnum("status").default('open'),
  summary: text("summary").notNull(),
  details: text("details"),
  slaDueAt: timestamp("sla_due_at"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const policyDocuments = pgTable("policy_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  category: text("category"),
  version: text("version").default('1.0'),
  status: text("status").default('draft'),
  content: text("content"),
  storagePath: text("storage_path"),
  ownerId: uuid("owner_id").references(() => users.id),
  nextReviewDate: timestamp("next_review_date"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  lastReviewedBy: uuid("last_reviewed_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const policyAcknowledgments = pgTable("policy_acknowledgments", {
  id: uuid("id").primaryKey().defaultRandom(),
  policyId: uuid("policy_id").references(() => policyDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainingCatalogue = pgTable("training_catalogue", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category"),
  provider: text("provider"),
  isMandatory: boolean("is_mandatory").default(false),
  validityMonths: integer("validity_months").default(12),
  applicableRoles: text("applicable_roles").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainingRecords = pgTable("training_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  courseId: uuid("course_id").references(() => trainingCatalogue.id),
  courseName: text("course_name"),
  completedAt: timestamp("completed_at"),
  expiryDate: timestamp("expiry_date"),
  evidenceId: uuid("evidence_id"),
  isMandatory: boolean("is_mandatory").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dbsChecks = pgTable("dbs_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  checkDate: timestamp("check_date").notNull(),
  certificateNumber: text("certificate_number"),
  nextReviewDue: timestamp("next_review_due"),
  evidenceId: uuid("evidence_id"),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  reportedById: uuid("reported_by_id").references(() => users.id),
  category: text("category"),
  severity: text("severity").default('low'),
  description: text("description").notNull(),
  dateOccurred: timestamp("date_occurred").notNull(),
  location: text("location"),
  personsInvolved: jsonb("persons_involved").default([]),
  immediateActions: text("immediate_actions"),
  rootCause: text("root_cause"),
  preventiveActions: text("preventive_actions"),
  status: text("status").default('open'),
  closedAt: timestamp("closed_at"),
  closedById: uuid("closed_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const complaints = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  receivedAt: timestamp("received_at").notNull(),
  channel: text("channel"),
  description: text("description").notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  ackDue: timestamp("ack_due").notNull(),
  ackSentAt: timestamp("ack_sent_at"),
  finalDue: timestamp("final_due").notNull(),
  finalSentAt: timestamp("final_sent_at"),
  status: text("status").default('open'),
  redactions: jsonb("redactions"),
  files: text("files").array(),
  emisHash: text("emis_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cleaningZones = pgTable("cleaning_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  zoneName: text("zone_name").notNull(),
  zoneType: text("zone_type"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cleaningTasks = pgTable("cleaning_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  zoneId: uuid("zone_id").references(() => cleaningZones.id),
  taskName: text("task_name").notNull(),
  description: text("description"),
  frequency: cleanFrequencyEnum("frequency").notNull(),
  periodicRule: text("periodic_rule"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cleaningLogs = pgTable("cleaning_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  roomId: uuid("room_id").references(() => rooms.id).notNull(),
  taskId: uuid("task_id").references(() => cleaningTasks.id),
  logDate: timestamp("log_date").notNull(),
  completedBy: uuid("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  initials: text("initials"),
  issues: jsonb("issues"),
  retainedUntil: timestamp("retained_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fridgeUnits = pgTable("fridge_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  location: text("location"),
  minTemp: decimal("min_temp", { precision: 4, scale: 1 }).default('2.0'),
  maxTemp: decimal("max_temp", { precision: 4, scale: 1 }).default('8.0'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fridgeReadings = pgTable("fridge_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  fridgeId: uuid("fridge_id").references(() => fridgeUnits.id, { onDelete: "cascade" }).notNull(),
  readingDate: timestamp("reading_date").notNull(),
  temperature: decimal("temperature", { precision: 4, scale: 1 }).notNull(),
  recordedBy: uuid("recorded_by").references(() => users.id),
  isOutOfRange: boolean("is_out_of_range").default(false),
  actionTaken: text("action_taken"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const claimRuns = pgTable("claim_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  claimType: text("claim_type"),
  status: text("status").default('draft'),
  totalItems: integer("total_items"),
  totalScripts: integer("total_scripts"),
  pdfStoragePath: text("pdf_storage_path"),
  submittedBy: uuid("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at"),
  fppsReference: text("fpps_reference"),
  fppsSubmissionStatus: text("fpps_submission_status"),
  fppsSubmittedAt: timestamp("fpps_submitted_at"),
  ppvAuditStatus: text("ppv_audit_status"),
  ppvAuditDate: timestamp("ppv_audit_date"),
  ppvAuditNotes: text("ppv_audit_notes"),
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const claimItems = pgTable("claim_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimRunId: uuid("claim_run_id").references(() => claimRuns.id, { onDelete: "cascade" }).notNull(),
  serviceCode: text("service_code").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitValue: decimal("unit_value", { precision: 10, scale: 2 }),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }),
  evidenceIds: text("evidence_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fireRiskAssessmentsV2 = pgTable("fire_risk_assessments_v2", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  assessmentDate: timestamp("assessment_date").notNull(),
  assessorName: text("assessor_name"),
  assessorRole: text("assessor_role"),
  premises: jsonb("premises"),
  hazards: jsonb("hazards"),
  emergencyPlan: jsonb("emergency_plan"),
  maintenance: jsonb("maintenance"),
  nextReviewDate: timestamp("next_review_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fireActions = pgTable("fire_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  assessmentId: uuid("assessment_id").references(() => fireRiskAssessmentsV2.id),
  deficiency: text("deficiency").notNull(),
  severity: actSeverityEnum("severity").default('medium'),
  timeframe: text("timeframe"),
  dueDate: timestamp("due_date"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  status: actStatusEnum("status").default('pending'),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coshhAssessments = pgTable("coshh_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  substanceName: text("substance_name").notNull(),
  manufacturer: text("manufacturer"),
  hazardFlags: jsonb("hazard_flags"),
  routes: jsonb("routes"),
  ppe: jsonb("ppe"),
  emergencyControls: jsonb("emergency_controls"),
  hazardSheetUrl: text("hazard_sheet_url"),
  riskLevel: text("risk_level"),
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ipcAudits = pgTable("ipc_audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  auditDate: timestamp("audit_date").notNull(),
  auditorId: uuid("auditor_id").references(() => users.id),
  auditType: text("audit_type").default('six_monthly'),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
  sections: jsonb("sections").default([]),
  findings: jsonb("findings").default([]),
  status: text("status").default('draft'),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ipcActions = pgTable("ipc_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  auditId: uuid("audit_id").references(() => ipcAudits.id),
  finding: text("finding").notNull(),
  actionRequired: text("action_required").notNull(),
  priority: text("priority").default('medium'),
  assignedTo: uuid("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  status: text("status").default('pending'),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const regulatoryFrameworks = pgTable("regulatory_frameworks", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  applicableCountries: text("applicable_countries").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const regulatoryStandards = pgTable("regulatory_standards", {
  id: uuid("id").primaryKey().defaultRandom(),
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id, { onDelete: "cascade" }).notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  guidance: text("guidance"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const complianceStatus = pgTable("compliance_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  frameworkId: uuid("framework_id").references(() => regulatoryFrameworks.id).notNull(),
  standardId: uuid("standard_id").references(() => regulatoryStandards.id).notNull(),
  status: text("status").default('not_assessed'),
  ragStatus: text("rag_status"),
  score: decimal("score", { precision: 5, scale: 2 }),
  evidenceCount: integer("evidence_count").default(0),
  notes: text("notes"),
  assessedBy: uuid("assessed_by").references(() => users.id),
  lastAssessedAt: timestamp("last_assessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  templateId: uuid("template_id").references(() => processTemplates.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default('medium'),
  status: text("status").default('pending'),
  assigneeId: uuid("assignee_id").references(() => users.id),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  module: text("module"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  notificationType: text("notification_type").notNull(),
  priority: text("priority").default('normal'),
  title: text("title").notNull(),
  message: text("message"),
  actionUrl: text("action_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  inAppEnabled: boolean("in_app_enabled").default(true),
  emailFrequency: text("email_frequency").default('immediate'),
  policyReminders: boolean("policy_reminders").default(true),
  taskNotifications: boolean("task_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scheduledReminders = pgTable("scheduled_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  reminderType: text("reminder_type").notNull(),
  schedulePattern: text("schedule_pattern").notNull(),
  nextRunAt: timestamp("next_run_at").notNull(),
  lastRunAt: timestamp("last_run_at"),
  metadata: jsonb("metadata").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizationSetup = pgTable("organization_setup", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull().unique(),
  setupStartedAt: timestamp("setup_started_at"),
  templatesSeeded: boolean("templates_seeded").default(false),
  rolesSeeded: boolean("roles_seeded").default(false),
  dashboardsSeeded: boolean("dashboards_seeded").default(false),
  notificationsSeeded: boolean("notifications_seeded").default(false),
  setupCompleted: boolean("setup_completed").default(false),
  setupCompletedAt: timestamp("setup_completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  emailType: text("email_type").notNull(),
  status: text("status").default('sent'),
  resendEmailId: text("resend_email_id"),
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  bounceType: text("bounce_type"),
  bounceReason: text("bounce_reason"),
  complainedAt: timestamp("complained_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roleAssignments = pgTable("role_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  role: userRoleEnum("role").notNull(),
  assignedName: text("assigned_name"),
  assignedEmail: text("assigned_email"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const riskRegister = pgTable("risk_register", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  likelihood: integer("likelihood").default(3),
  impact: integer("impact").default(3),
  riskScore: integer("risk_score"),
  mitigations: text("mitigations"),
  ownerId: uuid("owner_id").references(() => users.id),
  status: text("status").default('open'),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPracticeSchema = createInsertSchema(practices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProcessTemplateSchema = createInsertSchema(processTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProcessInstanceSchema = createInsertSchema(processInstances).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertComplaintSchema = createInsertSchema(complaints).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPolicyDocumentSchema = createInsertSchema(policyDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingRecordSchema = createInsertSchema(trainingRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

export type InsertPractice = z.infer<typeof insertPracticeSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type InsertProcessTemplate = z.infer<typeof insertProcessTemplateSchema>;
export type InsertProcessInstance = z.infer<typeof insertProcessInstanceSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type InsertPolicyDocument = z.infer<typeof insertPolicyDocumentSchema>;
export type InsertTrainingRecord = z.infer<typeof insertTrainingRecordSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Practice = typeof practices.$inferSelect;
export type User = typeof users.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type ProcessTemplate = typeof processTemplates.$inferSelect;
export type ProcessInstance = typeof processInstances.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type PolicyDocument = typeof policyDocuments.$inferSelect;
export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
