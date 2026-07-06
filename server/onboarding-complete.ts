// ── Onboarding Completion Transaction ─────────────────────────────────────────
// Creates all live practice records in a single atomic transaction.
// Any failure rolls back everything — no partial state is ever persisted.
// Called by POST /api/onboarding/complete; do not call directly.
import bcrypt from 'bcryptjs';
import { db } from './db';
import {
  onboardingSessions, practices, practiceModules, complianceTemplates,
  cleaningTemplates,
  rooms as roomsTable, cleaningZones, cleaningTasks, policyDocuments, auditLogs,
  tasks as tasksTable, users,
} from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

export interface ManagerCredentials {
  name: string;
  email: string;
  password: string;
}

export const ALL_MODULE_IDS = [
  'compliance', 'fire_safety', 'ipc', 'hr_training', 'policies',
  'complaints', 'cleaning', 'hr', 'fridge_temps',
] as const;

// ── Compliance frequency → due date ──────────────────────────────────────────
function dueDate(freq: string): Date {
  const now = new Date();
  switch (freq) {
    case 'daily':       return new Date(now.getTime() + 86_400_000);
    case 'weekly': {    const d = new Date(now); d.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7)); return d; }
    case 'monthly':     return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    case 'quarterly': { const q = Math.ceil((now.getMonth() + 1) / 3) * 3; return new Date(now.getFullYear() + (q > 11 ? 1 : 0), q % 12, 1); }
    case 'six_monthly': return new Date(now.getFullYear(), now.getMonth() + 6, 1);
    default:            return new Date(now.getFullYear() + 1, now.getMonth(), 1);
  }
}

// ── Onboarding → DB cleaning frequency ───────────────────────────────────────
const CLEAN_FREQ: Record<string, string> = {
  '2x_daily': 'twice_daily', 'daily': 'daily', 'every_other_day': 'periodic',
  'weekly': 'weekly', 'fortnightly': 'periodic', 'monthly': 'monthly',
};

// ── Room type → zone type ─────────────────────────────────────────────────────
const ROOM_TO_ZONE: Record<string, string> = {
  consultation: 'clinical', bathroom: 'patient', waiting_room: 'patient',
  staff_area: 'staff', kitchen: 'staff', utility: 'utility', custom: 'utility',
};

// ── Zone type → display name ──────────────────────────────────────────────────
const ZONE_LABELS: Record<string, string> = {
  clinical: 'Clinical Zone', patient: 'Patient Zone',
  staff: 'Staff Zone', utility: 'Utility Zone',
};

// ── Default NHS GP policies seeded for new practices ─────────────────────────
const DEFAULT_POLICIES = [
  { title: 'Infection Prevention and Control Policy',  category: 'IPC' },
  { title: 'Health and Safety Policy',                  category: 'Health & Safety' },
  { title: 'Significant Event Analysis Policy',         category: 'Governance' },
  { title: 'Complaints Handling Policy',                category: 'Complaints' },
  { title: 'Data Protection and GDPR Policy',           category: 'IG' },
  { title: 'Safeguarding Adults Policy',                category: 'Safeguarding' },
  { title: 'Safeguarding Children Policy',              category: 'Safeguarding' },
  { title: 'Medicines Management Policy',               category: 'Medicines' },
  { title: 'Chaperone Policy',                          category: 'Clinical' },
  { title: 'Equality and Diversity Policy',             category: 'HR' },
];

// ── Main completion function ──────────────────────────────────────────────────
// Returns { practiceId, userId } on success; throws structured errors on failure.
export async function executeComplete(sessionId: string, credentials: ManagerCredentials): Promise<{ practiceId: string; userId: string }> {
  const rows = await db.select().from(onboardingSessions)
    .where(eq(onboardingSessions.id, sessionId)).limit(1);
  const session = rows[0];
  if (!session || session.deletedAt) throw Object.assign(new Error('Session not found'), { status: 404 });
  if (session.completedAt) throw Object.assign(new Error('Session already completed'), { status: 409 });

  const enabledModules = (session.modulesEnabled as string[]) ?? [];
  const cleaningEnabled = enabledModules.includes('cleaning');
  const policiesEnabled = enabledModules.includes('policies');
  const regulator = session.regulator;
  const country = regulator === 'hiw' ? 'wales' : 'england';

  // Pre-fetch compliance templates (read-only, outside transaction)
  const compTpls = enabledModules.length > 0
    ? await db.select().from(complianceTemplates)
        .where(inArray(complianceTemplates.moduleName, enabledModules))
    : [];

  // Pre-fetch cleaning template names for task name lookup
  const cleaningTplIds = new Set<string>();
  if (cleaningEnabled && session.cleaningConfig) {
    const scheds = (session.cleaningConfig as any).schedules ?? [];
    for (const s of scheds) for (const t of s.tasks ?? []) cleaningTplIds.add(t.templateId);
  }
  const cleaningTpls = cleaningTplIds.size > 0
    ? await db.select().from(cleaningTemplates).where(inArray(cleaningTemplates.id, [...cleaningTplIds]))
    : [];
  const tplNameMap = new Map(cleaningTpls.map(t => [t.id, t.taskName]));

  return await db.transaction(async (tx) => {
    // ── 1. Create practice ────────────────────────────────────────────────────
    const [practice] = await tx.insert(practices).values({
      name: session.practiceName,
      country: country as any,
      regulator: regulator as any,
      address: session.address ?? null,
      postcode: session.postcode ?? null,
      contactEmail: session.contactEmail ?? null,
      contactName: session.contactName ?? null,
      registrationNumber: session.registrationNumber ?? null,
      isActive: true,
      onboardingStage: 'completed',
      onboardingCompletedAt: new Date(),
    }).returning();

    // ── 2. Create practice_modules for all 9 modules ──────────────────────────
    await tx.insert(practiceModules).values(
      ALL_MODULE_IDS.map(m => ({ practiceId: practice.id, moduleName: m, isEnabled: enabledModules.includes(m) }))
    );

    // ── 3. Create compliance tasks from templates ─────────────────────────────
    if (compTpls.length > 0) {
      const isPoor = ['requires improvement', 'inadequate']
        .includes(((session.inspectionData as any)?.rating?.overall ?? '').toLowerCase());
      const filtered = compTpls.filter(t => !t.regulator || t.regulator === regulator);
      if (filtered.length > 0) {
        await tx.insert(tasksTable).values(
          filtered.map(t => ({
            practiceId: practice.id, title: t.title, description: t.description ?? null,
            module: t.moduleName, priority: (isPoor && t.isMandatory) ? 'high' : 'medium',
            status: 'pending', dueAt: dueDate(t.frequency),
          }))
        );
      }
    }

    // ── 4-6. Rooms, zones, and cleaning tasks ─────────────────────────────────
    if (cleaningEnabled) await createCleaningRecords(tx, practice.id, session, tplNameMap);

    // ── 7. Default policies ───────────────────────────────────────────────────
    if (policiesEnabled) {
      const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
      await tx.insert(policyDocuments).values(
        DEFAULT_POLICIES.map(p => ({ practiceId: practice.id, title: p.title, category: p.category, version: '1.0', status: 'draft', nextReviewDate: nextYear }))
      );
    }

    // ── 8. Create practice manager user account ───────────────────────────────
    const passwordHash = await bcrypt.hash(credentials.password, 12);
    const [user] = await tx.insert(users).values({
      practiceId: practice.id,
      email: credentials.email,
      name: credentials.name,
      passwordHash,
      role: 'admin',
      isPracticeManager: true,
      isActive: true,
    }).returning();

    // ── 9. Mark session complete + link to new practice ───────────────────────
    await tx.update(onboardingSessions)
      .set({ completedAt: new Date(), practiceId: practice.id, currentStep: 8, updatedAt: new Date() })
      .where(eq(onboardingSessions.id, sessionId));

    // ── 10. Audit log ─────────────────────────────────────────────────────────
    await tx.insert(auditLogs).values({
      practiceId: practice.id,
      userId: user.id,
      entityType: 'practice', entityId: practice.id,
      action: 'onboarded_via_wizard',
      afterData: { sessionId, modules: enabledModules, roomCount: (session.roomsConfig as any)?.rooms?.length ?? 0 },
    });

    return { practiceId: practice.id, userId: user.id };
  });
}

// ── Helper: create rooms, zones and cleaning tasks in a transaction ───────────
async function createCleaningRecords(
  tx: any, practiceId: string, session: any, tplNameMap: Map<string, string>
): Promise<void> {
  const roomsCfg: any[] = (session.roomsConfig as any)?.rooms ?? [];
  const schedules: any[] = (session.cleaningConfig as any)?.schedules ?? [];

  // Create rooms
  if (roomsCfg.length > 0) {
    await tx.insert(roomsTable).values(
      roomsCfg.map((r: any) => ({ practiceId, name: r.name, type: r.type, isActive: true }))
    );
  }

  // Create one zone per unique zone type present in rooms
  const uniqueZones = [...new Set<string>(roomsCfg.map((r: any) => (ROOM_TO_ZONE[r.type] ?? 'utility')))];
  const zoneIds: Record<string, string> = {};
  for (const zoneType of uniqueZones) {
    const [zone] = await tx.insert(cleaningZones).values({
      practiceId, zoneName: ZONE_LABELS[zoneType] ?? zoneType, zoneType, isActive: true,
    }).returning();
    zoneIds[zoneType] = zone.id;
  }

  // Create cleaning tasks (deduplicated by zone + templateId)
  const created = new Set<string>();
  for (const sched of schedules) {
    const zoneType = ROOM_TO_ZONE[sched.roomType] ?? 'utility';
    const zoneId = zoneIds[zoneType];
    if (!zoneId) continue;
    for (const task of sched.tasks ?? []) {
      const key = `${zoneId}:${task.templateId}`;
      if (created.has(key)) continue;
      created.add(key);
      const taskName = tplNameMap.get(task.templateId) ?? 'Cleaning Task';
      await tx.insert(cleaningTasks).values({
        practiceId, zoneId, taskName,
        frequency: (CLEAN_FREQ[task.frequency] ?? 'daily') as any,
        requiresPhoto: task.requiresPhoto, isActive: true,
      });
    }
  }
}
