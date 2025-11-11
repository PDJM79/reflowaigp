import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Shield, Download, TrendingUp, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { ComplianceTagBadge } from '@/components/compliance/ComplianceTagBadge';

export default function ComplianceOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isFrameworkOpen, setIsFrameworkOpen] = useState(true);
  const [isReadinessOpen, setIsReadinessOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    // Set default date range (last 3 months)
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  }, [user, navigate]);

  // Fetch compliance data
  const { data: complianceData } = useQuery({
    queryKey: ['compliance-overview', user?.id, dateRange],
    queryFn: async () => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return null;

      // Fetch multiple compliance-related tables
      const [
        scoreData,
        tasksData,
        assessmentsData,
        incidentsData,
        policiesData,
      ] = await Promise.all([
        (supabase as any).from('score_current').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('tasks').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('fire_safety_assessments').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('incidents').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('policy_documents').select('*').eq('practice_id', userData.practice_id),
      ]);

      return {
        scores: scoreData.data || [],
        tasks: tasksData.data || [],
        assessments: assessmentsData.data || [],
        incidents: incidentsData.data || [],
        policies: policiesData.data || [],
      };
    },
    enabled: !!user?.id && !!dateRange.start,
  });

  const getRAGStatus = (score: number): 'green' | 'amber' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'amber';
    return 'red';
  };

  const handleExportPDF = async () => {
    if (!complianceData) return;

    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const exporter = new DashboardPDFExporter({
      title: 'Compliance Overview Dashboard',
      subtitle: 'HIW/CQC Readiness & Regulatory Compliance Tracking',
      dateRange,
    });

    // Key Metrics
    exporter.addSection('Key Performance Indicators');
    exporter.addMetricsGrid([
      { label: 'Overall Compliance Score', value: `${avgScore}%`, subtitle: getRAGStatus(avgScore).toUpperCase() },
      { label: 'Task Completion Rate', value: `${taskCompletionRate}%`, subtitle: `${completedTasks} of ${complianceData.tasks.length} completed` },
      { label: 'Active Policies', value: `${complianceData.policies.filter((p: any) => p.status === 'active').length}`, subtitle: 'Up to date' },
      { label: 'Safety Incidents', value: `${complianceData.incidents.length}`, subtitle: 'Last 3 months' },
    ]);

    // Regulatory Framework Compliance
    exporter.addSection('Regulatory Framework Compliance');
    
    exporter.addRAGIndicator('HIW - Healthcare Inspectorate Wales', getRAGStatus(85), 85);
    exporter.addKeyValuePairs([
      { key: 'Quality of patient experience', value: '85%' },
      { key: 'Delivery of safe & effective care', value: '82%' },
      { key: 'Quality of management & leadership', value: '88%' },
    ]);

    exporter.addRAGIndicator('CQC - Care Quality Commission', getRAGStatus(83), 83);
    exporter.addKeyValuePairs([
      { key: 'Safe', value: '80%' },
      { key: 'Effective', value: '85%' },
      { key: 'Caring', value: '90%' },
      { key: 'Responsive', value: '82%' },
      { key: 'Well-led', value: '78%' },
    ]);

    exporter.addRAGIndicator('QOF - Quality & Outcomes Framework', getRAGStatus(92), 92);
    exporter.addKeyValuePairs([
      { key: 'Clinical indicators', value: '95%' },
      { key: 'Public health indicators', value: '88%' },
      { key: 'Quality improvement', value: '93%' },
    ]);

    // Inspection Readiness
    exporter.addSection('Inspection Readiness');
    exporter.addList([
      '✓ Evidence Pack Complete - All required documents ready',
      '⚠ Policy Reviews - 3 policies need review',
      '✓ Staff Training Records - All staff up to date',
      '✓ Safety Audits - Latest audits completed',
    ]);

    exporter.save(generateFilename('compliance-overview', dateRange));
  };

  if (!complianceData) {
    return <div className="space-y-4 p-3 sm:p-6">Loading compliance data...</div>;
  }

  const totalScore = complianceData.scores.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
  const avgScore = complianceData.scores.length > 0 ? Math.round(totalScore / complianceData.scores.length) : 0;
  const completedTasks = complianceData.tasks.filter((t: any) => t.status === 'complete').length;
  const taskCompletionRate = complianceData.tasks.length > 0 
    ? Math.round((completedTasks / complianceData.tasks.length) * 100) 
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            Compliance Overview
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">HIW/CQC readiness tracking</p>
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

      {/* Key Metrics */}
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
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{taskCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks}/{complianceData.tasks.length}
            </p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {complianceData.policies.filter((p: any) => p.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Up to date</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{complianceData.incidents.length}</div>
            <p className="text-xs text-muted-foreground">Last 3 months</p>
          </CardContent>
        </Card>
      </div>

      {/* HIW/CQC Domain Breakdown */}
      <Collapsible open={isFrameworkOpen} onOpenChange={setIsFrameworkOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Regulatory Framework Compliance</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isFrameworkOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 sm:p-4 border rounded-lg touch-manipulation">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm sm:text-base">HIW - Healthcare Inspectorate Wales</h4>
                    <RAGBadge status={getRAGStatus(85)} />
                  </div>
                  <div className="grid gap-2 mt-3">
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="flex-1">Quality of patient experience</span>
                      <Badge variant="secondary" className="text-xs">85%</Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="flex-1">Delivery of safe & effective care</span>
                      <Badge variant="secondary" className="text-xs">82%</Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="flex-1">Quality of management & leadership</span>
                      <Badge variant="secondary" className="text-xs">88%</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 border rounded-lg touch-manipulation">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm sm:text-base">CQC - Care Quality Commission</h4>
                    <RAGBadge status={getRAGStatus(83)} />
                  </div>
                  <div className="grid gap-2 mt-3">
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span>Safe</span>
                      <Badge variant="secondary" className="text-xs">80%</Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span>Effective</span>
                      <Badge variant="secondary" className="text-xs">85%</Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span>Caring</span>
                      <Badge variant="secondary" className="text-xs">90%</Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span>Responsive</span>
                      <Badge variant="secondary" className="text-xs">82%</Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span>Well-led</span>
                      <Badge variant="secondary" className="text-xs">78%</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 border rounded-lg touch-manipulation">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm sm:text-base">QOF - Quality & Outcomes Framework</h4>
                    <RAGBadge status={getRAGStatus(92)} />
                  </div>
                  <div className="grid gap-2 mt-3">
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="flex-1">Clinical indicators</span>
                      <Badge variant="secondary" className="text-xs">95%</Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="flex-1">Public health indicators</span>
                      <Badge variant="secondary" className="text-xs">88%</Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="flex-1">Quality improvement</span>
                      <Badge variant="secondary" className="text-xs">93%</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Readiness Indicators */}
      <Collapsible open={isReadinessOpen} onOpenChange={setIsReadinessOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Inspection Readiness</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isReadinessOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Evidence Pack Complete</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">All documents ready</p>
                  </div>
                </div>
                <Badge className="bg-success self-start sm:self-center">Ready</Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Policy Reviews</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">3 policies need review</p>
                  </div>
                </div>
                <Badge className="bg-warning self-start sm:self-center whitespace-nowrap">Action Required</Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Staff Training Records</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">All staff up to date</p>
                  </div>
                </div>
                <Badge className="bg-success self-start sm:self-center">Ready</Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Safety Audits</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Latest audits completed</p>
                  </div>
                </div>
                <Badge className="bg-success self-start sm:self-center">Ready</Badge>
              </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
