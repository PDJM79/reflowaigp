import { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePracticeSelection } from './usePracticeSelection';
import type { Capability, UserPracticeRole, PracticeRole, RoleCatalogEntry } from '@/types/roles';
import { hasCapability as checkCapability } from '@/types/roles';

interface CapabilitiesContextType {
  capabilities: Capability[];
  userRoles: UserPracticeRole[];
  loading: boolean;
  error: string | null;
  hasCapability: (required: Capability | Capability[], requireAll?: boolean) => boolean;
  hasAnyCapability: (...caps: Capability[]) => boolean;
  hasAllCapabilities: (...caps: Capability[]) => boolean;
  refetch: () => Promise<void>;
}

const CapabilitiesContext = createContext<CapabilitiesContextType | undefined>(undefined);

interface CapabilitiesProviderProps {
  children: ReactNode;
}

export function CapabilitiesProvider({ children }: CapabilitiesProviderProps) {
  const { user } = useAuth();
  const { selectedPracticeId } = usePracticeSelection();
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [userRoles, setUserRoles] = useState<UserPracticeRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapabilities = useCallback(async () => {
    if (!user || !selectedPracticeId) {
      setCapabilities([]);
      setUserRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's internal ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData) {
        setCapabilities([]);
        setUserRoles([]);
        setLoading(false);
        return;
      }

      // Fetch user's practice roles with role catalog details
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_practice_roles')
        .select(`
          id,
          practice_id,
          user_id,
          practice_role_id,
          created_at,
          updated_at,
          practice_roles:practice_role_id (
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
          )
        `)
        .eq('user_id', userData.id)
        .eq('practice_id', selectedPracticeId);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        setError('Failed to fetch user roles');
        setLoading(false);
        return;
      }

      // Transform the nested data
      const transformedRoles: UserPracticeRole[] = (rolesData || []).map((role: any) => ({
        id: role.id,
        practice_id: role.practice_id,
        user_id: role.user_id,
        practice_role_id: role.practice_role_id,
        created_at: role.created_at,
        updated_at: role.updated_at,
        practice_role: role.practice_roles ? {
          id: role.practice_roles.id,
          practice_id: role.practice_roles.practice_id,
          role_catalog_id: role.practice_roles.role_catalog_id,
          is_active: role.practice_roles.is_active,
          created_at: role.practice_roles.created_at,
          updated_at: role.practice_roles.updated_at,
          role_catalog: role.practice_roles.role_catalog,
        } : undefined,
      }));

      setUserRoles(transformedRoles);

      // Collect all active practice role IDs
      const activePracticeRoleIds = transformedRoles
        .filter(r => r.practice_role?.is_active)
        .map(r => r.practice_role_id);

      if (activePracticeRoleIds.length === 0) {
        setCapabilities([]);
        setLoading(false);
        return;
      }

      // Fetch capability overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from('practice_role_capabilities')
        .select('practice_role_id, capability')
        .in('practice_role_id', activePracticeRoleIds);

      if (overridesError) {
        console.error('Error fetching capability overrides:', overridesError);
      }

      // Build capability set: start with defaults, add overrides
      const capabilitySet = new Set<Capability>();

      // Add default capabilities from role catalog
      transformedRoles.forEach(role => {
        if (role.practice_role?.is_active && role.practice_role.role_catalog?.default_capabilities) {
          role.practice_role.role_catalog.default_capabilities.forEach(cap => {
            capabilitySet.add(cap as Capability);
          });
        }
      });

      // Add override capabilities
      (overridesData || []).forEach((override: any) => {
        capabilitySet.add(override.capability as Capability);
      });

      setCapabilities(Array.from(capabilitySet));
    } catch (err) {
      console.error('Error in fetchCapabilities:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, selectedPracticeId]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  const hasCapabilityCheck = useCallback(
    (required: Capability | Capability[], requireAll = false): boolean => {
      return checkCapability(capabilities, required, requireAll);
    },
    [capabilities]
  );

  const hasAnyCapability = useCallback(
    (...caps: Capability[]): boolean => {
      return caps.some(cap => capabilities.includes(cap));
    },
    [capabilities]
  );

  const hasAllCapabilities = useCallback(
    (...caps: Capability[]): boolean => {
      return caps.every(cap => capabilities.includes(cap));
    },
    [capabilities]
  );

  const contextValue = useMemo(
    () => ({
      capabilities,
      userRoles,
      loading,
      error,
      hasCapability: hasCapabilityCheck,
      hasAnyCapability,
      hasAllCapabilities,
      refetch: fetchCapabilities,
    }),
    [capabilities, userRoles, loading, error, hasCapabilityCheck, hasAnyCapability, hasAllCapabilities, fetchCapabilities]
  );

  return (
    <CapabilitiesContext.Provider value={contextValue}>
      {children}
    </CapabilitiesContext.Provider>
  );
}

export function useCapabilities(): CapabilitiesContextType {
  const context = useContext(CapabilitiesContext);
  if (!context) {
    throw new Error('useCapabilities must be used within a CapabilitiesProvider');
  }
  return context;
}

// Standalone hook for simple capability checks without context
export function useHasCapability(required: Capability | Capability[], requireAll = false): boolean {
  const { capabilities } = useCapabilities();
  return checkCapability(capabilities, required, requireAll);
}
