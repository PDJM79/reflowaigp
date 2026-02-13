import React from 'react';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Capability } from '@/types/roles';

interface RoleGateProps {
  /** Required capability or capabilities */
  require: Capability | Capability[];
  /** If true, ALL capabilities must be present. Default is false (OR logic) */
  requireAll?: boolean;
  /** Fallback content to show when access is denied */
  fallback?: React.ReactNode;
  /** Content to show when access is granted */
  children: React.ReactNode;
  /** If true, shows loading state while checking capabilities */
  showLoading?: boolean;
}

/**
 * RoleGate component - Conditionally renders children based on user capabilities
 * 
 * @example
 * // Show content if user has manage_cleaning capability
 * <RoleGate require="manage_cleaning">
 *   <CleaningManagementPanel />
 * </RoleGate>
 * 
 * @example
 * // Show content if user has EITHER manage_policies OR approve_policies
 * <RoleGate require={['manage_policies', 'approve_policies']}>
 *   <PolicyEditor />
 * </RoleGate>
 * 
 * @example
 * // Show content if user has BOTH manage_policies AND approve_policies
 * <RoleGate require={['manage_policies', 'approve_policies']} requireAll>
 *   <PolicyApprovalButton />
 * </RoleGate>
 */
export function RoleGate({
  require,
  requireAll = false,
  fallback = null,
  children,
  showLoading = false,
}: RoleGateProps) {
  const { loading, hasCapability, hasAnyCapability, hasAllCapabilities } = useCapabilities();

  if (loading && showLoading) {
    return (
      <div className="animate-pulse bg-muted rounded h-8 w-24" />
    );
  }

  if (loading) {
    return null;
  }

  const requiredCaps = Array.isArray(require) ? require : [require];
  
  let hasAccess: boolean;
  if (requiredCaps.length === 1) {
    hasAccess = hasCapability(requiredCaps[0]);
  } else if (requireAll) {
    hasAccess = hasAllCapabilities(...requiredCaps);
  } else {
    hasAccess = hasAnyCapability(...requiredCaps);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook version for checking capabilities imperatively
 */
export function useRoleCheck() {
  const { hasCapability, hasAnyCapability, hasAllCapabilities, loading } = useCapabilities();
  
  return {
    isLoading: loading,
    can: hasCapability,
    canAny: hasAnyCapability,
    canAll: hasAllCapabilities,
  };
}

/**
 * HOC for protecting entire components
 */
export function withRoleGate<P extends object>(
  Component: React.ComponentType<P>,
  require: Capability | Capability[],
  options?: { requireAll?: boolean; fallback?: React.ReactNode }
) {
  return function WrappedComponent(props: P) {
    return (
      <RoleGate
        require={require}
        requireAll={options?.requireAll}
        fallback={options?.fallback}
      >
        <Component {...props} />
      </RoleGate>
    );
  };
}
