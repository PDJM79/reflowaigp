import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { getAITips } from "./aiTips";
import { getComplaintAnalysis } from "./complaintAnalysis";
import { getTrainingAnalysis } from "./trainingAnalysis";
import { getSectionTips } from "./sectionTips";
import { registerOnboardingRoutes } from "./onboarding";
import { getCqcCircuitStatus } from "./services/cqc-service";
import { auditLogger } from "./auditLogger";
import { db } from "./db";
import {
  insertPracticeSchema, insertUserSchema, insertEmployeeSchema,
  insertTaskSchema, insertIncidentSchema, insertComplaintSchema,
  insertPolicyDocumentSchema, insertTrainingRecordSchema, insertNotificationSchema,
  insertProcessTemplateSchema, insertFridgeUnitSchema, insertFridgeReadingSchema,
  insertCleaningZoneSchema, insertCleaningTaskSchema, insertCleaningLogSchema,
  practices, practiceModules, policyDocuments, tasks as tasksTable,
  cleaningZones, cleaningTasks, onboardingSessions,
} from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { newRequestId, clonePracticeSchema, toggleModuleSchema } from "./onboarding-helpers";
import { ALL_MODULE_IDS } from "./onboarding-complete";

// Ensures the authenticated user can only access their own practice's data
const requireSamePractice: RequestHandler = (req, res, next) => {
  const requestedPracticeId = (req.params.practiceId as string);
  if (!requestedPracticeId) return next();
  if (req.session.practiceId !== requestedPracticeId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

function stripPracticeId<T extends Record<string, any>>(data: T): Omit<T, 'practiceId'> {
  const { practiceId, ...rest } = data;
  return rest;
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Audit all mutating requests on practice routes after session is available
  app.use("/api/practices", auditLogger);

  app.get("/api/health", (_req, res) => {
    const cqc = getCqcCircuitStatus();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        onboarding: { status: "ok" },
        cqc: { status: cqc.open ? "degraded" : "ok", circuit: cqc },
      },
    });
  });

  // Register onboarding routes (public, no auth required)
  registerOnboardingRoutes(app);

  // Public: needed during login to list available practices
  app.get("/api/practices", async (_req, res) => {
    try {
      const practices = await storage.getPractices();
      // Only expose safe fields to unauthenticated callers
      res.json(practices.map(({ id, name, country }) => ({ id, name, country })));
    } catch (error) {
      console.error("GET /api/practices error:", error);
      res.status(500).json({ error: "Failed to fetch practices" });
    }
  });

  app.get("/api/practices/:id", isAuthenticated, async (req, res) => {
    try {
      // Users may only fetch their own practice
      if (req.session.practiceId !== (req.params.id as string)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const practice = await storage.getPractice((req.params.id as string));
      if (!practice) {
        return res.status(404).json({ error: "Practice not found" });
      }
      res.json(practice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch practice" });
    }
  });

  app.post("/api/practices", isAuthenticated, async (req, res) => {
    try {
      const validated = insertPracticeSchema.parse(req.body);
      const practice = await storage.createPractice(validated);
      res.status(201).json(practice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create practice" });
    }
  });

  app.patch("/api/practices/:id", isAuthenticated, async (req, res) => {
    try {
      if (req.session.practiceId !== (req.params.id as string)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const practice = await storage.updatePractice((req.params.id as string), req.body);
      if (!practice) {
        return res.status(404).json({ error: "Practice not found" });
      }
      res.json(practice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update practice" });
    }
  });

  app.get("/api/practices/:practiceId/users", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const users = await storage.getUsersByPractice((req.params.practiceId as string));
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/practices/:practiceId/users/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const user = await storage.getUser((req.params.id as string), (req.params.practiceId as string));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/practices/:practiceId/users", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertUserSchema.parse(dataWithPractice);
      const user = await storage.createUser(validated);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/practices/:practiceId/users/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const user = await storage.updateUser((req.params.id as string), (req.params.practiceId as string), stripPracticeId(req.body));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/practices/:practiceId/employees", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const employees = await storage.getEmployeesByPractice((req.params.practiceId as string));
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/practices/:practiceId/employees/active", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const employees = await storage.getActiveEmployeesByPractice((req.params.practiceId as string));
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active employees" });
    }
  });

  app.get("/api/practices/:practiceId/employees/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const employee = await storage.getEmployee((req.params.id as string), (req.params.practiceId as string));
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/practices/:practiceId/employees", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertEmployeeSchema.parse(dataWithPractice);
      const employee = await storage.createEmployee(validated);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.patch("/api/practices/:practiceId/employees/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const employee = await storage.updateEmployee((req.params.id as string), (req.params.practiceId as string), stripPracticeId(req.body));
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.get("/api/practices/:practiceId/process-templates", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const templates = await storage.getProcessTemplatesByPractice((req.params.practiceId as string));
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch process templates" });
    }
  });

  app.get("/api/practices/:practiceId/process-templates/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const template = await storage.getProcessTemplate((req.params.id as string), (req.params.practiceId as string));
      if (!template) {
        return res.status(404).json({ error: "Process template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch process template" });
    }
  });

  app.post("/api/practices/:practiceId/process-templates", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertProcessTemplateSchema.parse(dataWithPractice);
      const template = await storage.createProcessTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create process template" });
    }
  });

  app.patch("/api/practices/:practiceId/process-templates/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const template = await storage.updateProcessTemplate((req.params.id as string), (req.params.practiceId as string), stripPracticeId(req.body));
      if (!template) {
        return res.status(404).json({ error: "Process template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update process template" });
    }
  });

  app.get("/api/practices/:practiceId/tasks", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const module = typeof req.query.module === 'string' ? req.query.module : undefined;
      const tasks = await storage.getTasksByPractice(req.params.practiceId as string, module);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/practices/:practiceId/tasks/overdue", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const tasks = await storage.getOverdueTasks((req.params.practiceId as string));
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overdue tasks" });
    }
  });

  app.get("/api/practices/:practiceId/tasks/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const task = await storage.getTask((req.params.id as string), (req.params.practiceId as string));
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/practices/:practiceId/tasks", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertTaskSchema.parse(dataWithPractice);
      const task = await storage.createTask(validated);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/practices/:practiceId/tasks/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const task = await storage.updateTask((req.params.id as string), (req.params.practiceId as string), stripPracticeId(req.body));
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.get("/api/practices/:practiceId/incidents", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const incidents = await storage.getIncidentsByPractice((req.params.practiceId as string));
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  app.get("/api/practices/:practiceId/incidents/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const incident = await storage.getIncident((req.params.id as string), (req.params.practiceId as string));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incident" });
    }
  });

  app.post("/api/practices/:practiceId/incidents", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const practiceId = req.params.practiceId as string;
      const body = req.body;
      // Derive legacy required columns that exist in the live DB
      const severity = body.severity || 'low';
      const rag = (severity === 'major' || severity === 'critical') ? 'red'
                : (severity === 'moderate') ? 'amber' : 'green';
      const dateOccurred = body.dateOccurred ? new Date(body.dateOccurred) : new Date();
      const dataWithPractice = {
        ...stripPracticeId(body),
        practiceId,
        rag,
        reportedBy: body.reportedById || (req.session as any).userId || '',
        incidentDate: dateOccurred,
        dateOccurred,
      };
      const validated = insertIncidentSchema.parse(dataWithPractice);
      const incident = await storage.createIncident(validated);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  app.patch("/api/practices/:practiceId/incidents/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const incident = await storage.updateIncident((req.params.id as string), (req.params.practiceId as string), stripPracticeId(req.body));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to update incident" });
    }
  });

  app.get("/api/practices/:practiceId/complaints", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const complaints = await storage.getComplaintsByPractice((req.params.practiceId as string));
      res.json(complaints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });

  app.get("/api/practices/:practiceId/complaints/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const complaint = await storage.getComplaint((req.params.id as string), (req.params.practiceId as string));
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch complaint" });
    }
  });

  app.post("/api/practices/:practiceId/complaints", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertComplaintSchema.parse(dataWithPractice);
      const complaint = await storage.createComplaint(validated);
      res.status(201).json(complaint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create complaint" });
    }
  });

  app.patch("/api/practices/:practiceId/complaints/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const complaint = await storage.updateComplaint((req.params.id as string), (req.params.practiceId as string), stripPracticeId(req.body));
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update complaint" });
    }
  });

  app.get("/api/practices/:practiceId/policies", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const policies = await storage.getPolicyDocumentsByPractice((req.params.practiceId as string));
      res.json(policies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch policies" });
    }
  });

  app.get("/api/practices/:practiceId/policies/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const policy = await storage.getPolicyDocument((req.params.id as string), (req.params.practiceId as string));
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch policy" });
    }
  });

  app.post("/api/practices/:practiceId/policies", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertPolicyDocumentSchema.parse(dataWithPractice);
      const policy = await storage.createPolicyDocument(validated);
      res.status(201).json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create policy" });
    }
  });

  app.patch("/api/practices/:practiceId/policies/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const policy = await storage.updatePolicyDocument((req.params.id as string), (req.params.practiceId as string), stripPracticeId(req.body));
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: "Failed to update policy" });
    }
  });

  app.get("/api/practices/:practiceId/training-records", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const records = await storage.getTrainingRecordsByPractice((req.params.practiceId as string));
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training records" });
    }
  });

  app.get("/api/practices/:practiceId/training-records/expiring", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const records = await storage.getExpiringTrainingRecords((req.params.practiceId as string), days);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expiring training records" });
    }
  });

  app.get("/api/practices/:practiceId/training-records/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const record = await storage.getTrainingRecord((req.params.id as string), (req.params.practiceId as string));
      if (!record) {
        return res.status(404).json({ error: "Training record not found" });
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training record" });
    }
  });

  app.post("/api/practices/:practiceId/training-records", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertTrainingRecordSchema.parse(dataWithPractice);
      const record = await storage.createTrainingRecord(validated);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create training record" });
    }
  });

  app.patch("/api/practices/:practiceId/training-records/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const record = await storage.updateTrainingRecord((req.params.id as string), (req.params.practiceId as string), stripPracticeId(req.body));
      if (!record) {
        return res.status(404).json({ error: "Training record not found" });
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to update training record" });
    }
  });

  app.get("/api/practices/:practiceId/users/:userId/notifications", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser((req.params.userId as string), (req.params.practiceId as string));
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/practices/:practiceId/users/:userId/notifications/unread", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotificationsByUser((req.params.userId as string), (req.params.practiceId as string));
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  app.post("/api/practices/:practiceId/notifications", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertNotificationSchema.parse(dataWithPractice);
      const notification = await storage.createNotification(validated);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.patch("/api/practices/:practiceId/notifications/:id/read", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      await storage.markNotificationRead((req.params.id as string), (req.params.practiceId as string));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/practices/:practiceId/users/:userId/notifications/read-all", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      await storage.markAllNotificationsRead((req.params.userId as string), (req.params.practiceId as string));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.get("/api/practices/:practiceId/fridge-units", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const units = await storage.getFridgeUnitsByPractice(req.params.practiceId as string);
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fridge units" });
    }
  });

  app.post("/api/practices/:practiceId/fridge-units", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId as string };
      const validated = insertFridgeUnitSchema.parse(dataWithPractice);
      const unit = await storage.createFridgeUnit(validated);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create fridge unit" });
    }
  });

  app.patch("/api/practices/:practiceId/fridge-units/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const unit = await storage.updateFridgeUnit(req.params.id as string, req.params.practiceId as string, stripPracticeId(req.body));
      if (!unit) return res.status(404).json({ error: "Fridge unit not found" });
      res.json(unit);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fridge unit" });
    }
  });

  app.get("/api/practices/:practiceId/fridge-readings", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const fridgeId = typeof req.query.fridgeId === 'string' ? req.query.fridgeId : undefined;
      const readings = await storage.getFridgeReadingsByPractice(req.params.practiceId as string, fridgeId);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fridge readings" });
    }
  });

  app.post("/api/practices/:practiceId/fridge-readings", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const practiceId = req.params.practiceId as string;
      const body = req.body;
      const fridge = await storage.getFridgeUnitsByPractice(practiceId).then(units => units.find(u => u.id === body.fridgeId));
      const temp = parseFloat(body.temperature);
      const isOutOfRange = fridge
        ? (temp < parseFloat(fridge.minTemp as string) || temp > parseFloat(fridge.maxTemp as string))
        : false;
      const dataWithPractice = {
        ...stripPracticeId(body),
        practiceId,
        isOutOfRange,
        recordedBy: body.recordedBy || (req.session as any).userId || undefined,
      };
      const validated = insertFridgeReadingSchema.parse(dataWithPractice);
      const reading = await storage.createFridgeReading(validated);
      res.status(201).json({ ...reading, isOutOfRange });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create fridge reading" });
    }
  });

  // Cleaning Zones
  app.get("/api/practices/:practiceId/cleaning-zones", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const zones = await storage.getCleaningZonesByPractice(req.params.practiceId as string);
      res.json(zones);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cleaning zones" });
    }
  });

  app.post("/api/practices/:practiceId/cleaning-zones", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId as string };
      const validated = insertCleaningZoneSchema.parse(dataWithPractice);
      const zone = await storage.createCleaningZone(validated);
      res.status(201).json(zone);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create cleaning zone" });
    }
  });

  app.put("/api/practices/:practiceId/cleaning-zones/:zoneId", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const zone = await storage.updateCleaningZone(req.params.zoneId as string, req.params.practiceId as string, stripPracticeId(req.body));
      if (!zone) return res.status(404).json({ error: "Zone not found" });
      res.json(zone);
    } catch (error) {
      res.status(500).json({ error: "Failed to update cleaning zone" });
    }
  });

  app.delete("/api/practices/:practiceId/cleaning-zones/:zoneId", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      await storage.deleteCleaningZone(req.params.zoneId as string, req.params.practiceId as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete cleaning zone" });
    }
  });

  // Cleaning Tasks
  app.get("/api/practices/:practiceId/cleaning-tasks", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const zoneId = typeof req.query.zoneId === 'string' ? req.query.zoneId : undefined;
      const tasks = await storage.getCleaningTasksByPractice(req.params.practiceId as string, zoneId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cleaning tasks" });
    }
  });

  app.post("/api/practices/:practiceId/cleaning-tasks", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId as string };
      const validated = insertCleaningTaskSchema.parse(dataWithPractice);
      const task = await storage.createCleaningTask(validated);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create cleaning task" });
    }
  });

  app.put("/api/practices/:practiceId/cleaning-tasks/:taskId", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const task = await storage.updateCleaningTask(req.params.taskId as string, req.params.practiceId as string, stripPracticeId(req.body));
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update cleaning task" });
    }
  });

  app.delete("/api/practices/:practiceId/cleaning-tasks/:taskId", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      await storage.deleteCleaningTask(req.params.taskId as string, req.params.practiceId as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete cleaning task" });
    }
  });

  // Cleaning Logs
  app.get("/api/practices/:practiceId/cleaning-logs", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const logs = await storage.getCleaningLogsByPractice(req.params.practiceId as string, date);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cleaning logs" });
    }
  });

  app.post("/api/practices/:practiceId/cleaning-logs", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const practiceId = req.params.practiceId as string;
      const userId = (req.session as any).userId;
      const body = req.body;
      const dataWithPractice = {
        ...stripPracticeId(body),
        practiceId,
        completedBy: body.completedBy || userId,
        completedAt: new Date(),
        logDate: new Date(),
      };
      const validated = insertCleaningLogSchema.parse(dataWithPractice);
      const log = await storage.createCleaningLog(validated);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error('cleaning log error:', error);
      res.status(500).json({ error: "Failed to create cleaning log" });
    }
  });

  // ── AI section improvement tips (ReadyForAudit / Areas of Concern) ─────────
  app.post("/api/practices/:practiceId/ai/suggest-improvements", isAuthenticated, requireSamePractice, async (req, res) => {
    console.log('ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
    try {
      const { section, score, target, gap, contributors, country } = req.body;
      if (!section) return res.status(400).json({ error: "section is required" });
      const result = await getSectionTips(req.params.practiceId as string, {
        section: String(section),
        score: Number(score) || 0,
        target: Number(target) || 85,
        gap: Number(gap) || 0,
        contributors: contributors ?? {},
        country: String(country || 'england'),
      });
      res.json(result);
    } catch (error: any) {
      console.error("Section tips error:", error);
      const msg: string = (error as Error).message ?? "";
      if (msg.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({ error: "AI tips service not configured." });
      }
      res.status(500).json({ error: "Failed to generate improvement tips. Please try again." });
    }
  });

  // ── AI training analysis ───────────────────────────────────────────────────
  app.post("/api/practices/:practiceId/training-analysis", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const result = await getTrainingAnalysis(req.params.practiceId as string, force);
      res.json(result);
    } catch (error: any) {
      console.error("Training analysis error:", error);
      const msg: string = (error as Error).message ?? "";
      if (msg.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({ error: "AI analysis service not configured. Add ANTHROPIC_API_KEY to environment variables." });
      }
      res.status(500).json({ error: "Failed to analyse training records. Please try again later." });
    }
  });

  // ── AI complaint analysis ──────────────────────────────────────────────────
  app.post("/api/practices/:practiceId/complaint-analysis", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const result = await getComplaintAnalysis(req.params.practiceId as string, force);
      res.json(result);
    } catch (error: any) {
      console.error("Complaint analysis error:", error);
      const msg: string = (error as Error).message ?? "";
      if (msg.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({ error: "AI analysis service not configured. Add ANTHROPIC_API_KEY to environment variables." });
      }
      res.status(500).json({ error: "Failed to analyse complaints. Please try again later." });
    }
  });

  // ── AI improvement tips ────────────────────────────────────────────────────
  app.post("/api/practices/:practiceId/ai-tips", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const result = await getAITips(req.params.practiceId as string, force);
      res.json(result);
    } catch (error: any) {
      console.error("AI tips error:", error);
      const msg: string = (error as Error).message ?? "";
      if (msg.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({ error: "AI tips service not configured. Add ANTHROPIC_API_KEY to environment variables." });
      }
      res.status(500).json({ error: "Failed to generate AI tips. Please try again later." });
    }
  });

  // ── Practice modules: list ─────────────────────────────────────────────────
  app.get("/api/practices/:practiceId/modules", isAuthenticated, requireSamePractice, async (req, res) => {
    const rid = newRequestId();
    try {
      const modules = await db.select().from(practiceModules)
        .where(eq(practiceModules.practiceId, req.params.practiceId as string));
      res.json({ requestId: rid, modules });
    } catch (err) {
      console.error("GET /modules error:", err);
      res.status(500).json({ requestId: rid, error: "Failed to fetch modules" });
    }
  });

  // ── Practice modules: toggle ───────────────────────────────────────────────
  app.patch("/api/practices/:practiceId/modules/:moduleName", isAuthenticated, requireSamePractice, async (req, res) => {
    const rid = newRequestId();
    const parse = toggleModuleSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: "Invalid request", details: parse.error.flatten() });

    const { practiceId, moduleName } = req.params as { practiceId: string; moduleName: string };
    const { isEnabled } = parse.data;
    try {
      const [updated] = await db.update(practiceModules)
        .set({
          isEnabled,
          disabledAt: isEnabled ? null : new Date(),
          enabledAt:  isEnabled ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(practiceModules.practiceId, practiceId))
        .returning();
      if (!updated) return res.status(404).json({ requestId: rid, error: "Module not found" });

      // Audit log
      await storage.createAuditLog({
        practiceId, userId: req.session.userId ?? null,
        entityType: "practice_module", entityId: updated.id,
        action: isEnabled ? "module_enabled" : "module_disabled",
        afterData: { moduleName, isEnabled },
      } as any);

      res.json({ requestId: rid, module: updated });
    } catch (err) {
      console.error("PATCH /modules error:", err);
      res.status(500).json({ requestId: rid, error: "Failed to update module" });
    }
  });

  // ── Practice clone ─────────────────────────────────────────────────────────
  app.post("/api/practices/:sourcePracticeId/clone", isAuthenticated, async (req, res) => {
    const rid = newRequestId();
    // Manually verify ownership of source practice
    if (req.session.practiceId !== (req.params.sourcePracticeId as string)) {
      return res.status(403).json({ requestId: rid, error: "Forbidden" });
    }
    const parse = clonePracticeSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: "Invalid request", details: parse.error.flatten() });

    const sourcePracticeId = req.params.sourcePracticeId as string;
    const { newPracticeName, registrationNumber, regulator } = parse.data;
    const country = regulator === 'hiw' ? 'wales' : 'england';

    try {
      const practiceId = await db.transaction(async (tx) => {
        // 1. Create new practice
        const [newPractice] = await tx.insert(practices).values({
          name: newPracticeName, country: country as any, regulator: regulator as any,
          registrationNumber, isActive: true, onboardingStage: 'cloned',
        }).returning();

        // 2. Copy practice_modules from source
        const srcModules = await tx.select().from(practiceModules)
          .where(eq(practiceModules.practiceId, sourcePracticeId));
        if (srcModules.length > 0) {
          await tx.insert(practiceModules).values(
            srcModules.map(m => ({ practiceId: newPractice.id, moduleName: m.moduleName, isEnabled: m.isEnabled }))
          );
        } else {
          await tx.insert(practiceModules).values(
            ALL_MODULE_IDS.map(m => ({ practiceId: newPractice.id, moduleName: m, isEnabled: true }))
          );
        }

        // 3. Copy compliance tasks (structure only — not completions)
        const srcTasks = await tx.select().from(tasksTable)
          .where(eq(tasksTable.practiceId, sourcePracticeId));
        if (srcTasks.length > 0) {
          const tomorrow = new Date(Date.now() + 86_400_000);
          await tx.insert(tasksTable).values(
            srcTasks.map(t => ({
              practiceId: newPractice.id, title: t.title, description: t.description,
              module: t.module, priority: t.priority, status: 'pending', dueAt: tomorrow,
            }))
          );
        }

        // 4. Copy cleaning zones + tasks structure
        const srcZones = await tx.select().from(cleaningZones)
          .where(eq(cleaningZones.practiceId, sourcePracticeId));
        const zoneIdMap: Record<string, string> = {};
        for (const zone of srcZones) {
          const [newZone] = await tx.insert(cleaningZones).values({
            practiceId: newPractice.id, zoneName: zone.zoneName, zoneType: zone.zoneType, isActive: true,
          }).returning();
          zoneIdMap[zone.id] = newZone.id;
        }
        if (srcZones.length > 0) {
          const srcCtasks = await tx.select().from(cleaningTasks)
            .where(eq(cleaningTasks.practiceId, sourcePracticeId));
          if (srcCtasks.length > 0) {
            await tx.insert(cleaningTasks).values(
              srcCtasks.map(t => ({
                practiceId: newPractice.id, zoneId: zoneIdMap[t.zoneId ?? ''] ?? null,
                taskName: t.taskName, frequency: t.frequency, requiresPhoto: t.requiresPhoto, isActive: true,
              }))
            );
          }
        }

        // 5. Copy policy stubs (not content — each site reviews their own)
        const srcPolicies = await tx.select().from(policyDocuments)
          .where(eq(policyDocuments.practiceId, sourcePracticeId));
        if (srcPolicies.length > 0) {
          const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
          await tx.insert(policyDocuments).values(
            srcPolicies.map(p => ({
              practiceId: newPractice.id, title: p.title, category: p.category,
              version: '1.0', status: 'draft', nextReviewDate: nextYear,
            }))
          );
        }

        // 6. Create onboarding session starting at step 5 (rooms setup)
        const enabledModules = srcModules.filter(m => m.isEnabled).map(m => m.moduleName);
        await tx.insert(onboardingSessions).values({
          practiceName: newPracticeName, registrationNumber, regulator,
          modulesEnabled: enabledModules, practiceId: newPractice.id, currentStep: 5,
        });

        // 7. Audit
        await storage.createAuditLog({
          practiceId: newPractice.id, userId: req.session.userId ?? null,
          entityType: "practice", entityId: newPractice.id,
          action: "practice_cloned", afterData: { sourcePracticeId, modules: enabledModules.length },
        } as any);

        return newPractice.id;
      });

      console.log(JSON.stringify({ svc: 'clone', event: 'success', sourcePracticeId, practiceId, requestId: rid }));
      res.status(201).json({ requestId: rid, practiceId });
    } catch (err) {
      console.error("POST /clone error:", err);
      res.status(500).json({ requestId: rid, error: "Failed to clone practice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
