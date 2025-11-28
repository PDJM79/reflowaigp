import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch complaints with new SLA fields
  const { data: complaints = [], isLoading, refetch } = useQuery({
    queryKey: ['complaints', user?.id],
    queryFn: async () => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return [];

      const { data } = await (supabase as any)
        .from('complaints')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('received_date', { ascending: false })
        .limit(50);

      return data || [];
    },
    enabled: !!user?.id,
  });

  const { scrollableRef, isPulling, pullProgress, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
      triggerHaptic('success');
    },
    enabled: isMobile,
  });

  const needsAck = complaints.filter((c: any) => !c.acknowledgment_sent_at);
  const needsFinal = complaints.filter((c: any) => c.acknowledgment_sent_at && !c.final_response_sent_at);
  const overdueComplaints = complaints.filter((c: any) => c.sla_status === 'overdue');
  const atRiskComplaints = complaints.filter((c: any) => c.sla_status === 'at_risk');

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
    switch (complaint.sla_status) {
      case 'completed':
        return <Badge className="bg-success">Completed</Badge>;
      case 'on_track':
        return <Badge variant="secondary">On Track</Badge>;
      case 'at_risk':
        return <Badge className="bg-warning">At Risk</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return null;
    }
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
        <Button>
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
            <div className="text-3xl font-bold">{needsAck.length}</div>
            <p className="text-xs text-muted-foreground">48hr deadline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs Final</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{needsFinal.length}</div>
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
            <div className="text-3xl font-bold">{overdueComplaints.length}</div>
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
            <div className="text-3xl font-bold">{atRiskComplaints.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{complaints.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Tracker */}
      <ComplaintSLATracker />

      {/* AI Theme Analysis */}
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
                <div key={complaint.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSLABadge(complaint)}
                        {complaint.category && (
                          <Badge variant="outline" className="capitalize">
                            {complaint.category.replace('_', ' ')}
                          </Badge>
                        )}
                        {complaint.ai_sentiment && (
                          <Badge 
                            variant="outline"
                            className={
                              complaint.ai_sentiment === 'very_negative' ? 'border-destructive text-destructive' :
                              complaint.ai_sentiment === 'negative' ? 'border-warning text-warning' :
                              complaint.ai_sentiment === 'positive' ? 'border-success text-success' : ''
                            }
                          >
                            {complaint.ai_sentiment.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium">{complaint.complainant_name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{complaint.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!complaint.acknowledgment_sent_at && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSendAcknowledgment(complaint)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send ACK
                        </Button>
                      )}
                      {complaint.acknowledgment_sent_at && !complaint.final_response_sent_at && (
                        <Button 
                          size="sm"
                          onClick={() => handleSendFinalResponse(complaint)}
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
                      Received: {new Date(complaint.received_date).toLocaleDateString()}
                    </span>
                    {complaint.acknowledgment_sent_at ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle className="h-3 w-3" />
                        ACK: {new Date(complaint.acknowledgment_sent_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        ACK Due: {new Date(complaint.acknowledgment_due_date).toLocaleDateString()}
                      </span>
                    )}
                    {complaint.final_response_sent_at ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle className="h-3 w-3" />
                        Final: {new Date(complaint.final_response_sent_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        Final Due: {new Date(complaint.final_response_due_date).toLocaleDateString()}
                      </span>
                    )}
                    {complaint.working_days_to_complete && (
                      <span className="flex items-center gap-1">
                        Resolved in {complaint.working_days_to_complete} working days
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SLA Dialog */}
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
