import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IncidentReportDialog } from "@/components/incidents/IncidentReportDialog";
import { useAuth } from "@/hooks/useAuth";
import { Plus, AlertCircle, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { triggerHaptic } from "@/lib/haptics";

export default function IncidentsList() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const practiceId = user?.practiceId || '';

  const { data: incidents = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['incidents', practiceId],
    queryFn: async () => {
      if (!practiceId) return [];
      const res = await fetch(`/api/practices/${practiceId}/incidents`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch incidents');
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'major':
      case 'high':
        return 'bg-orange-500 text-white';
      case 'moderate':
      case 'medium':
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
      <div ref={scrollableRef} className="space-y-4 sm:space-y-6 p-3 sm:p-6 overflow-y-auto">
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Incidents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Report and track workplace incidents</p>
          </div>
          <Button 
            onClick={() => setReportDialogOpen(true)}
            size={isMobile ? 'lg' : 'default'}
            className="w-full sm:w-auto min-h-[44px]"
            data-testid="button-report-incident"
          >
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="touch-manipulation">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold" data-testid="text-total-incidents">{totalIncidents}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">All time</p>
            </CardContent>
          </Card>

          <Card className="touch-manipulation">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Open</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold" data-testid="text-open-incidents">{openIncidents}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Active</p>
            </CardContent>
          </Card>

          <Card className="touch-manipulation">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-red-600" data-testid="text-critical-incidents">{criticalIncidents}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">Priority</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Incident Reports</CardTitle>
            <CardDescription className="text-sm">View and manage all incident reports</CardDescription>
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
                <Button 
                  onClick={() => setReportDialogOpen(true)}
                  className="min-h-[44px]"
                  data-testid="button-report-first-incident"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Report First Incident
                </Button>
              </div>
            ) : isMobile ? (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div 
                    key={incident.id} 
                    className="border rounded-lg p-4 space-y-3 touch-manipulation active:bg-accent"
                    data-testid={`card-incident-${incident.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">
                          {incident.dateOccurred ? format(new Date(incident.dateOccurred), 'dd/MM/yyyy HH:mm') : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">{incident.location}</p>
                      </div>
                      <Badge className={getSeverityColor(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {incident.category && (
                        <Badge variant="outline">
                          {incident.category.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      <Badge className={getStatusColor(incident.status)}>
                        {incident.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                      <TableRow key={incident.id} data-testid={`row-incident-${incident.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {incident.dateOccurred ? format(new Date(incident.dateOccurred), 'dd/MM/yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {incident.category && (
                            <Badge variant="outline">
                              {incident.category.replace(/_/g, ' ')}
                            </Badge>
                          )}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <IncidentReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </>
  );
}
