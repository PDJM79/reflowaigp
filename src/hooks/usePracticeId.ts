import { useAuth } from './useAuth';

/**
 * Returns the current user's practiceId and userId directly from the session.
 * Replaces the legacy pattern of querying Supabase via auth_user_id.
 */
export function usePracticeId() {
  const { user } = useAuth();
  return {
    practiceId: user?.practiceId ?? null,
    userId: user?.id ?? null,
  };
}
