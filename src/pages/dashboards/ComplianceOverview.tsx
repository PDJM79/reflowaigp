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

interface ComplianceData {
  tasks: ComplianceTask[];
  incidents: unknown[];
  policies: CompliancePolicy[];
}

const LATE_COMPLETION_CREDIT = 0.7;

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

      const [tasksRes, incidentsRes, policiesRes] = await Promise.all([
        fetch(`/api/practices/${practiceId}/tasks`, { credentials: 'include' }),
        fetch(`/api/practices/${practiceId}/incidents`, { credentials: 'include' }),
        fetch(`/api/practices/${practiceId}/policies`, { credentials: 'include' }),
      ]);

      if (!tasksRes.ok || !incidentsRes.ok || !policiesRes.ok) {
        throw new Error('Failed to load compliance data');
      }

      const tasks = await tasksRes.json();
      const incidents = await incidentsRes.json();
      const policies = await policiesRes.json();

      return {
        tasks: Array.isArray(tasks) ? tasks : [],
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

  const { tasks, incidents, policies } = complianceData;
  const completedTasks = tasks.filter((t) => t.status === 'complete');
  const completedOnTime = completedTasks.filter(
    (t) => t.completedAt && t.dueAt && new Date(t.completedAt) <= new Date(t.dueAt)
  ).length;
  const completedLate = completedTasks.length - completedOnTime;
  const avgScore = tasks.length > 0
    ? Math.round(((completedOnTime + completedLate * LATE_COMPLETION_CREDIT) / tasks.length) * 100)
    : 0;
  const taskCompletionRate = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;
  const activePolicies = policies.filter((p) => p.status === 'active').length;

  const handleExportPDF = async () => {
    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');

    const exporter = new DashboardPDFExporter({
      title: 'Compliance Overview Dashboard',
      subtitle: 'Regulatory Readiness & Compliance Tracking',
      dateRange,
    });

    exporter.addSection('Key Performance Indicators');
    exporter.addMetricsGrid([
      { label: 'Overall Compliance Score', value: `${avgScore}%`, subtitle: getRAGStatus(avgScore).toUpperCase() },
      { label: 'Task Completion Rate', value: `${taskCompletionRate}%`, subtitle: `${completedTasks.length} of ${tasks.length} completed` },
      { label: 'Active Policies', value: `${activePolicies}`, subtitle: 'Currently active' },
      { label: 'Safety Incidents', value: `${incidents.length}`, subtitle: 'Last 3 months' },
    ]);

    exporter.addSection('Task Completion Detail');
    exporter.addKeyValuePairs([
      { key: 'Completed on time', value: `${completedOnTime}` },
      { key: 'Completed late', value: `${completedLate}` },
      { key: 'Outstanding', value: `${tasks.length - completedTasks.length}` },
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
            <div className="flex items-center gap-2">
              <div className="text-2xl sm:text-3xl font-bold">{avgScore}%</div>
              <RAGBadge status={getRAGStatus(avgScore)} />
            </div>
            <p className="text-xs text-muted-foreground">On-time task completion</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{taskCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks.length}/{tasks.length}
            </p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{activePolicies}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
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
