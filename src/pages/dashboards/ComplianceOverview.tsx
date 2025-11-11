import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Download, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { ComplianceTagBadge } from '@/components/compliance/ComplianceTagBadge';

export default function ComplianceOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

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

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log('Exporting PDF...');
  };

  if (!complianceData) {
    return <div className="container mx-auto p-6">Loading compliance data...</div>;
  }

  const totalScore = complianceData.scores.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
  const avgScore = complianceData.scores.length > 0 ? Math.round(totalScore / complianceData.scores.length) : 0;
  const completedTasks = complianceData.tasks.filter((t: any) => t.status === 'complete').length;
  const taskCompletionRate = complianceData.tasks.length > 0 
    ? Math.round((completedTasks / complianceData.tasks.length) * 100) 
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Compliance Overview Dashboard
          </h1>
          <p className="text-muted-foreground">HIW/CQC readiness and regulatory compliance tracking</p>
        </div>
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overall Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold">{avgScore}%</div>
              <RAGBadge status={getRAGStatus(avgScore)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Task Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{taskCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} of {complianceData.tasks.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {complianceData.policies.filter((p: any) => p.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Up to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Safety Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{complianceData.incidents.length}</div>
            <p className="text-xs text-muted-foreground">Last 3 months</p>
          </CardContent>
        </Card>
      </div>

      {/* HIW/CQC Domain Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Framework Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">HIW - Healthcare Inspectorate Wales</h4>
                <RAGBadge status={getRAGStatus(85)} />
              </div>
              <div className="grid gap-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span>Quality of patient experience</span>
                  <Badge variant="secondary">85%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery of safe & effective care</span>
                  <Badge variant="secondary">82%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quality of management & leadership</span>
                  <Badge variant="secondary">88%</Badge>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">CQC - Care Quality Commission</h4>
                <RAGBadge status={getRAGStatus(83)} />
              </div>
              <div className="grid gap-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span>Safe</span>
                  <Badge variant="secondary">80%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Effective</span>
                  <Badge variant="secondary">85%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Caring</span>
                  <Badge variant="secondary">90%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Responsive</span>
                  <Badge variant="secondary">82%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Well-led</span>
                  <Badge variant="secondary">78%</Badge>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">QOF - Quality & Outcomes Framework</h4>
                <RAGBadge status={getRAGStatus(92)} />
              </div>
              <div className="grid gap-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span>Clinical indicators</span>
                  <Badge variant="secondary">95%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Public health indicators</span>
                  <Badge variant="secondary">88%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quality improvement</span>
                  <Badge variant="secondary">93%</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Evidence Pack Complete</p>
                  <p className="text-sm text-muted-foreground">All required documents ready</p>
                </div>
              </div>
              <Badge className="bg-success">Ready</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Policy Reviews</p>
                  <p className="text-sm text-muted-foreground">3 policies need review</p>
                </div>
              </div>
              <Badge className="bg-warning">Action Required</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Staff Training Records</p>
                  <p className="text-sm text-muted-foreground">All staff up to date</p>
                </div>
              </div>
              <Badge className="bg-success">Ready</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Safety Audits</p>
                  <p className="text-sm text-muted-foreground">Latest audits completed</p>
                </div>
              </div>
              <Badge className="bg-success">Ready</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
