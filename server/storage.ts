import { eq, and, desc, gte, lte, isNull, sql, inArray, or, ilike } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@shared/schema";
import type {
  Practice, User, Employee, ProcessTemplate, ProcessInstance,
  Task, Incident, Complaint, PolicyDocument, TrainingRecord, Notification,
  InsertPractice, InsertUser, InsertEmployee, InsertProcessTemplate,
  InsertProcessInstance, InsertTask, InsertIncident, InsertComplaint,
  InsertPolicyDocument, InsertTrainingRecord, InsertNotification,
  AuthUser, UpsertAuthUser,
  FridgeUnit, FridgeReading, InsertFridgeUnit, InsertFridgeReading,
  CleaningZone, CleaningTask, CleaningLog, InsertCleaningZone, InsertCleaningTask, InsertCleaningLog
} from "@shared/schema";

export interface IStorage {
  getAuthUser(id: string): Promise<AuthUser | undefined>;
  upsertAuthUser(user: UpsertAuthUser): Promise<AuthUser>;
  getUserByAuthId(authUserId: string): Promise<User | undefined>;
  getUsersWithPracticesByAuthId(authUserId: string): Promise<Array<User & { practice: Practice }>>;

  getPractice(id: string): Promise<Practice | undefined>;
  getPractices(): Promise<Practice[]>;
  createPractice(practice: InsertPractice): Promise<Practice>;
  updatePractice(id: string, data: Partial<InsertPractice>): Promise<Practice | undefined>;

  getUser(id: string, practiceId: string): Promise<User | undefined>;
  getUserByEmail(email: string, practiceId?: string): Promise<User | undefined>;
  getUsersByPractice(practiceId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, practiceId: string, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;

  getEmployee(id: string, practiceId: string): Promise<Employee | undefined>;
  getEmployeesByPractice(practiceId: string): Promise<Employee[]>;
  getActiveEmployeesByPractice(practiceId: string): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, practiceId: string, data: Partial<InsertEmployee>): Promise<Employee | undefined>;

  getProcessTemplate(id: string, practiceId: string): Promise<ProcessTemplate | undefined>;
  getProcessTemplatesByPractice(practiceId: string): Promise<ProcessTemplate[]>;
  createProcessTemplate(template: InsertProcessTemplate): Promise<ProcessTemplate>;
  updateProcessTemplate(id: string, practiceId: string, data: Partial<InsertProcessTemplate>): Promise<ProcessTemplate | undefined>;

  getProcessInstance(id: string, practiceId: string): Promise<ProcessInstance | undefined>;
  getProcessInstancesByPractice(practiceId: string): Promise<ProcessInstance[]>;
  createProcessInstance(instance: InsertProcessInstance): Promise<ProcessInstance>;
  updateProcessInstance(id: string, practiceId: string, data: Partial<InsertProcessInstance>): Promise<ProcessInstance | undefined>;

  getTask(id: string, practiceId: string): Promise<Task | undefined>;
  getTasksByPractice(practiceId: string, module?: string): Promise<Task[]>;
  getOverdueTasks(practiceId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, practiceId: string, data: Partial<InsertTask>): Promise<Task | undefined>;

  getIncident(id: string, practiceId: string): Promise<Incident | undefined>;
  getIncidentsByPractice(practiceId: string): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, practiceId: string, data: Partial<InsertIncident>): Promise<Incident | undefined>;

  getComplaint(id: string, practiceId: string): Promise<Complaint | undefined>;
  getComplaintsByPractice(practiceId: string): Promise<Complaint[]>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  updateComplaint(id: string, practiceId: string, data: Partial<InsertComplaint>): Promise<Complaint | undefined>;

  getPolicyDocument(id: string, practiceId: string): Promise<PolicyDocument | undefined>;
  getPolicyDocumentsByPractice(practiceId: string): Promise<PolicyDocument[]>;
  createPolicyDocument(policy: InsertPolicyDocument): Promise<PolicyDocument>;
  updatePolicyDocument(id: string, practiceId: string, data: Partial<InsertPolicyDocument>): Promise<PolicyDocument | undefined>;

  getTrainingRecord(id: string, practiceId: string): Promise<TrainingRecord | undefined>;
  getTrainingRecordsByPractice(practiceId: string): Promise<TrainingRecord[]>;
  getExpiringTrainingRecords(practiceId: string, daysUntilExpiry: number): Promise<TrainingRecord[]>;
  createTrainingRecord(record: InsertTrainingRecord): Promise<TrainingRecord>;
  updateTrainingRecord(id: string, practiceId: string, data: Partial<InsertTrainingRecord>): Promise<TrainingRecord | undefined>;

  getNotificationsByUser(userId: string, practiceId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string, practiceId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, practiceId: string): Promise<void>;
  markAllNotificationsRead(userId: string, practiceId: string): Promise<void>;

  getFridgeUnitsByPractice(practiceId: string): Promise<FridgeUnit[]>;
  createFridgeUnit(unit: InsertFridgeUnit): Promise<FridgeUnit>;
  updateFridgeUnit(id: string, practiceId: string, data: Partial<InsertFridgeUnit>): Promise<FridgeUnit | undefined>;
  getFridgeReadingsByPractice(practiceId: string, fridgeId?: string): Promise<FridgeReading[]>;
  createFridgeReading(reading: InsertFridgeReading): Promise<FridgeReading>;

  getCleaningZonesByPractice(practiceId: string): Promise<CleaningZone[]>;
  createCleaningZone(zone: InsertCleaningZone): Promise<CleaningZone>;
  updateCleaningZone(id: string, practiceId: string, data: Partial<InsertCleaningZone>): Promise<CleaningZone | undefined>;
  deleteCleaningZone(id: string, practiceId: string): Promise<void>;
  getCleaningTasksByPractice(practiceId: string, zoneId?: string): Promise<CleaningTask[]>;
  createCleaningTask(task: InsertCleaningTask): Promise<CleaningTask>;
  updateCleaningTask(id: string, practiceId: string, data: Partial<InsertCleaningTask>): Promise<CleaningTask | undefined>;
  deleteCleaningTask(id: string, practiceId: string): Promise<void>;
  getCleaningLogsByPractice(practiceId: string, date?: string): Promise<CleaningLog[]>;
  createCleaningLog(log: InsertCleaningLog): Promise<CleaningLog>;
}

export class DatabaseStorage implements IStorage {
  async getAuthUser(id: string): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(schema.authUsers).where(eq(schema.authUsers.id, id));
    return user;
  }

  async upsertAuthUser(userData: UpsertAuthUser): Promise<AuthUser> {
    const [user] = await db
      .insert(schema.authUsers)
      .values(userData)
      .onConflictDoUpdate({
        target: schema.authUsers.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByAuthId(authUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.authUserId, authUserId));
    return user;
  }

  async getUsersWithPracticesByAuthId(authUserId: string): Promise<Array<User & { practice: Practice }>> {
    const results = await db
      .select()
      .from(schema.users)
      .innerJoin(schema.practices, eq(schema.users.practiceId, schema.practices.id))
      .where(eq(schema.users.authUserId, authUserId));
    
    return results.map(r => ({ ...r.users, practice: r.practices }));
  }

  async getPractice(id: string): Promise<Practice | undefined> {
    const [practice] = await db.select().from(schema.practices).where(eq(schema.practices.id, id));
    return practice;
  }

  async getPractices(): Promise<Practice[]> {
    return db.select().from(schema.practices).where(eq(schema.practices.isActive, true));
  }

  async createPractice(practice: InsertPractice): Promise<Practice> {
    const [created] = await db.insert(schema.practices).values(practice).returning();
    return created;
  }

  async updatePractice(id: string, data: Partial<InsertPractice>): Promise<Practice | undefined> {
    const [updated] = await db.update(schema.practices).set({ ...data, updatedAt: new Date() }).where(eq(schema.practices.id, id)).returning();
    return updated;
  }

  /**
   * Phase 5: merge per-module scheduling toggles into practices.metadata without
   * clobbering other keys. Only the two known boolean flags are written.
   */
  async setSchedulingFlags(
    id: string,
    flags: { cleaning_scheduling_enabled?: boolean; fridge_scheduling_enabled?: boolean },
  ): Promise<Record<string, unknown>> {
    const practice = await this.getPractice(id);
    const meta = { ...((practice?.metadata as Record<string, unknown>) ?? {}) };
    if (typeof flags.cleaning_scheduling_enabled === 'boolean') meta.cleaning_scheduling_enabled = flags.cleaning_scheduling_enabled;
    if (typeof flags.fridge_scheduling_enabled === 'boolean') meta.fridge_scheduling_enabled = flags.fridge_scheduling_enabled;
    const [updated] = await db.update(schema.practices)
      .set({ metadata: meta as any, updatedAt: new Date() })
      .where(eq(schema.practices.id, id))
      .returning({ metadata: schema.practices.metadata });
    return (updated?.metadata as Record<string, unknown>) ?? meta;
  }

  async getUser(id: string, practiceId: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(
      and(eq(schema.users.id, id), eq(schema.users.practiceId, practiceId))
    );
    return user;
  }

  async getUserByEmail(email: string, practiceId?: string): Promise<User | undefined> {
    if (practiceId) {
      const [user] = await db.select().from(schema.users).where(and(eq(schema.users.email, email), eq(schema.users.practiceId, practiceId)));
      return user;
    }
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, id));
  }

  async getUsersByPractice(practiceId: string): Promise<User[]> {
    return db.select().from(schema.users).where(eq(schema.users.practiceId, practiceId));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(schema.users).values(user).returning();
    return created;
  }

  async updateUser(id: string, practiceId: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(schema.users).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.users.id, id), eq(schema.users.practiceId, practiceId))
    ).returning();
    return updated;
  }

  async getEmployee(id: string, practiceId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(schema.employees).where(
      and(eq(schema.employees.id, id), eq(schema.employees.practiceId, practiceId))
    );
    return employee;
  }

  async getEmployeesByPractice(practiceId: string): Promise<Employee[]> {
    return db.select().from(schema.employees).where(eq(schema.employees.practiceId, practiceId));
  }

  async getActiveEmployeesByPractice(practiceId: string): Promise<Employee[]> {
    return db.select().from(schema.employees).where(and(eq(schema.employees.practiceId, practiceId), isNull(schema.employees.endDate)));
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(schema.employees).values(employee).returning();
    return created;
  }

  async updateEmployee(id: string, practiceId: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db.update(schema.employees).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.employees.id, id), eq(schema.employees.practiceId, practiceId))
    ).returning();
    return updated;
  }

  async getProcessTemplate(id: string, practiceId: string): Promise<ProcessTemplate | undefined> {
    const [template] = await db.select().from(schema.processTemplates).where(
      and(eq(schema.processTemplates.id, id), eq(schema.processTemplates.practiceId, practiceId))
    );
    return template;
  }

  async getProcessTemplatesByPractice(practiceId: string): Promise<ProcessTemplate[]> {
    return db.select().from(schema.processTemplates).where(and(eq(schema.processTemplates.practiceId, practiceId), eq(schema.processTemplates.isActive, true)));
  }

  async createProcessTemplate(template: InsertProcessTemplate): Promise<ProcessTemplate> {
    const [created] = await db.insert(schema.processTemplates).values(template).returning();
    return created;
  }

  async updateProcessTemplate(id: string, practiceId: string, data: Partial<InsertProcessTemplate>): Promise<ProcessTemplate | undefined> {
    const [updated] = await db.update(schema.processTemplates).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.processTemplates.id, id), eq(schema.processTemplates.practiceId, practiceId))
    ).returning();
    return updated;
  }

  async getProcessInstance(id: string, practiceId: string): Promise<ProcessInstance | undefined> {
    const [instance] = await db.select().from(schema.processInstances).where(
      and(eq(schema.processInstances.id, id), eq(schema.processInstances.practiceId, practiceId))
    );
    return instance;
  }

  async getProcessInstancesByPractice(practiceId: string): Promise<ProcessInstance[]> {
    return db.select().from(schema.processInstances).where(eq(schema.processInstances.practiceId, practiceId)).orderBy(desc(schema.processInstances.createdAt));
  }

  async createProcessInstance(instance: InsertProcessInstance): Promise<ProcessInstance> {
    const [created] = await db.insert(schema.processInstances).values(instance).returning();
    return created;
  }

  async updateProcessInstance(id: string, practiceId: string, data: Partial<InsertProcessInstance>): Promise<ProcessInstance | undefined> {
    const [updated] = await db.update(schema.processInstances).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.processInstances.id, id), eq(schema.processInstances.practiceId, practiceId))
    ).returning();
    return updated;
  }

  // Process instances with template + assignee joined, shaped snake_case with the
  // nested `process_templates` / `users` objects the client task views expect.
  async getProcessInstancesWithDetails(practiceId: string): Promise<any[]> {
    const rows = await db
      .select({ pi: schema.processInstances, tpl: schema.processTemplates, assignee: schema.users })
      .from(schema.processInstances)
      .leftJoin(schema.processTemplates, eq(schema.processInstances.templateId, schema.processTemplates.id))
      .leftJoin(schema.users, eq(schema.processInstances.assigneeId, schema.users.id))
      .where(eq(schema.processInstances.practiceId, practiceId))
      .orderBy(desc(schema.processInstances.createdAt));
    return rows.map(({ pi, tpl, assignee }) => ({
      id: pi.id,
      template_id: pi.templateId,
      practice_id: pi.practiceId,
      assignee_id: pi.assigneeId,
      status: (pi as any).status,
      period_start: pi.periodStart,
      period_end: pi.periodEnd,
      due_at: pi.dueAt,
      started_at: pi.startedAt,
      completed_at: pi.completedAt,
      created_at: pi.createdAt,
      process_templates: tpl ? {
        name: tpl.name,
        responsible_role: tpl.responsibleRole,
        steps: tpl.steps,
        sla_hours: tpl.slaHours,
      } : null,
      users: assignee ? { id: assignee.id, name: assignee.name } : null,
    }));
  }

  async getTask(id: string, practiceId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(schema.tasks).where(
      and(eq(schema.tasks.id, id), eq(schema.tasks.practiceId, practiceId))
    );
    return task;
  }

  async getTasksByPractice(practiceId: string, module?: string): Promise<Task[]> {
    const condition = module
      ? and(eq(schema.tasks.practiceId, practiceId), eq(schema.tasks.module, module))
      : eq(schema.tasks.practiceId, practiceId);
    return db.select().from(schema.tasks).where(condition).orderBy(desc(schema.tasks.createdAt));
  }

  async getOverdueTasks(practiceId: string): Promise<Task[]> {
    const now = new Date();
    return db.select().from(schema.tasks).where(
      and(
        eq(schema.tasks.practiceId, practiceId),
        lte(schema.tasks.dueAt, now),
        sql`${schema.tasks.status} != 'complete'`
      )
    );
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(schema.tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, practiceId: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(schema.tasks).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.tasks.id, id), eq(schema.tasks.practiceId, practiceId))
    ).returning();
    return updated;
  }

  async getFridgeUnitsByPractice(practiceId: string): Promise<FridgeUnit[]> {
    return db.select().from(schema.fridgeUnits)
      .where(and(eq(schema.fridgeUnits.practiceId, practiceId), eq(schema.fridgeUnits.isActive, true)))
      .orderBy(schema.fridgeUnits.name);
  }

  async createFridgeUnit(unit: InsertFridgeUnit): Promise<FridgeUnit> {
    const [created] = await db.insert(schema.fridgeUnits).values(unit).returning();
    return created;
  }

  async updateFridgeUnit(id: string, practiceId: string, data: Partial<InsertFridgeUnit>): Promise<FridgeUnit | undefined> {
    const [updated] = await db.update(schema.fridgeUnits)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.fridgeUnits.id, id), eq(schema.fridgeUnits.practiceId, practiceId)))
      .returning();
    return updated;
  }

  async getFridgeReadingsByPractice(practiceId: string, fridgeId?: string): Promise<FridgeReading[]> {
    const condition = fridgeId
      ? and(eq(schema.fridgeReadings.practiceId, practiceId), eq(schema.fridgeReadings.fridgeId, fridgeId))
      : eq(schema.fridgeReadings.practiceId, practiceId);
    return db.select().from(schema.fridgeReadings).where(condition).orderBy(desc(schema.fridgeReadings.readingDate)).limit(200);
  }

  async createFridgeReading(reading: InsertFridgeReading): Promise<FridgeReading> {
    const [created] = await db.insert(schema.fridgeReadings).values(reading).returning();
    return created;
  }

  // Phase 6: recorded compliance exports for a practice (most recent first).
  async getComplianceExports(practiceId: string) {
    return db.select().from(schema.complianceExports)
      .where(eq(schema.complianceExports.practiceId, practiceId))
      .orderBy(desc(schema.complianceExports.createdAt))
      .limit(100);
  }

  /** First active holder of a role in a practice, or null (role-resolution fallback). */
  async resolveRoleHolder(practiceId: string, role: string): Promise<string | null> {
    const [row] = await db.select({ userId: schema.roleAssignments.userId })
      .from(schema.roleAssignments)
      .where(and(
        eq(schema.roleAssignments.practiceId, practiceId),
        eq(schema.roleAssignments.role, role),
      ))
      .limit(1);
    return row?.userId ?? null;
  }

  /**
   * Phase 5: create a fridge reading and, in ONE transaction:
   *   - close the matching scheduled fridge occurrence for this unit today (if any);
   *   - on an out-of-range reading, auto-create a high-importance adhoc remedial
   *     task assigned to the estates lead (unassigned if no holder), linked back to
   *     the reading via metadata so the remedial dialog can resolve it.
   * Returns the reading plus the remedial task id (null when in range).
   */
  async createFridgeReadingWithOccurrence(
    reading: InsertFridgeReading,
    practiceId: string,
    fridgeUnitId: string,
    isOutOfRange: boolean,
    fridgeName: string,
  ): Promise<{ reading: FridgeReading; remedialTaskId: string | null; occurrenceClosed: boolean }> {
    const estatesLead = isOutOfRange ? await this.resolveRoleHolder(practiceId, 'estates_lead') : null;
    const todayStr = new Date().toISOString().slice(0, 10);
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.fridgeReadings).values(reading).returning();

      // Close the earliest still-open fridge occurrence for this unit today.
      const openOcc = await tx.select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(and(
          eq(schema.tasks.practiceId, practiceId),
          eq(schema.tasks.sourceType, 'fridge'),
          eq(schema.tasks.scheduledDate, todayStr),
          sql`${schema.tasks.metadata}->>'fridgeUnitId' = ${fridgeUnitId}`,
          sql`${schema.tasks.status} NOT IN ('complete','closed')`,
        ))
        .orderBy(schema.tasks.slot)
        .limit(1);
      let occurrenceClosed = false;
      if (openOcc[0]) {
        await tx.update(schema.tasks)
          .set({ status: 'complete', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.tasks.id, openOcc[0].id));
        occurrenceClosed = true;
      }

      // Out-of-range → high-importance remedial task.
      let remedialTaskId: string | null = null;
      if (isOutOfRange) {
        const [task] = await tx.insert(schema.tasks).values({
          practiceId,
          title: `Remedial: ${fridgeName} temperature breach`,
          description: `Fridge "${fridgeName}" recorded ${created.temperature}°C, outside its safe range. Investigate and record the remedial action taken.`,
          sourceType: 'adhoc',
          status: 'pending',
          priority: 'high',
          importance: 'high',
          module: 'fridge',
          assigneeId: estatesLead,
          metadata: { fridgeReadingId: created.id, fridgeUnitId },
        }).returning({ id: schema.tasks.id });
        remedialTaskId = task?.id ?? null;
      }

      return { reading: created, remedialTaskId, occurrenceClosed };
    });
  }

  /** Today's (or a given date's) scheduled fridge occurrences, with assignee name. */
  async getFridgeOccurrences(practiceId: string, date: string) {
    const rows = await db
      .select({ t: schema.tasks, assignee: schema.users.name })
      .from(schema.tasks)
      .leftJoin(schema.users, eq(schema.tasks.assigneeId, schema.users.id))
      .where(and(
        eq(schema.tasks.practiceId, practiceId),
        eq(schema.tasks.sourceType, 'fridge'),
        eq(schema.tasks.scheduledDate, date),
      ));
    return rows.map(({ t, assignee }) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      slot: t.slot,
      due_at: t.dueAt,
      assignee_id: t.assigneeId,
      assignee_name: assignee ?? null,
      fridge_unit_id: (t.metadata as any)?.fridgeUnitId ?? null,
    }));
  }

  /** Close the remedial task auto-created for a fridge reading (loop-closing). */
  async closeRemedialTaskForReading(practiceId: string, readingId: string): Promise<void> {
    await db.update(schema.tasks)
      .set({ status: 'complete', completedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(schema.tasks.practiceId, practiceId),
        eq(schema.tasks.sourceType, 'adhoc'),
        sql`${schema.tasks.metadata}->>'fridgeReadingId' = ${readingId}`,
        sql`${schema.tasks.status} NOT IN ('complete','closed')`,
      ));
  }

  async updateFridgeReading(id: string, practiceId: string, data: Partial<InsertFridgeReading>): Promise<FridgeReading | undefined> {
    const [updated] = await db.update(schema.fridgeReadings).set(data).where(
      and(eq(schema.fridgeReadings.id, id), eq(schema.fridgeReadings.practiceId, practiceId))
    ).returning();
    return updated;
  }

  // Paginated, filtered audit log with the acting user's name joined in.
  async getAuditLogs(practiceId: string, opts: {
    entityType?: string; action?: string; search?: string;
    startDate?: Date; endDate?: Date; page: number; pageSize: number;
  }): Promise<{ rows: any[]; total: number }> {
    const conds = [eq(schema.auditLogs.practiceId, practiceId)];
    if (opts.entityType && opts.entityType !== 'all') conds.push(eq(schema.auditLogs.entityType, opts.entityType));
    if (opts.action && opts.action !== 'all') conds.push(eq(schema.auditLogs.action, opts.action));
    if (opts.search) {
      const like = `%${opts.search}%`;
      conds.push(or(
        ilike(schema.auditLogs.entityType, like),
        sql`${schema.auditLogs.entityId}::text ILIKE ${like}`,
      )!);
    }
    if (opts.startDate) conds.push(gte(schema.auditLogs.createdAt, opts.startDate));
    if (opts.endDate) conds.push(lte(schema.auditLogs.createdAt, opts.endDate));
    const where = and(...conds);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.auditLogs).where(where);

    const rows = await db.select({ log: schema.auditLogs, userName: schema.users.name })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize);

    return {
      total: count,
      rows: rows.map(({ log, userName }) => ({
        id: log.id,
        practice_id: log.practiceId,
        user_id: log.userId,
        entity_type: log.entityType,
        entity_id: log.entityId,
        action: log.action,
        before_data: log.beforeData,
        after_data: log.afterData,
        ip_address: log.ipAddress,
        user_agent: (log as any).userAgent ?? null,
        created_at: log.createdAt,
        user_name: userName ?? null,
      })),
    };
  }

  async getIncident(id: string, practiceId: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(schema.incidents).where(
      and(eq(schema.incidents.id, id), eq(schema.incidents.practiceId, practiceId))
    );
    return incident;
  }

  async getIncidentsByPractice(practiceId: string): Promise<Incident[]> {
    return db.select().from(schema.incidents).where(eq(schema.incidents.practiceId, practiceId)).orderBy(desc(schema.incidents.createdAt));
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const [created] = await db.insert(schema.incidents).values(incident).returning();
    return created;
  }

  async updateIncident(id: string, practiceId: string, data: Partial<InsertIncident>): Promise<Incident | undefined> {
    const [updated] = await db.update(schema.incidents).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.incidents.id, id), eq(schema.incidents.practiceId, practiceId))
    ).returning();
    return updated;
  }

  async getComplaint(id: string, practiceId: string): Promise<Complaint | undefined> {
    const [complaint] = await db.select().from(schema.complaints).where(
      and(eq(schema.complaints.id, id), eq(schema.complaints.practiceId, practiceId))
    );
    return complaint;
  }

  async getComplaintsByPractice(practiceId: string): Promise<Complaint[]> {
    return db.select().from(schema.complaints).where(eq(schema.complaints.practiceId, practiceId)).orderBy(desc(schema.complaints.createdAt));
  }

  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const [created] = await db.insert(schema.complaints).values(complaint).returning();
    return created;
  }

  async updateComplaint(id: string, practiceId: string, data: Partial<InsertComplaint>): Promise<Complaint | undefined> {
    const [updated] = await db.update(schema.complaints).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.complaints.id, id), eq(schema.complaints.practiceId, practiceId))
    ).returning();
    return updated;
  }

  async getPolicyDocument(id: string, practiceId: string): Promise<PolicyDocument | undefined> {
    const [policy] = await db.select().from(schema.policyDocuments).where(
      and(eq(schema.policyDocuments.id, id), eq(schema.policyDocuments.practiceId, practiceId))
    );
    return policy;
  }

  async getPolicyDocumentsByPractice(practiceId: string): Promise<PolicyDocument[]> {
    return db.select().from(schema.policyDocuments).where(eq(schema.policyDocuments.practiceId, practiceId)).orderBy(desc(schema.policyDocuments.updatedAt));
  }

  async createPolicyDocument(policy: InsertPolicyDocument): Promise<PolicyDocument> {
    const [created] = await db.insert(schema.policyDocuments).values(policy).returning();
    return created;
  }

  async updatePolicyDocument(id: string, practiceId: string, data: Partial<InsertPolicyDocument>): Promise<PolicyDocument | undefined> {
    const [updated] = await db.update(schema.policyDocuments).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.policyDocuments.id, id), eq(schema.policyDocuments.practiceId, practiceId))
    ).returning();
    return updated;
  }

  async getTrainingRecord(id: string, practiceId: string): Promise<TrainingRecord | undefined> {
    const [record] = await db.select().from(schema.trainingRecords).where(
      and(eq(schema.trainingRecords.id, id), eq(schema.trainingRecords.practiceId, practiceId))
    );
    return record;
  }

  async getTrainingRecordsByPractice(practiceId: string): Promise<TrainingRecord[]> {
    return db.select().from(schema.trainingRecords).where(eq(schema.trainingRecords.practiceId, practiceId));
  }

  async getExpiringTrainingRecords(practiceId: string, daysUntilExpiry: number): Promise<TrainingRecord[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
    return db.select().from(schema.trainingRecords).where(
      and(
        eq(schema.trainingRecords.practiceId, practiceId),
        lte(schema.trainingRecords.expiryDate, expiryDate)
      )
    );
  }

  async createTrainingRecord(record: InsertTrainingRecord): Promise<TrainingRecord> {
    const [created] = await db.insert(schema.trainingRecords).values(record).returning();
    return created;
  }

  async updateTrainingRecord(id: string, practiceId: string, data: Partial<InsertTrainingRecord>): Promise<TrainingRecord | undefined> {
    const [updated] = await db.update(schema.trainingRecords).set({ ...data, updatedAt: new Date() }).where(
      and(eq(schema.trainingRecords.id, id), eq(schema.trainingRecords.practiceId, practiceId))
    ).returning();
    return updated;
  }

  async getNotificationsByUser(userId: string, practiceId: string): Promise<Notification[]> {
    return db.select().from(schema.notifications).where(
      and(eq(schema.notifications.userId, userId), eq(schema.notifications.practiceId, practiceId))
    ).orderBy(desc(schema.notifications.createdAt));
  }

  async getUnreadNotificationsByUser(userId: string, practiceId: string): Promise<Notification[]> {
    return db.select().from(schema.notifications).where(
      and(
        eq(schema.notifications.userId, userId), 
        eq(schema.notifications.practiceId, practiceId),
        isNull(schema.notifications.readAt)
      )
    ).orderBy(desc(schema.notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(schema.notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string, practiceId: string): Promise<void> {
    await db.update(schema.notifications).set({ readAt: new Date() }).where(
      and(eq(schema.notifications.id, id), eq(schema.notifications.practiceId, practiceId))
    );
  }

  async markAllNotificationsRead(userId: string, practiceId: string): Promise<void> {
    await db.update(schema.notifications).set({ readAt: new Date() }).where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.practiceId, practiceId),
        isNull(schema.notifications.readAt)
      )
    );
  }

  async getCleaningZonesByPractice(practiceId: string): Promise<CleaningZone[]> {
    return db.select().from(schema.cleaningZones)
      .where(eq(schema.cleaningZones.practiceId, practiceId))
      .orderBy(schema.cleaningZones.zoneName);
  }

  async createCleaningZone(zone: InsertCleaningZone): Promise<CleaningZone> {
    const [created] = await db.insert(schema.cleaningZones).values(zone).returning();
    return created;
  }

  async updateCleaningZone(id: string, practiceId: string, data: Partial<InsertCleaningZone>): Promise<CleaningZone | undefined> {
    const [updated] = await db.update(schema.cleaningZones).set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.cleaningZones.id, id), eq(schema.cleaningZones.practiceId, practiceId))).returning();
    return updated;
  }

  async deleteCleaningZone(id: string, practiceId: string): Promise<void> {
    await db.update(schema.cleaningZones).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.cleaningZones.id, id), eq(schema.cleaningZones.practiceId, practiceId)));
  }

  async getCleaningTasksByPractice(practiceId: string, zoneId?: string): Promise<CleaningTask[]> {
    const condition = zoneId
      ? and(eq(schema.cleaningTasks.practiceId, practiceId), eq(schema.cleaningTasks.zoneId, zoneId))
      : eq(schema.cleaningTasks.practiceId, practiceId);
    return db.select().from(schema.cleaningTasks).where(condition).orderBy(schema.cleaningTasks.taskName);
  }

  async createCleaningTask(task: InsertCleaningTask): Promise<CleaningTask> {
    const [created] = await db.insert(schema.cleaningTasks).values(task).returning();
    return created;
  }

  async updateCleaningTask(id: string, practiceId: string, data: Partial<InsertCleaningTask>): Promise<CleaningTask | undefined> {
    const [updated] = await db.update(schema.cleaningTasks).set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.cleaningTasks.id, id), eq(schema.cleaningTasks.practiceId, practiceId))).returning();
    return updated;
  }

  async deleteCleaningTask(id: string, practiceId: string): Promise<void> {
    await db.update(schema.cleaningTasks).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.cleaningTasks.id, id), eq(schema.cleaningTasks.practiceId, practiceId)));
  }

  async getCleaningLogsByPractice(practiceId: string, date?: string): Promise<CleaningLog[]> {
    if (date) {
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      return db.select().from(schema.cleaningLogs)
        .where(and(
          eq(schema.cleaningLogs.practiceId, practiceId),
          gte(schema.cleaningLogs.logDate, start),
          lte(schema.cleaningLogs.logDate, end)
        ))
        .orderBy(desc(schema.cleaningLogs.createdAt));
    }
    return db.select().from(schema.cleaningLogs)
      .where(eq(schema.cleaningLogs.practiceId, practiceId))
      .orderBy(desc(schema.cleaningLogs.createdAt))
      .limit(200);
  }

  async createCleaningLog(log: InsertCleaningLog): Promise<CleaningLog> {
    const [created] = await db.insert(schema.cleaningLogs).values(log).returning();
    return created;
  }

  /**
   * Phase 5: create a cleaning log and, when it satisfies a scheduled cleaning
   * occurrence, mark that task complete — both in ONE transaction so the log and
   * the task completion never diverge. occurrenceTaskId is the generated tasks.id
   * (source_type='cleaning'); it must belong to this practice.
   */
  async createCleaningLogWithOccurrence(
    log: InsertCleaningLog,
    occurrenceTaskId: string | null,
    practiceId: string,
  ): Promise<CleaningLog> {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.cleaningLogs).values(log).returning();
      if (occurrenceTaskId) {
        const [updated] = await tx.update(schema.tasks)
          .set({ status: 'complete', completedAt: new Date(), updatedAt: new Date() })
          .where(and(
            eq(schema.tasks.id, occurrenceTaskId),
            eq(schema.tasks.practiceId, practiceId),
            eq(schema.tasks.sourceType, 'cleaning'),
          ))
          .returning({ id: schema.tasks.id });
        if (!updated) {
          // Occurrence not found / wrong practice / not a cleaning task — abort so
          // we never write a log claiming to close an occurrence that didn't close.
          throw new Error('cleaning occurrence not found for this practice');
        }
      }
      return created;
    });
  }

  /**
   * Today's (or a given date's) generated cleaning occurrences for a practice,
   * with assignee name. Powers the Cleaning page's scheduled view.
   */
  async getCleaningOccurrences(practiceId: string, date: string) {
    const rows = await db
      .select({ t: schema.tasks, assignee: schema.users.name })
      .from(schema.tasks)
      .leftJoin(schema.users, eq(schema.tasks.assigneeId, schema.users.id))
      .where(and(
        eq(schema.tasks.practiceId, practiceId),
        eq(schema.tasks.sourceType, 'cleaning'),
        eq(schema.tasks.scheduledDate, date),
      ));
    return rows.map(({ t, assignee }) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      slot: t.slot,
      due_at: t.dueAt,
      assignee_id: t.assigneeId,
      assignee_name: assignee ?? null,
      cleaning_task_id: (t.metadata as any)?.cleaningTaskId ?? null,
      zone_id: (t.metadata as any)?.zoneId ?? null,
    }));
  }

  // ── Phase 3: curated logbook library + selections ─────────────────────────

  /**
   * The curated library for a practice: every active curated logbook joined to
   * its section, filtered by applicability against the practice's flags, with
   * the practice's current selection attached (if any).
   */
  async getCuratedLibraryForPractice(practiceId: string): Promise<any[]> {
    const practice = await this.getPractice(practiceId);
    if (!practice) return [];

    const logbooks = await db
      .select({
        id: schema.curatedLogbooks.id,
        code: schema.curatedLogbooks.code,
        title: schema.curatedLogbooks.title,
        cadence: schema.curatedLogbooks.cadence,
        triggers: schema.curatedLogbooks.triggers,
        applicableTo: schema.curatedLogbooks.applicableTo,
        steps: schema.curatedLogbooks.steps,
        sortOrder: schema.curatedLogbooks.sortOrder,
        sectionId: schema.curatedSections.id,
        sectionName: schema.curatedSections.name,
        sectionSlug: schema.curatedSections.slug,
        sectionSort: schema.curatedSections.sortOrder,
        provenance: schema.curatedSections.provenance,
      })
      .from(schema.curatedLogbooks)
      .innerJoin(schema.curatedSections, eq(schema.curatedLogbooks.sectionId, schema.curatedSections.id))
      .where(eq(schema.curatedLogbooks.isActive, true))
      .orderBy(schema.curatedSections.sortOrder, schema.curatedLogbooks.sortOrder);

    const selections = await db
      .select()
      .from(schema.practiceLogbookSelections)
      .where(eq(schema.practiceLogbookSelections.practiceId, practiceId));
    const selByLogbook = new Map(selections.map((s) => [s.curatedLogbookId, s]));

    // Nation coverage: distinct step nations for informational display.
    const applies = (applicableTo: string[] | null): boolean => {
      const arr = applicableTo ?? ["all"];
      return arr.some((a) =>
        a === "all" ||
        (a === "dispensing" && practice.isDispensing) ||
        (a === "branch" && practice.isBranch)
      );
    };

    return logbooks
      .filter((lb) => applies(lb.applicableTo as string[] | null))
      .map((lb) => {
        const stepNations = Array.from(
          new Set(((lb.steps as any[]) ?? []).map((s) => s?.nations).filter(Boolean))
        );
        return {
          id: lb.id,
          code: lb.code,
          title: lb.title,
          cadence: lb.cadence,
          triggers: lb.triggers ?? [],
          applicableTo: lb.applicableTo ?? ["all"],
          nationCoverage: stepNations,
          section: { id: lb.sectionId, name: lb.sectionName, slug: lb.sectionSlug, sortOrder: lb.sectionSort },
          provenance: lb.provenance,
          selection: selByLogbook.get(lb.id) ?? null,
        };
      });
  }

  async getLogbookSelections(practiceId: string): Promise<any[]> {
    return db
      .select({
        id: schema.practiceLogbookSelections.id,
        curatedLogbookId: schema.practiceLogbookSelections.curatedLogbookId,
        isEnabled: schema.practiceLogbookSelections.isEnabled,
        adHocOnly: schema.practiceLogbookSelections.adHocOnly,
        cadenceOverride: schema.practiceLogbookSelections.cadenceOverride,
        preferredDay: schema.practiceLogbookSelections.preferredDay,
        preferredDate: schema.practiceLogbookSelections.preferredDate,
        dueWindowHours: schema.practiceLogbookSelections.dueWindowHours,
        earlyStartHours: schema.practiceLogbookSelections.earlyStartHours,
        importance: schema.practiceLogbookSelections.importance,
        defaultAssigneeId: schema.practiceLogbookSelections.defaultAssigneeId,
        defaultAssigneeRole: schema.practiceLogbookSelections.defaultAssigneeRole,
        requiresReview: schema.practiceLogbookSelections.requiresReview,
        nextReviewDate: schema.practiceLogbookSelections.nextReviewDate,
        logbookTitle: schema.curatedLogbooks.title,
        logbookCadence: schema.curatedLogbooks.cadence,
        sectionName: schema.curatedSections.name,
        assigneeName: schema.users.name,
      })
      .from(schema.practiceLogbookSelections)
      .innerJoin(schema.curatedLogbooks, eq(schema.practiceLogbookSelections.curatedLogbookId, schema.curatedLogbooks.id))
      .innerJoin(schema.curatedSections, eq(schema.curatedLogbooks.sectionId, schema.curatedSections.id))
      .leftJoin(schema.users, eq(schema.practiceLogbookSelections.defaultAssigneeId, schema.users.id))
      .where(eq(schema.practiceLogbookSelections.practiceId, practiceId));
  }

  async getLogbookSelection(id: string, practiceId: string): Promise<schema.PracticeLogbookSelection | undefined> {
    const [row] = await db.select().from(schema.practiceLogbookSelections).where(
      and(eq(schema.practiceLogbookSelections.id, id), eq(schema.practiceLogbookSelections.practiceId, practiceId))
    );
    return row;
  }

  async createLogbookSelection(data: any): Promise<schema.PracticeLogbookSelection> {
    const [created] = await db.insert(schema.practiceLogbookSelections).values(data).returning();
    return created;
  }

  // --- Phase 4: generated-task <-> step-execution linkage ---
  async getCuratedLogbook(id: string): Promise<schema.CuratedLogbook | undefined> {
    const [row] = await db.select().from(schema.curatedLogbooks).where(eq(schema.curatedLogbooks.id, id));
    return row;
  }

  // Find a task linked to a process instance via metadata.processInstanceId.
  async getTaskByProcessInstanceId(practiceId: string, processInstanceId: string): Promise<Task | undefined> {
    const [row] = await db.select().from(schema.tasks).where(and(
      eq(schema.tasks.practiceId, practiceId),
      sql`${schema.tasks.metadata}->>'processInstanceId' = ${processInstanceId}`,
    ));
    return row;
  }

  // My Day: a single per-user queue of what needs doing now — overdue, rejected,
  // and due-today/soon items across all sources, urgency-ranked. Respects
  // visible_from (far-future items with visible_from in the future are hidden).
  async getMyDay(practiceId: string, userId: string) {
    const now = new Date();
    const endOfTomorrow = new Date(now); endOfTomorrow.setHours(23, 59, 59, 999); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

    const rows = await db.select().from(schema.tasks).where(and(
      eq(schema.tasks.practiceId, practiceId),
      eq(schema.tasks.assigneeId, userId),
    ));

    // Exclude submitted_for_review — the assignee has done their part; it's now in
    // a manager's Review Queue, not actionable in the assignee's My Day.
    const active = rows.filter((t) => t.status !== 'complete' && t.status !== 'closed' && t.status !== 'submitted_for_review');
    const items = active
      .map((t) => {
        const due = t.dueAt ? new Date(t.dueAt) : null;
        const visibleFrom = t.visibleFrom ? new Date(t.visibleFrom) : null;
        const overdue = t.status === 'overdue' || t.status === 'missed' || (due != null && due < startOfToday);
        const rejected = t.status === 'rejected';
        const dueToday = due != null && due >= startOfToday && due <= endOfToday;
        const soon = due != null && due <= endOfTomorrow;
        // Hide items not yet visible (far-future early-start window not reached).
        if (visibleFrom && visibleFrom > now) return null;
        // Scope: overdue, rejected, or due today/soon.
        if (!overdue && !rejected && !dueToday && !soon) return null;
        const rank = overdue ? 0 : rejected ? 1 : dueToday ? 2 : 3;
        return {
          id: t.id, title: t.title, module: t.module, status: t.status,
          priority: t.priority, importance: t.importance, source_type: t.sourceType,
          due_at: t.dueAt, rejected_reason: t.rejectedReason,
          process_instance_id: (t.metadata as any)?.processInstanceId ?? null,
          rank,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.rank - b.rank || (new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime()));
    return items;
  }

  // Count of practice-wide overdue (not-complete, past-due or flagged) tasks.
  async getPracticeOverdueCount(practiceId: string): Promise<number> {
    const rows = await db.select({ status: schema.tasks.status, dueAt: schema.tasks.dueAt })
      .from(schema.tasks).where(eq(schema.tasks.practiceId, practiceId));
    const now = Date.now();
    return rows.filter((t) => t.status !== 'complete' && t.status !== 'closed' &&
      (t.status === 'overdue' || t.status === 'missed' || (t.dueAt != null && new Date(t.dueAt).getTime() < now))).length;
  }

  // Tasks awaiting manager review, with assignee name + linked process instance.
  async getReviewQueue(practiceId: string) {
    const rows = await db
      .select({ t: schema.tasks, assignee: schema.users.name })
      .from(schema.tasks)
      .leftJoin(schema.users, eq(schema.tasks.assigneeId, schema.users.id))
      .where(and(
        eq(schema.tasks.practiceId, practiceId),
        eq(schema.tasks.status, 'submitted_for_review'),
      ))
      .orderBy(desc(schema.tasks.submittedForReviewAt));
    return rows.map(({ t, assignee }) => ({
      id: t.id,
      title: t.title,
      module: t.module,
      assignee_id: t.assigneeId,
      assignee_name: assignee ?? null,
      submitted_for_review_at: t.submittedForReviewAt,
      process_instance_id: (t.metadata as any)?.processInstanceId ?? null,
      due_at: t.dueAt,
    }));
  }

  // Dedup materialised templates (curated logbook -> process_template) by name.
  async findProcessTemplateByName(practiceId: string, name: string): Promise<ProcessTemplate | undefined> {
    const [row] = await db.select().from(schema.processTemplates).where(and(
      eq(schema.processTemplates.practiceId, practiceId),
      eq(schema.processTemplates.name, name),
    ));
    return row;
  }

  async updateLogbookSelection(id: string, practiceId: string, data: any): Promise<schema.PracticeLogbookSelection | undefined> {
    const [updated] = await db.update(schema.practiceLogbookSelections)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.practiceLogbookSelections.id, id), eq(schema.practiceLogbookSelections.practiceId, practiceId)))
      .returning();
    return updated;
  }

  /** Disable a selection (soft): keeps its schedule settings; scheduler stops generating. */
  async disableLogbookSelection(id: string, practiceId: string): Promise<schema.PracticeLogbookSelection | undefined> {
    return this.updateLogbookSelection(id, practiceId, { isEnabled: false });
  }

  /** Generated logbook occurrences with no assignee, in active states, for triage. */
  async getUnassignedOccurrences(practiceId: string): Promise<Task[]> {
    return db.select().from(schema.tasks).where(
      and(
        eq(schema.tasks.practiceId, practiceId),
        eq(schema.tasks.sourceType, "logbook"),
        isNull(schema.tasks.assigneeId),
        sql`${schema.tasks.status} IN ('pending','in_progress','overdue')`
      )
    ).orderBy(schema.tasks.dueAt);
  }

  async getRoleAssignments(practiceId: string): Promise<{ role: string; userId: string | null; assignedName: string | null }[]> {
    const rows = await db.select({
      role: schema.roleAssignments.role,
      userId: schema.roleAssignments.userId,
      assignedName: schema.roleAssignments.assignedName,
    }).from(schema.roleAssignments).where(eq(schema.roleAssignments.practiceId, practiceId));
    return rows as any;
  }

  // Detailed role assignments (with contact email) for the admin management UI.
  // Distinct from getRoleAssignments (the scheduler picker) — that shape is unchanged.
  async getRoleAssignmentsDetailed(practiceId: string) {
    const rows = await db
      .select({ ra: schema.roleAssignments, email: schema.roleAssignmentContacts.assignedEmail })
      .from(schema.roleAssignments)
      .leftJoin(schema.roleAssignmentContacts, eq(schema.roleAssignments.id, schema.roleAssignmentContacts.assignmentId))
      .where(eq(schema.roleAssignments.practiceId, practiceId))
      .orderBy(schema.roleAssignments.assignedName);
    return rows.map(({ ra, email }) => ({
      id: ra.id,
      practice_id: ra.practiceId,
      role: ra.role,
      assigned_name: ra.assignedName,
      assigned_email: ra.assignedEmail ?? email ?? null,
      user_id: ra.userId,
      created_at: ra.createdAt,
    }));
  }
  async createRoleAssignment(practiceId: string, assignedName: string, role: string): Promise<string> {
    const [row] = await db.insert(schema.roleAssignments)
      .values({ practiceId, assignedName, role: role as any })
      .returning({ id: schema.roleAssignments.id });
    return row.id;
  }
  async setRoleAssignmentContact(assignmentId: string, assignedEmail: string) {
    await db.insert(schema.roleAssignmentContacts)
      .values({ assignmentId, assignedEmail })
      .onConflictDoUpdate({ target: schema.roleAssignmentContacts.assignmentId, set: { assignedEmail, updatedAt: new Date() } });
  }
  async deleteRoleAssignment(id: string, practiceId: string): Promise<boolean> {
    const result = await db.delete(schema.roleAssignments)
      .where(and(eq(schema.roleAssignments.id, id), eq(schema.roleAssignments.practiceId, practiceId)))
      .returning({ id: schema.roleAssignments.id });
    return result.length > 0;
  }

  // --- RBAC catalog (moved off client Supabase onto the API; see docs/RBAC_MAP.md) ---
  // Returns are shaped snake_case with nested `role_catalog` to match what the client
  // transforms already expect, so page transforms stay untouched.

  private mapCatalog(r: typeof schema.roleCatalog.$inferSelect) {
    return {
      id: r.id,
      role_key: r.roleKey,
      display_name: r.displayName,
      category: r.category,
      default_capabilities: r.defaultCapabilities ?? [],
      description: r.description,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }

  async getRoleCatalog() {
    const rows = await db.select().from(schema.roleCatalog)
      .orderBy(schema.roleCatalog.category, schema.roleCatalog.displayName);
    return rows.map((r) => this.mapCatalog(r));
  }

  async getPracticeRoles(practiceId: string) {
    const rows = await db
      .select({ pr: schema.practiceRoles, cat: schema.roleCatalog })
      .from(schema.practiceRoles)
      .leftJoin(schema.roleCatalog, eq(schema.practiceRoles.roleCatalogId, schema.roleCatalog.id))
      .where(eq(schema.practiceRoles.practiceId, practiceId));
    return rows.map(({ pr, cat }) => ({
      id: pr.id,
      practice_id: pr.practiceId,
      role_catalog_id: pr.roleCatalogId,
      is_active: pr.isActive,
      created_at: pr.createdAt,
      updated_at: pr.updatedAt,
      role_catalog: cat ? this.mapCatalog(cat) : null,
    }));
  }

  async enablePracticeRole(practiceId: string, roleCatalogId: string) {
    const [existing] = await db.select().from(schema.practiceRoles)
      .where(and(
        eq(schema.practiceRoles.practiceId, practiceId),
        eq(schema.practiceRoles.roleCatalogId, roleCatalogId),
      ));
    if (existing) {
      if (!existing.isActive) {
        await db.update(schema.practiceRoles)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(schema.practiceRoles.id, existing.id));
      }
      return existing.id;
    }
    const [created] = await db.insert(schema.practiceRoles)
      .values({ practiceId, roleCatalogId, isActive: true })
      .returning({ id: schema.practiceRoles.id });
    return created.id;
  }

  async setPracticeRoleActive(id: string, practiceId: string, isActive: boolean) {
    const result = await db.update(schema.practiceRoles)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(schema.practiceRoles.id, id), eq(schema.practiceRoles.practiceId, practiceId)))
      .returning({ id: schema.practiceRoles.id });
    return result.length > 0;
  }

  async getPracticeRoleCapabilities(practiceRoleIds: string[]) {
    if (practiceRoleIds.length === 0) return [];
    const rows = await db.select({
      practice_role_id: schema.practiceRoleCapabilities.practiceRoleId,
      capability: schema.practiceRoleCapabilities.capability,
    }).from(schema.practiceRoleCapabilities)
      .where(inArray(schema.practiceRoleCapabilities.practiceRoleId, practiceRoleIds));
    return rows;
  }

  async addCapabilityOverride(practiceRoleId: string, capability: string) {
    await db.insert(schema.practiceRoleCapabilities)
      .values({ practiceRoleId, capability })
      .onConflictDoNothing();
  }

  async removeCapabilityOverride(practiceRoleId: string, capability: string) {
    await db.delete(schema.practiceRoleCapabilities)
      .where(and(
        eq(schema.practiceRoleCapabilities.practiceRoleId, practiceRoleId),
        eq(schema.practiceRoleCapabilities.capability, capability),
      ));
  }

  async getUserPracticeRoles(practiceId: string, userId?: string) {
    const conditions = [eq(schema.userPracticeRoles.practiceId, practiceId)];
    if (userId) conditions.push(eq(schema.userPracticeRoles.userId, userId));
    const rows = await db
      .select({ upr: schema.userPracticeRoles, pr: schema.practiceRoles, cat: schema.roleCatalog })
      .from(schema.userPracticeRoles)
      .leftJoin(schema.practiceRoles, eq(schema.userPracticeRoles.practiceRoleId, schema.practiceRoles.id))
      .leftJoin(schema.roleCatalog, eq(schema.practiceRoles.roleCatalogId, schema.roleCatalog.id))
      .where(and(...conditions));
    return rows.map(({ upr, pr, cat }) => ({
      id: upr.id,
      practice_id: upr.practiceId,
      user_id: upr.userId,
      practice_role_id: upr.practiceRoleId,
      created_at: upr.createdAt,
      updated_at: upr.updatedAt,
      practice_role: pr ? {
        id: pr.id,
        practice_id: pr.practiceId,
        role_catalog_id: pr.roleCatalogId,
        is_active: pr.isActive,
        created_at: pr.createdAt,
        updated_at: pr.updatedAt,
        role_catalog: cat ? this.mapCatalog(cat) : null,
      } : null,
    }));
  }

  async assignUserPracticeRole(practiceId: string, userId: string, practiceRoleId: string): Promise<string> {
    const [row] = await db.insert(schema.userPracticeRoles)
      .values({ practiceId, userId, practiceRoleId })
      .onConflictDoNothing()
      .returning({ id: schema.userPracticeRoles.id });
    if (row) return row.id;
    // Already existed (idempotent) — look up the existing row's id.
    const [existing] = await db.select({ id: schema.userPracticeRoles.id })
      .from(schema.userPracticeRoles)
      .where(and(
        eq(schema.userPracticeRoles.userId, userId),
        eq(schema.userPracticeRoles.practiceRoleId, practiceRoleId),
      ));
    return existing?.id ?? "";
  }

  async unassignUserPracticeRole(userId: string, practiceRoleId: string) {
    await db.delete(schema.userPracticeRoles)
      .where(and(
        eq(schema.userPracticeRoles.userId, userId),
        eq(schema.userPracticeRoles.practiceRoleId, practiceRoleId),
      ));
  }

  // Compute a single user's capability set: catalog defaults of active roles + overrides.
  async getUserCapabilities(practiceId: string, userId: string): Promise<string[]> {
    const roles = await this.getUserPracticeRoles(practiceId, userId);
    const active = roles.filter((r) => r.practice_role?.is_active);
    const caps = new Set<string>();
    for (const r of active) {
      for (const c of r.practice_role?.role_catalog?.default_capabilities ?? []) caps.add(c);
    }
    const overrides = await this.getPracticeRoleCapabilities(
      active.map((r) => r.practice_role_id),
    );
    for (const o of overrides) caps.add(o.capability);
    return Array.from(caps);
  }

  // --- batch (c) data tables (existing Supabase-native, described in Drizzle) ---

  async getMedicalRequests(practiceId: string) {
    return db.select().from(schema.medicalRequests)
      .where(eq(schema.medicalRequests.practiceId, practiceId))
      .orderBy(desc(schema.medicalRequests.receivedAt));
  }
  async createMedicalRequest(data: typeof schema.medicalRequests.$inferInsert) {
    const [row] = await db.insert(schema.medicalRequests).values(data).returning();
    return row;
  }
  async updateMedicalRequest(id: string, practiceId: string, data: Partial<typeof schema.medicalRequests.$inferInsert>) {
    const [row] = await db.update(schema.medicalRequests).set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.medicalRequests.id, id), eq(schema.medicalRequests.practiceId, practiceId))).returning();
    return row;
  }

  async getGovernanceApprovals(practiceId: string) {
    return db.select().from(schema.governanceApprovals)
      .where(eq(schema.governanceApprovals.practiceId, practiceId))
      .orderBy(desc(schema.governanceApprovals.createdAt));
  }
  async createGovernanceApproval(data: typeof schema.governanceApprovals.$inferInsert) {
    const [row] = await db.insert(schema.governanceApprovals).values(data).returning();
    return row;
  }
  async updateGovernanceApproval(id: string, practiceId: string, data: Partial<typeof schema.governanceApprovals.$inferInsert>) {
    const [row] = await db.update(schema.governanceApprovals).set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.governanceApprovals.id, id), eq(schema.governanceApprovals.practiceId, practiceId))).returning();
    return row;
  }
  async deleteGovernanceApproval(id: string, practiceId: string) {
    await db.delete(schema.governanceApprovals)
      .where(and(eq(schema.governanceApprovals.id, id), eq(schema.governanceApprovals.practiceId, practiceId)));
  }

  async getMonthEndScripts(practiceId: string) {
    return db.select().from(schema.monthEndScripts)
      .where(eq(schema.monthEndScripts.practiceId, practiceId))
      .orderBy(desc(schema.monthEndScripts.createdAt));
  }
  async createMonthEndScript(data: typeof schema.monthEndScripts.$inferInsert) {
    const [row] = await db.insert(schema.monthEndScripts).values(data).returning();
    return row;
  }

  async getClaimRuns(practiceId: string) {
    return db.select().from(schema.claimRuns)
      .where(eq(schema.claimRuns.practiceId, practiceId))
      .orderBy(desc(schema.claimRuns.periodStart));
  }

  async getClaimRun(id: string, practiceId: string) {
    const [row] = await db.select().from(schema.claimRuns)
      .where(and(eq(schema.claimRuns.id, id), eq(schema.claimRuns.practiceId, practiceId)));
    return row;
  }

  /** month_end_scripts whose issue_date falls in [from,to] — the run's scripts. */
  async getScriptsInPeriod(practiceId: string, from: string, to: string) {
    return db.select().from(schema.monthEndScripts).where(and(
      eq(schema.monthEndScripts.practiceId, practiceId),
      gte(schema.monthEndScripts.issueDate, from),
      lte(schema.monthEndScripts.issueDate, to),
    ));
  }

  /** KF3: create a draft claim run, auto-counting scripts + items in the period. */
  async createClaimRun(practiceId: string, from: string, to: string, claimType: string | null) {
    const scripts = await this.getScriptsInPeriod(practiceId, from, to);
    const totalScripts = scripts.length;
    const totalItems = scripts.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
    const [row] = await db.insert(schema.claimRuns).values({
      practiceId,
      periodStart: new Date(from + "T00:00:00Z"),
      periodEnd: new Date(to + "T23:59:59Z"),
      claimType: claimType ?? "month_end",
      status: "draft",
      totalScripts,
      totalItems,
    } as any).returning();
    return row;
  }

  /** KF3: draft -> submitted (records submitter + timestamp). */
  async submitClaimRun(id: string, practiceId: string, submittedBy: string) {
    const [row] = await db.update(schema.claimRuns)
      .set({ status: "submitted", submittedBy, submittedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.claimRuns.id, id), eq(schema.claimRuns.practiceId, practiceId)))
      .returning();
    return row;
  }

  async getRoomsByPractice(practiceId: string) {
    return db.select().from(schema.rooms).where(eq(schema.rooms.practiceId, practiceId));
  }

  async getIpcAudits(practiceId: string) {
    return db.select().from(schema.ipcAudits)
      .where(eq(schema.ipcAudits.practiceId, practiceId))
      .orderBy(desc(schema.ipcAudits.auditDate));
  }
  async createIpcAudit(data: typeof schema.ipcAudits.$inferInsert) {
    const [row] = await db.insert(schema.ipcAudits).values(data).returning();
    return row;
  }
  async getIpcActions(practiceId: string) {
    return db.select().from(schema.ipcActions)
      .where(eq(schema.ipcActions.practiceId, practiceId));
  }

  async getDbsChecks(practiceId: string) {
    return db.select().from(schema.dbsChecks)
      .where(eq(schema.dbsChecks.practiceId, practiceId))
      .orderBy(desc(schema.dbsChecks.checkDate));
  }
  async createDbsCheck(data: typeof schema.dbsChecks.$inferInsert) {
    const [row] = await db.insert(schema.dbsChecks).values(data).returning();
    return row;
  }

  async updateDbsCheck(id: string, practiceId: string, data: Partial<typeof schema.dbsChecks.$inferInsert>) {
    const [row] = await db.update(schema.dbsChecks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.dbsChecks.id, id), eq(schema.dbsChecks.practiceId, practiceId)))
      .returning();
    return row;
  }

  async deleteDbsCheck(id: string, practiceId: string): Promise<boolean> {
    const rows = await db.delete(schema.dbsChecks)
      .where(and(eq(schema.dbsChecks.id, id), eq(schema.dbsChecks.practiceId, practiceId)))
      .returning({ id: schema.dbsChecks.id });
    return rows.length > 0;
  }

  // KF4: training-type catalogue (practice-defined).
  async getTrainingTypes(practiceId: string) {
    return db.select().from(schema.trainingTypes)
      .where(eq(schema.trainingTypes.practiceId, practiceId))
      .orderBy(schema.trainingTypes.name);
  }
  async createTrainingType(data: typeof schema.trainingTypes.$inferInsert) {
    const [row] = await db.insert(schema.trainingTypes).values(data).returning();
    return row;
  }
  async updateTrainingType(id: string, practiceId: string, data: Partial<typeof schema.trainingTypes.$inferInsert>) {
    const [row] = await db.update(schema.trainingTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.trainingTypes.id, id), eq(schema.trainingTypes.practiceId, practiceId)))
      .returning();
    return row;
  }
  /** KF4: set (or clear) a training record's type_id, scoped to the practice. */
  async setTrainingRecordType(recordId: string, practiceId: string, typeId: string | null) {
    const [row] = await db.update(schema.trainingRecords)
      .set({ typeId, updatedAt: new Date() })
      .where(and(eq(schema.trainingRecords.id, recordId), eq(schema.trainingRecords.practiceId, practiceId)))
      .returning();
    return row;
  }

  // KF2: appraisals register (per-employee history, newest first).
  async getAppraisals(practiceId: string) {
    return db.select().from(schema.appraisals)
      .where(eq(schema.appraisals.practiceId, practiceId))
      .orderBy(desc(schema.appraisals.appraisalDate));
  }
  async createAppraisal(data: typeof schema.appraisals.$inferInsert) {
    const [row] = await db.insert(schema.appraisals).values(data).returning();
    return row;
  }
  async updateAppraisal(id: string, practiceId: string, data: Partial<typeof schema.appraisals.$inferInsert>) {
    const [row] = await db.update(schema.appraisals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.appraisals.id, id), eq(schema.appraisals.practiceId, practiceId)))
      .returning();
    return row;
  }

  // --- step_instances + evidence (logbook completion flow) ---
  // step_instances/evidence carry no practice_id; scope via the parent
  // process_instance. Shaped snake_case to match the client interfaces.
  private mapStep(s: typeof schema.stepInstances.$inferSelect) {
    return {
      id: s.id,
      process_instance_id: s.processInstanceId,
      step_index: s.stepIndex,
      title: s.title,
      status: s.status,
      notes: s.notes,
      device_timestamp: s.deviceTimestamp,
      server_timestamp: s.serverTimestamp,
      three_words: s.threeWords,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    };
  }
  private mapEvidence(e: typeof schema.evidence.$inferSelect) {
    return {
      id: e.id,
      step_instance_id: e.stepInstanceId,
      user_id: e.userId,
      type: e.type,
      storage_path: e.storagePath,
      mime_type: e.mimeType,
      created_at: e.createdAt,
    };
  }

  async getStepInstances(practiceId: string, processInstanceId: string) {
    const pi = await this.getProcessInstance(processInstanceId, practiceId);
    if (!pi) return [];
    const rows = await db.select().from(schema.stepInstances)
      .where(eq(schema.stepInstances.processInstanceId, processInstanceId))
      .orderBy(schema.stepInstances.stepIndex);
    return rows.map((r) => this.mapStep(r));
  }

  async createStepInstances(practiceId: string, processInstanceId: string,
    steps: { stepIndex: number; title: string; status?: string }[]) {
    const pi = await this.getProcessInstance(processInstanceId, practiceId);
    if (!pi) return null;
    const values = steps.map((s) => ({
      processInstanceId,
      stepIndex: s.stepIndex,
      title: s.title,
      status: (s.status ?? 'pending') as any,
    }));
    const created = await db.insert(schema.stepInstances).values(values).returning();
    return created.sort((a, b) => a.stepIndex - b.stepIndex).map((r) => this.mapStep(r));
  }

  // Verify a step belongs to the practice via its process_instance.
  private async stepBelongsToPractice(stepInstanceId: string, practiceId: string): Promise<boolean> {
    const [row] = await db
      .select({ pid: schema.processInstances.practiceId })
      .from(schema.stepInstances)
      .leftJoin(schema.processInstances, eq(schema.stepInstances.processInstanceId, schema.processInstances.id))
      .where(eq(schema.stepInstances.id, stepInstanceId));
    return !!row && row.pid === practiceId;
  }

  async updateStepInstance(id: string, practiceId: string, data: Partial<typeof schema.stepInstances.$inferInsert>) {
    if (!(await this.stepBelongsToPractice(id, practiceId))) return undefined;
    const [updated] = await db.update(schema.stepInstances)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.stepInstances.id, id)).returning();
    return updated ? this.mapStep(updated) : undefined;
  }

  async getEvidenceByStep(practiceId: string, stepInstanceId: string) {
    if (!(await this.stepBelongsToPractice(stepInstanceId, practiceId))) return [];
    const rows = await db.select().from(schema.evidence)
      .where(eq(schema.evidence.stepInstanceId, stepInstanceId))
      .orderBy(desc(schema.evidence.createdAt));
    return rows.map((r) => this.mapEvidence(r));
  }

  async createEvidence(practiceId: string, data: typeof schema.evidence.$inferInsert) {
    if (!(await this.stepBelongsToPractice(data.stepInstanceId, practiceId))) return null;
    const [row] = await db.insert(schema.evidence).values(data).returning();
    return this.mapEvidence(row);
  }

  async deleteEvidence(id: string, practiceId: string): Promise<boolean> {
    const [row] = await db
      .select({ pid: schema.processInstances.practiceId })
      .from(schema.evidence)
      .leftJoin(schema.stepInstances, eq(schema.evidence.stepInstanceId, schema.stepInstances.id))
      .leftJoin(schema.processInstances, eq(schema.stepInstances.processInstanceId, schema.processInstances.id))
      .where(eq(schema.evidence.id, id));
    if (!row || row.pid !== practiceId) return false;
    await db.delete(schema.evidence).where(eq(schema.evidence.id, id));
    return true;
  }

  // --- baseline (table access only; edge-function compute stays on Supabase) ---
  async getBaselineSnapshots(practiceId: string) {
    return db.select().from(schema.baselineSnapshots)
      .where(eq(schema.baselineSnapshots.practiceId, practiceId))
      .orderBy(desc(schema.baselineSnapshots.createdAt));
  }
  async createBaselineDocument(data: typeof schema.baselineDocuments.$inferInsert) {
    const [row] = await db.insert(schema.baselineDocuments).values(data).returning();
    return row;
  }
  async deleteBaselineDocument(id: string, practiceId: string): Promise<boolean> {
    const result = await db.delete(schema.baselineDocuments)
      .where(and(eq(schema.baselineDocuments.id, id), eq(schema.baselineDocuments.practiceId, practiceId)))
      .returning({ id: schema.baselineDocuments.id });
    return result.length > 0;
  }

  // --- MFA (server-only secret handling) ---
  async getUserById(id: string) {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return u;
  }
  async getMfaSecret(userId: string): Promise<string | null> {
    const [row] = await db.select({ s: schema.userAuthSensitive.mfaSecret })
      .from(schema.userAuthSensitive).where(eq(schema.userAuthSensitive.userId, userId));
    return row?.s ?? null;
  }
  async setMfaSecret(userId: string, secret: string | null) {
    await db.insert(schema.userAuthSensitive)
      .values({ userId, mfaSecret: secret })
      .onConflictDoUpdate({ target: schema.userAuthSensitive.userId, set: { mfaSecret: secret, updatedAt: new Date() } });
  }
  async insertAuditLog(row: typeof schema.auditLogs.$inferInsert) {
    await db.insert(schema.auditLogs).values(row);
  }

  async createOrganizationSetup(practiceId: string) {
    await db.insert(schema.organizationSetup)
      .values({ practiceId, setupCompleted: true, setupCompletedAt: new Date() } as any)
      .onConflictDoNothing();
  }
}

export const storage = new DatabaseStorage();
