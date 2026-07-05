import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BackButton } from '@/components/ui/back-button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Loader2, ClipboardCheck, ChevronDown, ChevronUp, Camera, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewItem {
  id: string;
  title: string;
  module: string;
  assignee_name: string | null;
  submitted_for_review_at: string | null;
  process_instance_id: string | null;
  due_at: string | null;
}
interface StepResult { id: string; step_index: number; title: string; status: string; notes: string | null; }
interface EvidenceItem { id: string; type: string; created_at: string; }

export default function ReviewQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, { steps: StepResult[]; evidence: Record<string, EvidenceItem[]> }>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const practiceId = user?.practiceId;

  const fetchQueue = useCallback(async () => {
    if (!practiceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/practices/${practiceId}/review-queue`, { credentials: 'include' });
      if (res.status === 403) { setError('You do not have permission to review submissions.'); setItems([]); return; }
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setItems(await res.json());
    } catch (e) {
      setError('Failed to load the review queue.');
    } finally {
      setLoading(false);
    }
  }, [practiceId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const toggleExpand = async (item: ReviewItem) => {
    if (expanded === item.id) { setExpanded(null); return; }
    setExpanded(item.id);
    if (!detail[item.id] && item.process_instance_id) {
      try {
        const stepsRes = await fetch(`/api/practices/${practiceId}/process-instances/${item.process_instance_id}/step-instances`, { credentials: 'include' });
        const steps: StepResult[] = stepsRes.ok ? await stepsRes.json() : [];
        const evidence: Record<string, EvidenceItem[]> = {};
        await Promise.all(steps.map(async (s) => {
          const evRes = await fetch(`/api/practices/${practiceId}/step-instances/${s.id}/evidence`, { credentials: 'include' });
          evidence[s.id] = evRes.ok ? await evRes.json() : [];
        }));
        setDetail((d) => ({ ...d, [item.id]: { steps, evidence } }));
      } catch { /* leave empty */ }
    }
  };

  const approve = async (item: ReviewItem) => {
    setActing(true);
    try {
      const res = await fetch(`/api/practices/${practiceId}/tasks/${item.id}/approve`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      toast.success(`Approved: ${item.title}`);
      await fetchQueue();
    } catch { toast.error('Failed to approve'); } finally { setActing(false); }
  };

  const submitReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setActing(true);
    try {
      const res = await fetch(`/api/practices/${practiceId}/tasks/${rejectingId}/reject`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      toast.success('Rejected — sent back to the assignee to redo');
      setRejectingId(null); setRejectReason('');
      await fetchQueue();
    } catch { toast.error('Failed to reject'); } finally { setActing(false); }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <BackButton />
      <div className="flex items-center gap-2 mt-4 mb-1">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Review Queue</h1>
      </div>
      <p className="text-muted-foreground mb-6">Approve or reject staff submissions awaiting your review</p>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : error ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{error}</CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nothing awaiting review. 🎉</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline">{item.module?.replace(/_/g, ' ')}</Badge>
                      <span>By {item.assignee_name || 'Unknown'}</span>
                      {item.submitted_for_review_at && (
                        <span>· Submitted {new Date(item.submitted_for_review_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-blue-600 text-white">Awaiting review</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {item.process_instance_id && (
                  <Button variant="ghost" size="sm" onClick={() => toggleExpand(item)}>
                    {expanded === item.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    {expanded === item.id ? 'Hide' : 'Show'} step results & evidence
                  </Button>
                )}
                {expanded === item.id && (
                  <div className="rounded border p-3 space-y-2 bg-muted/30">
                    {(detail[item.id]?.steps ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No step results recorded.</p>
                    ) : detail[item.id].steps.map((s) => (
                      <div key={s.id} className="text-sm border-b last:border-0 pb-2">
                        <div className="flex items-center gap-2">
                          {s.status === 'complete' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium">Step {s.step_index + 1}: {s.title}</span>
                        </div>
                        {s.notes && <p className="ml-6 text-muted-foreground">“{s.notes}”</p>}
                        <div className="ml-6 flex flex-wrap gap-2 mt-1">
                          {(detail[item.id].evidence[s.id] ?? []).map((e) => (
                            <Badge key={e.id} variant="secondary" className="text-xs">
                              {e.type === 'photo' ? <Camera className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                              {e.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(item)} disabled={acting} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setRejectingId(item.id); setRejectReason(''); }} disabled={acting}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={rejectingId !== null} onOpenChange={(o) => { if (!o) setRejectingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject submission</AlertDialogTitle>
            <AlertDialogDescription>
              Give a reason. The task returns to the assignee's My Day flagged “rejected — redo”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="e.g. Photo unclear — please retake with better lighting"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); submitReject(); }}
              disabled={acting || !rejectReason.trim()}
            >
              {acting ? 'Rejecting…' : 'Reject & send back'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
