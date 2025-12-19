import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePracticeSelection } from './usePracticeSelection';
import type { 
  RoleCatalogEntry, 
  PracticeRole, 
  PracticeRoleCapability, 
  Capability,
  RoleCategory 
} from '@/types/roles';

interface UseRoleCatalogReturn {
  // Global catalog
  roleCatalog: RoleCatalogEntry[];
  catalogLoading: boolean;
  catalogError: string | null;
  
  // Practice-specific roles
  practiceRoles: PracticeRole[];
  practiceRolesLoading: boolean;
  practiceRolesError: string | null;
  
  // Actions
  fetchRoleCatalog: () => Promise<void>;
  fetchPracticeRoles: () => Promise<void>;
  enableRole: (roleCatalogId: string) => Promise<{ success: boolean; error?: string }>;
  disableRole: (practiceRoleId: string) => Promise<{ success: boolean; error?: string }>;
  addCapabilityOverride: (practiceRoleId: string, capability: Capability) => Promise<{ success: boolean; error?: string }>;
  removeCapabilityOverride: (practiceRoleId: string, capability: Capability) => Promise<{ success: boolean; error?: string }>;
  
  // Helpers
  getRolesByCategory: (category: RoleCategory) => RoleCatalogEntry[];
  getActivePracticeRoles: () => PracticeRole[];
  getPracticeRoleForCatalogEntry: (roleCatalogId: string) => PracticeRole | undefined;
}

export function useRoleCatalog(): UseRoleCatalogReturn {
  const { selectedPracticeId } = usePracticeSelection();
  
  // Global catalog state
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  
  // Practice roles state
  const [practiceRoles, setPracticeRoles] = useState<PracticeRole[]>([]);
  const [practiceRolesLoading, setPracticeRolesLoading] = useState(true);
  const [practiceRolesError, setPracticeRolesError] = useState<string | null>(null);

  // Fetch global role catalog
  const fetchRoleCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      setCatalogError(null);

      const { data, error } = await supabase
        .from('role_catalog')
        .select('*')
        .order('category')
        .order('display_name');

      if (error) {
        console.error('Error fetching role catalog:', error);
        setCatalogError('Failed to fetch role catalog');
        return;
      }

      // Transform data to match our types
      const transformedData: RoleCatalogEntry[] = (data || []).map((role: any) => ({
        id: role.id,
        role_key: role.role_key,
        display_name: role.display_name,
        category: role.category as RoleCategory,
        default_capabilities: (role.default_capabilities || []) as Capability[],
        description: role.description,
        created_at: role.created_at,
        updated_at: role.updated_at,
      }));

      setRoleCatalog(transformedData);
    } catch (err) {
      console.error('Error in fetchRoleCatalog:', err);
      setCatalogError('An unexpected error occurred');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Fetch practice-specific roles
  const fetchPracticeRoles = useCallback(async () => {
    if (!selectedPracticeId) {
      setPracticeRoles([]);
      setPracticeRolesLoading(false);
      return;
    }

    try {
      setPracticeRolesLoading(true);
      setPracticeRolesError(null);

      const { data, error } = await supabase
        .from('practice_roles')
        .select(`
          id,
          practice_id,
          role_catalog_id,
          is_active,
          created_at,
          updated_at,
          role_catalog:role_catalog_id (
            id,
            role_key,
            display_name,
            category,
            default_capabilities,
            description,
            created_at,
            updated_at
          )
        `)
        .eq('practice_id', selectedPracticeId);

      if (error) {
        console.error('Error fetching practice roles:', error);
        setPracticeRolesError('Failed to fetch practice roles');
        return;
      }

      const transformedData: PracticeRole[] = (data || []).map((role: any) => ({
        id: role.id,
        practice_id: role.practice_id,
        role_catalog_id: role.role_catalog_id,
        is_active: role.is_active,
        created_at: role.created_at,
        updated_at: role.updated_at,
        role_catalog: role.role_catalog ? {
          id: role.role_catalog.id,
          role_key: role.role_catalog.role_key,
          display_name: role.role_catalog.display_name,
          category: role.role_catalog.category as RoleCategory,
          default_capabilities: (role.role_catalog.default_capabilities || []) as Capability[],
          description: role.role_catalog.description,
          created_at: role.role_catalog.created_at,
          updated_at: role.role_catalog.updated_at,
        } : undefined,
      }));

      setPracticeRoles(transformedData);
    } catch (err) {
      console.error('Error in fetchPracticeRoles:', err);
      setPracticeRolesError('An unexpected error occurred');
    } finally {
      setPracticeRolesLoading(false);
    }
  }, [selectedPracticeId]);

  // Enable a role from the catalog for this practice
  const enableRole = useCallback(async (roleCatalogId: string): Promise<{ success: boolean; error?: string }> => {
    if (!selectedPracticeId) {
      return { success: false, error: 'No practice selected' };
    }

    try {
      // Check if already exists
      const existing = practiceRoles.find(r => r.role_catalog_id === roleCatalogId);
      
      if (existing) {
        // Reactivate if inactive
        if (!existing.is_active) {
          const { error } = await supabase
            .from('practice_roles')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (error) {
            return { success: false, error: error.message };
          }
        }
      } else {
        // Create new practice role
        const { error } = await supabase
          .from('practice_roles')
          .insert({
            practice_id: selectedPracticeId,
            role_catalog_id: roleCatalogId,
            is_active: true,
          });

        if (error) {
          return { success: false, error: error.message };
        }
      }

      await fetchPracticeRoles();
      return { success: true };
    } catch (err) {
      console.error('Error enabling role:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [selectedPracticeId, practiceRoles, fetchPracticeRoles]);

  // Disable a role for this practice
  const disableRole = useCallback(async (practiceRoleId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('practice_roles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', practiceRoleId);

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchPracticeRoles();
      return { success: true };
    } catch (err) {
      console.error('Error disabling role:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [fetchPracticeRoles]);

  // Add a capability override for a practice role
  const addCapabilityOverride = useCallback(async (
    practiceRoleId: string, 
    capability: Capability
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('practice_role_capabilities')
        .insert({
          practice_role_id: practiceRoleId,
          capability,
        });

      if (error) {
        // Ignore duplicate key errors
        if (error.code === '23505') {
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Error adding capability override:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  // Remove a capability override for a practice role
  const removeCapabilityOverride = useCallback(async (
    practiceRoleId: string, 
    capability: Capability
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('practice_role_capabilities')
        .delete()
        .eq('practice_role_id', practiceRoleId)
        .eq('capability', capability);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Error removing capability override:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  // Get roles by category
  const getRolesByCategory = useCallback((category: RoleCategory): RoleCatalogEntry[] => {
    return roleCatalog.filter(role => role.category === category);
  }, [roleCatalog]);

  // Get active practice roles
  const getActivePracticeRoles = useCallback((): PracticeRole[] => {
    return practiceRoles.filter(role => role.is_active);
  }, [practiceRoles]);

  // Get practice role for a catalog entry
  const getPracticeRoleForCatalogEntry = useCallback((roleCatalogId: string): PracticeRole | undefined => {
    return practiceRoles.find(role => role.role_catalog_id === roleCatalogId);
  }, [practiceRoles]);

  // Initial fetch
  useEffect(() => {
    fetchRoleCatalog();
  }, [fetchRoleCatalog]);

  useEffect(() => {
    fetchPracticeRoles();
  }, [fetchPracticeRoles]);

  return {
    // Global catalog
    roleCatalog,
    catalogLoading,
    catalogError,
    
    // Practice-specific roles
    practiceRoles,
    practiceRolesLoading,
    practiceRolesError,
    
    // Actions
    fetchRoleCatalog,
    fetchPracticeRoles,
    enableRole,
    disableRole,
    addCapabilityOverride,
    removeCapabilityOverride,
    
    // Helpers
    getRolesByCategory,
    getActivePracticeRoles,
    getPracticeRoleForCatalogEntry,
  };
}

// Hook to manage user role assignments
export function useUserRoleAssignment(userId: string) {
  const { selectedPracticeId } = usePracticeSelection();
  const [userRoles, setUserRoles] = useState<PracticeRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRoles = useCallback(async () => {
    if (!userId || !selectedPracticeId) {
      setUserRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_practice_roles')
        .select(`
          practice_role_id,
          practice_roles:practice_role_id (
            id,
            practice_id,
            role_catalog_id,
            is_active,
            role_catalog:role_catalog_id (
              id,
              role_key,
              display_name,
              category,
              default_capabilities,
              description
            )
          )
        `)
        .eq('user_id', userId)
        .eq('practice_id', selectedPracticeId);

      if (fetchError) {
        setError('Failed to fetch user roles');
        return;
      }

      const roles: PracticeRole[] = (data || [])
        .filter((item: any) => item.practice_roles)
        .map((item: any) => ({
          id: item.practice_roles.id,
          practice_id: item.practice_roles.practice_id,
          role_catalog_id: item.practice_roles.role_catalog_id,
          is_active: item.practice_roles.is_active,
          created_at: '',
          updated_at: '',
          role_catalog: item.practice_roles.role_catalog ? {
            id: item.practice_roles.role_catalog.id,
            role_key: item.practice_roles.role_catalog.role_key,
            display_name: item.practice_roles.role_catalog.display_name,
            category: item.practice_roles.role_catalog.category,
            default_capabilities: item.practice_roles.role_catalog.default_capabilities || [],
            description: item.practice_roles.role_catalog.description,
            created_at: '',
            updated_at: '',
          } : undefined,
        }));

      setUserRoles(roles);
    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedPracticeId]);

  const assignRole = useCallback(async (practiceRoleId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId || !selectedPracticeId) {
      return { success: false, error: 'Missing user or practice' };
    }

    try {
      const { error } = await supabase
        .from('user_practice_roles')
        .insert({
          user_id: userId,
          practice_id: selectedPracticeId,
          practice_role_id: practiceRoleId,
        });

      if (error) {
        if (error.code === '23505') {
          return { success: true }; // Already assigned
        }
        return { success: false, error: error.message };
      }

      await fetchUserRoles();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [userId, selectedPracticeId, fetchUserRoles]);

  const unassignRole = useCallback(async (practiceRoleId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'Missing user' };
    }

    try {
      const { error } = await supabase
        .from('user_practice_roles')
        .delete()
        .eq('user_id', userId)
        .eq('practice_role_id', practiceRoleId);

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchUserRoles();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [userId, fetchUserRoles]);

  useEffect(() => {
    fetchUserRoles();
  }, [fetchUserRoles]);

  return {
    userRoles,
    loading,
    error,
    fetchUserRoles,
    assignRole,
    unassignRole,
  };
}
