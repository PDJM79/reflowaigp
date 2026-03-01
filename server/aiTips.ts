import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { tasks, incidents, complaints, trainingRecords } from '@shared/schema';
import { eq, and, ne, sql } from 'drizzle-orm';

interface CacheEntry {
  tips: string[];
  generatedAt: Date;
}

// In-memory cache keyed by practiceId — survives process lifetime, refreshed every 24 h
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getAITips(
  practiceId: string,
  forceRefresh = false,
): Promise<{ tips: string[]; cachedAt: string | null }> {
  if (!forceRefresh) {
    const cached = cache.get(practiceId);
    if (cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS) {
      return { tips: cached.tips, cachedAt: cached.generatedAt.toISOString() };
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const now = new Date();

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const allTasks = await db
    .select({ id: tasks.id, status: tasks.status, dueAt: tasks.dueAt, module: tasks.module })
    .from(tasks)
    .where(eq(tasks.practiceId, practiceId));

  const closedStatuses = ['complete', 'closed', 'submitted'];
  const completedCount = allTasks.filter(t => closedStatuses.includes(t.status ?? '')).length;
  const overdueIds = new Set(
    allTasks
      .filter(t => t.dueAt && new Date(t.dueAt) < now && !closedStatuses.includes(t.status ?? ''))
      .map(t => t.id),
  );

  // Breakdown by module — sorted by overdue count descending
  const moduleStats: Record<string, { total: number; overdue: number }> = {};
  for (const task of allTasks) {
    const mod = task.module ?? 'general';
    if (!moduleStats[mod]) moduleStats[mod] = { total: 0, overdue: 0 };
    moduleStats[mod].total++;
    if (overdueIds.has(task.id)) moduleStats[mod].overdue++;
  }
  const moduleLines = Object.entries(moduleStats)
    .filter(([, s]) => s.total > 0)
    .sort((a, b) => b[1].overdue - a[1].overdue)
    .map(([mod, s]) => `  - ${mod}: ${s.total} tasks, ${s.overdue} overdue`)
    .join('\n');

  // ── Open incidents ─────────────────────────────────────────────────────────
  const openIncidents = await db
    .select({ severity: incidents.severity })
    .from(incidents)
    .where(and(eq(incidents.practiceId, practiceId), ne(incidents.status, 'closed')));

  const highSeverityCount = openIncidents.filter(
    i => i.severity === 'high' || i.severity === 'critical',
  ).length;

  // ── Open complaints ────────────────────────────────────────────────────────
  const openComplaints = await db
    .select({ ackDue: complaints.ackDue, finalDue: complaints.finalDue })
    .from(complaints)
    .where(and(eq(complaints.practiceId, practiceId), ne(complaints.status, 'closed')));

  const overdueComplaintCount = openComplaints.filter(
    c => (c.ackDue && new Date(c.ackDue) < now) || (c.finalDue && new Date(c.finalDue) < now),
  ).length;

  // ── Training gaps ──────────────────────────────────────────────────────────
  const expiredTraining = await db
    .select({ isMandatory: trainingRecords.isMandatory })
    .from(trainingRecords)
    .where(
      and(
        eq(trainingRecords.practiceId, practiceId),
        sql`${trainingRecords.expiryDate} IS NOT NULL`,
        sql`${trainingRecords.expiryDate} < ${now}`,
      ),
    );

  const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const soonExpiring = await db
    .select({ isMandatory: trainingRecords.isMandatory })
    .from(trainingRecords)
    .where(
      and(
        eq(trainingRecords.practiceId, practiceId),
        sql`${trainingRecords.expiryDate} IS NOT NULL`,
        sql`${trainingRecords.expiryDate} >= ${now}`,
        sql`${trainingRecords.expiryDate} <= ${sixtyDaysOut}`,
      ),
    );

  // ── Build prompt ───────────────────────────────────────────────────────────
  const completionRate =
    allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;

  const prompt = `GP practice compliance snapshot (date: ${now.toISOString().split('T')[0]}):

TASK COMPLETION:
  - Total tasks: ${allTasks.length}
  - Completed: ${completedCount} (${completionRate}%)
  - Overdue: ${overdueIds.size}

TASKS BY MODULE:
${moduleLines || '  - No tasks recorded'}

INCIDENTS:
  - Open incidents: ${openIncidents.length}
  - High/critical severity: ${highSeverityCount}

COMPLAINTS:
  - Open complaints: ${openComplaints.length}
  - Overdue SLA: ${overdueComplaintCount}

TRAINING:
  - Expired records: ${expiredTraining.length} (mandatory: ${expiredTraining.filter(t => t.isMandatory).length})
  - Expiring within 60 days: ${soonExpiring.length} (mandatory: ${soonExpiring.filter(t => t.isMandatory).length})`;

  // ── Call Claude ────────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 500,
    system:
      "You are a GP practice compliance advisor for Health Inspectorate Wales. Based on the following compliance data, provide 3-5 specific, actionable improvement tips to improve the practice's audit readiness score. Be concise and practical. Focus on quick wins first. Return ONLY a JSON array of strings — no markdown, no explanation, just the array. Example: [\"Address the 3 overdue fire safety tasks before next inspection.\", \"Book mandatory DBS renewals for 2 staff this month.\"]",
    messages: [{ role: 'user', content: prompt }],
  });

  // ── Parse response ─────────────────────────────────────────────────────────
  let tips: string[] = [];
  const block = message.content[0];
  if (block.type === 'text') {
    const text = block.text.trim();
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) tips = parsed.map(String);
    } catch {
      // Try to extract a JSON array from within free-text response
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) tips = parsed.map(String);
        } catch {
          tips = [text];
        }
      } else {
        tips = [text];
      }
    }
  }

  cache.set(practiceId, { tips, generatedAt: now });
  return { tips, cachedAt: null };
}
