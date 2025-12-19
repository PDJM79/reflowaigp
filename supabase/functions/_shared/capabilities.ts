// supabase/functions/_shared/capabilities.ts
// Capability checking utilities for edge functions

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Manager info returned by getPracticeManagersForPractice
 */
export interface ManagerInfo {
  id: string;
  name: string;
  email?: string;
}

/**
 * Get all practice managers for a practice using the role system with fallback.
 * Queries user_practice_roles for users with role_key='practice_manager',
 * then falls back to checking is_practice_manager flag for backward compatibility.
 * Results are deduplicated by user ID.
 */
export async function getPracticeManagersForPractice(
  supabase: SupabaseClient,
  practiceId: string
): Promise<ManagerInfo[]> {
  const managerMap = new Map<string, ManagerInfo>();

  // First: Try role-based lookup via user_practice_roles
  const { data: roleBasedManagers, error: roleError } = await supabase
    .from('user_practice_roles')
    .select(`
      users!inner (
        id,
        name,
        email,
        is_active
      ),
      practice_roles!inner (
        role_catalog!inner (
          role_key
        )
      )
    `)
    .eq('practice_id', practiceId)
    .eq('practice_roles.role_catalog.role_key', 'practice_manager');

  if (roleError) {
    console.warn('Role-based manager lookup failed, using fallback:', roleError.message);
  } else if (roleBasedManagers) {
    for (const item of roleBasedManagers) {
      const user = (item as any).users;
      if (user?.id && user?.is_active) {
        managerMap.set(user.id, { 
          id: user.id, 
          name: user.name || '', 
          email: user.email 
        });
      }
    }
  }

  // Second: Fallback to is_practice_manager flag
  const { data: flagBasedManagers, error: flagError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('practice_id', practiceId)
    .eq('is_practice_manager', true)
    .eq('is_active', true);

  if (flagError) {
    console.warn('Flag-based manager lookup failed:', flagError.message);
  } else if (flagBasedManagers) {
    for (const user of flagBasedManagers) {
      if (!managerMap.has(user.id)) {
        managerMap.set(user.id, { 
          id: user.id, 
          name: user.name || '', 
          email: user.email 
        });
      }
    }
  }

  const managers = Array.from(managerMap.values());
  console.log(`Found ${managers.length} practice manager(s) for practice ${practiceId}`);
  return managers;
}

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
