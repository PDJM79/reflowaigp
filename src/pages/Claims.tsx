import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PoundSterling, Plus, Calendar, FileText, FileDown, ClipboardCheck } from 'lucide-react';
import { ScriptClaimRunDialog } from '@/components/scripts/ScriptClaimRunDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateClaimsPackPDF } from '@/lib/pdfExportV2';
import { toast } from 'sonner';

interface ClaimReview { id: string; outcome: string; notes: string | null; reviewDate: string }

export default function Claims() {
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claimRuns, setClaimRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClaimRunDialogOpen, setIsClaimRunDialogOpen] = useState(false);
  const [practiceId, setPracticeId] = useState<string>('');
  const [reviewsByRun, setReviewsByRun] = useState<Record<string, ClaimReview>>({});
  const today = new Date().toISOString().slice(0, 10);
  const [reviewRunId, setReviewRunId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ outcome: 'approved', notes: '', reviewDate: today });
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchClaims();
  }, [user, navigate]);

  const fetchClaims = async () => {
    try {
      if (!user?.practiceId) return;

      setPracticeId(user.practiceId);

      const res = await fetch(`/api/practices/${user.practiceId}/claim-runs`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch claims (${res.status})`);
      const runs = await res.json() || [];
      setClaimRuns(runs);

      // Latest review per reviewed run (approved/queried), for inline display.
      const reviewed = runs.filter((r: any) => r.status === 'approved' || r.status === 'queried');
      const entries = await Promise.all(reviewed.map(async (r: any) => {
        const rr = await fetch(`/api/practices/${user.practiceId}/claim-runs/${r.id}/reviews`, { credentials: 'include' });
        if (!rr.ok) return null;
        const list: ClaimReview[] = await rr.json();
        return list.length ? ([r.id, list[0]] as [string, ClaimReview]) : null;
      }));
      setReviewsByRun(Object.fromEntries(entries.filter(Boolean) as [string, ClaimReview][]));
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user?.practiceId || !reviewRunId) return;
    setSavingReview(true);
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/claim-runs/${reviewRunId}/reviews`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: reviewForm.outcome, notes: reviewForm.notes || null, reviewDate: reviewForm.reviewDate }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Failed (${res.status})`); }
      toast.success(reviewForm.outcome === 'approved' ? 'Claim run approved' : 'Claim run queried');
      setReviewRunId(null);
      setReviewForm({ outcome: 'approved', notes: '', reviewDate: today });
      fetchClaims();
    } catch (e: any) { toast.error(e.message || 'Failed to record review'); } finally { setSavingReview(false); }
  };

  const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' =>
    status === 'submitted' ? 'default'
    : status === 'approved' ? 'outline'
    : status === 'queried' ? 'destructive' : 'secondary';

  const submitRun = async (id: string) => {
    if (!user?.practiceId) return;
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/claim-runs/${id}/submit`, { method: 'PATCH', credentials: 'include' });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success('Claim run submitted');
      fetchClaims();
    } catch { toast.error('Failed to submit claim run'); }
  };

  const exportRun = async (id: string, _ps?: string, _pe?: string) => {
    if (!user?.practiceId) return;
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/claim-runs/${id}/export`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `claim-run-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Claim run PDF exported');
    } catch { toast.error('Failed to export claim run'); }
  };

  const draftClaims = claimRuns.filter(c => c.status === 'draft');
  const submittedClaims = claimRuns.filter(c => c.status === 'submitted');

  // Capability check - requires manage_claims capability
  const canManageClaims = hasCapability('manage_claims');

  if (capabilitiesLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canManageClaims) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need the "manage_claims" capability to access claims.
            </p>
            <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <PoundSterling className="h-8 w-8" />
              Enhanced Service Claims
            </h1>
          </div>
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
              {claimRuns.map((run) => {
                const ps = run.periodStart ?? run.period_start;
                const pe = run.periodEnd ?? run.period_end;
                const scripts = run.totalScripts ?? run.total_scripts ?? 0;
                const items = run.totalItems ?? run.total_items ?? 0;
                return (
                <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusBadgeVariant(run.status ?? 'draft')}>{run.status ?? 'draft'}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {ps ? new Date(ps).toLocaleDateString() : '?'} – {pe ? new Date(pe).toLocaleDateString() : '?'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{scripts} scripts · {items} items</p>
                    {reviewsByRun[run.id] && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <ClipboardCheck className="h-3 w-3" />
                        Reviewed {reviewsByRun[run.id].outcome}
                        {reviewsByRun[run.id].notes ? ` — ${reviewsByRun[run.id].notes}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {run.status === 'draft' && (
                      <Button variant="default" size="sm" onClick={() => submitRun(run.id)}>
                        Submit
                      </Button>
                    )}
                    {run.status === 'submitted' && (
                      <Button variant="default" size="sm" onClick={() => { setReviewRunId(run.id); setReviewForm({ outcome: 'approved', notes: '', reviewDate: today }); }}>
                        <ClipboardCheck className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => exportRun(run.id, ps, pe)}>
                      <FileDown className="h-4 w-4 mr-1" />
                      Export PDF
                    </Button>
                  </div>
                </div>
                );
              })}
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
