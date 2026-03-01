import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { trainingRecords, employees } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────
export interface UrgentAction {
  staff_name: string;
  role: string;
  course: string;
  expired_date: string;       // ISO date string
  days_overdue: number;
  is_mandatory: boolean;
}

export interface UpcomingExpiration {
  staff_name: string;
  role: string;
  course: string;
  expiry_date: string;        // ISO date string
  days_remaining: number;
  is_mandatory: boolean;
}

export interface CourseGap {
  course: string;
  current_count: number;
  expired_count: number;
  total_count: number;
  compliance_pct: number;
  is_mandatory: boolean;
}

export interface TrainingRecommendation {
  action: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface ComplianceSummary {
  overall_pct: number;
  mandatory_pct: number;
  rag: 'green' | 'amber' | 'red';
  total_records: number;
  expired_count: number;
  expiring_soon_count: number;    // within 90 days
  summary: string;                // narrative from Claude
}

export interface TrainingAnalysis {
  compliance_summary: ComplianceSummary;
  urgent_actions: UrgentAction[];
  upcoming_expirations: UpcomingExpiration[];
  gap_analysis: CourseGap[];
  recommendations: TrainingRecommendation[];
}

// ── In-memory cache ────────────────────────────────────────────────────────
interface CacheEntry {
  analysis: TrainingAnalysis;
  generatedAt: Date;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const ROLE_LABELS: Record<string, string> = {
  practice_manager: 'Practice Manager', nurse_lead: 'Nurse Lead',
  cd_lead_gp: 'CD Lead GP', estates_lead: 'Estates Lead',
  ig_lead: 'IG Lead', reception_lead: 'Reception Lead',
  nurse: 'Nurse', hca: 'HCA', gp: 'GP',
  reception: 'Receptionist', cleaner: 'Cleaner',
  administrator: 'Administrator', auditor: 'Auditor',
};
const roleLabel = (r: string | null) => (r && ROLE_LABELS[r]) || r || 'Unknown';

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Main export ─────────────────────────────────────────────────────────────
export async function getTrainingAnalysis(
  practiceId: string,
  forceRefresh = false,
): Promise<{ analysis: TrainingAnalysis; cachedAt: string | null }> {
  if (!forceRefresh) {
    const cached = cache.get(practiceId);
    if (cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS) {
      return { analysis: cached.analysis, cachedAt: cached.generatedAt.toISOString() };
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // ── Fetch training records joined with employee details ────────────────────
  const rows = await db
    .select({
      id: trainingRecords.id,
      employeeId: trainingRecords.employeeId,
      courseName: trainingRecords.courseName,
      completedAt: trainingRecords.completedAt,
      expiryDate: trainingRecords.expiryDate,
      isMandatory: trainingRecords.isMandatory,
      employeeName: employees.name,
      employeeRole: employees.role,
    })
    .from(trainingRecords)
    .leftJoin(employees, eq(trainingRecords.employeeId, employees.id))
    .where(eq(trainingRecords.practiceId, practiceId));

  if (rows.length === 0) {
    const empty: TrainingAnalysis = {
      compliance_summary: {
        overall_pct: 100, mandatory_pct: 100, rag: 'green',
        total_records: 0, expired_count: 0, expiring_soon_count: 0,
        summary: 'No training records found. Add staff training records to enable compliance analysis.',
      },
      urgent_actions: [],
      upcoming_expirations: [],
      gap_analysis: [],
      recommendations: [{
        action: 'Begin logging staff training records including course name, completion date, expiry date, and mandatory status.',
        priority: 'high',
        rationale: 'Training records are required for HIW inspection readiness and staff compliance monitoring.',
      }],
    };
    cache.set(practiceId, { analysis: empty, generatedAt: new Date() });
    return { analysis: empty, cachedAt: null };
  }

  // ── Compute factual data locally (not delegated to Claude) ─────────────────

  // Categorise each record
  const expired = rows.filter(
    r => r.expiryDate && new Date(r.expiryDate) < now,
  );
  const expiringSoon = rows.filter(
    r => r.expiryDate && new Date(r.expiryDate) >= now && new Date(r.expiryDate) <= ninetyDays,
  );
  const current = rows.filter(
    r => !r.expiryDate || new Date(r.expiryDate) > ninetyDays,
  );

  const mandatoryRows = rows.filter(r => r.isMandatory);
  const mandatoryExpired = mandatoryRows.filter(r => r.expiryDate && new Date(r.expiryDate) < now);
  const mandatoryCurrent = mandatoryRows.filter(r => !r.expiryDate || new Date(r.expiryDate) >= now);

  const totalWithExpiry = rows.filter(r => !!r.expiryDate).length;
  const currentWithExpiry = current.filter(r => !!r.expiryDate).length + expiringSoon.length;

  const overallPct =
    totalWithExpiry > 0 ? Math.round((currentWithExpiry / totalWithExpiry) * 100) : 100;

  const mandatoryTotal = mandatoryRows.filter(r => !!r.expiryDate).length;
  const mandatoryCurrentCount = mandatoryCurrent.filter(r => !!r.expiryDate).length;
  const mandatoryPct =
    mandatoryTotal > 0 ? Math.round((mandatoryCurrentCount / mandatoryTotal) * 100) : 100;

  const rag: 'green' | 'amber' | 'red' =
    mandatoryPct >= 90 ? 'green' : mandatoryPct >= 70 ? 'amber' : 'red';

  // Urgent actions (expired records) — sorted by days overdue desc, mandatory first
  const urgentActions: UrgentAction[] = expired
    .map(r => ({
      staff_name: r.employeeName ?? 'Unknown',
      role: roleLabel(r.employeeRole),
      course: r.courseName ?? 'Unknown course',
      expired_date: new Date(r.expiryDate!).toISOString().split('T')[0],
      days_overdue: Math.abs(daysBetween(now, new Date(r.expiryDate!))),
      is_mandatory: r.isMandatory ?? false,
    }))
    .sort((a, b) => {
      if (a.is_mandatory !== b.is_mandatory) return a.is_mandatory ? -1 : 1;
      return b.days_overdue - a.days_overdue;
    });

  // Upcoming expirations — sorted by days remaining asc
  const upcomingExpirations: UpcomingExpiration[] = expiringSoon
    .map(r => ({
      staff_name: r.employeeName ?? 'Unknown',
      role: roleLabel(r.employeeRole),
      course: r.courseName ?? 'Unknown course',
      expiry_date: new Date(r.expiryDate!).toISOString().split('T')[0],
      days_remaining: daysBetween(now, new Date(r.expiryDate!)),
      is_mandatory: r.isMandatory ?? false,
    }))
    .sort((a, b) => a.days_remaining - b.days_remaining);

  // Gap analysis per course
  const courseMap = new Map<string, { current: number; expired: number; mandatory: boolean }>();
  for (const r of rows) {
    const course = r.courseName ?? 'Unknown';
    const entry = courseMap.get(course) ?? { current: 0, expired: 0, mandatory: r.isMandatory ?? false };
    if (r.expiryDate && new Date(r.expiryDate) < now) {
      entry.expired++;
    } else {
      entry.current++;
    }
    if (r.isMandatory) entry.mandatory = true;
    courseMap.set(course, entry);
  }
  const gapAnalysis: CourseGap[] = Array.from(courseMap.entries())
    .map(([course, stats]) => {
      const total = stats.current + stats.expired;
      return {
        course,
        current_count: stats.current,
        expired_count: stats.expired,
        total_count: total,
        compliance_pct: total > 0 ? Math.round((stats.current / total) * 100) : 100,
        is_mandatory: stats.mandatory,
      };
    })
    .sort((a, b) => a.compliance_pct - b.compliance_pct);   // worst first

  // ── Build prompt for Claude (narrative + recommendations only) ────────────
  const topUrgent = urgentActions.slice(0, 10);
  const topExpiring = upcomingExpirations.slice(0, 10);
  const topGaps = gapAnalysis.slice(0, 8);

  const prompt = `GP surgery training compliance data (date: ${now.toISOString().split('T')[0]}):

OVERALL METRICS:
- Total training records: ${rows.length}
- Mandatory training compliance: ${mandatoryPct}% (${mandatoryCurrentCount}/${mandatoryTotal} current)
- Overall compliance (inc. optional): ${overallPct}%
- Expired records: ${expired.length} (mandatory: ${mandatoryExpired.length})
- Expiring within 90 days: ${expiringSoon.length}
- RAG status: ${rag.toUpperCase()}

${topUrgent.length > 0 ? `TOP EXPIRED (needs immediate action):
${topUrgent.map(u => `- ${u.staff_name} (${u.role}): ${u.course} — expired ${u.expired_date} (${u.days_overdue}d overdue)${u.is_mandatory ? ' [MANDATORY]' : ''}`).join('\n')}` : 'No expired training records.'}

${topExpiring.length > 0 ? `EXPIRING SOON (next 90 days):
${topExpiring.map(e => `- ${e.staff_name} (${e.role}): ${e.course} — expires ${e.expiry_date} (${e.days_remaining}d)${e.is_mandatory ? ' [MANDATORY]' : ''}`).join('\n')}` : 'No training expiring in 90 days.'}

${topGaps.length > 0 ? `LOWEST COMPLIANCE COURSES:
${topGaps.map(g => `- ${g.course}: ${g.compliance_pct}% (${g.current_count}/${g.total_count} current)${g.is_mandatory ? ' [MANDATORY]' : ''}`).join('\n')}` : ''}

Return a JSON object with ONLY these two fields (no markdown fences):
{
  "summary": "2-3 sentence narrative for the practice manager about overall compliance position and key risks",
  "recommendations": [
    { "action": string, "priority": "high"|"medium"|"low", "rationale": string }
  ]
}
Provide 4-6 specific, actionable recommendations referencing actual staff/courses from the data above.`;

  // ── Call Claude ────────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    system:
      "You are an NHS Wales mandatory training compliance advisor for a GP surgery. Provide a concise compliance narrative and specific, actionable recommendations. Reference actual staff names and courses from the data. Return only the JSON object requested — no markdown, no preamble.",
    messages: [{ role: 'user', content: prompt }],
  });

  // ── Parse Claude response ──────────────────────────────────────────────────
  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');

  const text = block.text.trim();
  let aiOutput: { summary: string; recommendations: TrainingRecommendation[] };
  try {
    aiOutput = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse AI response');
    aiOutput = JSON.parse(match[0]);
  }

  // ── Assemble final response ────────────────────────────────────────────────
  const analysis: TrainingAnalysis = {
    compliance_summary: {
      overall_pct: overallPct,
      mandatory_pct: mandatoryPct,
      rag,
      total_records: rows.length,
      expired_count: expired.length,
      expiring_soon_count: expiringSoon.length,
      summary: aiOutput.summary ?? '',
    },
    urgent_actions: urgentActions,
    upcoming_expirations: upcomingExpirations,
    gap_analysis: gapAnalysis,
    recommendations: aiOutput.recommendations ?? [],
  };

  cache.set(practiceId, { analysis, generatedAt: new Date() });
  return { analysis, cachedAt: null };
}
