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

/**
 * User info returned by getUsersWithCapability
 */
export interface UserWithCapability {
  id: string;
  name: string;
  email?: string;
}

/**
 * Get all users in a practice who have a specific capability.
 * This checks both role-based capabilities (from role_catalog.default_capabilities)
 * and practice-specific capability overrides.
 */
export async function getUsersWithCapability(
  supabase: SupabaseClient,
  practiceId: string,
  capability: Capability
): Promise<UserWithCapability[]> {
  const userMap = new Map<string, UserWithCapability>();

  // Query all user_practice_roles for the practice, joining to get role capabilities
  const { data: roleAssignments, error: roleError } = await supabase
    .from('user_practice_roles')
    .select(`
      user_id,
      users!inner (
        id,
        name,
        email,
        is_active
      ),
      practice_roles!inner (
        id,
        role_catalog!inner (
          default_capabilities
        )
      )
    `)
    .eq('practice_id', practiceId);

  if (roleError) {
    console.warn('Role-based capability lookup failed:', roleError.message);
  } else if (roleAssignments) {
    for (const assignment of roleAssignments) {
      const user = (assignment as any).users;
      const practiceRole = (assignment as any).practice_roles;
      const roleCatalog = practiceRole?.role_catalog;
      
      if (!user?.id || !user?.is_active) continue;
      
      // Check if this role has the required capability in default_capabilities
      const defaultCapabilities: string[] = roleCatalog?.default_capabilities || [];
      if (defaultCapabilities.includes(capability)) {
        userMap.set(user.id, {
          id: user.id,
          name: user.name || '',
          email: user.email
        });
        continue;
      }

      // Check for capability overrides on the practice_role
      const { data: overrides } = await supabase
        .from('practice_role_capabilities')
        .select('capability, is_granted')
        .eq('practice_role_id', practiceRole.id)
        .eq('capability', capability);

      if (overrides?.some(o => o.is_granted)) {
        userMap.set(user.id, {
          id: user.id,
          name: user.name || '',
          email: user.email
        });
      }
    }
  }

  // Fallback: Check is_practice_manager flag for approve_governance capability
  if (capability === 'approve_governance') {
    const { data: flagBasedManagers, error: flagError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('practice_id', practiceId)
      .eq('is_practice_manager', true)
      .eq('is_active', true);

    if (!flagError && flagBasedManagers) {
      for (const user of flagBasedManagers) {
        if (!userMap.has(user.id)) {
          userMap.set(user.id, {
            id: user.id,
            name: user.name || '',
            email: user.email
          });
        }
      }
    }
  }

  const users = Array.from(userMap.values());
  console.log(`Found ${users.length} user(s) with '${capability}' capability for practice ${practiceId}`);
  return users;
}

/**
 * Ensure a user has a practice role assignment in user_practice_roles.
 * Creates practice_roles entry if needed, then creates user_practice_roles entry.
 * This should be called when creating new users to ensure they have proper role assignments.
 */
export async function ensureUserPracticeRole(
  supabase: SupabaseClient,
  userId: string,
  practiceId: string,
  roleKey: string
): Promise<void> {
  console.log(`[ensureUserPracticeRole] Assigning role '${roleKey}' to user ${userId} for practice ${practiceId}`);

  // 1. Get the role_catalog entry for this role_key
  const { data: roleCatalog, error: catalogError } = await supabase
    .from('role_catalog')
    .select('id')
    .eq('role_key', roleKey)
    .single();

  if (catalogError || !roleCatalog) {
    console.warn(`[ensureUserPracticeRole] Role '${roleKey}' not found in role_catalog:`, catalogError?.message);
    return;
  }

  // 2. Ensure practice_roles entry exists (create if needed)
  const { data: practiceRole, error: practiceRoleError } = await supabase
    .from('practice_roles')
    .select('id')
    .eq('practice_id', practiceId)
    .eq('role_catalog_id', roleCatalog.id)
    .single();

  if (practiceRoleError?.code === 'PGRST116' || !practiceRole) {
    // No practice_role exists, create one
    const { data: newPracticeRole, error: createError } = await supabase
      .from('practice_roles')
      .insert({ practice_id: practiceId, role_catalog_id: roleCatalog.id })
      .select('id')
      .single();

    if (createError) {
      console.error(`[ensureUserPracticeRole] Failed to create practice_role:`, createError.message);
      return;
    }
    practiceRole = newPracticeRole;
  }

  if (!practiceRole) {
    console.error(`[ensureUserPracticeRole] Could not get or create practice_role for role '${roleKey}'`);
    return;
  }

  // 3. Create user_practice_roles entry (upsert to handle duplicates)
  const { error: assignError } = await supabase
    .from('user_practice_roles')
    .upsert(
      {
        user_id: userId,
        practice_id: practiceId,
        practice_role_id: practiceRole.id
      },
      { onConflict: 'user_id,practice_role_id' }
    );

  if (assignError) {
    console.error(`[ensureUserPracticeRole] Failed to assign role:`, assignError.message);
    return;
  }

  console.log(`[ensureUserPracticeRole] Successfully assigned role '${roleKey}' to user ${userId}`);
}
