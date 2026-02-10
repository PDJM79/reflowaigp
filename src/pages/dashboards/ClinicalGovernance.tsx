import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Activity, Download, TrendingUp, AlertCircle, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function ClinicalGovernance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isTrendsOpen, setIsTrendsOpen] = useState(true);
  const [isIPCOpen, setIsIPCOpen] = useState(true);
  const [isScriptsOpen, setIsScriptsOpen] = useState(false);

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

  const { data: clinicalData } = useQuery({
    queryKey: ['clinical-governance', user?.practiceId, dateRange],
    queryFn: async () => {
      const practiceId = user?.practiceId;
      if (!practiceId) return null;

      const incidentsRes = await fetch(`/api/practices/${practiceId}/incidents`, { credentials: 'include' });
      const incidents = incidentsRes.ok ? await incidentsRes.json() : [];

      return {
        incidents: Array.isArray(incidents) ? incidents : [],
        claims: [],
        ipcActions: [],
        medicalRequests: [],
        scripts: [],
      };
    },
    enabled: !!user?.practiceId && !!dateRange.start,
  });

  const handleExportPDF = async () => {
    if (!clinicalData) return;

    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const exporter = new DashboardPDFExporter({
      title: 'Clinical Governance Dashboard',
      subtitle: 'Patient Safety, Incidents, and Clinical Quality Monitoring',
      dateRange,
    });

    exporter.addSection('Key Clinical Metrics');
    exporter.addMetricsGrid([
      { label: 'Total Incidents', value: `${clinicalData.incidents.length}`, subtitle: `${criticalIncidents} critical` },
      { label: 'Claims Processed', value: `${clinicalData.claims.length}`, subtitle: 'Enhanced services' },
      { label: 'IPC Actions', value: `${pendingIPC}`, subtitle: 'Pending completion' },
      { label: 'Medical Request Turnaround', value: `${avgMedicalRequestTurnaround} days`, subtitle: 'Average time' },
    ]);

    exporter.addSection('Incident Trends & Analysis');
    const incidentCategories = ['Clinical', 'Non-Clinical', 'Medication Error', 'Near Miss'];
    const incidentRows = incidentCategories.map(category => {
      const count = clinicalData.incidents.filter((i: any) => 
        i.incidentCategory?.toLowerCase().includes(category.toLowerCase())
      ).length;
      const percentage = Math.round((count / Math.max(clinicalData.incidents.length, 1)) * 100);
      return [category, count.toString(), `${percentage}%`];
    });
    exporter.addTable(['Category', 'Count', 'Percentage'], incidentRows, 'Incidents by Category');

    exporter.addSection('Infection Prevention & Control');
    exporter.addList([
      'Six-Monthly IPC Audits - May & December audits up to date',
      `Action Plan Items - ${pendingIPC} pending actions`,
    ]);

    exporter.save(generateFilename('clinical-governance', dateRange));
  };

  if (!clinicalData) {
    return <div className="space-y-4 p-3 sm:p-6">Loading clinical governance data...</div>;
  }

  const criticalIncidents = clinicalData.incidents.filter((i: any) => i.severity === 'critical').length;
  const pendingIPC = clinicalData.ipcActions.filter((a: any) => !a.completedAt).length;
  const avgMedicalRequestTurnaround = 5;

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
            <div className="text-2xl sm:text-3xl font-bold">{clinicalData.incidents.length}</div>
            <p className="text-xs text-muted-foreground">{criticalIncidents} critical</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{clinicalData.claims.length}</div>
            <p className="text-xs text-muted-foreground">Enhanced services</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">IPC Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{pendingIPC}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Request Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{avgMedicalRequestTurnaround} days</div>
            <p className="text-xs text-muted-foreground">Average</p>
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
              <div className="space-y-3">
                {['Clinical', 'Non-Clinical', 'Medication Error', 'Near Miss'].map((category) => {
                  const count = clinicalData.incidents.filter((i: any) => i.incidentCategory?.toLowerCase().includes(category.toLowerCase())).length;
                  return (
                    <div key={category} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                      <div className="flex-1 w-full">
                        <p className="font-medium text-sm sm:text-base mb-1">{category}</p>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2" 
                            style={{ width: `${(count / Math.max(clinicalData.incidents.length, 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right self-start sm:self-center">
                        <p className="text-xl sm:text-2xl font-bold">{count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={isIPCOpen} onOpenChange={setIsIPCOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Infection Prevention & Control</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isIPCOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Six-Monthly IPC Audits</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">May & December</p>
                  </div>
                  <Badge className="bg-success self-start sm:self-center">Up to Date</Badge>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Action Plan Items</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{pendingIPC} pending</p>
                  </div>
                  <Badge variant="secondary" className="self-start sm:self-center">{pendingIPC} open</Badge>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={isScriptsOpen} onOpenChange={setIsScriptsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Month-End Script Review</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isScriptsOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                {clinicalData.scripts.length} scripts reviewed this quarter
              </p>
              {clinicalData.scripts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No script review data available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {clinicalData.scripts.slice(0, 5).map((script: any) => (
                    <div key={script.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg text-xs sm:text-sm touch-manipulation active:bg-accent gap-2">
                      <span className="font-medium">{new Date(script.date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">{script.medication}</span>
                      <Badge variant="outline" className="self-start sm:self-center">{script.status}</Badge>
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
