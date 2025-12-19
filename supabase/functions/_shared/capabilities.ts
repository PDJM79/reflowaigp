// supabase/functions/_shared/capabilities.ts
// Capability checking utilities for edge functions

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type Capability = 
  | 'view_tasks'
  | 'manage_tasks'
  | 'view_users'
  | 'manage_users'
  | 'view_policies'
  | 'manage_policies'
  | 'acknowledge_policies'
  | 'view_reports'
  | 'run_reports'
  | 'view_incidents'
  | 'manage_incidents'
  | 'view_complaints'
  | 'manage_complaints'
  | 'view_cleaning'
  | 'manage_cleaning'
  | 'view_fridge'
  | 'manage_fridge'
  | 'view_fire_safety'
  | 'manage_fire_safety'
  | 'view_ipc'
  | 'manage_ipc'
  | 'view_hr'
  | 'manage_hr'
  | 'view_claims'
  | 'manage_claims'
  | 'approve_governance';

/**
 * Check if a user has a specific capability via the database function.
 * This uses the has_capability() database function which handles:
 * - Role-based capabilities from role_catalog
 * - Practice-specific capability overrides
 * - Fallback to is_practice_manager flag for backward compatibility
 * - Master user privileges
 */
export async function checkCapability(
  supabase: SupabaseClient,
  authUserId: string,
  capability: Capability
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_capability', {
    _user_id: authUserId,
    _capability: capability,
  });

  if (error) {
    console.error('Error checking capability:', error);
    return false;
  }

  return data === true;
}

/**
 * Require a specific capability, throwing an error if not authorized.
 * Use this in edge functions for authorization checks.
 */
export async function requireCapability(
  supabase: SupabaseClient,
  authUserId: string,
  capability: Capability,
  errorMessage?: string
): Promise<void> {
  const hasCapability = await checkCapability(supabase, authUserId, capability);
  
  if (!hasCapability) {
    throw new Error(errorMessage || `Unauthorized: ${capability} capability required`);
  }
}
