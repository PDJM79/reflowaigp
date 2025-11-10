import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type EmailFrequency = 'immediate' | 'daily' | 'weekly' | 'none';

export type NotificationPreferences = {
  id?: string;
  user_id: string;
  email_frequency: EmailFrequency;
  in_app_enabled: boolean;
  policy_reminders: boolean;
  task_notifications: boolean;
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (prefs) {
        setPreferences(prefs as NotificationPreferences);
      } else {
        // Create default preferences
        const defaultPrefs: Omit<NotificationPreferences, 'id'> = {
          user_id: userData.id,
          email_frequency: 'immediate',
          in_app_enabled: true,
          policy_reminders: true,
          task_notifications: true,
        };

        const { data: newPrefs } = await supabase
          .from('notification_preferences')
          .insert(defaultPrefs)
          .select()
          .single();

        if (newPrefs) {
          setPreferences(newPrefs as NotificationPreferences);
        }
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', preferences.user_id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data as NotificationPreferences);
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved',
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    }
  };

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: fetchPreferences,
  };
}
