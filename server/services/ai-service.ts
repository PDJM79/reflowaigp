// ── AI Service ────────────────────────────────────────────────────────────────
// Wraps the Anthropic SDK for onboarding AI recommendations.
// Retry: 2 attempts with 5s backoff. Timeout: 30s. Circuit breaker: 3 failures
// → 5-minute pause. Logs token counts + duration, never session content.
import Anthropic from '@anthropic-ai/sdk';

const MODEL            = 'claude-haiku-4-5-20251001';
const MAX_TOKENS       = 1500;
const TIMEOUT_MS       = 30_000;
const MAX_RETRIES      = 2;
const RETRY_MS         = 5_000;
const CB_THRESHOLD     = 3;
const CB_RESET_MS      = 5 * 60_000;

// ── Circuit breaker (module-level singleton state) ────────────────────────────
let cbFailures  = 0;
let cbOpenedAt: number | null = null;

const cbIsOpen = (): boolean => {
  if (cbOpenedAt === null) return false;
  if (Date.now() - cbOpenedAt >= CB_RESET_MS) { cbFailures = 0; cbOpenedAt = null; return false; }
  return true;
};
const cbFail  = () => { cbFailures++; if (cbFailures >= CB_THRESHOLD) cbOpenedAt = Date.now(); };
const cbReset = () => { cbFailures = 0; cbOpenedAt = null; };

// ── Types ──────────────────────────────────────────────────────────────────────
export interface FocusArea  { task: string; reason: string; deadline: string; category: string; }
export interface QuickWin   { task: string; reason: string; timeEstimate: string; }
export interface AIPriorities {
  focusAreas:     FocusArea[];
  quickWins:      QuickWin[];
  ongoingSummary: { weeklyTasks: number; monthlyTasks: number; annualTasks: number; totalRooms: number; cleaningTasksPerDay: number; };
  personalNote:   string;
}
export interface SessionSummary {
  practiceName:    string;
  regulator:       string;
  modulesEnabled:  string[];
  inspectionData:  Record<string, any> | null;
  roomCount:       number;
  cleaningEnabled: boolean;
}

// ── Robust JSON parser ────────────────────────────────────────────────────────
// Handles markdown fences, trailing commas, and partial wrapping.
function parseAiJson(raw: string): AIPriorities {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = s.indexOf('{'); const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in AI response');
  s = s.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(s) as AIPriorities;
}

// ── Fallback recommendations (no AI required) ─────────────────────────────────
export function buildFallback(s: SessionSummary): AIPriorities {
  const focus: FocusArea[] = [
    { task: 'Complete your IPC audit', reason: 'Fundamental CQC/HIW requirement for all GP practices', deadline: 'Within 30 days', category: 'IPC' },
    { task: 'Review all clinical policies', reason: 'Up-to-date policies are required for regulatory compliance', deadline: 'Within 30 days', category: 'Policies' },
    { task: 'Verify mandatory training is current', reason: 'Training records must be current for your next inspection', deadline: 'Within 30 days', category: 'HR & Training' },
  ];
  if (s.modulesEnabled.includes('fridge_temps'))
    focus.push({ task: 'Set up daily fridge temperature recording', reason: 'Vaccine storage compliance requires daily monitoring', deadline: 'This week', category: 'Medicines Management' });
  if (s.modulesEnabled.includes('fire_safety'))
    focus.push({ task: 'Schedule annual fire risk assessment', reason: 'Legal requirement for all healthcare premises', deadline: 'Within 60 days', category: 'Health & Safety' });
  return {
    focusAreas: focus,
    quickWins: [
      { task: "Record today's fridge temperatures", reason: 'Start your daily compliance streak immediately', timeEstimate: '2 minutes' },
      { task: 'Assign tasks to team members', reason: 'Clear ownership ensures nothing is missed', timeEstimate: '15 minutes' },
      { task: 'Verify all staff can log in', reason: 'Everyone needs access before you can track compliance', timeEstimate: '10 minutes' },
    ],
    ongoingSummary: { weeklyTasks: 8, monthlyTasks: 12, annualTasks: 15, totalRooms: s.roomCount, cleaningTasksPerDay: s.cleaningEnabled ? 5 : 0 },
    personalNote: `Welcome to FitForAudit! ${s.practiceName} is set up with ${s.modulesEnabled.length} compliance modules — ready for your next ${s.regulator.toUpperCase()} inspection.`,
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildPrompt(s: SessionSummary): string {
  return `You are FitForAudit's compliance advisor for UK GP practices. Expert in CQC/HIW regulations.
A GP practice just completed onboarding. Provide a personalised JSON action plan (no markdown, no code fences):
{"focusAreas":[{"task":"string","reason":"string","deadline":"string","category":"string"}],"quickWins":[{"task":"string","reason":"string","timeEstimate":"string"}],"ongoingSummary":{"weeklyTasks":0,"monthlyTasks":0,"annualTasks":0,"totalRooms":0,"cleaningTasksPerDay":0},"personalNote":"string"}
Practice: ${s.practiceName} | Regulator: ${s.regulator.toUpperCase()} | Modules: ${s.modulesEnabled.join(', ')} | Rooms: ${s.roomCount} | Rating: ${s.inspectionData?.rating?.overall ?? 'Unknown'} | Findings: ${s.inspectionData?.keyFindings ?? 'None'}
Provide 3-5 focus areas (urgent, specific to their modules and inspection rating) and 3-5 quick wins (easy, actionable).`;
}

// ── AI Service class ──────────────────────────────────────────────────────────
class AiService {
  private client: Anthropic;
  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not configured');
    this.client = new Anthropic({ apiKey: key });
  }

  async generatePriorities(summary: SessionSummary): Promise<{ priorities: AIPriorities; fromFallback: boolean }> {
    if (cbIsOpen()) {
      console.log(JSON.stringify({ svc: 'ai-service', event: 'circuit_open', fallback: true }));
      return { priorities: buildFallback(summary), fromFallback: true };
    }
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_MS));
      try {
        const start = Date.now();
        const response = await Promise.race([
          this.client.messages.create({
            model: MODEL, max_tokens: MAX_TOKENS,
            system: buildPrompt(summary),
            messages: [{ role: 'user', content: 'Generate the personalised action plan.' }],
          }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS)),
        ]);
        const msg = response as Anthropic.Message;
        console.log(JSON.stringify({ svc: 'ai-service', event: 'success', durationMs: Date.now() - start, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens }));
        const content = msg.content[0];
        if (content.type !== 'text') throw new Error('Unexpected content type');
        cbReset();
        return { priorities: parseAiJson(content.text), fromFallback: false };
      } catch (err: any) {
        lastErr = err;
        console.log(JSON.stringify({ svc: 'ai-service', event: 'attempt_failed', attempt, message: err.message }));
        if (err?.status === 429) await new Promise(r => setTimeout(r, RETRY_MS * 2));
      }
    }
    cbFail();
    console.log(JSON.stringify({ svc: 'ai-service', event: 'all_failed', fallback: true, message: lastErr?.message }));
    return { priorities: buildFallback(summary), fromFallback: true };
  }
}

let _instance: AiService | null = null;
export const getAiService = (): AiService => {
  if (!_instance) _instance = new AiService();
  return _instance;
};
