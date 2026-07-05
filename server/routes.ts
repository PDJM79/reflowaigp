import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, validatePasswordStrength, generateTemporaryPassword, hashPassword } from "./auth";
import { getAITips } from "./aiTips";
import { getComplaintAnalysis } from "./complaintAnalysis";
import { getTrainingAnalysis } from "./trainingAnalysis";
import { getSectionTips } from "./sectionTips";
import { auditLogger } from "./auditLogger";
import {
  insertPracticeSchema, insertUserSchema, insertEmployeeSchema,
  insertTaskSchema, insertIncidentSchema, insertComplaintSchema,
  insertPolicyDocumentSchema, insertTrainingRecordSchema, insertNotificationSchema,
  insertProcessTemplateSchema, insertFridgeUnitSchema, insertFridgeReadingSchema,
  insertCleaningZoneSchema, insertCleaningTaskSchema, insertCleaningLogSchema,
  ALL_CAPABILITIES
} from "@shared/schema";
import { z } from "zod";

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

// Never send password hashes to the client
function sanitizeUser<T extends { passwordHash?: string | null }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}

// Drizzle timestamp columns need Date objects; clients send ISO strings.
function coerceDates<T extends Record<string, any>>(body: T, keys: string[]): T {
  const out: any = { ...body };
  for (const k of keys) if (typeof out[k] === "string") out[k] = new Date(out[k]);
  return out;
}

const USER_MANAGER_ROLES = new Set(['practice_manager', 'cd_lead_gp']);

// Only practice managers (or CD lead GPs) may create or modify user accounts
const requireUserManager: RequestHandler = async (req, res, next) => {
  try {
    const currentUser = await storage.getUser(req.session.userId!, req.session.practiceId!);
    if (!currentUser || (!currentUser.isPracticeManager && !USER_MANAGER_ROLES.has(currentUser.role ?? ''))) {
      return res.status(403).json({ error: "Only practice managers can manage user accounts" });
    }
    next();
  } catch (error) {
    console.error("requireUserManager error:", error);
    res.status(500).json({ error: "Failed to verify permissions" });
  }
};

// Generic manager gate for practice-management actions (logbooks, scheduling, reassignment).
const requireManager: RequestHandler = async (req, res, next) => {
  try {
    const currentUser = await storage.getUser(req.session.userId!, req.session.practiceId!);
    if (!currentUser || (!currentUser.isPracticeManager && !USER_MANAGER_ROLES.has(currentUser.role ?? ''))) {
      return res.status(403).json({ error: "Practice manager permission required" });
    }
    next();
  } catch (error) {
    console.error("requireManager error:", error);
    res.status(500).json({ error: "Failed to verify permissions" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Audit all mutating requests on practice routes after session is available
  app.use("/api/practices", auditLogger);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

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
      res.json(users.map(sanitizeUser));
    } catch (error) {
      console.error("GET users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/practices/:practiceId/users/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const user = await storage.getUser((req.params.id as string), (req.params.practiceId as string));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("GET user error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/practices/:practiceId/users", isAuthenticated, requireSamePractice, requireUserManager, async (req, res) => {
    try {
      const practiceId = (req.params.practiceId as string);
      // Never accept a client-supplied hash; passwords are hashed server-side
      const { password, passwordHash: _ignored, ...body } = req.body ?? {};

      if (password !== undefined && password !== '') {
        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
          return res.status(400).json({ error: passwordError });
        }
      }
      const plainPassword: string = password || generateTemporaryPassword();
      const wasGenerated = !password;

      if (body.email) {
        const existing = await storage.getUserByEmail(body.email, practiceId);
        if (existing) {
          return res.status(400).json({ error: "A user with this email already exists in this practice" });
        }
      }

      const dataWithPractice = {
        ...stripPracticeId(body),
        practiceId,
        passwordHash: await hashPassword(plainPassword),
      };
      const validated = insertUserSchema.parse(dataWithPractice);
      const user = await storage.createUser(validated);
      // Return the generated password once so the manager can share login details
      res.status(201).json({
        ...sanitizeUser(user),
        ...(wasGenerated ? { temporaryPassword: plainPassword } : {}),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("POST user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/practices/:practiceId/users/:id", isAuthenticated, requireSamePractice, requireUserManager, async (req, res) => {
    try {
      // Password changes go through dedicated auth flows, not this endpoint
      const { password: _pw, passwordHash: _hash, ...updates } = req.body ?? {};
      const user = await storage.updateUser((req.params.id as string), (req.params.practiceId as string), stripPracticeId(updates));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("PATCH user error:", error);
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

  // ── Phase 3: curated logbook library + selections ─────────────────────────

  // The curated library for THIS practice (applicability-filtered, selection attached).
  app.get("/api/practices/:practiceId/curated-logbooks", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const library = await storage.getCuratedLibraryForPractice(req.params.practiceId as string);
      res.json(library);
    } catch (error) {
      console.error("GET curated-logbooks error:", error);
      res.status(500).json({ error: "Failed to fetch curated logbooks" });
    }
  });

  app.get("/api/practices/:practiceId/logbook-selections", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const selections = await storage.getLogbookSelections(req.params.practiceId as string);
      res.json(selections);
    } catch (error) {
      console.error("GET logbook-selections error:", error);
      res.status(500).json({ error: "Failed to fetch logbook selections" });
    }
  });

  // Fields a manager may set on a selection (never trust practiceId/id from body).
  const SELECTION_FIELDS = [
    "curatedLogbookId", "isEnabled", "adHocOnly", "cadenceOverride", "preferredDay",
    "preferredDate", "dueWindowHours", "earlyStartHours", "importance",
    "defaultAssigneeId", "defaultAssigneeRole", "requiresReview", "nextReviewDate",
  ] as const;
  function pickSelectionFields(body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const k of SELECTION_FIELDS) if (k in body) out[k] = body[k];
    return out;
  }

  app.post("/api/practices/:practiceId/logbook-selections", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const practiceId = req.params.practiceId as string;
      const fields = pickSelectionFields(req.body ?? {});
      if (!fields.curatedLogbookId) {
        return res.status(400).json({ error: "curatedLogbookId is required" });
      }
      // Enabling a logbook that already has a (disabled) selection updates it, so the
      // library toggle is idempotent and preserves prior schedule settings.
      const existing = (await storage.getLogbookSelections(practiceId))
        .find((s) => s.curatedLogbookId === fields.curatedLogbookId);
      if (existing) {
        const updated = await storage.updateLogbookSelection(existing.id, practiceId, { ...fields, isEnabled: true });
        return res.json(updated);
      }
      const created = await storage.createLogbookSelection({ ...fields, practiceId, isEnabled: true });
      res.status(201).json(created);
    } catch (error) {
      console.error("POST logbook-selection error:", error);
      res.status(500).json({ error: "Failed to create logbook selection" });
    }
  });

  app.patch("/api/practices/:practiceId/logbook-selections/:id", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const updated = await storage.updateLogbookSelection(
        req.params.id as string, req.params.practiceId as string, pickSelectionFields(req.body ?? {})
      );
      if (!updated) return res.status(404).json({ error: "Selection not found" });
      res.json(updated);
    } catch (error) {
      console.error("PATCH logbook-selection error:", error);
      res.status(500).json({ error: "Failed to update logbook selection" });
    }
  });

  // Disable (soft) a selection — keeps its settings; scheduler stops generating.
  app.delete("/api/practices/:practiceId/logbook-selections/:id", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const disabled = await storage.disableLogbookSelection(req.params.id as string, req.params.practiceId as string);
      if (!disabled) return res.status(404).json({ error: "Selection not found" });
      res.json(disabled);
    } catch (error) {
      console.error("DELETE logbook-selection error:", error);
      res.status(500).json({ error: "Failed to disable logbook selection" });
    }
  });

  // Generated logbook occurrences with no assignee, for manager triage.
  app.get("/api/practices/:practiceId/unassigned-occurrences", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const occ = await storage.getUnassignedOccurrences(req.params.practiceId as string);
      res.json(occ);
    } catch (error) {
      console.error("GET unassigned-occurrences error:", error);
      res.status(500).json({ error: "Failed to fetch unassigned occurrences" });
    }
  });

  // Assign / reassign a task occurrence. Anyone may self-assign an UNASSIGNED
  // occurrence; reassigning an already-assigned task (or assigning someone else)
  // requires manager permission.
  app.post("/api/practices/:practiceId/tasks/:id/assign", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const practiceId = req.params.practiceId as string;
      const taskId = req.params.id as string;
      const selfId = req.session.userId!;
      const assignToMe = req.body?.assignToMe === true;
      const targetAssignee: string | null = assignToMe ? selfId : (req.body?.assigneeId ?? null);

      const task = await storage.getTask(taskId, practiceId);
      if (!task) return res.status(404).json({ error: "Task not found" });

      const isSelfClaimOfUnassigned = task.assigneeId == null && targetAssignee === selfId;
      if (!isSelfClaimOfUnassigned) {
        // Reassigning others / already-assigned tasks -> manager only.
        const currentUser = await storage.getUser(selfId, practiceId);
        const isManager = !!currentUser && (currentUser.isPracticeManager || USER_MANAGER_ROLES.has(currentUser.role ?? ''));
        if (!isManager) {
          return res.status(403).json({ error: "Only a practice manager can reassign an occupied task" });
        }
      }

      const updated = await storage.updateTask(taskId, practiceId, { assigneeId: targetAssignee });
      res.json(updated);
    } catch (error) {
      console.error("POST task assign error:", error);
      res.status(500).json({ error: "Failed to assign task" });
    }
  });

  // Role assignments (role -> user) for the Schedule Editor's role-assignee picker.
  app.get("/api/practices/:practiceId/role-assignments", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const rows = await storage.getRoleAssignments(req.params.practiceId as string);
      res.json(rows);
    } catch (error) {
      console.error("GET role-assignments error:", error);
      res.status(500).json({ error: "Failed to fetch role assignments" });
    }
  });

  // --- RBAC catalog (moved off client Supabase; see docs/RBAC_MAP.md) ---
  // Enforcement is unchanged: these gates read users.role/is_practice_manager via
  // storage.getUser, NOT the RBAC tables. Client migration cannot regress the 403s.

  // Global role catalog (read-only, any authenticated user).
  app.get("/api/role-catalog", isAuthenticated, async (_req, res) => {
    try {
      res.json(await storage.getRoleCatalog());
    } catch (error) {
      console.error("GET role-catalog error:", error);
      res.status(500).json({ error: "Failed to fetch role catalog" });
    }
  });

  // A practice's enabled roles (with catalog join).
  app.get("/api/practices/:practiceId/practice-roles", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      res.json(await storage.getPracticeRoles(req.params.practiceId as string));
    } catch (error) {
      console.error("GET practice-roles error:", error);
      res.status(500).json({ error: "Failed to fetch practice roles" });
    }
  });

  // Enable a catalog role for this practice (manager-only).
  app.post("/api/practices/:practiceId/practice-roles", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const { roleCatalogId } = req.body as { roleCatalogId?: string };
      if (!roleCatalogId) return res.status(400).json({ error: "roleCatalogId is required" });
      const id = await storage.enablePracticeRole(req.params.practiceId as string, roleCatalogId);
      res.status(201).json({ id });
    } catch (error) {
      console.error("POST practice-roles error:", error);
      res.status(500).json({ error: "Failed to enable role" });
    }
  });

  // Toggle a practice role active/inactive (manager-only).
  app.patch("/api/practices/:practiceId/practice-roles/:id", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const { isActive } = req.body as { isActive?: boolean };
      if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive (boolean) is required" });
      const ok = await storage.setPracticeRoleActive(req.params.id as string, req.params.practiceId as string, isActive);
      if (!ok) return res.status(404).json({ error: "Practice role not found" });
      res.json({ ok: true });
    } catch (error) {
      console.error("PATCH practice-roles error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Capability overrides for a practice role (manager-only).
  app.post("/api/practices/:practiceId/practice-roles/:id/capabilities", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const { capability } = req.body as { capability?: string };
      if (!capability) return res.status(400).json({ error: "capability is required" });
      await storage.addCapabilityOverride(req.params.id as string, capability);
      res.status(201).json({ ok: true });
    } catch (error) {
      console.error("POST capability override error:", error);
      res.status(500).json({ error: "Failed to add capability" });
    }
  });

  app.delete("/api/practices/:practiceId/practice-roles/:id/capabilities/:capability", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      await storage.removeCapabilityOverride(req.params.id as string, req.params.capability as string);
      res.json({ ok: true });
    } catch (error) {
      console.error("DELETE capability override error:", error);
      res.status(500).json({ error: "Failed to remove capability" });
    }
  });

  // User↔role assignments. GET is read (any same-practice user); ?userId filters.
  app.get("/api/practices/:practiceId/user-practice-roles", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
      res.json(await storage.getUserPracticeRoles(req.params.practiceId as string, userId));
    } catch (error) {
      console.error("GET user-practice-roles error:", error);
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  // Assign a role to a user (manager-only).
  app.post("/api/practices/:practiceId/user-practice-roles", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const { userId, practiceRoleId } = req.body as { userId?: string; practiceRoleId?: string };
      if (!userId || !practiceRoleId) return res.status(400).json({ error: "userId and practiceRoleId are required" });
      const id = await storage.assignUserPracticeRole(req.params.practiceId as string, userId, practiceRoleId);
      // Return id + fields so the audit middleware records the assignment (afterData).
      res.status(201).json({ id, userId, practiceRoleId, ok: true });
    } catch (error) {
      console.error("POST user-practice-roles error:", error);
      res.status(500).json({ error: "Failed to assign role" });
    }
  });

  // Unassign a role from a user (manager-only).
  app.delete("/api/practices/:practiceId/user-practice-roles", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const { userId, practiceRoleId } = req.body as { userId?: string; practiceRoleId?: string };
      if (!userId || !practiceRoleId) return res.status(400).json({ error: "userId and practiceRoleId are required" });
      await storage.unassignUserPracticeRole(userId, practiceRoleId);
      // Return practiceRoleId as id so the audit middleware records the unassignment.
      res.json({ id: practiceRoleId, ok: true });
    } catch (error) {
      console.error("DELETE user-practice-roles error:", error);
      res.status(500).json({ error: "Failed to unassign role" });
    }
  });

  // Staff + their roles, for the /staff-roles assignment table.
  app.get("/api/practices/:practiceId/staff-roles", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const practiceId = req.params.practiceId as string;
      const [users, roles] = await Promise.all([
        storage.getUsersByPractice(practiceId),
        storage.getUserPracticeRoles(practiceId),
      ]);
      const byUser = new Map<string, typeof roles>();
      for (const r of roles) {
        const list = byUser.get(r.user_id) ?? [];
        list.push(r);
        byUser.set(r.user_id, list);
      }
      res.json(users.map((u) => ({
        ...sanitizeUser(u),
        user_practice_roles: byUser.get(u.id) ?? [],
      })));
    } catch (error) {
      console.error("GET staff-roles error:", error);
      res.status(500).json({ error: "Failed to fetch staff roles" });
    }
  });

  // Current session user's computed capabilities (for client nav gating).
  app.get("/api/capabilities", isAuthenticated, async (req, res) => {
    try {
      const practiceId = req.session.practiceId as string;
      const userId = req.session.userId as string;
      const currentUser = await storage.getUser(userId, practiceId);
      if (!currentUser) return res.status(404).json({ error: "User not found" });
      // Practice managers get all capabilities (mirrors the prior client fallback).
      if (currentUser.isPracticeManager) {
        return res.json({ isPracticeManager: true, capabilities: ALL_CAPABILITIES, userRoles: [] });
      }
      const [capabilities, userRoles] = await Promise.all([
        storage.getUserCapabilities(practiceId, userId),
        storage.getUserPracticeRoles(practiceId, userId),
      ]);
      res.json({ isPracticeManager: false, capabilities, userRoles });
    } catch (error) {
      console.error("GET capabilities error:", error);
      res.status(500).json({ error: "Failed to fetch capabilities" });
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

  // Process instances (logbook process occurrences). `?details=1` joins template + assignee.
  app.get("/api/practices/:practiceId/process-instances", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const practiceId = req.params.practiceId as string;
      const rows = req.query.details === "1"
        ? await storage.getProcessInstancesWithDetails(practiceId)
        : await storage.getProcessInstancesByPractice(practiceId);
      res.json(rows);
    } catch (error) {
      console.error("GET process-instances error:", error);
      res.status(500).json({ error: "Failed to fetch process instances" });
    }
  });

  app.get("/api/practices/:practiceId/process-instances/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const instance = await storage.getProcessInstance(req.params.id as string, req.params.practiceId as string);
      if (!instance) return res.status(404).json({ error: "Process instance not found" });
      res.json(instance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch process instance" });
    }
  });

  app.post("/api/practices/:practiceId/process-instances", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const created = await storage.createProcessInstance({ ...stripPracticeId(req.body), practiceId: req.params.practiceId } as any);
      res.status(201).json(created);
    } catch (error) {
      console.error("POST process-instances error:", error);
      res.status(500).json({ error: "Failed to create process instance" });
    }
  });

  app.patch("/api/practices/:practiceId/process-instances/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const body = coerceDates(stripPracticeId(req.body), ["startedAt", "completedAt", "periodStart", "periodEnd", "dueAt"]);
      const updated = await storage.updateProcessInstance(req.params.id as string, req.params.practiceId as string, body);
      if (!updated) return res.status(404).json({ error: "Process instance not found" });
      res.json(updated);
    } catch (error) {
      console.error("PATCH process-instances error:", error);
      res.status(500).json({ error: "Failed to update process instance" });
    }
  });

  // Step instances (logbook steps within a process instance)
  app.get("/api/practices/:practiceId/process-instances/:piid/step-instances", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      res.json(await storage.getStepInstances(req.params.practiceId as string, req.params.piid as string));
    } catch (e) { console.error("GET step-instances", e); res.status(500).json({ error: "Failed to fetch step instances" }); }
  });
  app.post("/api/practices/:practiceId/process-instances/:piid/step-instances", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const steps = (req.body?.steps ?? []) as { stepIndex: number; title: string; status?: string }[];
      const created = await storage.createStepInstances(req.params.practiceId as string, req.params.piid as string, steps);
      if (created === null) return res.status(404).json({ error: "Process instance not found" });
      res.status(201).json(created);
    } catch (e) { console.error("POST step-instances", e); res.status(500).json({ error: "Failed to create step instances" }); }
  });
  app.patch("/api/practices/:practiceId/step-instances/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const body = coerceDates(stripPracticeId(req.body), ["serverTimestamp", "deviceTimestamp"]);
      const updated = await storage.updateStepInstance(req.params.id as string, req.params.practiceId as string, body);
      if (!updated) return res.status(404).json({ error: "Step instance not found" });
      res.json(updated);
    } catch (e) { console.error("PATCH step-instances", e); res.status(500).json({ error: "Failed to update step instance" }); }
  });

  // Evidence for a step (DB records; file bytes live in Supabase Storage)
  app.get("/api/practices/:practiceId/step-instances/:id/evidence", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      res.json(await storage.getEvidenceByStep(req.params.practiceId as string, req.params.id as string));
    } catch (e) { console.error("GET evidence", e); res.status(500).json({ error: "Failed to fetch evidence" }); }
  });
  app.post("/api/practices/:practiceId/step-instances/:id/evidence", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const row = await storage.createEvidence(req.params.practiceId as string, {
        ...stripPracticeId(req.body),
        stepInstanceId: req.params.id,
        userId: req.body.userId ?? req.session.userId,
      } as any);
      if (row === null) return res.status(404).json({ error: "Step instance not found" });
      res.status(201).json(row);
    } catch (e) { console.error("POST evidence", e); res.status(500).json({ error: "Failed to create evidence" }); }
  });
  app.delete("/api/practices/:practiceId/evidence/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const ok = await storage.deleteEvidence(req.params.id as string, req.params.practiceId as string);
      if (!ok) return res.status(404).json({ error: "Evidence not found" });
      res.json({ ok: true });
    } catch (e) { console.error("DELETE evidence", e); res.status(500).json({ error: "Failed to delete evidence" }); }
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

  // Accept ISO strings for timestamps (clients send JSON)
  const taskDateFields = {
    dueAt: z.coerce.date().nullable().optional(),
    completedAt: z.coerce.date().nullable().optional(),
  };

  app.post("/api/practices/:practiceId/tasks", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const dataWithPractice = { ...stripPracticeId(req.body), practiceId: (req.params.practiceId as string) };
      const validated = insertTaskSchema.extend(taskDateFields).parse(dataWithPractice);
      const task = await storage.createTask(validated);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("POST task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/practices/:practiceId/tasks/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const updates: Record<string, unknown> = { ...stripPracticeId(req.body) };
      if (typeof updates.dueAt === 'string') updates.dueAt = new Date(updates.dueAt);
      if (typeof updates.completedAt === 'string') updates.completedAt = new Date(updates.completedAt);
      // Stamp completion time so on-time analytics work
      if (updates.status === 'complete' && updates.completedAt === undefined) {
        updates.completedAt = new Date();
      }
      const task = await storage.updateTask((req.params.id as string), (req.params.practiceId as string), updates);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("PATCH task error:", error);
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

  app.get("/api/practices/:practiceId/audit-logs", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const q = req.query;
      const page = Math.max(1, parseInt((q.page as string) || "1", 10));
      const pageSize = Math.min(100, Math.max(1, parseInt((q.pageSize as string) || "25", 10)));
      const result = await storage.getAuditLogs(req.params.practiceId as string, {
        entityType: typeof q.entityType === "string" ? q.entityType : undefined,
        action: typeof q.action === "string" ? q.action : undefined,
        search: typeof q.search === "string" ? q.search : undefined,
        startDate: typeof q.startDate === "string" ? new Date(q.startDate) : undefined,
        endDate: typeof q.endDate === "string" ? new Date(q.endDate) : undefined,
        page, pageSize,
      });
      res.json(result);
    } catch (error) {
      console.error("GET audit-logs error:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // --- batch (c) data routes ---
  app.get("/api/practices/:practiceId/medical-requests", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getMedicalRequests(req.params.practiceId as string)); }
    catch (e) { console.error("GET medical-requests", e); res.status(500).json({ error: "Failed to fetch medical requests" }); }
  });
  app.post("/api/practices/:practiceId/medical-requests", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.status(201).json(await storage.createMedicalRequest({ ...stripPracticeId(req.body), practiceId: req.params.practiceId } as any)); }
    catch (e) { console.error("POST medical-requests", e); res.status(500).json({ error: "Failed to create medical request" }); }
  });
  app.patch("/api/practices/:practiceId/medical-requests/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const row = await storage.updateMedicalRequest(req.params.id as string, req.params.practiceId as string, stripPracticeId(req.body));
      if (!row) return res.status(404).json({ error: "Medical request not found" });
      res.json(row);
    } catch (e) { console.error("PATCH medical-requests", e); res.status(500).json({ error: "Failed to update medical request" }); }
  });

  app.get("/api/practices/:practiceId/governance-approvals", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getGovernanceApprovals(req.params.practiceId as string)); }
    catch (e) { console.error("GET governance-approvals", e); res.status(500).json({ error: "Failed to fetch governance approvals" }); }
  });
  app.post("/api/practices/:practiceId/governance-approvals", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.status(201).json(await storage.createGovernanceApproval({ ...stripPracticeId(req.body), practiceId: req.params.practiceId } as any)); }
    catch (e) { console.error("POST governance-approvals", e); res.status(500).json({ error: "Failed to create governance approval" }); }
  });
  app.patch("/api/practices/:practiceId/governance-approvals/:id", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try {
      const row = await storage.updateGovernanceApproval(req.params.id as string, req.params.practiceId as string, stripPracticeId(req.body));
      if (!row) return res.status(404).json({ error: "Governance approval not found" });
      res.json(row);
    } catch (e) { console.error("PATCH governance-approvals", e); res.status(500).json({ error: "Failed to update governance approval" }); }
  });
  app.delete("/api/practices/:practiceId/governance-approvals/:id", isAuthenticated, requireSamePractice, requireManager, async (req, res) => {
    try { await storage.deleteGovernanceApproval(req.params.id as string, req.params.practiceId as string); res.json({ ok: true }); }
    catch (e) { console.error("DELETE governance-approvals", e); res.status(500).json({ error: "Failed to delete governance approval" }); }
  });

  app.get("/api/practices/:practiceId/month-end-scripts", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getMonthEndScripts(req.params.practiceId as string)); }
    catch (e) { console.error("GET month-end-scripts", e); res.status(500).json({ error: "Failed to fetch month-end scripts" }); }
  });
  app.post("/api/practices/:practiceId/month-end-scripts", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.status(201).json(await storage.createMonthEndScript({ ...stripPracticeId(req.body), practiceId: req.params.practiceId, createdBy: req.session.userId } as any)); }
    catch (e) { console.error("POST month-end-scripts", e); res.status(500).json({ error: "Failed to create month-end script" }); }
  });

  app.get("/api/practices/:practiceId/claim-runs", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getClaimRuns(req.params.practiceId as string)); }
    catch (e) { console.error("GET claim-runs", e); res.status(500).json({ error: "Failed to fetch claim runs" }); }
  });

  app.get("/api/practices/:practiceId/rooms", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getRoomsByPractice(req.params.practiceId as string)); }
    catch (e) { console.error("GET rooms", e); res.status(500).json({ error: "Failed to fetch rooms" }); }
  });

  app.get("/api/practices/:practiceId/ipc-audits", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getIpcAudits(req.params.practiceId as string)); }
    catch (e) { console.error("GET ipc-audits", e); res.status(500).json({ error: "Failed to fetch IPC audits" }); }
  });
  app.post("/api/practices/:practiceId/ipc-audits", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.status(201).json(await storage.createIpcAudit({ ...stripPracticeId(req.body), practiceId: req.params.practiceId } as any)); }
    catch (e) { console.error("POST ipc-audits", e); res.status(500).json({ error: "Failed to create IPC audit" }); }
  });
  app.get("/api/practices/:practiceId/ipc-actions", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getIpcActions(req.params.practiceId as string)); }
    catch (e) { console.error("GET ipc-actions", e); res.status(500).json({ error: "Failed to fetch IPC actions" }); }
  });

  app.get("/api/practices/:practiceId/dbs-checks", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getDbsChecks(req.params.practiceId as string)); }
    catch (e) { console.error("GET dbs-checks", e); res.status(500).json({ error: "Failed to fetch DBS checks" }); }
  });

  app.get("/api/practices/:practiceId/baseline-snapshots", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.json(await storage.getBaselineSnapshots(req.params.practiceId as string)); }
    catch (e) { console.error("GET baseline-snapshots", e); res.status(500).json({ error: "Failed to fetch baseline snapshots" }); }
  });
  app.post("/api/practices/:practiceId/baseline-documents", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.status(201).json(await storage.createBaselineDocument({ ...stripPracticeId(req.body), practiceId: req.params.practiceId } as any)); }
    catch (e) { console.error("POST baseline-documents", e); res.status(500).json({ error: "Failed to create baseline document" }); }
  });
  app.delete("/api/practices/:practiceId/baseline-documents/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const ok = await storage.deleteBaselineDocument(req.params.id as string, req.params.practiceId as string);
      if (!ok) return res.status(404).json({ error: "Baseline document not found" });
      res.json({ ok: true });
    } catch (e) { console.error("DELETE baseline-documents", e); res.status(500).json({ error: "Failed to delete baseline document" }); }
  });
  app.post("/api/practices/:practiceId/dbs-checks", isAuthenticated, requireSamePractice, async (req, res) => {
    try { res.status(201).json(await storage.createDbsCheck({ ...stripPracticeId(req.body), practiceId: req.params.practiceId } as any)); }
    catch (e) { console.error("POST dbs-checks", e); res.status(500).json({ error: "Failed to create DBS check" }); }
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

  app.patch("/api/practices/:practiceId/fridge-readings/:id", isAuthenticated, requireSamePractice, async (req, res) => {
    try {
      const reading = await storage.updateFridgeReading(req.params.id as string, req.params.practiceId as string, stripPracticeId(req.body));
      if (!reading) return res.status(404).json({ error: "Fridge reading not found" });
      res.json(reading);
    } catch (error) {
      console.error("PATCH fridge-reading error:", error);
      res.status(500).json({ error: "Failed to update fridge reading" });
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

  const httpServer = createServer(app);
  return httpServer;
}
