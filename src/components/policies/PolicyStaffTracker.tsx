import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

interface PolicyStaffTrackerProps {
  policyId: string;
}

export function PolicyStaffTracker({ policyId }: PolicyStaffTrackerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<{
    acknowledged: any[];
    notAcknowledged: any[];
    totalStaff: number;
  }>({
    acknowledged: [],
    notAcknowledged: [],
    totalStaff: 0,
  });

  useEffect(() => {
    fetchStaffAcknowledgments();
  }, [policyId]);

  const fetchStaffAcknowledgments = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      // Get all active staff in the practice
      const { data: allStaff, error: staffError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('practice_id', userData.practice_id)
        .eq('is_active', true);

      if (staffError) throw staffError;

      // Get policy details
      const { data: policy } = await supabase
        .from('policy_documents')
        .select('version')
        .eq('id', policyId)
        .single();

      // Get acknowledgments for this policy
      const { data: acknowledgments, error: ackError } = await supabase
        .from('policy_acknowledgments')
        .select('user_id, acknowledged_at, version_acknowledged')
        .eq('policy_id', policyId)
        .eq('version_acknowledged', policy?.version || 'unversioned');

      if (ackError) throw ackError;

      const acknowledgedUserIds = new Set(acknowledgments?.map(a => a.user_id) || []);
      
      const acknowledged = (allStaff || [])
        .filter(staff => acknowledgedUserIds.has(staff.id))
        .map(staff => ({
          ...staff,
          acknowledgedAt: acknowledgments?.find(a => a.user_id === staff.id)?.acknowledged_at,
        }));

      const notAcknowledged = (allStaff || [])
        .filter(staff => !acknowledgedUserIds.has(staff.id));

      setStaffData({
        acknowledged,
        notAcknowledged,
        totalStaff: allStaff?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching staff acknowledgments:', error);
      toast.error('Failed to load staff acknowledgments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading staff acknowledgments...</div>;
  }

  const completionRate = staffData.totalStaff > 0
    ? Math.round((staffData.acknowledged.length / staffData.totalStaff) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff Acknowledgment Status
            </span>
            <Badge variant={completionRate === 100 ? 'default' : 'secondary'}>
              {completionRate}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{staffData.acknowledged.length}</div>
              <p className="text-sm text-muted-foreground">Acknowledged</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{staffData.notAcknowledged.length}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {staffData.notAcknowledged.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-orange-600" />
              Pending Acknowledgments ({staffData.notAcknowledged.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staffData.notAcknowledged.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium text-sm">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.email}</p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Not Acknowledged
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {staffData.acknowledged.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Acknowledged ({staffData.acknowledged.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staffData.acknowledged.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium text-sm">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Acknowledged
                    </Badge>
                    {staff.acknowledgedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(staff.acknowledgedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
