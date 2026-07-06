// ── usePracticeModules ────────────────────────────────────────────────────────
// Fetches enabled modules for the current practice and returns a Set of enabled
// module names. Used by AppLayout for sidebar filtering and ModuleSettings page.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export interface PracticeModule {
  id: string;
  moduleName: string;
  isEnabled: boolean;
  disabledAt: string | null;
  enabledAt: string | null;
}

export function usePracticeModules() {
  const { user } = useAuth();
  const practiceId = (user as any)?.practiceId as string | undefined;

  const { data, isLoading } = useQuery<PracticeModule[]>({
    queryKey: ['practice-modules', practiceId],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await fetch(`/api/practices/${practiceId}/modules`);
      if (!res.ok) return [];
      const d = await res.json();
      return d.modules ?? [];
    },
    enabled: !!practiceId,
    staleTime: 5 * 60_000,    // 5-minute cache
    gcTime: 30 * 60_000,
  });

  const enabledSet = new Set(
    (data ?? []).filter(m => m.isEnabled).map(m => m.moduleName)
  );

  return {
    modules:      data ?? [],
    enabledSet,
    isLoading,
    practiceId,
  };
}

// ── Toggle a module (invalidates query on success) ────────────────────────────
export async function toggleModule(
  practiceId: string,
  moduleName: string,
  isEnabled: boolean
): Promise<void> {
  const res = await fetch(`/api/practices/${practiceId}/modules/${moduleName}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isEnabled }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? `Failed to update module (${res.status})`);
  }
}
