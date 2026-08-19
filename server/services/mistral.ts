/**
 * mistral.ts — the shared Mistral client for the Express server. ONE provider,
 * ONE model string, ONE retry policy.
 *
 * Ported from graig-escapes/server/src/utils/mistral.ts (Aug 2026), kept close to
 * it so a fix in one repo is a readable diff in the other.
 *
 * THREE DELIBERATE DIVERGENCES from that reference, all forced:
 *
 *   1  RUNTIME. The reference writes ai_usage through a bare `pg` helper. This
 *      repo is Drizzle over a pg pool, so logUsage writes raw SQL through the
 *      exported `pool` in server/db.ts. Telemetry has no business depending on
 *      the ORM's generated types, and the raw insert stays a readable diff
 *      against the reference.
 *
 *   2  NO TOOL CALLING. The reference carries a tools / tool_calls surface with
 *      the tool_call_id rules Mistral enforces. Nothing in this repo calls a
 *      tool, so none of it came across. Re-port from the reference if a call
 *      site ever needs it — do not add it speculatively.
 *
 *   3  SINGLE-TURN ONLY. All five call sites are one system prompt plus one user
 *      message. Parity with the New-school Deno port, which dropped multi-turn
 *      for the same reason.
 *
 * PROVIDER HISTORY: this replaced a direct Anthropic SDK client (claude-haiku)
 * across five server modules. That provider processed data outside the EU. This
 * platform holds UK GP practice compliance records, and Mistral serves the EU.
 *
 * (The retired hostname and key name are spelled out nowhere in server/ on
 * purpose: CI greps for them, so writing one in a comment fails the build.)
 *
 * NO FAILOVER, deliberately. A second provider is a second processing region and
 * a second DPA; falling back to one silently, under load, is exactly the failure
 * mode residency guarantees exist to prevent. When Mistral is unavailable this
 * module gives up cleanly and the caller says so — see mapModelError.
 */

import { pool } from '../db';

// EU endpoint — determines UK GDPR processing region. Mistral's US region is
// opt-in via a separate hostname, and CI fails the build if that hostname
// reaches source. Do not change without DPA review.
export const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/** The ONE model string. Never inline a model literal at a call site. */
export const MISTRAL_MODEL = 'mistral-large-latest';

/** Render env var name. Never VITE_-prefixed — this key is server-only. */
export const MISTRAL_API_KEY_ENV = 'MISTRAL_API_KEY';

export const PROVIDER = 'mistral';
/** Written to ai_usage.repo — the table shape is shared across repos. */
export const REPO = 'reflowaigp';

// Rate card, USD per 1M tokens. Copied from the reference port (Mistral's public
// API pricing page, read 14 Aug 2026 — Standard tier, Mistral Large 3). Used only
// to stamp ai_usage.est_cost_usd; an estimate for trend-watching, never a billing
// figure. Mistral bills in EUR.
//
// The URL is spelled out in prose rather than written as a hostname on purpose:
// scripts/checkAiProvider.mjs allows exactly one Mistral host, and a docs link in
// a comment is otherwise indistinguishable from a changed endpoint.
const USD_PER_MTOK_INPUT = 0.5;
const USD_PER_MTOK_OUTPUT = 1.5;

// Retry policy: at most 2 retries (3 attempts), 1s then 2s. Transient only.
const MAX_RETRIES = 2;
const BACKOFF_MS = [1_000, 2_000];
const REQUEST_TIMEOUT_MS = 60_000;

// ── Failure vocabulary ───────────────────────────────────────────────────────
// Thrown as Error.message, mapped to {status, message, error_type} by
// mapModelError and recorded verbatim in ai_usage.error_type. Machine-facing,
// never user-facing.
export const MODEL_RATE_LIMIT = 'rate_limit';
export const MODEL_UNAVAILABLE = 'unavailable';
export const MODEL_TIMEOUT = 'timeout';
export const MODEL_AUTH = 'auth';
export const MODEL_CREDITS = 'credits';
export const MODEL_BAD_REQUEST = 'bad_request';
export const MODEL_EMPTY = 'empty_content';
export const MODEL_NOT_CONFIGURED = 'not_configured';

/**
 * The failure line for END USERS. Every failure mode lands here: a practice
 * manager cannot act on "402 credits exhausted" and should not be shown provider
 * internals. The specific cause goes to the server log — see logAdminCause.
 */
export const AI_UNAVAILABLE = 'AI is unavailable, please try again shortly.';

/**
 * OPERATOR-ONLY failure copy — server logs and admin responses, never a plain
 * user-facing body. Three of these are things only whoever owns the Render
 * service can fix (auth = wrong secret, credits = topped-out spending cap,
 * bad_request = a code defect), and "try again shortly" describes a problem that
 * will never clear on its own.
 */
const ADMIN_CAUSE: Record<string, string> = {
  [MODEL_RATE_LIMIT]: 'Mistral rate limit. The 2 retries are already spent — try again in a minute.',
  [MODEL_UNAVAILABLE]: 'Mistral is unavailable (provider outage or network failure). The 2 retries are already spent.',
  [MODEL_TIMEOUT]: 'Mistral did not respond within 60s. The 2 retries are already spent.',
  [MODEL_AUTH]: `Mistral rejected the API key — check the ${MISTRAL_API_KEY_ENV} environment variable on Render. This will not clear on its own.`,
  [MODEL_CREDITS]: 'Mistral credits or the pay-as-you-go spending cap are exhausted — check the Mistral console. This will not clear on its own.',
  [MODEL_BAD_REQUEST]: 'Mistral rejected the request. That is a code or payload defect, not a transient failure — check the server logs.',
  [MODEL_EMPTY]: 'Mistral returned empty content.',
  [MODEL_NOT_CONFIGURED]: `${MISTRAL_API_KEY_ENV} is not set on this server. Nothing will work until it is.`,
};

/** Read the key. Returns null when it is unset — callers return 503. */
export function getModelApiKey(): string | null {
  return process.env[MISTRAL_API_KEY_ENV] || null;
}

/** Log the operator-facing cause where Render surfaces it to whoever owns the service. */
export function logAdminCause(tag: string, errorType: string): void {
  const cause = ADMIN_CAUSE[errorType];
  if (cause) console.error(`[${tag}] AI unavailable — ${cause}`);
}

/**
 * Map a thrown model error to the {status, message} callers return, plus the
 * error_type for logging.
 *
 * `isAdmin` gates COPY ONLY — the status, the error_type and the ai_usage row
 * are identical either way, so nothing about who is looking changes what
 * happened or what gets recorded.
 */
export function mapModelError(
  error: unknown,
  isAdmin = false,
): { status: number; message: string; error_type: string } {
  const m = error instanceof Error ? error.message : '';
  const known = [
    MODEL_RATE_LIMIT, MODEL_UNAVAILABLE, MODEL_TIMEOUT, MODEL_AUTH,
    MODEL_CREDITS, MODEL_BAD_REQUEST, MODEL_EMPTY, MODEL_NOT_CONFIGURED,
  ];
  const error_type = known.includes(m) ? m : 'internal';
  // 429 is the one status worth passing through — clients and proxies treat it
  // as "back off", which is the correct behaviour here. Everything else degrades
  // to 503: the AI panel is unavailable, the rest of the app is fine.
  const status = error_type === MODEL_RATE_LIMIT ? 429 : 503;
  const cause = isAdmin ? ADMIN_CAUSE[error_type] : undefined;
  return {
    status,
    message: cause ? `AI unavailable — ${cause}` : AI_UNAVAILABLE,
    error_type,
  };
}

export interface CallOpts {
  system: string;
  user: string;
  maxTokens: number;
  /** true → response_format json_object; false/omitted → prose. */
  jsonMode?: boolean;
  temperature?: number;
  /**
   * ai_usage.route — the calling module's name. Omit and the row still writes,
   * stamped "unknown", which is worse telemetry but never an error.
   */
  route?: string;
}

export interface Usage {
  input_tokens: number | null;
  output_tokens: number | null;
  cached_tokens: number | null;
}

const EMPTY_USAGE: Usage = { input_tokens: null, output_tokens: null, cached_tokens: null };

type Attempt =
  | { ok: true; content: string; usage: Usage }
  | { ok: false; error: Error; retryable: boolean; usage: Usage };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Read the OpenAI-shaped usage block Mistral returns. */
export function readUsage(data: unknown): Usage {
  const u = (data as { usage?: Record<string, unknown> } | null)?.usage ?? {};
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const details = u.prompt_tokens_details as { cached_tokens?: unknown } | undefined;
  return {
    input_tokens: n(u.prompt_tokens),
    output_tokens: n(u.completion_tokens),
    cached_tokens: n(details?.cached_tokens),
  };
}

/** Estimate only — see the rate-card note above. Cached input is billed as input. */
export function estimateCostUsd(usage: Usage): string {
  const input = (usage.input_tokens ?? 0) * (USD_PER_MTOK_INPUT / 1_000_000);
  const output = (usage.output_tokens ?? 0) * (USD_PER_MTOK_OUTPUT / 1_000_000);
  return (input + output).toFixed(8);
}

/**
 * Classify a non-2xx response. Retry ONLY 429 and 503 — every other 4xx is a
 * request we would re-send unchanged and get the same answer to, so retrying
 * just burns the budget and delays the error the caller needs to see.
 */
export function classifyStatus(status: number): { error: Error; retryable: boolean } {
  if (status === 429) return { error: new Error(MODEL_RATE_LIMIT), retryable: true };
  if (status === 503) return { error: new Error(MODEL_UNAVAILABLE), retryable: true };
  const type = status === 401 || status === 403 ? MODEL_AUTH
    : status === 402 ? MODEL_CREDITS
    : status >= 400 && status < 500 ? MODEL_BAD_REQUEST
    : MODEL_UNAVAILABLE;
  return { error: new Error(type), retryable: false };
}

function requestBody(model: string, opts: CallOpts): string {
  return JSON.stringify({
    model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens,
    ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });
}

/** One HTTP attempt. Never throws — classifies instead, so the caller owns retry. */
async function attemptOnce(apiKey: string, model: string, opts: CallOpts): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: requestBody(model, opts),
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError = our own timeout. Anything else here is a transport failure,
    // which is the same class of problem and gets the same retry budget.
    const timedOut = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      error: new Error(timedOut ? MODEL_TIMEOUT : MODEL_UNAVAILABLE),
      retryable: true,
      usage: EMPTY_USAGE,
    };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[Mistral] error ${res.status}:`, body.slice(0, 500));
    const { error, retryable } = classifyStatus(res.status);
    return { ok: false, error, retryable, usage: EMPTY_USAGE };
  }

  const data = await res.json().catch(() => null);
  const usage = readUsage(data);
  const raw = (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)
    ?.choices?.[0]?.message?.content;
  const content = typeof raw === 'string' ? raw.trim() : '';
  // Whitespace-only content would otherwise reach the UI as a blank 200.
  if (!content) return { ok: false, error: new Error(MODEL_EMPTY), retryable: false, usage };
  return { ok: true, content, usage };
}

/**
 * The one model call. Retries transient failures (429 / 503 / timeout) at most
 * twice with 1s then 2s backoff, then gives up. Writes exactly one ai_usage row
 * per call, success or failure.
 *
 * Throws an Error whose message is one of the MODEL_* constants. Callers pass it
 * to mapModelError; nothing here reaches the client unhandled.
 */
export async function callModel(
  apiKey: string,
  opts: CallOpts,
): Promise<{ content: string; model: string; usage: Usage }> {
  const model = process.env.MISTRAL_MODEL || MISTRAL_MODEL;
  const started = Date.now();
  let last: Attempt = {
    ok: false, error: new Error(MODEL_UNAVAILABLE), retryable: false, usage: EMPTY_USAGE,
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(BACKOFF_MS[attempt - 1]);
    last = await attemptOnce(apiKey, model, opts);
    if (last.ok) {
      await logUsage({
        route: opts.route,
        model,
        usage: last.usage,
        latency_ms: Date.now() - started,
        success: true,
        error_type: null,
      });
      return { content: last.content, model, usage: last.usage };
    }
    if (!last.retryable) break;
  }

  const error = last.ok ? new Error(MODEL_UNAVAILABLE) : last.error;
  await logUsage({
    route: opts.route,
    model,
    usage: last.usage,
    latency_ms: Date.now() - started,
    success: false,
    error_type: error.message,
  });
  throw error;
}

/**
 * Best-effort usage row. NEVER fails the caller's request — the insert is tried
 * and any error logged, but swallowed. Telemetry that can break the feature it
 * measures is worse than no telemetry, and here it would be the ONLY thing that
 * could break an otherwise working AI call.
 */
export async function logUsage(row: {
  route?: string;
  model: string;
  usage: Usage;
  latency_ms: number;
  success: boolean;
  error_type: string | null;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO ai_usage
         (repo, route, provider, model, input_tokens, output_tokens,
          cached_tokens, latency_ms, success, error_type, est_cost_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        REPO,
        row.route ?? 'unknown',
        PROVIDER,
        row.model,
        row.usage.input_tokens,
        row.usage.output_tokens,
        row.usage.cached_tokens,
        row.latency_ms,
        row.success,
        // The table CHECKs that a failure names its cause. Coerced rather than
        // trusted: a null here would make the row bounce and lose the failure
        // silently, which is the one row worth keeping.
        row.success ? null : row.error_type || 'internal',
        estimateCostUsd(row.usage),
      ],
    );
  } catch (err) {
    console.error('[Mistral] ai_usage insert failed:', err instanceof Error ? err.message : err);
  }
}
