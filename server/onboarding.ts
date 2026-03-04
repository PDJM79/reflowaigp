// ── Onboarding Wizard API ─────────────────────────────────────────────────────
import type { Express } from 'express';
import { z } from 'zod';
import { db } from './db';
import { onboardingSessions } from '@shared/schema';
import { eq, isNull } from 'drizzle-orm';
import { lookupPractice, CqcServiceError, getCqcCircuitStatus } from './services/cqc-service';

// ── Zod schemas ───────────────────────────────────────────────────────────────
const lookupPracticeSchema = z.object({
  registrationNumber: z.string().min(1).max(50),
  regulator: z.enum(['cqc', 'hiw']).default('cqc'),
});

const createSessionSchema = z.object({
  practiceName:        z.string().min(1).max(200),
  registrationNumber:  z.string().max(50).optional(),
  regulator:           z.enum(['cqc', 'hiw']).default('cqc'),
  address:             z.string().max(500).optional(),
  postcode:            z.string().max(10).optional(),
  contactEmail:        z.string().email().optional(),
  contactName:         z.string().max(100).optional(),
  inspectionData:      z.record(z.any()).optional(),
});

const updateSessionSchema = z.object({
  currentStep:      z.number().int().min(1).max(10).optional(),
  practiceName:     z.string().min(1).max(200).optional(),
  address:          z.string().max(500).optional(),
  postcode:         z.string().max(10).optional(),
  contactEmail:     z.string().email().optional(),
  contactName:      z.string().max(100).optional(),
  modulesEnabled:   z.array(z.string()).optional(),
  inspectionData:   z.record(z.any()).optional(),
  roomsConfig:      z.record(z.any()).optional(),
  cleaningConfig:   z.record(z.any()).optional(),
  aiRecommendations:z.record(z.any()).optional(),
  completedAt:      z.string().datetime().optional(),
});

// ── Route registration ────────────────────────────────────────────────────────
export function registerOnboardingRoutes(app: Express): void {

  // ── POST /api/onboarding/lookup-practice ────────────────────────────────────
  // Public endpoint — no auth required (pre-login wizard)
  app.post('/api/onboarding/lookup-practice', async (req, res) => {
    const parse = lookupPracticeSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid request', details: parse.error.flatten() });
    }
    const { registrationNumber, regulator } = parse.data;

    // HIW has no public API — return prompt for manual entry
    if (regulator === 'hiw') {
      return res.json({
        found: false,
        regulator: 'hiw',
        message: 'Health Inspectorate Wales does not provide a public search API. Please enter your practice details manually.',
        manualEntryRequired: true,
      });
    }

    try {
      const practice = await lookupPractice(registrationNumber);
      return res.json({ found: true, regulator: 'cqc', practice });
    } catch (err) {
      if (err instanceof CqcServiceError) {
        const status = err.code === 'NOT_FOUND' ? 404
          : err.code === 'CIRCUIT_OPEN' ? 503
          : err.code === 'TIMEOUT' ? 504
          : 502;
        return res.status(status).json({
          found: false,
          error: err.message,
          code: err.code,
          manualEntryRequired: true,
        });
      }
      console.error('onboarding/lookup-practice unexpected error:', err);
      return res.status(502).json({
        found: false,
        error: 'An unexpected error occurred. Please enter your details manually.',
        manualEntryRequired: true,
      });
    }
  });

  // ── GET /api/onboarding/inspection-data ─────────────────────────────────────
  // Returns the cached inspection_data from the session (or re-fetches if stale)
  app.get('/api/onboarding/inspection-data', async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query parameter is required' });
    }

    const rows = await db
      .select()
      .from(onboardingSessions)
      .where(eq(onboardingSessions.id, sessionId))
      .limit(1);

    const session = rows[0];
    if (!session || session.deletedAt) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // If we already have inspection data, return it
    if (session.inspectionData) {
      return res.json({ inspectionData: session.inspectionData, fromCache: true });
    }

    // Re-fetch from CQC if we have a registration number
    if (session.registrationNumber && session.regulator === 'cqc') {
      try {
        const practice = await lookupPractice(session.registrationNumber);
        const inspectionData = {
          lastInspectionDate: practice.lastInspectionDate,
          rating: practice.rating,
          registrationStatus: practice.registrationStatus,
          fetchedAt: new Date().toISOString(),
        };

        await db
          .update(onboardingSessions)
          .set({ inspectionData, updatedAt: new Date() })
          .where(eq(onboardingSessions.id, sessionId));

        return res.json({ inspectionData, fromCache: false });
      } catch (err) {
        if (err instanceof CqcServiceError) {
          return res.status(502).json({ error: err.message, code: err.code });
        }
        return res.status(502).json({ error: 'Failed to fetch inspection data' });
      }
    }

    return res.json({ inspectionData: null, fromCache: false });
  });

  // ── POST /api/onboarding/sessions ───────────────────────────────────────────
  // Creates a new onboarding session; returns sessionId for subsequent steps
  app.post('/api/onboarding/sessions', async (req, res) => {
    const parse = createSessionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid request', details: parse.error.flatten() });
    }

    const {
      practiceName, registrationNumber, regulator, address, postcode,
      contactEmail, contactName, inspectionData,
    } = parse.data;

    const [session] = await db
      .insert(onboardingSessions)
      .values({
        practiceName,
        registrationNumber: registrationNumber ?? null,
        regulator,
        address: address ?? null,
        postcode: postcode ?? null,
        contactEmail: contactEmail ?? null,
        contactName: contactName ?? null,
        inspectionData: inspectionData ?? null,
        currentStep: 1,
      })
      .returning();

    return res.status(201).json({ sessionId: session.id, session });
  });

  // ── PUT /api/onboarding/sessions/:sessionId ──────────────────────────────────
  // Updates step data; used on every step transition to persist progress
  app.put('/api/onboarding/sessions/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    const parse = updateSessionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid request', details: parse.error.flatten() });
    }

    // Verify session exists
    const rows = await db
      .select({ id: onboardingSessions.id, deletedAt: onboardingSessions.deletedAt })
      .from(onboardingSessions)
      .where(eq(onboardingSessions.id, sessionId))
      .limit(1);

    if (!rows[0] || rows[0].deletedAt) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (parse.data.currentStep     !== undefined) updates.currentStep     = parse.data.currentStep;
    if (parse.data.practiceName    !== undefined) updates.practiceName    = parse.data.practiceName;
    if (parse.data.address         !== undefined) updates.address         = parse.data.address;
    if (parse.data.postcode        !== undefined) updates.postcode        = parse.data.postcode;
    if (parse.data.contactEmail    !== undefined) updates.contactEmail    = parse.data.contactEmail;
    if (parse.data.contactName     !== undefined) updates.contactName     = parse.data.contactName;
    if (parse.data.modulesEnabled  !== undefined) updates.modulesEnabled  = parse.data.modulesEnabled;
    if (parse.data.inspectionData  !== undefined) updates.inspectionData  = parse.data.inspectionData;
    if (parse.data.roomsConfig     !== undefined) updates.roomsConfig     = parse.data.roomsConfig;
    if (parse.data.cleaningConfig  !== undefined) updates.cleaningConfig  = parse.data.cleaningConfig;
    if (parse.data.aiRecommendations !== undefined) updates.aiRecommendations = parse.data.aiRecommendations;
    if (parse.data.completedAt     !== undefined) updates.completedAt     = new Date(parse.data.completedAt);

    const [updated] = await db
      .update(onboardingSessions)
      .set(updates)
      .where(eq(onboardingSessions.id, sessionId))
      .returning();

    return res.json({ session: updated });
  });
}
