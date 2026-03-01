import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { complaints } from '@shared/schema';
import { eq } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────
export interface ComplaintTheme {
  name: string;
  count: number;
  severity_level: 'high' | 'medium' | 'low';
  description: string;
}

export interface RootCause {
  cause: string;
  complaints_affected: number;
}

export interface SlaPerformance {
  ack_compliance_pct: number;
  final_compliance_pct: number;
  status: 'green' | 'amber' | 'red';
  summary: string;
}

export interface Recommendation {
  action: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface RiskArea {
  description: string;
  complaint_ref: string;
  risk_level: 'high' | 'critical';
}

export interface ComplaintAnalysis {
  themes: ComplaintTheme[];
  root_causes: RootCause[];
  sla_performance: SlaPerformance;
  recommendations: Recommendation[];
  risk_areas: RiskArea[];
}

interface CacheEntry {
  analysis: ComplaintAnalysis;
  generatedAt: Date;
}

// ── In-memory cache (24 h per practice) ────────────────────────────────────
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ── Helper: name → initials ─────────────────────────────────────────────────
function toInitials(name: string | null): string {
  if (!name) return 'Unknown';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p[0].toUpperCase() + '.')
    .join('');
}

// ── Helper: calculate working days between two dates ─────────────────────
function calendarDaysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Main export ─────────────────────────────────────────────────────────────
export async function getComplaintAnalysis(
  practiceId: string,
  forceRefresh = false,
): Promise<{ analysis: ComplaintAnalysis; cachedAt: string | null }> {
  if (!forceRefresh) {
    const cached = cache.get(practiceId);
    if (cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS) {
      return { analysis: cached.analysis, cachedAt: cached.generatedAt.toISOString() };
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  // ── Fetch all complaints for the practice ─────────────────────────────────
  const rows = await db
    .select({
      id: complaints.id,
      complainantName: complaints.complainantName,
      description: complaints.description,
      category: complaints.category,
      severity: complaints.severity,
      channel: complaints.channel,
      status: complaints.status,
      slaStatus: complaints.slaStatus,
      receivedAt: complaints.receivedAt,
      ackDue: complaints.ackDue,
      ackSentAt: complaints.ackSentAt,
      finalDue: complaints.finalDue,
      finalSentAt: complaints.finalSentAt,
      closedAt: complaints.closedAt,
    })
    .from(complaints)
    .where(eq(complaints.practiceId, practiceId));

  if (rows.length === 0) {
    const empty: ComplaintAnalysis = {
      themes: [],
      root_causes: [],
      sla_performance: {
        ack_compliance_pct: 100,
        final_compliance_pct: 100,
        status: 'green',
        summary: 'No complaints recorded — maintain current standards.',
      },
      recommendations: [
        {
          action: 'Continue to log all patient feedback, even informal concerns, to build a trend picture.',
          priority: 'low',
          rationale: 'Proactive recording helps identify patterns before they escalate.',
        },
      ],
      risk_areas: [],
    };
    cache.set(practiceId, { analysis: empty, generatedAt: new Date() });
    return { analysis: empty, cachedAt: null };
  }

  // ── Compute SLA metrics locally ────────────────────────────────────────────
  const now = new Date();
  let ackOnTime = 0, ackMeasurable = 0;
  let finalOnTime = 0, finalMeasurable = 0;

  const complaintsForPrompt = rows.map(r => {
    const receivedAt = r.receivedAt ? new Date(r.receivedAt) : null;
    const ackSentAt = r.ackSentAt ? new Date(r.ackSentAt) : null;
    const finalSentAt = r.finalSentAt ? new Date(r.finalSentAt) : null;
    const ackDue = r.ackDue ? new Date(r.ackDue) : null;
    const finalDue = r.finalDue ? new Date(r.finalDue) : null;

    // ACK compliance: sent at or before ack_due
    if (ackSentAt) {
      ackMeasurable++;
      if (ackDue && ackSentAt <= ackDue) ackOnTime++;
    }

    // Final compliance: sent at or before final_due
    if (finalSentAt) {
      finalMeasurable++;
      if (finalDue && finalSentAt <= finalDue) finalOnTime++;
    }

    // Days to ACK
    const daysToAck =
      receivedAt && ackSentAt ? calendarDaysBetween(receivedAt, ackSentAt) : null;
    const ackStatus = ackSentAt
      ? daysToAck !== null && daysToAck <= 2
        ? 'acked on time'
        : 'acked late'
      : ackDue && ackDue < now
      ? 'ACK overdue'
      : 'awaiting ACK';

    // Days to final
    const daysToFinal =
      receivedAt && finalSentAt ? calendarDaysBetween(receivedAt, finalSentAt) : null;
    const finalStatus = finalSentAt
      ? daysToFinal !== null && daysToFinal <= 30
        ? `final sent in ${daysToFinal}d`
        : `final sent late (${daysToFinal}d)`
      : finalDue && finalDue < now
      ? 'final overdue'
      : 'final pending';

    // Truncate description to keep prompt size manageable
    const desc = (r.description ?? '').replace(/\s+/g, ' ').slice(0, 120);

    return [
      `[${toInitials(r.complainantName)}]`,
      r.category ?? 'unknown',
      r.severity ?? 'unknown',
      r.channel ?? 'unknown',
      r.status ?? 'open',
      `received:${r.receivedAt ? new Date(r.receivedAt).toISOString().split('T')[0] : '?'}`,
      ackStatus,
      finalStatus,
      `"${desc}"`,
    ].join(' | ');
  });

  const ackPct = ackMeasurable > 0 ? Math.round((ackOnTime / ackMeasurable) * 100) : 100;
  const finalPct = finalMeasurable > 0 ? Math.round((finalOnTime / finalMeasurable) * 100) : 100;

  const prompt = `GP practice complaints data — ${rows.length} total complaint(s):

ACK compliance (48 h target): ${ackPct}% (${ackOnTime}/${ackMeasurable} measured)
Final response compliance (30-day target): ${finalPct}% (${finalOnTime}/${finalMeasurable} measured)

Individual complaints (ref | category | severity | channel | status | dates | ACK status | final status | description):
${complaintsForPrompt.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Return a single JSON object (no markdown fences) matching this exact structure:
{
  "themes": [{ "name": string, "count": number, "severity_level": "high"|"medium"|"low", "description": string }],
  "root_causes": [{ "cause": string, "complaints_affected": number }],
  "sla_performance": { "ack_compliance_pct": number, "final_compliance_pct": number, "status": "green"|"amber"|"red", "summary": string },
  "recommendations": [{ "action": string, "priority": "high"|"medium"|"low", "rationale": string }],
  "risk_areas": [{ "description": string, "complaint_ref": string, "risk_level": "high"|"critical" }]
}`;

  // ── Call Claude ─────────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 900,
    system:
      "You are a GP practice complaints analyst for a Welsh GP surgery regulated by Health Inspectorate Wales. Analyse the patient complaints provided and return structured JSON only — no explanations, no markdown. Use patient initials only (never full names). Set sla_performance.status to 'green' if both compliance rates ≥80%, 'amber' if either is 60-79%, 'red' if either is below 60%. Identify up to 5 themes, up to 4 root causes, 3-5 recommendations ordered by priority, and any risk_areas that could escalate to the Public Services Ombudsman Wales or HIW.",
    messages: [{ role: 'user', content: prompt }],
  });

  // ── Parse response ──────────────────────────────────────────────────────────
  const block = message.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  let analysis: ComplaintAnalysis;
  const text = block.text.trim();

  try {
    analysis = JSON.parse(text);
  } catch {
    // Strip markdown fences if present
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse AI response as JSON');
    analysis = JSON.parse(match[0]);
  }

  // Override SLA pcts with our own calculated values for accuracy
  analysis.sla_performance.ack_compliance_pct = ackPct;
  analysis.sla_performance.final_compliance_pct = finalPct;
  if (ackPct >= 80 && finalPct >= 80) analysis.sla_performance.status = 'green';
  else if (ackPct >= 60 && finalPct >= 60) analysis.sla_performance.status = 'amber';
  else analysis.sla_performance.status = 'red';

  cache.set(practiceId, { analysis, generatedAt: new Date() });
  return { analysis, cachedAt: null };
}
