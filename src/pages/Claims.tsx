import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PoundSterling, Plus, Calendar, FileText } from 'lucide-react';
import { ScriptClaimRunDialog } from '@/components/scripts/ScriptClaimRunDialog';

export default function Claims() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claimRuns, setClaimRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClaimRunDialogOpen, setIsClaimRunDialogOpen] = useState(false);
  const [practiceId, setPracticeId] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchClaims();
  }, [user, navigate]);

  const fetchClaims = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      setPracticeId(userData.practice_id);

      const { data, error } = await supabase
        .from('script_claim_runs')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('run_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setClaimRuns(data || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const draftClaims = claimRuns.filter(c => c.status === 'draft');
  const submittedClaims = claimRuns.filter(c => c.status === 'submitted');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PoundSterling className="h-8 w-8" />
            Enhanced Service Claims
          </h1>
          <p className="text-muted-foreground">Manage NHS enhanced service claims and submissions</p>
        </div>
        <Button onClick={() => setIsClaimRunDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Claim Run
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Claim Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{claimRuns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Draft Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{draftClaims.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{submittedClaims.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading claims data...</div>
      ) : claimRuns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PoundSterling className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No claim runs created yet</p>
            <Button onClick={() => setIsClaimRunDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Claim Run
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Claim Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {claimRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={run.review_status === 'reviewed' ? 'default' : 'secondary'}>
                        {run.review_status || 'pending review'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(run.run_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {run.fpps_submitted_at ? `Submitted to FPPS ${new Date(run.fpps_submitted_at).toLocaleDateString()}` : 'Not yet submitted'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ScriptClaimRunDialog
        open={isClaimRunDialogOpen}
        onOpenChange={setIsClaimRunDialogOpen}
        onSuccess={fetchClaims}
      />
    </div>
  );
}
