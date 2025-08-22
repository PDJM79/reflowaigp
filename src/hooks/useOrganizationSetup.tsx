import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
        // Check if user exists in users table
        const { data: userData } = await supabase
          .from('users')
          .select('practice_id, is_practice_manager')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) {
          // New user needs setup (assumes they are a practice manager)
          setNeedsSetup(true);
        } else if (!userData.is_practice_manager) {
          // Non-practice managers never need organization setup
          setNeedsSetup(false);
        } else {
          // Practice managers: check if organization setup is complete
          const { data: setupData } = await supabase
            .from('organization_setup')
            .select('setup_completed')
            .eq('practice_id', userData.practice_id)
            .single();

          setNeedsSetup(!setupData?.setup_completed);
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
        // For existing users, assume no setup needed
        // Only new practice managers should see setup
        setNeedsSetup(false);
      } finally {
        setLoading(false);
      }
    };

    checkSetupStatus();
  }, [user]);

  return { needsSetup, loading };
}