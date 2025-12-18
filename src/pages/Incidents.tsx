import { useState, useEffect } from 'react';
import { IncidentReportDialog } from '@/components/incidents/IncidentReportDialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Calendar } from 'lucide-react';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

export default function Incidents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchIncidents();
  }, [user, navigate]);

  const fetchIncidents = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('incident_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const openIncidents = incidents.filter(i => i.status === 'open');
  const redIncidents = incidents.filter(i => i.rag === 'red');
  const amberIncidents = incidents.filter(i => i.rag === 'amber');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            Incidents & Risk Register
          </h1>
          <p className="text-muted-foreground">Track and manage practice incidents</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openIncidents.length}</div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive">High Risk (Red)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{redIncidents.length}</div>
          </CardContent>
        </Card>

        <Card className="border-warning">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-warning">Medium Risk (Amber)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{amberIncidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{incidents.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading incidents...</div>
      ) : incidents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No incidents recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {incidents.slice(0, 10).map((incident) => (
            <Card key={incident.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <RAGBadge status={incident.rag as any} />
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(incident.incident_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <IncidentReportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
