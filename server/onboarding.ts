// ── Onboarding Wizard API ─────────────────────────────────────────────────────
import type { Express } from 'express';
import { db } from './db';
import { onboardingSessions, complianceTemplates, cleaningTemplates } from '@shared/schema';
import { eq, inArray, asc } from 'drizzle-orm';
import { lookupPractice, CqcServiceError } from './services/cqc-service';
import { getAiService, buildFallback } from './services/ai-service';
import type { SessionSummary } from './services/ai-service';
import { executeComplete } from './onboarding-complete';
import {
  newRequestId, sanitizeText,
  lookupPracticeSchema, createSessionSchema, updateSessionSchema,
  updateModulesSchema, updateInspectionSchema, complianceTemplatesQuerySchema,
  updateRoomsSchema, updateCleaningScheduleSchema,
  aiPrioritizeSchema, completeSessionSchema,
} from './onboarding-helpers';

// ── Audit log helper ──────────────────────────────────────────────────────────
// Onboarding sessions exist before a practice is created, so they cannot be
// written to audit_logs (which requires a practice_id FK). We log structured
// JSON to stdout instead; Railway/Render captures this in their log pipeline.
function auditOnboarding(action: string, sessionId: string, detail: Record<string, unknown>) {
  // No PII logged — only session IDs, step numbers, and boolean flags
  console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'onboarding', action, sessionId, ...detail }));
}

// ── Shared session fetch helper ───────────────────────────────────────────────
async function getSession(sessionId: string) {
  const rows = await db
    .select()
    .from(onboardingSessions)
    .where(eq(onboardingSessions.id, sessionId))
    .limit(1);
  return rows[0] ?? null;
}

// ── Route registration ────────────────────────────────────────────────────────
export function registerOnboardingRoutes(app: Express): void {

  // POST /api/onboarding/lookup-practice ──────────────────────────────────────
  app.post('/api/onboarding/lookup-practice', async (req, res) => {
    const rid = newRequestId();
    const parse = lookupPracticeSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });
    const { registrationNumber, regulator } = parse.data;

    if (regulator === 'hiw') {
      return res.json({ requestId: rid, found: false, regulator: 'hiw', manualEntryRequired: true,
        message: 'Health Inspectorate Wales does not provide a public search API. Please enter your practice details manually.' });
    }

    try {
      const practice = await lookupPractice(registrationNumber);
      return res.json({ requestId: rid, found: true, regulator: 'cqc', practice });
    } catch (err) {
      if (err instanceof CqcServiceError) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'CIRCUIT_OPEN' ? 503 : err.code === 'TIMEOUT' ? 504 : 502;
        return res.status(status).json({ requestId: rid, found: false, error: err.message, code: err.code, manualEntryRequired: true });
      }
      console.error('onboarding/lookup-practice:', err);
      return res.status(502).json({ requestId: rid, found: false, error: 'An unexpected error occurred. Please enter your details manually.', manualEntryRequired: true });
    }
  });

  // GET /api/onboarding/inspection-data ───────────────────────────────────────
  app.get('/api/onboarding/inspection-data', async (req, res) => {
    const rid = newRequestId();
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) return res.status(400).json({ requestId: rid, error: 'sessionId query parameter is required' });

    const session = await getSession(sessionId);
    if (!session || session.deletedAt) return res.status(404).json({ requestId: rid, error: 'Session not found' });

    if (session.inspectionData) return res.json({ requestId: rid, inspectionData: session.inspectionData, fromCache: true });

    if (session.registrationNumber && session.regulator === 'cqc') {
      try {
        const practice = await lookupPractice(session.registrationNumber);
        const inspectionData = { source: 'cqc', lastInspectionDate: practice.lastInspectionDate, rating: practice.rating, registrationStatus: practice.registrationStatus, fetchedAt: new Date().toISOString() };
        await db.update(onboardingSessions).set({ inspectionData, updatedAt: new Date() }).where(eq(onboardingSessions.id, sessionId));
        return res.json({ requestId: rid, inspectionData, fromCache: false });
      } catch (err) {
        if (err instanceof CqcServiceError) return res.status(502).json({ requestId: rid, error: err.message, code: err.code });
        return res.status(502).json({ requestId: rid, error: 'Failed to fetch inspection data' });
      }
    }
    return res.json({ requestId: rid, inspectionData: null, fromCache: false });
  });

  // POST /api/onboarding/sessions ─────────────────────────────────────────────
  app.post('/api/onboarding/sessions', async (req, res) => {
    const rid = newRequestId();
    const parse = createSessionSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });

    const { practiceName, registrationNumber, regulator, address, postcode, contactEmail, contactName, inspectionData } = parse.data;
    const [session] = await db.insert(onboardingSessions).values({
      practiceName, registrationNumber: registrationNumber ?? null, regulator,
      address: address ?? null, postcode: postcode ?? null,
      contactEmail: contactEmail ?? null, contactName: contactName ?? null,
      inspectionData: inspectionData ?? null, currentStep: 1,
    }).returning();

    auditOnboarding('session_created', session.id, { step: 1, regulator });
    return res.status(201).json({ requestId: rid, sessionId: session.id, session });
  });

  // PUT /api/onboarding/sessions/:sessionId ───────────────────────────────────
  app.put('/api/onboarding/sessions/:sessionId', async (req, res) => {
    const rid = newRequestId();
    const { sessionId } = req.params;
    const parse = updateSessionSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });

    const session = await getSession(sessionId);
    if (!session || session.deletedAt) return res.status(404).json({ requestId: rid, error: 'Session not found' });

    const d = parse.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (d.currentStep     !== undefined) updates.currentStep     = d.currentStep;
    if (d.practiceName    !== undefined) updates.practiceName    = d.practiceName;
    if (d.address         !== undefined) updates.address         = d.address;
    if (d.postcode        !== undefined) updates.postcode        = d.postcode;
    if (d.contactEmail    !== undefined) updates.contactEmail    = d.contactEmail;
    if (d.contactName     !== undefined) updates.contactName     = d.contactName;
    if (d.modulesEnabled  !== undefined) updates.modulesEnabled  = d.modulesEnabled;
    if (d.inspectionData  !== undefined) updates.inspectionData  = d.inspectionData;
    if (d.roomsConfig     !== undefined) updates.roomsConfig     = d.roomsConfig;
    if (d.cleaningConfig  !== undefined) updates.cleaningConfig  = d.cleaningConfig;
    if (d.aiRecommendations !== undefined) updates.aiRecommendations = d.aiRecommendations;
    if (d.completedAt     !== undefined) updates.completedAt     = new Date(d.completedAt);

    const [updated] = await db.update(onboardingSessions).set(updates).where(eq(onboardingSessions.id, sessionId)).returning();
    auditOnboarding('session_updated', sessionId, { step: d.currentStep ?? session.currentStep });
    return res.json({ requestId: rid, session: updated });
  });

  // PUT /api/onboarding/sessions/:sessionId/modules ───────────────────────────
  // Saves module selections from Step 2. Stores as array of enabled module IDs.
  app.put('/api/onboarding/sessions/:sessionId/modules', async (req, res) => {
    const rid = newRequestId();
    const { sessionId } = req.params;
    const parse = updateModulesSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });

    const session = await getSession(sessionId);
    if (!session || session.deletedAt) return res.status(404).json({ requestId: rid, error: 'Session not found' });

    // Store enabled module IDs as a JSON array for compact retrieval
    const enabledModules = Object.entries(parse.data.modules)
      .filter(([, on]) => on)
      .map(([id]) => id);

    const [updated] = await db.update(onboardingSessions)
      .set({ modulesEnabled: enabledModules, currentStep: 3, updatedAt: new Date() })
      .where(eq(onboardingSessions.id, sessionId))
      .returning();

    auditOnboarding('modules_selected', sessionId, { enabledCount: enabledModules.length, cleaningEnabled: parse.data.modules['cleaning'] ?? true });
    return res.json({ requestId: rid, session: updated, enabledModules });
  });

  // PUT /api/onboarding/sessions/:sessionId/inspection ────────────────────────
  // Saves inspection data from Step 3 (CQC confirmed or manual entry).
  app.put('/api/onboarding/sessions/:sessionId/inspection', async (req, res) => {
    const rid = newRequestId();
    const { sessionId } = req.params;
    const parse = updateInspectionSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });

    const session = await getSession(sessionId);
    if (!session || session.deletedAt) return res.status(404).json({ requestId: rid, error: 'Session not found' });

    // Sanitize free-text fields to prevent XSS in any downstream renderer
    const data = parse.data.inspectionData;
    const sanitized = {
      ...data,
      keyFindings: data.keyFindings ? sanitizeText(data.keyFindings) : undefined,
    };

    const [updated] = await db.update(onboardingSessions)
      .set({ inspectionData: sanitized, currentStep: 4, updatedAt: new Date() })
      .where(eq(onboardingSessions.id, sessionId))
      .returning();

    auditOnboarding('inspection_saved', sessionId, { source: data.source, hasRating: !!data.rating.overall });
    return res.json({ requestId: rid, session: updated });
  });

  // GET /api/onboarding/compliance-templates ──────────────────────────────────
  // Returns compliance templates filtered by enabled module names and regulator.
  app.get('/api/onboarding/compliance-templates', async (req, res) => {
    const rid = newRequestId();
    const parse = complianceTemplatesQuerySchema.safeParse(req.query);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid query parameters', details: parse.error.flatten() });

    const moduleList = parse.data.modules.split(',').map(s => s.trim()).filter(Boolean);
    if (moduleList.length === 0) return res.json({ requestId: rid, templates: [] });

    // Fetch templates for the requested module names; regulator filter is additive
    // (NULL regulator = applies to all, specific regulator = only that regulator)
    const rows = await db
      .select()
      .from(complianceTemplates)
      .where(inArray(complianceTemplates.moduleName, moduleList));

    // Filter by regulator: include rows with no regulator OR matching regulator
    const regulator = parse.data.regulator;
    const filtered = regulator
      ? rows.filter(r => !r.regulator || r.regulator === regulator)
      : rows;

    return res.json({ requestId: rid, templates: filtered, total: filtered.length });
  });

  // PUT /api/onboarding/sessions/:sessionId/rooms ─────────────────────────────
  // Saves room layout from Step 5. Sanitises all name fields before storage.
  app.put('/api/onboarding/sessions/:sessionId/rooms', async (req, res) => {
    const rid = newRequestId();
    const { sessionId } = req.params;
    const parse = updateRoomsSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });

    const session = await getSession(sessionId);
    if (!session || session.deletedAt) return res.status(404).json({ requestId: rid, error: 'Session not found' });

    // Sanitise all user-supplied text to prevent XSS in downstream rendering
    const rooms = parse.data.rooms.map(r => ({
      ...r,
      name:       sanitizeText(r.name),
      customType: r.customType ? sanitizeText(r.customType) : undefined,
    }));

    const [updated] = await db.update(onboardingSessions)
      .set({ roomsConfig: { rooms }, currentStep: 6, updatedAt: new Date() })
      .where(eq(onboardingSessions.id, sessionId))
      .returning();

    auditOnboarding('rooms_saved', sessionId, { roomCount: rooms.length });
    return res.json({ requestId: rid, session: updated });
  });

  // PUT /api/onboarding/sessions/:sessionId/cleaning-schedule ─────────────────
  // Saves cleaning schedule config from Step 6.
  app.put('/api/onboarding/sessions/:sessionId/cleaning-schedule', async (req, res) => {
    const rid = newRequestId();
    const { sessionId } = req.params;
    const parse = updateCleaningScheduleSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });

    const session = await getSession(sessionId);
    if (!session || session.deletedAt) return res.status(404).json({ requestId: rid, error: 'Session not found' });

    const taskTotal = parse.data.schedules.reduce((sum, s) => sum + s.tasks.length, 0);
    const [updated] = await db.update(onboardingSessions)
      .set({ cleaningConfig: { schedules: parse.data.schedules }, currentStep: 7, updatedAt: new Date() })
      .where(eq(onboardingSessions.id, sessionId))
      .returning();

    auditOnboarding('cleaning_schedule_saved', sessionId, { roomTypeCount: parse.data.schedules.length, taskTotal });
    return res.json({ requestId: rid, session: updated });
  });

  // GET /api/onboarding/cleaning-templates ────────────────────────────────────
  // Returns all cleaning templates sorted by room_type + sort_order.
  // Frontend groups by room_type and maps to Step 5 room types.
  app.get('/api/onboarding/cleaning-templates', async (_req, res) => {
    const rid = newRequestId();
    const rows = await db
      .select()
      .from(cleaningTemplates)
      .orderBy(asc(cleaningTemplates.roomType), asc(cleaningTemplates.sortOrder));
    return res.json({ requestId: rid, templates: rows });
  });

  // POST /api/onboarding/ai-prioritize ─────────────────────────────────────────
  // Calls the AI service to generate priority recommendations for Step 7.
  // Result is cached in onboarding_sessions.ai_recommendations.
  // Returns fallback gracefully if AI fails — never blocks wizard completion.
  app.post('/api/onboarding/ai-prioritize', async (req, res) => {
    const rid = newRequestId();
    const parse = aiPrioritizeSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });

    const session = await getSession(parse.data.sessionId);
    if (!session || session.deletedAt) return res.status(404).json({ requestId: rid, error: 'Session not found' });

    // Return cached result if available
    if (session.aiRecommendations) {
      return res.json({ requestId: rid, priorities: session.aiRecommendations, fromCache: true, fromFallback: false });
    }

    const summary: SessionSummary = {
      practiceName:    session.practiceName,
      regulator:       session.regulator,
      modulesEnabled:  (session.modulesEnabled as string[]) ?? [],
      inspectionData:  (session.inspectionData as Record<string, any>) ?? null,
      roomCount:       (session.roomsConfig as any)?.rooms?.length ?? 0,
      cleaningEnabled: ((session.modulesEnabled as string[]) ?? []).includes('cleaning'),
    };

    try {
      const { priorities, fromFallback } = await getAiService().generatePriorities(summary);
      if (!fromFallback) {
        await db.update(onboardingSessions)
          .set({ aiRecommendations: priorities as any, updatedAt: new Date() })
          .where(eq(onboardingSessions.id, parse.data.sessionId));
      }
      auditOnboarding('ai_prioritize', parse.data.sessionId, { fromFallback });
      return res.json({ requestId: rid, priorities, fromCache: false, fromFallback });
    } catch (err: any) {
      const fallback = buildFallback(summary);
      return res.json({ requestId: rid, priorities: fallback, fromCache: false, fromFallback: true });
    }
  });

  // POST /api/onboarding/complete ───────────────────────────────────────────────
  // CRITICAL endpoint: creates all live practice records in a single transaction.
  // On any failure, everything is rolled back. Returns { practiceId }.
  app.post('/api/onboarding/complete', async (req, res) => {
    const rid = newRequestId();
    const parse = completeSessionSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ requestId: rid, error: 'Invalid request', details: parse.error.flatten() });

    const { sessionId, managerName, managerEmail, managerPassword } = parse.data;
    auditOnboarding('complete_started', sessionId, {});
    try {
      const { practiceId, userId } = await executeComplete(sessionId, { name: managerName, email: managerEmail, password: managerPassword });
      // Log the new practice manager in immediately
      req.session.userId = userId;
      req.session.practiceId = practiceId;
      await new Promise<void>((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
      auditOnboarding('complete_success', sessionId, { practiceId });
      return res.status(201).json({ requestId: rid, practiceId });
    } catch (err: any) {
      const status = err.status ?? 500;
      auditOnboarding('complete_failed', sessionId, { error: err.message, status });
      console.error('onboarding/complete:', err);
      return res.status(status).json({ requestId: rid, error: err.message ?? 'Completion failed' });
    }
  });
}
