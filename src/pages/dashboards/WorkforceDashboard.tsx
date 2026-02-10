import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
    queryKey: ['workforce-dashboard', user?.practiceId],
    queryFn: async () => {
      const practiceId = user?.practiceId;
      if (!practiceId) return null;

      const [employeesRes, trainingRes] = await Promise.all([
        fetch(`/api/practices/${practiceId}/employees`, { credentials: 'include' }),
        fetch(`/api/practices/${practiceId}/training-records`, { credentials: 'include' }),
      ]);

      const employees = employeesRes.ok ? await employeesRes.json() : [];
      const training = trainingRes.ok ? await trainingRes.json() : [];

      const activeEmployees = Array.isArray(employees) ? employees.filter((e: any) => !e.endDate) : [];

      return {
        employees: activeEmployees,
        dbsChecks: [],
        training: Array.isArray(training) ? training : [],
        appraisals: [],
      };
    },
    enabled: !!user?.practiceId,
  });

  const handleExportPDF = async () => {
    if (!workforceData) return;

    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const exporter = new DashboardPDFExporter({
      title: 'Workforce Dashboard',
      subtitle: 'Staff Compliance, Training, and HR Monitoring',
    });

    exporter.addSection('Key Workforce Metrics');
    exporter.addMetricsGrid([
      { label: 'Active Staff', value: `${workforceData.employees.length}`, subtitle: 'Current headcount' },
      { label: 'DBS Checks', value: `${workforceData.dbsChecks.length}`, subtitle: `${dbsDueSoon} due within 6 months` },
      { label: 'Training Records', value: `${workforceData.training.length}`, subtitle: `${trainingExpiringSoon} expiring soon` },
      { label: 'Pending Appraisals', value: `${pendingAppraisals}`, subtitle: 'To be completed' },
    ]);

    exporter.addSection('DBS Review Schedule (3-Year Cycle)');
    const dbsRows = workforceData.dbsChecks.slice(0, 10).map((check: any) => {
      const isDueSoon = new Date(check.nextReviewDue).getTime() < new Date().setMonth(new Date().getMonth() + 6);
      return [
        check.employeeId?.slice(0, 8) || 'N/A',
        new Date(check.checkDate).toLocaleDateString(),
        new Date(check.nextReviewDue).toLocaleDateString(),
        isDueSoon ? 'Due Soon' : 'On Track',
      ];
    });
    exporter.addTable(['Employee ID', 'Last Check', 'Next Review', 'Status'], dbsRows);

    exporter.addSection('Annual Appraisal Status');
    const completedAppraisals = workforceData.appraisals.filter((a: any) => a.status === 'completed').length;
    const completionRate = Math.round((completedAppraisals / Math.max(workforceData.employees.length, 1)) * 100);
    exporter.addKeyValuePairs([
      { key: 'Completed This Year', value: `${completedAppraisals} appraisals (${completionRate}%)` },
      { key: 'Scheduled', value: `${pendingAppraisals} pending` },
    ]);

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
    if (!check.nextReviewDue) return false;
    const dueDate = new Date(check.nextReviewDue);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return dueDate <= sixMonthsFromNow;
  }).length;

  const pendingAppraisals = workforceData.appraisals.filter((a: any) => a.status === 'scheduled').length;

  const trainingExpiringSoon = workforceData.training.filter((t: any) => {
    if (!t.expiryDate) return false;
    const expiry = new Date(t.expiryDate);
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

      <TrainingExpiryAlerts />

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
              {workforceData.dbsChecks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No DBS check records available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workforceData.dbsChecks.slice(0, 10).map((check: any) => (
                    <div key={check.id} className="flex flex-col sm:flex-row items-start justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base">ID: {check.employeeId?.slice(0, 8)}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Last: {new Date(check.checkDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right self-start sm:self-center">
                        <p className="text-xs sm:text-sm font-medium">Next Review</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(check.nextReviewDue).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
              {workforceData.appraisals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No appraisal records available</p>
                </div>
              ) : (
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
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
