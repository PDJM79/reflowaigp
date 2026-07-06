import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

interface ComplianceTask {
  status?: string;
  completedAt?: string | null;
  dueAt?: string | null;
}

interface CompliancePolicy {
  status?: string;
}

interface ComplianceAnalytics {
  compliance_score: number | null;
  fit_for_audit_score: number | null;
  basis: { compliance: string };
  breakdown: { expected: number; completed_on_time: number; completed_late: number; overdue_open: number; missed: number };
}

interface ComplianceData {
  analytics: ComplianceAnalytics;
  incidents: unknown[];
  policies: CompliancePolicy[];
}

export default function ComplianceOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

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

  const { data: complianceData, isLoading, isError, refetch } = useQuery<ComplianceData | null>({
    queryKey: ['compliance-overview', user?.practiceId, dateRange],
    queryFn: async () => {
      const practiceId = user?.practiceId;
      if (!practiceId) return null;

      const [analyticsRes, incidentsRes, policiesRes] = await Promise.all([
        fetch(`/api/practices/${practiceId}/analytics/compliance?from=${dateRange.start}&to=${dateRange.end}`, { credentials: 'include' }),
        fetch(`/api/practices/${practiceId}/incidents`, { credentials: 'include' }),
        fetch(`/api/practices/${practiceId}/policies`, { credentials: 'include' }),
      ]);

      if (!analyticsRes.ok || !incidentsRes.ok || !policiesRes.ok) {
        throw new Error('Failed to load compliance data');
      }

      const analytics = await analyticsRes.json();
      const incidents = await incidentsRes.json();
      const policies = await policiesRes.json();

      return {
        analytics,
        incidents: Array.isArray(incidents) ? incidents : [],
        policies: Array.isArray(policies) ? policies : [],
      };
    },
    enabled: !!user?.practiceId && !!dateRange.start,
  });

  const getRAGStatus = (score: number): 'green' | 'amber' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'amber';
    return 'red';
  };

  if (isLoading || (!complianceData && !isError)) {
    return <div className="space-y-4 p-3 sm:p-6">Loading compliance data...</div>;
  }

  if (isError || !complianceData) {
    return (
      <div className="p-3 sm:p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-medium">Failed to load compliance data</p>
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

  const { analytics, incidents, policies } = complianceData;
  const b = analytics.breakdown;
  const completedOnTime = b.completed_on_time;
  const completedLate = b.completed_late;
  const completedCount = completedOnTime + completedLate;
  // Server-computed compliance score (on-time + 0.5x late / expected). null = no scheduled work.
  const hasScore = analytics.compliance_score != null;
  const avgScore = analytics.compliance_score ?? 0;
  const fitScore = analytics.fit_for_audit_score;
  const taskCompletionRate = b.expected > 0 ? Math.round((completedCount / b.expected) * 100) : 0;
  void policies; // retained in payload for future policy KPIs

  const handleExportPDF = async () => {
    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');

    const exporter = new DashboardPDFExporter({
      title: 'Compliance Overview Dashboard',
      subtitle: 'Regulatory Readiness & Compliance Tracking',
      dateRange,
    });

    exporter.addSection('Key Performance Indicators');
    exporter.addMetricsGrid([
      { label: 'Overall Compliance Score', value: hasScore ? `${avgScore}%` : 'N/A', subtitle: hasScore ? getRAGStatus(avgScore).toUpperCase() : 'No scheduled work' },
      { label: 'Fit for Audit', value: fitScore != null ? `${fitScore}%` : 'N/A', subtitle: 'Audit readiness' },
      { label: 'Task Completion Rate', value: `${taskCompletionRate}%`, subtitle: `${completedCount} of ${b.expected} completed` },
      { label: 'Safety Incidents', value: `${incidents.length}`, subtitle: 'Last 3 months' },
    ]);

    exporter.addSection('Occurrence Completion Detail');
    exporter.addKeyValuePairs([
      { key: 'Completed on time', value: `${completedOnTime}` },
      { key: 'Completed late', value: `${completedLate}` },
      { key: 'Overdue (open)', value: `${b.overdue_open}` },
      { key: 'Missed', value: `${b.missed}` },
    ]);

    exporter.save(generateFilename('compliance-overview', dateRange));
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            Compliance Overview
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Regulatory readiness tracking</p>
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
            <CardTitle className="text-xs sm:text-sm font-medium">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            {hasScore ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-2xl sm:text-3xl font-bold">{avgScore}%</div>
                  <RAGBadge status={getRAGStatus(avgScore)} />
                </div>
                <p className="text-xs text-muted-foreground">On-time completion (late ½ credit)</p>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-3xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">No scheduled work in period</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Fit for Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{fitScore != null ? `${fitScore}%` : '—'}</div>
            <p className="text-xs text-muted-foreground">Audit readiness</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{taskCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{b.expected}
            </p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{incidents.length}</div>
            <p className="text-xs text-muted-foreground">Last 3 months</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Regulatory Framework Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Framework-level scoring (HIW, CQC, QOF) is not yet available. It will appear here
            once compliance data is mapped to regulatory frameworks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
