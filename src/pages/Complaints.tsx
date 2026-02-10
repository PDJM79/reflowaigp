import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Clock, CheckCircle, AlertTriangle, Send, FileText, Loader2, RefreshCw } from 'lucide-react';
import { ComplaintSLADialog } from '@/components/complaints/ComplaintSLADialog';
import { ComplaintThemeAnalysis } from '@/components/complaints/ComplaintThemeAnalysis';
import { ComplaintSLATracker } from '@/components/complaints/ComplaintSLATracker';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { triggerHaptic } from '@/lib/haptics';

export default function Complaints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [dialogAction, setDialogAction] = useState<'acknowledgment' | 'final_response'>('acknowledgment');
  const [dialogOpen, setDialogOpen] = useState(false);

  const practiceId = user?.practiceId || '';

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const { data: complaints = [], isLoading, refetch } = useQuery({
    queryKey: ['complaints', practiceId],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await fetch(`/api/practices/${practiceId}/complaints`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch complaints');
      return res.json();
    },
    enabled: !!practiceId,
  });

  const { scrollableRef, isPulling, pullProgress, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
      triggerHaptic('success');
    },
    enabled: isMobile,
  });

  const needsAck = complaints.filter((c: any) => !c.ackSentAt);
  const needsFinal = complaints.filter((c: any) => c.ackSentAt && !c.finalSentAt);
  const overdueComplaints = complaints.filter((c: any) => c.status === 'overdue');
  const atRiskComplaints = complaints.filter((c: any) => c.status === 'at_risk');

  const handleSendAcknowledgment = (complaint: any) => {
    setSelectedComplaint(complaint);
    setDialogAction('acknowledgment');
    setDialogOpen(true);
  };

  const handleSendFinalResponse = (complaint: any) => {
    setSelectedComplaint(complaint);
    setDialogAction('final_response');
    setDialogOpen(true);
  };

  const getSLABadge = (complaint: any) => {
    if (complaint.finalSentAt) {
      return <Badge className="bg-success">Completed</Badge>;
    }
    if (complaint.status === 'overdue') {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (complaint.status === 'at_risk') {
      return <Badge className="bg-warning">At Risk</Badge>;
    }
    return <Badge variant="secondary">Open</Badge>;
  };

  return (
    <div ref={scrollableRef} className="container mx-auto p-6 space-y-6 overflow-y-auto">
      {isMobile && (isPulling || isRefreshing) && (
        <div 
          className="flex items-center justify-center py-4 transition-opacity"
          style={{ opacity: isPulling ? pullProgress : 1 }}
        >
          {isRefreshing ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <RefreshCw 
              className="h-6 w-6 text-primary transition-transform"
              style={{ transform: `rotate(${pullProgress * 360}deg)` }}
            />
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-8 w-8" />
              Complaints Management (PTR)
            </h1>
          </div>
          <p className="text-muted-foreground">Track and manage patient complaints with SLA monitoring</p>
        </div>
        <Button data-testid="button-log-complaint">
          <Plus className="h-4 w-4 mr-2" />
          Log Complaint
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs ACK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-needs-ack-count">{needsAck.length}</div>
            <p className="text-xs text-muted-foreground">48hr deadline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs Final</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-needs-final-count">{needsFinal.length}</div>
            <p className="text-xs text-muted-foreground">30-day deadline</p>
          </CardContent>
        </Card>

        <Card className={overdueComplaints.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-overdue-count">{overdueComplaints.length}</div>
          </CardContent>
        </Card>

        <Card className={atRiskComplaints.length > 0 ? 'border-warning' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-at-risk-count">{atRiskComplaints.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-complaints">{complaints.length}</div>
          </CardContent>
        </Card>
      </div>

      <ComplaintSLATracker />

      <ComplaintThemeAnalysis />

      {isLoading ? (
        <div className="text-center py-8">Loading complaints...</div>
      ) : complaints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No complaints recorded</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complaints.map((complaint: any) => (
                <div key={complaint.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow" data-testid={`card-complaint-${complaint.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSLABadge(complaint)}
                        {complaint.channel && (
                          <Badge variant="outline" className="capitalize">
                            {complaint.channel.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{complaint.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!complaint.ackSentAt && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSendAcknowledgment(complaint)}
                          data-testid={`button-send-ack-${complaint.id}`}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send ACK
                        </Button>
                      )}
                      {complaint.ackSentAt && !complaint.finalSentAt && (
                        <Button 
                          size="sm"
                          onClick={() => handleSendFinalResponse(complaint)}
                          data-testid={`button-final-response-${complaint.id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Final Response
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Received: {complaint.receivedAt ? new Date(complaint.receivedAt).toLocaleDateString() : 'N/A'}
                    </span>
                    {complaint.ackSentAt ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle className="h-3 w-3" />
                        ACK: {new Date(complaint.ackSentAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        ACK Due: {complaint.ackDue ? new Date(complaint.ackDue).toLocaleDateString() : 'N/A'}
                      </span>
                    )}
                    {complaint.finalSentAt ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle className="h-3 w-3" />
                        Final: {new Date(complaint.finalSentAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        Final Due: {complaint.finalDue ? new Date(complaint.finalDue).toLocaleDateString() : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedComplaint && (
        <ComplaintSLADialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedComplaint(null);
          }}
          complaint={selectedComplaint}
          actionType={dialogAction}
        />
      )}
    </div>
  );
}
