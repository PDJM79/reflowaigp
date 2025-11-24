import React, { useState, useEffect } from 'react';
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
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('practice_id, is_practice_manager')
          .eq('auth_user_id', user.id)
          .single();

        if (userError || !userData) {
          // New user needs setup (assumes they are a practice manager)
          setNeedsSetup(true);
          setLoading(false);
          return;
        }

        // Non-practice managers never need organization setup
        if (!userData.is_practice_manager) {
          setNeedsSetup(false);
          setLoading(false);
          return;
        }

        // Practice managers: check if organization setup is complete
        const { data: setupData, error: setupError } = await supabase
          .from('organization_setup')
          .select('setup_completed')
          .eq('practice_id', userData.practice_id)
          .maybeSingle(); // Use maybeSingle to handle no rows gracefully

        // If no setup record exists, it needs setup
        // If setup record exists but setup_completed is false, it needs setup
        // Otherwise, setup is complete
        if (!setupData) {
          setNeedsSetup(true);
        } else {
          setNeedsSetup(setupData.setup_completed !== true);
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
        // On error, assume no setup needed to avoid blocking existing users
        setNeedsSetup(false);
      } finally {
        setLoading(false);
      }
    };

    checkSetupStatus();
  }, [user]);

  return { needsSetup, loading };
}