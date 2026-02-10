import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export const ComplaintSLATracker = () => {
  const { user } = useAuth();

  const { data: complaints } = useQuery({
    queryKey: ['complaints', user?.practiceId],
    queryFn: async () => {
      if (!user?.practiceId) return [];

      const response = await fetch(`/api/practices/${user.practiceId}/complaints`, {
        credentials: 'include',
      });

      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.practiceId,
  });

  if (!complaints || complaints.length === 0) {
    return null;
  }

  const completedComplaints = complaints.filter((c: any) => c.status === 'resolved' || c.status === 'closed');
  const completedCount = completedComplaints.length;

  const withinSlaCount = completedComplaints.filter((c: any) => {
    const finalResponseDueDate = c.finalResponseDueDate || c.final_response_due_date;
    const resolvedAt = c.finalResponseSentAt || c.final_response_sent_at || c.updatedAt;
    if (!finalResponseDueDate || !resolvedAt) return false;
    return new Date(resolvedAt) <= new Date(finalResponseDueDate);
  }).length;

  const slaCompliance = completedCount > 0
    ? Math.round((withinSlaCount / completedCount) * 100)
    : 0;

  const now = new Date();

  const ackOverdueCount = complaints.filter((c: any) => {
    const ackSentAt = c.acknowledgmentSentAt || c.acknowledgment_sent_at;
    const ackDueDate = c.acknowledgmentDueDate || c.acknowledgment_due_date;
    return !ackSentAt && ackDueDate && new Date(ackDueDate) < now;
  }).length;

  const responseOverdueCount = complaints.filter((c: any) => {
    const finalSentAt = c.finalResponseSentAt || c.final_response_sent_at;
    const finalDueDate = c.finalResponseDueDate || c.final_response_due_date;
    return !finalSentAt && finalDueDate && new Date(finalDueDate) < now;
  }).length;

  const totalDays = completedComplaints.reduce((sum: number, c: any) => {
    const received = c.receivedDate || c.received_date;
    const resolved = c.finalResponseSentAt || c.final_response_sent_at || c.updatedAt;
    if (!received || !resolved) return sum;
    const days = Math.ceil((new Date(resolved).getTime() - new Date(received).getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  const avgCompletionDays = completedCount > 0 ? Math.round(totalDays / completedCount) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{slaCompliance}%</div>
          <p className="text-xs text-muted-foreground">
            {withinSlaCount} of {completedCount} within 30 days
          </p>
        </CardContent>
      </Card>

      <Card className={ackOverdueCount > 0 ? 'border-warning' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            Ack. Overdue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{ackOverdueCount}</div>
          <p className="text-xs text-muted-foreground">Needs 48hr acknowledgement</p>
        </CardContent>
      </Card>

      <Card className={responseOverdueCount > 0 ? 'border-destructive' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Response Overdue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{responseOverdueCount}</div>
          <p className="text-xs text-muted-foreground">Past 30-day deadline</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Avg. Resolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{avgCompletionDays}</div>
          <p className="text-xs text-muted-foreground">Working days</p>
        </CardContent>
      </Card>
    </div>
  );
};
