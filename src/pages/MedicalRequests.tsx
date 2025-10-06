import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Plus, Calendar, UserCheck } from 'lucide-react';

export default function MedicalRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchRequests();
  }, [user, navigate]);

  const fetchRequests = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('medical_requests')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching medical requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const receivedRequests = requests.filter(r => r.status === 'received');
  const assignedRequests = requests.filter(r => r.status === 'assigned');
  const sentRequests = requests.filter(r => r.status === 'sent');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCheck className="h-8 w-8" />
            Insurance & Medical Requests
          </h1>
          <p className="text-muted-foreground">Manage insurance forms, medical reports, and third-party requests</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Log Request
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{receivedRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Assigned to GP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignedRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sentRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading medical requests...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No medical requests recorded</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Medical Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={
                          request.status === 'sent' ? 'default' : 
                          request.status === 'assigned' ? 'secondary' : 
                          'outline'
                        }>
                          {request.status}
                        </Badge>
                        <Badge variant="outline">{request.request_type}</Badge>
                      </div>
                      {request.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{request.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Received: {new Date(request.received_at).toLocaleDateString()}
                    </span>
                    {request.assigned_gp_id && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        Assigned to GP
                      </span>
                    )}
                    {request.sent_at && (
                      <span className="flex items-center gap-1 text-success">
                        Sent: {new Date(request.sent_at).toLocaleDateString()}
                      </span>
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
