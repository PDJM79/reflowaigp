import { useAuth } from './useAuth';

export function useOrganizationSetup() {
  const { loading } = useAuth();

  // With custom session-based auth, users always have a practice assigned at login.
  // The organisation setup wizard is not used in this auth flow.
  return { needsSetup: false, loading };
}