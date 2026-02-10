import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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

  const practiceId = user?.practiceId || '';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchIncidents();
  }, [user, navigate]);

  const fetchIncidents = async () => {
    if (!practiceId) return;
    try {
      const res = await fetch(`/api/practices/${practiceId}/incidents`, { credentials: 'include' });

      if (!res.ok) throw new Error('Failed to fetch incidents');
      const data = await res.json();
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const openIncidents = incidents.filter(i => i.status === 'open');
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' || i.severity === 'high');
  const moderateIncidents = incidents.filter(i => i.severity === 'moderate' || i.severity === 'medium');

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
        <Button data-testid="button-report-incident">
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
            <div className="text-3xl font-bold" data-testid="text-open-incidents-count">{openIncidents.length}</div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-high-risk-count">{criticalIncidents.length}</div>
          </CardContent>
        </Card>

        <Card className="border-warning">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-warning">Medium Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-medium-risk-count">{moderateIncidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-incidents-count">{incidents.length}</div>
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
            <Card key={incident.id} className="hover:shadow-lg transition-shadow" data-testid={`card-incident-${incident.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{incident.severity || 'unknown'}</Badge>
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{incident.dateOccurred ? new Date(incident.dateOccurred).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
