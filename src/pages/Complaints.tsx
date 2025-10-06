import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Complaints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchComplaints();
  }, [user, navigate]);

  const fetchComplaints = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const newComplaints = complaints.filter(c => c.status === 'new');
  const awaitingAck = complaints.filter(c => !c.ack_sent_at && new Date(c.ack_due) > new Date());
  const overdueAck = complaints.filter(c => !c.ack_sent_at && new Date(c.ack_due) < new Date());
  const awaitingFinal = complaints.filter(c => c.ack_sent_at && !c.final_sent_at);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Complaints Management (PTR)
          </h1>
          <p className="text-muted-foreground">Track and manage patient complaints with SLA monitoring</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Log Complaint
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{newComplaints.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Awaiting Acknowledgment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{awaitingAck.length}</div>
          </CardContent>
        </Card>

        <Card className={overdueAck.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Overdue ACK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overdueAck.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Awaiting Final Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{awaitingFinal.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
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
              {complaints.map((complaint) => {
                const ackOverdue = !complaint.ack_sent_at && new Date(complaint.ack_due) < new Date();
                const finalOverdue = complaint.ack_sent_at && !complaint.final_sent_at && new Date(complaint.final_due) < new Date();
                
                return (
                  <div key={complaint.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={complaint.status === 'resolved' ? 'default' : 'secondary'}>
                            {complaint.status}
                          </Badge>
                          {complaint.channel && (
                            <Badge variant="outline">{complaint.channel}</Badge>
                          )}
                          {ackOverdue && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              ACK Overdue
                            </Badge>
                          )}
                          {finalOverdue && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Final Response Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm line-clamp-2">{complaint.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Received: {new Date(complaint.received_at).toLocaleDateString()}
                      </span>
                      {complaint.ack_sent_at ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle className="h-3 w-3" />
                          ACK Sent: {new Date(complaint.ack_sent_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>ACK Due: {new Date(complaint.ack_due).toLocaleDateString()}</span>
                      )}
                      {complaint.final_sent_at ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle className="h-3 w-3" />
                          Final Sent: {new Date(complaint.final_sent_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>Final Due: {new Date(complaint.final_due).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
