import { eq, and, desc, gte, lte, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@shared/schema";
import type {
  Practice, User, Employee, ProcessTemplate, ProcessInstance,
  Task, Incident, Complaint, PolicyDocument, TrainingRecord, Notification,
  InsertPractice, InsertUser, InsertEmployee, InsertProcessTemplate,
  InsertProcessInstance, InsertTask, InsertIncident, InsertComplaint,
  InsertPolicyDocument, InsertTrainingRecord, InsertNotification
} from "@shared/schema";

export interface IStorage {
  getPractice(id: string): Promise<Practice | undefined>;
  getPractices(): Promise<Practice[]>;
  createPractice(practice: InsertPractice): Promise<Practice>;
  updatePractice(id: string, data: Partial<InsertPractice>): Promise<Practice | undefined>;

  getUser(id: string, practiceId: string): Promise<User | undefined>;
  getUserByEmail(email: string, practiceId: string): Promise<User | undefined>;
  getUsersByPractice(practiceId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, practiceId: string, data: Partial<InsertUser>): Promise<User | undefined>;

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
  getTasksByPractice(practiceId: string): Promise<Task[]>;
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
}

export class DatabaseStorage implements IStorage {
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

  async getUserByEmail(email: string, practiceId: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(and(eq(schema.users.email, email), eq(schema.users.practiceId, practiceId)));
    return user;
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

  async getTasksByPractice(practiceId: string): Promise<Task[]> {
    return db.select().from(schema.tasks).where(eq(schema.tasks.practiceId, practiceId)).orderBy(desc(schema.tasks.createdAt));
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
}

export const storage = new DatabaseStorage();
