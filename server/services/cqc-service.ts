// ── CQC / HIW Practice Lookup Service ────────────────────────────────────────
// Implements retry with exponential backoff, request timeout, circuit breaker,
// and structured errors. HIW (Wales) has no public API — manual entry only.

const CQC_BASE = 'https://api.cqc.org.uk/public/v1';
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const CIRCUIT_THRESHOLD = 5;   // consecutive failures before opening circuit
const CIRCUIT_RESET_MS  = 60_000;

// ── Structured error ──────────────────────────────────────────────────────────
export class CqcServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'UNAVAILABLE' | 'TIMEOUT' | 'CIRCUIT_OPEN' | 'INVALID_RESPONSE',
    public readonly correlationId: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'CqcServiceError';
  }
}

// ── Circuit breaker state ─────────────────────────────────────────────────────
let circuitFailures = 0;
let circuitOpenedAt: number | null = null;

function isCircuitOpen(): boolean {
  if (circuitOpenedAt === null) return false;
  if (Date.now() - circuitOpenedAt >= CIRCUIT_RESET_MS) {
    // Half-open: allow one probe through
    circuitOpenedAt = null;
    circuitFailures = 0;
    return false;
  }
  return true;
}

function recordFailure(): void {
  circuitFailures++;
  if (circuitFailures >= CIRCUIT_THRESHOLD) {
    circuitOpenedAt = Date.now();
  }
}

function recordSuccess(): void {
  circuitFailures = 0;
  circuitOpenedAt = null;
}

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, correlationId: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'X-Correlation-ID': correlationId },
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new CqcServiceError('CQC API request timed out', 'TIMEOUT', correlationId);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Retry with exponential backoff ────────────────────────────────────────────
async function fetchWithRetry(url: string, correlationId: string): Promise<Response> {
  let lastError: Error = new Error('Unknown error');
  const delays = [1000, 2000, 4000]; // 1s → 2s → 4s

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, correlationId);
      return res;
    } catch (err: any) {
      lastError = err;
      // Don't retry timeouts or circuit-open errors immediately
      if (err instanceof CqcServiceError && err.code === 'TIMEOUT') {
        recordFailure();
        break;
      }
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, delays[attempt]));
      }
    }
  }
  recordFailure();
  throw lastError;
}

// ── Public types ─────────────────────────────────────────────────────────────
export interface CqcRating {
  overall: string | null;
  safe: string | null;
  effective: string | null;
  caring: string | null;
  responsive: string | null;
  wellLed: string | null;
}

export interface PracticeLookupResult {
  locationId: string;
  name: string;
  address: string;
  postcode: string;
  lastInspectionDate: string | null;
  registrationStatus: string;
  rating: CqcRating;
  providerName: string | null;
}

// ── Parse CQC rating from API response ───────────────────────────────────────
function parseRatings(raw: any): CqcRating {
  if (!raw || typeof raw !== 'object') {
    return { overall: null, safe: null, effective: null, caring: null, responsive: null, wellLed: null };
  }
  const find = (key: string) =>
    raw?.overall?.rating ??
    raw?.currentRatings?.[key]?.rating ??
    null;

  return {
    overall:   raw?.currentRatings?.overall?.rating ?? null,
    safe:      raw?.currentRatings?.safe?.rating ?? null,
    effective: raw?.currentRatings?.effective?.rating ?? null,
    caring:    raw?.currentRatings?.caring?.rating ?? null,
    responsive:raw?.currentRatings?.responsive?.rating ?? null,
    wellLed:   raw?.currentRatings?.['well-led']?.rating ?? null,
  };
}

// ── Build address string from CQC location object ────────────────────────────
function buildAddress(loc: any): string {
  const parts: string[] = [
    loc?.postalAddressLine1,
    loc?.postalAddressLine2,
    loc?.postalAddressTownCity,
    loc?.postalAddressCounty,
  ].filter(Boolean);
  return parts.join(', ');
}

// ── Main: look up a practice by CQC location ID or provider ID ───────────────
export async function lookupPractice(
  registrationNumber: string,
): Promise<PracticeLookupResult> {
  const correlationId = `cqc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (isCircuitOpen()) {
    throw new CqcServiceError(
      'CQC API is temporarily unavailable. Please try again in 60 seconds or enter your details manually.',
      'CIRCUIT_OPEN',
      correlationId,
    );
  }

  // Normalise: strip spaces / dashes, upper-case
  const ref = registrationNumber.trim().replace(/\s+/g, '');

  // Attempt 1: treat as CQC location ID (format: 1-XXXXXXXXX)
  const locationUrl = `${CQC_BASE}/locations/${encodeURIComponent(ref)}`;
  let res = await fetchWithRetry(locationUrl, correlationId);

  // Attempt 2: treat as provider ID
  if (res.status === 404) {
    const providerUrl = `${CQC_BASE}/providers/${encodeURIComponent(ref)}`;
    res = await fetchWithRetry(providerUrl, correlationId);
    if (res.status === 404) {
      recordFailure();
      throw new CqcServiceError(
        `No CQC registration found for "${registrationNumber}". Check the reference and try again, or enter details manually.`,
        'NOT_FOUND',
        correlationId,
        404,
      );
    }
  }

  if (!res.ok) {
    recordFailure();
    throw new CqcServiceError(
      `CQC API returned an error (HTTP ${res.status}). Please try again or enter details manually.`,
      'UNAVAILABLE',
      correlationId,
      res.status,
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    recordFailure();
    throw new CqcServiceError('CQC API returned an unreadable response.', 'INVALID_RESPONSE', correlationId);
  }

  recordSuccess();

  // Handle location vs provider response shapes
  const loc = data?.location ?? data?.provider ?? data;

  return {
    locationId:          loc?.locationId ?? loc?.providerId ?? ref,
    name:                loc?.locationName ?? loc?.name ?? loc?.providerName ?? 'Unknown',
    address:             buildAddress(loc),
    postcode:            loc?.postalCode ?? '',
    lastInspectionDate:  loc?.lastInspection?.date ?? loc?.inspections?.[0]?.date ?? null,
    registrationStatus:  loc?.registrationStatus ?? 'Unknown',
    rating:              parseRatings(loc),
    providerName:        loc?.providerName ?? null,
  };
}

// ── Health check ─────────────────────────────────────────────────────────────
export function getCqcCircuitStatus(): { open: boolean; failures: number; openedAt: string | null } {
  return {
    open:     isCircuitOpen(),
    failures: circuitFailures,
    openedAt: circuitOpenedAt ? new Date(circuitOpenedAt).toISOString() : null,
  };
}
