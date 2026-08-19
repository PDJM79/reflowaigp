// ── AI Service ────────────────────────────────────────────────────────────────
// Onboarding AI recommendations, on the shared Mistral client.
//
// Retry and timeout belong to services/mistral.ts (2 retries, 1s/2s backoff,
// 60s cap) — ONE retry policy per process, not one per module. Stacking this
// module's old loop on top of the shared one would have meant 9 attempts and a
// multi-minute worst case on a screen a user is sat waiting on.
//
// What stays here is what the shared client has no opinion about: the circuit
// breaker (3 failures → 5-minute pause) and the deterministic fallback plan.
// Logs token counts + duration, never session content.
import { callModel, getModelApiKey, MODEL_NOT_CONFIGURED } from './mistral';

const MAX_TOKENS       = 1500;
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
  private apiKey: string;
  constructor() {
    const key = getModelApiKey();
    if (!key) throw new Error(MODEL_NOT_CONFIGURED);
    this.apiKey = key;
  }

  async generatePriorities(summary: SessionSummary): Promise<{ priorities: AIPriorities; fromFallback: boolean }> {
    if (cbIsOpen()) {
      console.log(JSON.stringify({ svc: 'ai-service', event: 'circuit_open', fallback: true }));
      return { priorities: buildFallback(summary), fromFallback: true };
    }
    try {
      const start = Date.now();
      const { content, usage } = await callModel(this.apiKey, {
        route: 'ai-service',
        maxTokens: MAX_TOKENS,
        system: buildPrompt(summary),
        user: 'Generate the personalised action plan.',
      });
      console.log(JSON.stringify({ svc: 'ai-service', event: 'success', durationMs: Date.now() - start, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens }));
      cbReset();
      return { priorities: parseAiJson(content), fromFallback: false };
    } catch (err: any) {
      // callModel has already spent its retry budget and written the ai_usage
      // row by the time we get here, so one failure here is a final failure.
      cbFail();
      console.log(JSON.stringify({ svc: 'ai-service', event: 'all_failed', fallback: true, message: err?.message }));
      return { priorities: buildFallback(summary), fromFallback: true };
    }
  }
}

let _instance: AiService | null = null;
export const getAiService = (): AiService => {
  if (!_instance) _instance = new AiService();
  return _instance;
};
