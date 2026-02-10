import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

export type EmailFrequency = 'immediate' | 'daily' | 'weekly' | 'none';

export type NotificationPreferences = {
  id?: string;
  userId: string;
  emailFrequency: EmailFrequency;
  inAppEnabled: boolean;
  policyReminders: boolean;
  taskNotifications: boolean;
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const defaultPrefs: NotificationPreferences = {
      userId: '',
      emailFrequency: 'immediate',
      inAppEnabled: true,
      policyReminders: true,
      taskNotifications: true,
    };
    setPreferences(defaultPrefs);
    setLoading(false);
  }, []);

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return;

    try {
      setPreferences({ ...preferences, ...updates });
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved locally',
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
    refetch: () => {},
  };
}