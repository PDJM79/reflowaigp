import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const TrainingExpiryAlerts = () => {
  const { user } = useAuth();

  const { data: expiringTraining = [] } = useQuery({
    queryKey: ['expiring-training', user?.id],
    queryFn: async () => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData?.practice_id) return [];

      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(today.getDate() + 90);

      const { data } = await (supabase as any)
        .from('training_records')
        .select(`
          id,
          course_name,
          expiry_date,
          is_mandatory,
          employee:employees(id, name)
        `)
        .eq('employees.practice_id', userData.practice_id)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', ninetyDaysFromNow.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      return data || [];
    },
    enabled: !!user?.id,
  });

  const getUrgencyBadge = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge className="bg-destructive">Expires in {daysUntilExpiry} days</Badge>;
    } else if (daysUntilExpiry <= 60) {
      return <Badge className="bg-warning">Expires in {daysUntilExpiry} days</Badge>;
    } else {
      return <Badge variant="secondary">Expires in {daysUntilExpiry} days</Badge>;
    }
  };

  if (expiringTraining.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Training Expiry Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {expiringTraining.slice(0, 5).map((training: any) => (
            <div key={training.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{training.course_name}</p>
                  {training.is_mandatory && (
                    <Badge variant="outline" className="text-xs">Mandatory</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{training.employee?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {getUrgencyBadge(training.expiry_date)}
              </div>
            </div>
          ))}
          {expiringTraining.length > 5 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              +{expiringTraining.length - 5} more training certificates expiring soon
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
