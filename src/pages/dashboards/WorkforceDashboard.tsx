import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Download, Shield, GraduationCap, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TrainingExpiryAlerts } from '@/components/hr/TrainingExpiryAlerts';

export default function WorkforceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
    return <div className="container mx-auto p-6">Loading workforce data...</div>;
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Workforce Dashboard
          </h1>
          <p className="text-muted-foreground">Staff compliance, training, and HR monitoring</p>
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
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workforceData.employees.length}</div>
            <p className="text-xs text-muted-foreground">Current headcount</p>
          </CardContent>
        </Card>

        <Card className={dbsDueSoon > 0 ? 'border-warning' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              DBS Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workforceData.dbsChecks.length}</div>
            <p className="text-xs text-muted-foreground">{dbsDueSoon} due within 6 months</p>
          </CardContent>
        </Card>

        <Card className={trainingExpiringSoon > 0 ? 'border-warning' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Training Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{workforceData.training.length}</div>
            <p className="text-xs text-muted-foreground">{trainingExpiringSoon} expiring soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Appraisals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingAppraisals}</div>
            <p className="text-xs text-muted-foreground">Pending completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Training Expiry Alerts */}
      <TrainingExpiryAlerts />

      {/* DBS Review Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>DBS Review Schedule (3-Year Cycle)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {workforceData.dbsChecks.slice(0, 10).map((check: any) => (
              <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">Employee ID: {check.employee_id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    Last check: {new Date(check.check_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Next Review</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(check.next_review_due).toLocaleDateString()}
                  </p>
                  {dbsDueSoon > 0 && new Date(check.next_review_due).getTime() < new Date().setMonth(new Date().getMonth() + 6) && (
                    <Badge className="bg-warning mt-1">Due Soon</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Appraisal Status */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Appraisal Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Completed This Year</p>
                <p className="text-sm text-muted-foreground">
                  {workforceData.appraisals.filter((a: any) => a.status === 'completed').length} appraisals
                </p>
              </div>
              <Badge className="bg-success">
                {Math.round((workforceData.appraisals.filter((a: any) => a.status === 'completed').length / Math.max(workforceData.employees.length, 1)) * 100)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Scheduled</p>
                <p className="text-sm text-muted-foreground">{pendingAppraisals} pending</p>
              </div>
              <Badge variant="secondary">{pendingAppraisals}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
