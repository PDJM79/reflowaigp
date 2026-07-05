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
}

export const storage = new DatabaseStorage();
