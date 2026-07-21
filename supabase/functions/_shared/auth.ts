// supabase/functions/_shared/auth.ts
// Authentication utilities for edge functions

import { createServiceClient, createUserClientFromRequest, getEnvOrThrow } from './supabase.ts';

export type AuthedContext = {
  authUserId: string;
  practiceId: string;
  appUserId?: string;
};

/**
 * Require CRON secret for scheduled jobs (verify_jwt=false functions)
 * Throws if X-Job-Token header doesn't match EDGE_CRON_SECRET
 */
export const requireCronSecret = (req: Request): void => {
  const token = req.headers.get('X-Job-Token') ?? '';
  const expected = getEnvOrThrow('EDGE_CRON_SECRET');
  if (!token || token !== expected) {
    throw new Error('Unauthorized: invalid X-Job-Token');
  }
};

/**
 * Require valid JWT and derive practice from user record.
 * Never trust client-provided practiceId for authorization.
 */
export const requireJwtAndPractice = async (req: Request): Promise<AuthedContext> => {
  // Validate the JWT via the user/anon client (auth API, not RLS-subject).
  const supabase = createUserClientFromRequest(req);
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    throw new Error('Unauthorized: invalid JWT');
  }
  const authUserId = userData.user.id;

  // Derive practice_id via the service-role client (RLS-immune). The caller is already
  // authenticated by getUser() above; we read ONLY their own row, keyed on the verified
  // auth.uid(). All public tables are deny-all RLS, so the anon/user client sees no rows.
  const admin = createServiceClient();
  const { data: appUser, error: appUserErr } = await admin
    .from('users')
    .select('id, practice_id')
    .eq('auth_user_id', authUserId)
    .single();

  if (appUserErr || !appUser?.practice_id) {
    throw new Error('Unauthorized: user has no practice');
  }

  return {
    authUserId,
    practiceId: appUser.practice_id,
    appUserId: appUser.id,
  };
};

/**
 * Require valid JWT only (for functions that don't need practice context)
 */
export const requireJwt = async (req: Request): Promise<string> => {
  const supabase = createUserClientFromRequest(req);
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    throw new Error('Unauthorized: invalid JWT');
  }

  return userData.user.id;
};
