import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function useOrganizationSetup() {
  const { user } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkSetupStatus = async () => {
      try {
        if (!user.practiceId) {
          setNeedsSetup(true);
          setLoading(false);
          return;
        }

        if (!user.isPracticeManager) {
          setNeedsSetup(false);
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/practices/${user.practiceId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          setNeedsSetup(true);
          setLoading(false);
          return;
        }

        setNeedsSetup(false);
      } catch (error) {
        console.error('Error checking setup status:', error);
        setNeedsSetup(false);
      } finally {
        setLoading(false);
      }
    };

    checkSetupStatus();
  }, [user]);

  return { needsSetup, loading };
}
