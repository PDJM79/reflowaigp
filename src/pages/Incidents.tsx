import { useState, useEffect } from 'react';
import { IncidentReportDialog } from '@/components/incidents/IncidentReportDialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Calendar, RefreshCw } from 'lucide-react';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

export default function Incidents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
      if (!user?.practiceId) return;
      setLoadError(false);

      const res = await fetch(`/api/practices/${user.practiceId}/incidents`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load incidents');
      const data = await res.json();
      // API returns Drizzle camelCase; map the one field the render reads as snake_case.
      const mapped = (Array.isArray(data) ? data : []).map((i: any) => ({
        ...i,
        incident_date: i.incidentDate ?? i.dateOccurred ?? i.createdAt,
      }));
      mapped.sort((a, b) => new Date(b.incident_date || 0).getTime() - new Date(a.incident_date || 0).getTime());
      setIncidents(mapped);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setLoadError(true);
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
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="font-medium">Failed to load incidents</p>
            <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchIncidents(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />Retry
            </Button>
          </CardContent>
        </Card>
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
