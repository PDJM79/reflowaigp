import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Activity, Download, AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Incident {
  category?: string | null;
  severity?: string | null;
  closedAt?: string | null;
}

const INCIDENT_CATEGORIES = [
  { value: 'patient_fall', label: 'Patient Fall' },
  { value: 'medication_error', label: 'Medication Error' },
  { value: 'equipment_failure', label: 'Equipment Failure' },
  { value: 'staff_injury', label: 'Staff Injury' },
  { value: 'security_breach', label: 'Security Breach' },
  { value: 'infection_control', label: 'Infection Control' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'other', label: 'Other' },
];

export default function ClinicalGovernance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isTrendsOpen, setIsTrendsOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  }, [user, navigate]);

  const { data: incidents, isLoading, isError, refetch } = useQuery<Incident[] | null>({
    queryKey: ['clinical-governance', user?.practiceId, dateRange],
    queryFn: async () => {
      const practiceId = user?.practiceId;
      if (!practiceId) return null;

      const incidentsRes = await fetch(`/api/practices/${practiceId}/incidents`, { credentials: 'include' });
      if (!incidentsRes.ok) {
        throw new Error('Failed to load incidents');
      }
      const data = await incidentsRes.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.practiceId && !!dateRange.start,
  });

  if (isLoading || (!incidents && !isError)) {
    return <div className="space-y-4 p-3 sm:p-6">Loading clinical governance data...</div>;
  }

  if (isError || !incidents) {
    return (
      <div className="p-3 sm:p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-medium">Failed to load clinical governance data</p>
              <p className="text-sm text-muted-foreground">
                Check your connection and try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criticalIncidents = incidents.filter((i) => i.severity === 'critical').length;
  const openIncidents = incidents.filter((i) => !i.closedAt).length;
  const closedIncidents = incidents.length - openIncidents;
  const categoryCounts = INCIDENT_CATEGORIES.map(({ value, label }) => ({
    label,
    count: incidents.filter((i) => i.category === value).length,
  }));

  const handleExportPDF = async () => {
    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');

    const exporter = new DashboardPDFExporter({
      title: 'Clinical Governance Dashboard',
      subtitle: 'Patient Safety, Incidents, and Clinical Quality Monitoring',
      dateRange,
    });

    exporter.addSection('Key Clinical Metrics');
    exporter.addMetricsGrid([
      { label: 'Total Incidents', value: `${incidents.length}`, subtitle: 'Last 3 months' },
      { label: 'Critical Incidents', value: `${criticalIncidents}`, subtitle: 'Severity: critical' },
      { label: 'Open Incidents', value: `${openIncidents}`, subtitle: 'Not yet closed' },
      { label: 'Closed Incidents', value: `${closedIncidents}`, subtitle: 'Resolved' },
    ]);

    exporter.addSection('Incident Trends & Analysis');
    const incidentRows = categoryCounts.map(({ label, count }) => {
      const percentage = Math.round((count / Math.max(incidents.length, 1)) * 100);
      return [label, count.toString(), `${percentage}%`];
    });
    exporter.addTable(['Category', 'Count', 'Percentage'], incidentRows, 'Incidents by Category');

    exporter.save(generateFilename('clinical-governance', dateRange));
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8" />
            Clinical Governance
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Patient safety monitoring</p>
        </div>
        <Button
          onClick={handleExportPDF}
          size={isMobile ? 'lg' : 'default'}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{incidents.length}</div>
            <p className="text-xs text-muted-foreground">Last 3 months</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{criticalIncidents}</div>
            <p className="text-xs text-muted-foreground">Severity: critical</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{openIncidents}</div>
            <p className="text-xs text-muted-foreground">Not yet closed</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{closedIncidents}</div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={isTrendsOpen} onOpenChange={setIsTrendsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Incident Trends & Analysis</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isTrendsOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {incidents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No incidents reported in this period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryCounts.map(({ label, count }) => (
                    <div key={label} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                      <div className="flex-1 w-full">
                        <p className="font-medium text-sm sm:text-base mb-1">{label}</p>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{ width: `${(count / Math.max(incidents.length, 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right self-start sm:self-center">
                        <p className="text-xl sm:text-2xl font-bold">{count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
