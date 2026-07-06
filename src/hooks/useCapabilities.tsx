import { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { usePracticeSelection } from './usePracticeSelection';
import type { Capability, UserPracticeRole } from '@/types/roles';
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
  const [isPracticeManager, setIsPracticeManager] = useState(false);

  const fetchCapabilities = useCallback(async () => {
    if (!user) {
      setCapabilities([]);
      setUserRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const effectivePracticeId = selectedPracticeId || user.practiceId;

      if (!effectivePracticeId) {
        setCapabilities([]);
        setUserRoles([]);
        setIsPracticeManager(false);
        setLoading(false);
        return;
      }

      // Capabilities are now computed server-side (catalog defaults + overrides,
      // with practice managers granted all). See docs/RBAC_MAP.md.
      const res = await fetch('/api/capabilities', { credentials: 'include' });
      if (!res.ok) {
        console.error('Error fetching capabilities:', res.status);
        setError('Failed to fetch capabilities');
        setLoading(false);
        return;
      }

      const data = await res.json() as {
        isPracticeManager: boolean;
        capabilities: Capability[];
        userRoles: UserPracticeRole[];
      };

      setIsPracticeManager(data.isPracticeManager);
      setCapabilities(data.capabilities ?? []);
      setUserRoles(data.userRoles ?? []);
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
