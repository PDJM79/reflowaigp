// ── Onboarding: shared helpers used by route handlers ────────────────────────
import { randomBytes } from 'crypto';
import { z } from 'zod';

// ── Request ID generator ──────────────────────────────────────────────────────
// Short random ID attached to every API response for log correlation.
// Not a UUID — kept short to be readable in logs.
export const newRequestId = () => randomBytes(4).toString('hex');

// ── XSS sanitizer ────────────────────────────────────────────────────────────
// Strips HTML tags and null bytes from user-supplied free text before storage.
// React escapes output automatically so this is defence-in-depth for any
// server-side rendering or downstream consumers of stored data.
export const sanitizeText = (s: string): string =>
  s.replace(/<[^>]*>/g, '').replace(/\x00/g, '').trim();

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const lookupPracticeSchema = z.object({
  registrationNumber: z.string().min(1).max(50),
  regulator: z.enum(['cqc', 'hiw']).default('cqc'),
});

export const createSessionSchema = z.object({
  practiceName:        z.string().min(1).max(200),
  registrationNumber:  z.string().max(50).optional(),
  regulator:           z.enum(['cqc', 'hiw']).default('cqc'),
  address:             z.string().max(500).optional(),
  postcode:            z.string().max(10).optional(),
  contactEmail:        z.string().email().optional(),
  contactName:         z.string().max(100).optional(),
  inspectionData:      z.record(z.any()).optional(),
});

export const updateSessionSchema = z.object({
  currentStep:        z.number().int().min(1).max(10).optional(),
  practiceName:       z.string().min(1).max(200).optional(),
  address:            z.string().max(500).optional(),
  postcode:           z.string().max(10).optional(),
  contactEmail:       z.string().email().optional(),
  contactName:        z.string().max(100).optional(),
  modulesEnabled:     z.array(z.string()).optional(),
  inspectionData:     z.record(z.any()).optional(),
  roomsConfig:        z.record(z.any()).optional(),
  cleaningConfig:     z.record(z.any()).optional(),
  aiRecommendations:  z.record(z.any()).optional(),
  completedAt:        z.string().datetime().optional(),
});

// Modules step: record of moduleId → boolean
export const updateModulesSchema = z.object({
  modules: z.record(z.string(), z.boolean()),
});

// Inspection step: stores structured data (source + rating + optional free text)
const cqcRatingSchema = z.object({
  overall:    z.string().nullable(),
  safe:       z.string().nullable(),
  effective:  z.string().nullable(),
  caring:     z.string().nullable(),
  responsive: z.string().nullable(),
  wellLed:    z.string().nullable(),
});

export const updateInspectionSchema = z.object({
  inspectionData: z.object({
    source:              z.enum(['cqc', 'manual']),
    lastInspectionDate:  z.string().nullable(),
    rating:              cqcRatingSchema,
    registrationStatus:  z.string().optional(),
    // Free text from manual entry — will be sanitized server-side
    keyFindings:         z.string().max(2000).optional(),
    fetchedAt:           z.string().optional(),
  }),
});

// Compliance templates query params
export const complianceTemplatesQuerySchema = z.object({
  modules:   z.string().min(1).max(200),   // comma-separated module names
  regulator: z.enum(['cqc', 'hiw']).optional(),
});
