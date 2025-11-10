import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

type UnacknowledgedPolicy = {
  id: string;
  title: string;
  version: string;
  effective_date: string;
  days_overdue: number;
};

export function PoliciesNeedingAcknowledgment() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<UnacknowledgedPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnacknowledgedPolicies();
  }, []);

  const fetchUnacknowledgedPolicies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      // Fetch policies and acknowledgments separately
      const [policiesRes, acknowledgementsRes] = await Promise.all([
        supabase
          .from('policy_documents')
          .select('id, title, version, effective_from')
          .eq('practice_id', userData.practice_id)
          .eq('is_active', true),
        supabase
          .from('policy_acknowledgments')
          .select('policy_id, version_acknowledged')
          .eq('user_id', userData.id)
      ]);

      if (!policiesRes.data) return;

      const acknowledgedMap = new Map(
        (acknowledgementsRes.data || []).map(a => [`${a.policy_id}-${a.version_acknowledged}`, true])
      );

      const unacknowledged: UnacknowledgedPolicy[] = policiesRes.data
        .filter(p => !acknowledgedMap.has(`${p.id}-${p.version}`))
        .map(p => ({
          id: p.id,
          title: p.title || 'Untitled Policy',
          version: p.version || '1.0',
          effective_date: p.effective_from || new Date().toISOString(),
          days_overdue: Math.floor((Date.now() - new Date(p.effective_from || 0).getTime()) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => b.days_overdue - a.days_overdue);

      setPolicies(unacknowledged);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to load policies', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Policies Needing Acknowledgment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (policies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Policies Needing Acknowledgment
          </CardTitle>
          <CardDescription>You're all caught up!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3 mb-3">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground">All policies have been acknowledged</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Policies Needing Acknowledgment
          <Badge variant="destructive" className="ml-auto">{policies.length}</Badge>
        </CardTitle>
        <CardDescription>Please review and acknowledge these policies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {policies.slice(0, 3).map((policy) => (
            <div key={policy.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-start gap-3 flex-1">
                <div className="rounded-full bg-orange-100 dark:bg-orange-900/20 p-2 mt-0.5">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium text-sm leading-none truncate">{policy.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Version {policy.version}
                    {policy.days_overdue > 0 && (
                      <span className="text-destructive ml-2">• {policy.days_overdue} days overdue</span>
                    )}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/policies')} className="ml-2 shrink-0">
                Review
              </Button>
            </div>
          ))}
          {policies.length > 3 && (
            <Button variant="ghost" className="w-full" onClick={() => navigate('/policies')}>
              View all {policies.length} policies
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
