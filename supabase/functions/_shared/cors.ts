// supabase/functions/_shared/cors.ts
// Configurable CORS with environment-based allowlist

const parseAllowedOrigins = (): string[] => {
  const raw = Deno.env.get('EDGE_ALLOWED_ORIGINS') ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export const buildCorsHeaders = (req: Request): HeadersInit => {
  const origin = req.headers.get('Origin');
  const allowed = parseAllowedOrigins();

  // Check if origin is a Lovable preview domain
  const isLovablePreview = origin?.endsWith('.lovableproject.com');

  // Check if origin is a Lovable production domain
  const isLovableProduction = origin?.endsWith('.lovable.app');

  // Allow localhost for dev
  const isLocalhost =
    origin?.startsWith('http://localhost:') ||
    origin?.startsWith('http://127.0.0.1:');

  // Allow if in explicit allowlist
  const isInAllowlist = allowed.includes(origin ?? '');

  // Determine if we should allow this origin
  const shouldAllow = isLovablePreview || isLovableProduction || isLocalhost || isInAllowlist;

  console.log(`CORS check: origin=${origin}, allowed=${shouldAllow}`);

  const headers: HeadersInit = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-job-token, svix-id, svix-timestamp, svix-signature',
  };

  if (shouldAllow && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
};

export const handleOptions = (req: Request): Response | null => {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { headers: buildCorsHeaders(req) });
};

export const withCors = (req: Request, res: Response): Response => {
  const headers = new Headers(res.headers);
  const cors = buildCorsHeaders(req);
  Object.entries(cors).forEach(([k, v]) => headers.set(k, String(v)));
  return new Response(res.body, { status: res.status, headers });
};

export const jsonResponse = (
  req: Request,
  data: unknown,
  status = 200
): Response => {
  return withCors(
    req,
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
};

export const errorResponse = (
  req: Request,
  message: string,
  status = 400
): Response => {
  return jsonResponse(req, { ok: false, error: message }, status);
};
