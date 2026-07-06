import { useState, useEffect, useCallback } from 'react';
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

  // Fetch global role catalog (server returns snake_case shape already)
  const fetchRoleCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      setCatalogError(null);

      const res = await fetch('/api/role-catalog', { credentials: 'include' });
      if (!res.ok) {
        console.error('Error fetching role catalog:', res.status);
        setCatalogError('Failed to fetch role catalog');
        return;
      }
      setRoleCatalog(await res.json() as RoleCatalogEntry[]);
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

      const res = await fetch(`/api/practices/${selectedPracticeId}/practice-roles`, { credentials: 'include' });
      if (!res.ok) {
        console.error('Error fetching practice roles:', res.status);
        setPracticeRolesError('Failed to fetch practice roles');
        return;
      }
      setPracticeRoles(await res.json() as PracticeRole[]);
    } catch (err) {
      console.error('Error in fetchPracticeRoles:', err);
      setPracticeRolesError('An unexpected error occurred');
    } finally {
      setPracticeRolesLoading(false);
    }
  }, [selectedPracticeId]);

  // Enable a role from the catalog for this practice (server handles upsert/reactivate)
  const enableRole = useCallback(async (roleCatalogId: string): Promise<{ success: boolean; error?: string }> => {
    if (!selectedPracticeId) {
      return { success: false, error: 'No practice selected' };
    }

    try {
      const res = await fetch(`/api/practices/${selectedPracticeId}/practice-roles`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCatalogId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || 'Failed to enable role' };
      }
      await fetchPracticeRoles();
      return { success: true };
    } catch (err) {
      console.error('Error enabling role:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [selectedPracticeId, fetchPracticeRoles]);

  // Disable a role for this practice
  const disableRole = useCallback(async (practiceRoleId: string): Promise<{ success: boolean; error?: string }> => {
    if (!selectedPracticeId) {
      return { success: false, error: 'No practice selected' };
    }
    try {
      const res = await fetch(`/api/practices/${selectedPracticeId}/practice-roles/${practiceRoleId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || 'Failed to disable role' };
      }
      await fetchPracticeRoles();
      return { success: true };
    } catch (err) {
      console.error('Error disabling role:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [selectedPracticeId, fetchPracticeRoles]);

  // Add a capability override for a practice role
  const addCapabilityOverride = useCallback(async (
    practiceRoleId: string,
    capability: Capability
  ): Promise<{ success: boolean; error?: string }> => {
    if (!selectedPracticeId) {
      return { success: false, error: 'No practice selected' };
    }
    try {
      const res = await fetch(`/api/practices/${selectedPracticeId}/practice-roles/${practiceRoleId}/capabilities`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || 'Failed to add capability' };
      }
      return { success: true };
    } catch (err) {
      console.error('Error adding capability override:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [selectedPracticeId]);

  // Remove a capability override for a practice role
  const removeCapabilityOverride = useCallback(async (
    practiceRoleId: string,
    capability: Capability
  ): Promise<{ success: boolean; error?: string }> => {
    if (!selectedPracticeId) {
      return { success: false, error: 'No practice selected' };
    }
    try {
      const res = await fetch(
        `/api/practices/${selectedPracticeId}/practice-roles/${practiceRoleId}/capabilities/${encodeURIComponent(capability)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || 'Failed to remove capability' };
      }
      return { success: true };
    } catch (err) {
      console.error('Error removing capability override:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [selectedPracticeId]);

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

      const res = await fetch(
        `/api/practices/${selectedPracticeId}/user-practice-roles?userId=${encodeURIComponent(userId)}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        setError('Failed to fetch user roles');
        return;
      }

      const data = await res.json() as any[];
      // The page consumes PracticeRole shape; unwrap the nested practice_role.
      const roles: PracticeRole[] = (data || [])
        .filter((item) => item.practice_role)
        .map((item) => ({
          id: item.practice_role.id,
          practice_id: item.practice_role.practice_id,
          role_catalog_id: item.practice_role.role_catalog_id,
          is_active: item.practice_role.is_active,
          created_at: item.practice_role.created_at || '',
          updated_at: item.practice_role.updated_at || '',
          role_catalog: item.practice_role.role_catalog || undefined,
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
      const res = await fetch(`/api/practices/${selectedPracticeId}/user-practice-roles`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, practiceRoleId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || 'Failed to assign role' };
      }
      await fetchUserRoles();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [userId, selectedPracticeId, fetchUserRoles]);

  const unassignRole = useCallback(async (practiceRoleId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId || !selectedPracticeId) {
      return { success: false, error: 'Missing user or practice' };
    }

    try {
      const res = await fetch(`/api/practices/${selectedPracticeId}/user-practice-roles`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, practiceRoleId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || 'Failed to unassign role' };
      }
      await fetchUserRoles();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [userId, selectedPracticeId, fetchUserRoles]);

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
