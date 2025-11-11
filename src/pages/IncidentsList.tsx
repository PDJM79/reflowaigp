import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IncidentReportDialog } from "@/components/incidents/IncidentReportDialog";
import { useAuth } from "@/hooks/useAuth";
import { Plus, AlertCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function IncidentsList() {
  const { user } = useAuth();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const { data: incidents = [], isLoading } = useQuery<any[]>({
    queryKey: ['incidents', user?.id],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return [];

      const { data, error } = await supabase
        .from('incidents' as any)
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('incident_date', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  const { data: trends } = useQuery<any[]>({
    queryKey: ['incident-trends', user?.id],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return [];

      const { data, error } = await supabase
        .from('incident_trends' as any)
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('month', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'major':
        return 'bg-orange-500 text-white';
      case 'moderate':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'resolved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'under_investigation':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(i => i.status !== 'closed').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Incidents</h1>
            <p className="text-muted-foreground">Report and track workplace incidents</p>
          </div>
          <Button onClick={() => setReportDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalIncidents}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openIncidents}</div>
              <p className="text-xs text-muted-foreground">Requiring attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Critical Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{criticalIncidents}</div>
              <p className="text-xs text-muted-foreground">High priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Incidents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Reports</CardTitle>
            <CardDescription>View and manage all incident reports</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading incidents...</div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No incidents reported</p>
                <p className="text-muted-foreground mb-4">
                  All staff can report incidents when they occur
                </p>
                <Button onClick={() => setReportDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Report First Incident
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(incident.incident_date), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {incident.category.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{incident.location}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(incident.status)}>
                          {incident.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Trends (if available) */}
        {trends && trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Incident Trends
              </CardTitle>
              <CardDescription>Monthly incident statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.map((trend) => (
                  <div key={trend.month} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">
                        {format(new Date(trend.month), 'MMMM yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trend.category.replace(/_/g, ' ')} - {trend.severity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{trend.incident_count} incidents</p>
                      <p className="text-xs text-muted-foreground">
                        {trend.resolved_count} resolved ({Math.round((trend.resolved_count / trend.incident_count) * 100)}%)
                      </p>
                      {trend.avg_resolution_days && (
                        <p className="text-xs text-muted-foreground">
                          Avg: {trend.avg_resolution_days} days
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <IncidentReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </>
  );
}
