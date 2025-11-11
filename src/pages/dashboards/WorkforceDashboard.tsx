import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Download, Shield, GraduationCap, FileText, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TrainingExpiryAlerts } from '@/components/hr/TrainingExpiryAlerts';

export default function WorkforceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isDBSOpen, setIsDBSOpen] = useState(false);
  const [isAppraisalOpen, setIsAppraisalOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  const { data: workforceData } = useQuery({
    queryKey: ['workforce-dashboard', user?.id],
    queryFn: async () => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return null;

      const [employees, dbsChecks, training, appraisals] = await Promise.all([
        (supabase as any).from('employees').select('*').eq('practice_id', userData.practice_id).is('end_date', null),
        (supabase as any).from('dbs_checks').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('training_records').select('*, employee:employees!inner(practice_id)').eq('employee.practice_id', userData.practice_id),
        (supabase as any).from('appraisals').select('*, employee:employees!inner(practice_id)').eq('employee.practice_id', userData.practice_id),
      ]);

      return {
        employees: employees.data || [],
        dbsChecks: dbsChecks.data || [],
        training: training.data || [],
        appraisals: appraisals.data || [],
      };
    },
    enabled: !!user?.id,
  });

  const handleExportPDF = async () => {
    if (!workforceData) return;

    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const exporter = new DashboardPDFExporter({
      title: 'Workforce Dashboard',
      subtitle: 'Staff Compliance, Training, and HR Monitoring',
    });

    // Key Metrics
    exporter.addSection('Key Workforce Metrics');
    exporter.addMetricsGrid([
      { label: 'Active Staff', value: `${workforceData.employees.length}`, subtitle: 'Current headcount' },
      { label: 'DBS Checks', value: `${workforceData.dbsChecks.length}`, subtitle: `${dbsDueSoon} due within 6 months` },
      { label: 'Training Records', value: `${workforceData.training.length}`, subtitle: `${trainingExpiringSoon} expiring soon` },
      { label: 'Pending Appraisals', value: `${pendingAppraisals}`, subtitle: 'To be completed' },
    ]);

    // DBS Review Schedule
    exporter.addSection('DBS Review Schedule (3-Year Cycle)');
    const dbsRows = workforceData.dbsChecks.slice(0, 10).map((check: any) => {
      const isDueSoon = new Date(check.next_review_due).getTime() < new Date().setMonth(new Date().getMonth() + 6);
      return [
        check.employee_id.slice(0, 8),
        new Date(check.check_date).toLocaleDateString(),
        new Date(check.next_review_due).toLocaleDateString(),
        isDueSoon ? 'Due Soon' : 'On Track',
      ];
    });
    exporter.addTable(['Employee ID', 'Last Check', 'Next Review', 'Status'], dbsRows);

    // Appraisal Status
    exporter.addSection('Annual Appraisal Status');
    const completedAppraisals = workforceData.appraisals.filter((a: any) => a.status === 'completed').length;
    const completionRate = Math.round((completedAppraisals / Math.max(workforceData.employees.length, 1)) * 100);
    exporter.addKeyValuePairs([
      { key: 'Completed This Year', value: `${completedAppraisals} appraisals (${completionRate}%)` },
      { key: 'Scheduled', value: `${pendingAppraisals} pending` },
    ]);

    // Training Compliance
    if (trainingExpiringSoon > 0) {
      exporter.addSection('Training Expiry Alerts');
      exporter.addList([
        `${trainingExpiringSoon} training certificates expiring within 90 days`,
        'Review TrainingExpiryAlerts component for detailed breakdown',
      ]);
    }

    exporter.save(generateFilename('workforce-dashboard'));
  };

  if (!workforceData) {
    return <div className="space-y-4 p-3 sm:p-6">Loading workforce data...</div>;
  }

  const dbsDueSoon = workforceData.dbsChecks.filter((check: any) => {
    if (!check.next_review_due) return false;
    const dueDate = new Date(check.next_review_due);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return dueDate <= sixMonthsFromNow;
  }).length;

  const pendingAppraisals = workforceData.appraisals.filter((a: any) => a.status === 'scheduled').length;

  const trainingExpiringSoon = workforceData.training.filter((t: any) => {
    if (!t.expiry_date) return false;
    const expiry = new Date(t.expiry_date);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    return expiry <= ninetyDaysFromNow;
  }).length;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 sm:h-8 sm:w-8" />
            Workforce Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Staff compliance & HR monitoring</p>
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
            <CardTitle className="text-xs sm:text-sm font-medium">Active Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{workforceData.employees.length}</div>
            <p className="text-xs text-muted-foreground">Headcount</p>
          </CardContent>
        </Card>

        <Card className={`touch-manipulation ${dbsDueSoon > 0 ? 'border-warning' : ''}`}>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              DBS Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{workforceData.dbsChecks.length}</div>
            <p className="text-xs text-muted-foreground">{dbsDueSoon} due soon</p>
          </CardContent>
        </Card>

        <Card className={`touch-manipulation ${trainingExpiringSoon > 0 ? 'border-warning' : ''}`}>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
              Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{workforceData.training.length}</div>
            <p className="text-xs text-muted-foreground">{trainingExpiringSoon} expiring</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              Appraisals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{pendingAppraisals}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Training Expiry Alerts */}
      <TrainingExpiryAlerts />

      {/* DBS Review Schedule */}
      <Collapsible open={isDBSOpen} onOpenChange={setIsDBSOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>DBS Review Schedule (3-Year Cycle)</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isDBSOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2">
                {workforceData.dbsChecks.slice(0, 10).map((check: any) => (
                  <div key={check.id} className="flex flex-col sm:flex-row items-start justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">ID: {check.employee_id.slice(0, 8)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Last: {new Date(check.check_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right self-start sm:self-center">
                      <p className="text-xs sm:text-sm font-medium">Next Review</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(check.next_review_due).toLocaleDateString()}
                      </p>
                      {dbsDueSoon > 0 && new Date(check.next_review_due).getTime() < new Date().setMonth(new Date().getMonth() + 6) && (
                        <Badge className="bg-warning mt-1 text-xs">Due Soon</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Appraisal Status */}
      <Collapsible open={isAppraisalOpen} onOpenChange={setIsAppraisalOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Annual Appraisal Status</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isAppraisalOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Completed This Year</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {workforceData.appraisals.filter((a: any) => a.status === 'completed').length} appraisals
                    </p>
                  </div>
                  <Badge className="bg-success self-start sm:self-center">
                    {Math.round((workforceData.appraisals.filter((a: any) => a.status === 'completed').length / Math.max(workforceData.employees.length, 1)) * 100)}%
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Scheduled</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{pendingAppraisals} pending</p>
                  </div>
                  <Badge variant="secondary" className="self-start sm:self-center">{pendingAppraisals}</Badge>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
