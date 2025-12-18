// supabase/functions/_shared/supabase.ts
// Centralized Supabase client creation for edge functions

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

export const getEnvOrThrow = (key: string): string => {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

export const createServiceClient = (): SupabaseClient => {
  const url = getEnvOrThrow('SUPABASE_URL');
  const key = getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
};

export const createUserClientFromRequest = (req: Request): SupabaseClient => {
  const url = getEnvOrThrow('SUPABASE_URL');
  const anon = getEnvOrThrow('SUPABASE_ANON_KEY');

  // Forward Authorization bearer token so RLS applies.
  const authHeader = req.headers.get('Authorization') ?? '';

  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
};
