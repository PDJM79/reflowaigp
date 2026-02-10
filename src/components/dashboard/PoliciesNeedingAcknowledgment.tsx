import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
  const { user } = useAuth();
  const [policies, setPolicies] = useState<UnacknowledgedPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.practiceId) {
      setLoading(false);
      return;
    }
    fetchPolicies();
  }, [user?.practiceId]);

  const fetchPolicies = async () => {
    try {
      const response = await fetch(`/api/practices/${user!.practiceId}/policies`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setPolicies([]);
        setLoading(false);
        return;
      }

      const policiesData = await response.json();

      const unacknowledged: UnacknowledgedPolicy[] = (policiesData || [])
        .filter((p: any) => p.isActive !== false)
        .map((p: any) => ({
          id: p.id,
          title: p.title || 'Untitled Policy',
          version: p.version || '1.0',
          effective_date: p.effectiveFrom || p.effective_from || new Date().toISOString(),
          days_overdue: Math.floor((Date.now() - new Date(p.effectiveFrom || p.effective_from || 0).getTime()) / (1000 * 60 * 60 * 24))
        }))
        .sort((a: UnacknowledgedPolicy, b: UnacknowledgedPolicy) => b.days_overdue - a.days_overdue);

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
      <Card data-testid="card-policies-loading">
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
      <Card data-testid="card-policies-empty">
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
            <p className="text-sm text-muted-foreground" data-testid="text-policies-all-acknowledged">All policies have been acknowledged</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-policies-needing-acknowledgment">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Policies Needing Acknowledgment
          <Badge variant="destructive" className="ml-auto" data-testid="badge-policies-count">{policies.length}</Badge>
        </CardTitle>
        <CardDescription>Please review and acknowledge these policies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {policies.slice(0, 3).map((policy) => (
            <div key={policy.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors" data-testid={`card-policy-${policy.id}`}>
              <div className="flex items-start gap-3 flex-1">
                <div className="rounded-full bg-orange-100 dark:bg-orange-900/20 p-2 mt-0.5">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium text-sm leading-none truncate" data-testid={`text-policy-title-${policy.id}`}>{policy.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Version {policy.version}
                    {policy.days_overdue > 0 && (
                      <span className="text-destructive ml-2">• {policy.days_overdue} days overdue</span>
                    )}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/policies')} className="ml-2 shrink-0" data-testid={`button-review-policy-${policy.id}`}>
                Review
              </Button>
            </div>
          ))}
          {policies.length > 3 && (
            <Button variant="ghost" className="w-full" onClick={() => navigate('/policies')} data-testid="button-view-all-policies">
              View all {policies.length} policies
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
