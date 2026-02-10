import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Plus, Calendar, UserCheck, Info } from 'lucide-react';

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
    setLoading(false);
  }, [user, navigate]);

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

      <Card>
        <CardContent className="py-12 text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2 font-medium">Medical requests data will be available soon.</p>
          <p className="text-sm text-muted-foreground">
            This feature is being migrated to the new system. Request logging and tracking will be restored shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
