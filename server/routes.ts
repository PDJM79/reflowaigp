import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPracticeSchema, insertUserSchema, insertEmployeeSchema,
  insertTaskSchema, insertIncidentSchema, insertComplaintSchema,
  insertPolicyDocumentSchema, insertTrainingRecordSchema, insertNotificationSchema,
  insertProcessTemplateSchema
} from "@shared/schema";
import { z } from "zod";

function stripPracticeId<T extends Record<string, any>>(data: T): Omit<T, 'practiceId'> {
  const { practiceId, ...rest } = data;
  return rest;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/practices", async (_req, res) => {
    try {
      const practices = await storage.getPractices();
      res.json(practices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch practices" });
    }
  });

  app.get("/api/practices/:id", async (req, res) => {
    try {
      const practice = await storage.getPractice(req.params.id);
      if (!practice) {
        return res.status(404).json({ error: "Practice not found" });
      }
      res.json(practice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch practice" });
    }
  });

  app.post("/api/practices", async (req, res) => {
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

  app.patch("/api/practices/:id", async (req, res) => {
    try {
      const practice = await storage.updatePractice(req.params.id, req.body);
      if (!practice) {
        return res.status(404).json({ error: "Practice not found" });
      }
      res.json(practice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update practice" });
    }
  });

  app.get("/api/practices/:practiceId/users", async (req, res) => {
    try {
      const users = await storage.getUsersByPractice(req.params.practiceId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/practices/:practiceId/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id, req.params.practiceId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/practices/:practiceId/users", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.params.practiceId, stripPracticeId(req.body));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/practices/:practiceId/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployeesByPractice(req.params.practiceId);
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/practices/:practiceId/employees/active", async (req, res) => {
    try {
      const employees = await storage.getActiveEmployeesByPractice(req.params.practiceId);
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active employees" });
    }
  });

  app.get("/api/practices/:practiceId/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id, req.params.practiceId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/practices/:practiceId/employees", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/employees/:id", async (req, res) => {
    try {
      const employee = await storage.updateEmployee(req.params.id, req.params.practiceId, stripPracticeId(req.body));
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.get("/api/practices/:practiceId/process-templates", async (req, res) => {
    try {
      const templates = await storage.getProcessTemplatesByPractice(req.params.practiceId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch process templates" });
    }
  });

  app.get("/api/practices/:practiceId/process-templates/:id", async (req, res) => {
    try {
      const template = await storage.getProcessTemplate(req.params.id, req.params.practiceId);
      if (!template) {
        return res.status(404).json({ error: "Process template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch process template" });
    }
  });

  app.post("/api/practices/:practiceId/process-templates", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/process-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateProcessTemplate(req.params.id, req.params.practiceId, stripPracticeId(req.body));
      if (!template) {
        return res.status(404).json({ error: "Process template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update process template" });
    }
  });

  app.get("/api/practices/:practiceId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByPractice(req.params.practiceId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/practices/:practiceId/tasks/overdue", async (req, res) => {
    try {
      const tasks = await storage.getOverdueTasks(req.params.practiceId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overdue tasks" });
    }
  });

  app.get("/api/practices/:practiceId/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id, req.params.practiceId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/practices/:practiceId/tasks", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.params.practiceId, stripPracticeId(req.body));
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.get("/api/practices/:practiceId/incidents", async (req, res) => {
    try {
      const incidents = await storage.getIncidentsByPractice(req.params.practiceId);
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  app.get("/api/practices/:practiceId/incidents/:id", async (req, res) => {
    try {
      const incident = await storage.getIncident(req.params.id, req.params.practiceId);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incident" });
    }
  });

  app.post("/api/practices/:practiceId/incidents", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/incidents/:id", async (req, res) => {
    try {
      const incident = await storage.updateIncident(req.params.id, req.params.practiceId, stripPracticeId(req.body));
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to update incident" });
    }
  });

  app.get("/api/practices/:practiceId/complaints", async (req, res) => {
    try {
      const complaints = await storage.getComplaintsByPractice(req.params.practiceId);
      res.json(complaints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });

  app.get("/api/practices/:practiceId/complaints/:id", async (req, res) => {
    try {
      const complaint = await storage.getComplaint(req.params.id, req.params.practiceId);
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch complaint" });
    }
  });

  app.post("/api/practices/:practiceId/complaints", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/complaints/:id", async (req, res) => {
    try {
      const complaint = await storage.updateComplaint(req.params.id, req.params.practiceId, stripPracticeId(req.body));
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update complaint" });
    }
  });

  app.get("/api/practices/:practiceId/policies", async (req, res) => {
    try {
      const policies = await storage.getPolicyDocumentsByPractice(req.params.practiceId);
      res.json(policies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch policies" });
    }
  });

  app.get("/api/practices/:practiceId/policies/:id", async (req, res) => {
    try {
      const policy = await storage.getPolicyDocument(req.params.id, req.params.practiceId);
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch policy" });
    }
  });

  app.post("/api/practices/:practiceId/policies", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/policies/:id", async (req, res) => {
    try {
      const policy = await storage.updatePolicyDocument(req.params.id, req.params.practiceId, stripPracticeId(req.body));
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: "Failed to update policy" });
    }
  });

  app.get("/api/practices/:practiceId/training-records", async (req, res) => {
    try {
      const records = await storage.getTrainingRecordsByPractice(req.params.practiceId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training records" });
    }
  });

  app.get("/api/practices/:practiceId/training-records/expiring", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const records = await storage.getExpiringTrainingRecords(req.params.practiceId, days);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expiring training records" });
    }
  });

  app.get("/api/practices/:practiceId/training-records/:id", async (req, res) => {
    try {
      const record = await storage.getTrainingRecord(req.params.id, req.params.practiceId);
      if (!record) {
        return res.status(404).json({ error: "Training record not found" });
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training record" });
    }
  });

  app.post("/api/practices/:practiceId/training-records", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/training-records/:id", async (req, res) => {
    try {
      const record = await storage.updateTrainingRecord(req.params.id, req.params.practiceId, stripPracticeId(req.body));
      if (!record) {
        return res.status(404).json({ error: "Training record not found" });
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to update training record" });
    }
  });

  app.get("/api/practices/:practiceId/users/:userId/notifications", async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.params.userId, req.params.practiceId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/practices/:practiceId/users/:userId/notifications/unread", async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotificationsByUser(req.params.userId, req.params.practiceId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  app.post("/api/practices/:practiceId/notifications", async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: req.params.practiceId };
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

  app.patch("/api/practices/:practiceId/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id, req.params.practiceId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/practices/:practiceId/users/:userId/notifications/read-all", async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.params.userId, req.params.practiceId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
