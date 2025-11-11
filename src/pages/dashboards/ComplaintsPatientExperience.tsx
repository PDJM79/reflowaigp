import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Download, TrendingUp, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ComplaintThemeAnalysis } from '@/components/complaints/ComplaintThemeAnalysis';
import { ComplaintSLATracker } from '@/components/complaints/ComplaintSLATracker';

export default function ComplaintsPatientExperience() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const { data: complaintsData } = useQuery({
    queryKey: ['complaints-dashboard', user?.id, dateRange],
    queryFn: async () => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return null;

      const [complaints, analytics] = await Promise.all([
        (supabase as any)
          .from('complaints')
          .select('*')
          .eq('practice_id', userData.practice_id)
          .gte('received_date', dateRange.start)
          .lte('received_date', dateRange.end),
        (supabase as any)
          .from('complaints_analytics')
          .select('*')
          .eq('practice_id', userData.practice_id)
          .single(),
      ]);

      return {
        complaints: complaints.data || [],
        analytics: analytics.data,
      };
    },
    enabled: !!user?.id && !!dateRange.start,
  });

  const handleExportPDF = async () => {
    if (!complaintsData) return;

    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const exporter = new DashboardPDFExporter({
      title: 'Complaints & Patient Experience Dashboard',
      subtitle: 'Patient Feedback, SLA Compliance, and Sentiment Analysis',
      dateRange,
    });

    // SLA Compliance Summary
    exporter.addSection('SLA Compliance Summary');
    const onTrack = complaintsData.complaints.filter((c: any) => c.sla_status === 'on_track' || c.sla_status === 'completed').length;
    const atRisk = complaintsData.complaints.filter((c: any) => c.sla_status === 'at_risk').length;
    const overdue = complaintsData.complaints.filter((c: any) => c.sla_status === 'overdue').length;
    
    exporter.addMetricsGrid([
      { label: 'On Track', value: `${onTrack}`, subtitle: 'Meeting SLA deadlines' },
      { label: 'At Risk', value: `${atRisk}`, subtitle: 'Approaching deadline' },
      { label: 'Overdue', value: `${overdue}`, subtitle: 'Missed deadline' },
      { label: 'Total Complaints', value: `${totalComplaints}`, subtitle: 'Last 3 months' },
    ]);

    // Complaint Volume by Severity
    exporter.addSection('Complaint Volume by Severity');
    const severityRows = [
      ['Low Severity', bySeverity.low.toString(), `${Math.round((bySeverity.low / Math.max(totalComplaints, 1)) * 100)}%`],
      ['Medium Severity', bySeverity.medium.toString(), `${Math.round((bySeverity.medium / Math.max(totalComplaints, 1)) * 100)}%`],
      ['High Severity', bySeverity.high.toString(), `${Math.round((bySeverity.high / Math.max(totalComplaints, 1)) * 100)}%`],
    ];
    exporter.addTable(['Severity', 'Count', 'Percentage'], severityRows);

    // Category Breakdown
    exporter.addSection('Complaints by Category');
    const categories = ['clinical_care', 'staff_attitude', 'waiting_times', 'communication', 'prescriptions'];
    const categoryRows = categories.map(category => {
      const count = complaintsData.complaints.filter((c: any) => c.category === category).length;
      const percentage = Math.round((count / Math.max(totalComplaints, 1)) * 100);
      return [category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), count.toString(), `${percentage}%`];
    });
    exporter.addTable(['Category', 'Count', 'Percentage'], categoryRows);

    // Response Times
    exporter.addSection('Average Response Times');
    exporter.addKeyValuePairs([
      { key: '48-Hour Acknowledgment', value: '1.2 days average' },
      { key: '30-Day Final Response', value: `${complaintsData.analytics?.avg_completion_days || 0} days average` },
    ]);

    // AI Theme Analysis Summary
    exporter.addSection('AI Theme Analysis');
    exporter.addList([
      'Quarterly AI-powered theme analysis identifies recurring patterns',
      'Sentiment analysis tracks patient satisfaction trends',
      'Proactive insights help address systemic issues before escalation',
    ]);

    exporter.save(generateFilename('complaints-patient-experience', dateRange));
  };

  if (!complaintsData) {
    return <div className="container mx-auto p-6">Loading complaints data...</div>;
  }

  const totalComplaints = complaintsData.complaints.length;
  const bySeverity = {
    low: complaintsData.complaints.filter((c: any) => c.severity === 'low').length,
    medium: complaintsData.complaints.filter((c: any) => c.severity === 'medium').length,
    high: complaintsData.complaints.filter((c: any) => c.severity === 'high').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Complaints & Patient Experience Dashboard
          </h1>
          <p className="text-muted-foreground">Patient feedback, SLA compliance, and sentiment analysis</p>
        </div>
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* SLA Compliance Metrics */}
      <ComplaintSLATracker />

      {/* Complaint Volume Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Complaint Volume by Severity (Last 3 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-success">Low Severity</p>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div 
                    className="bg-success rounded-full h-2" 
                    style={{ width: `${(bySeverity.low / Math.max(totalComplaints, 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold">{bySeverity.low}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-warning">Medium Severity</p>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div 
                    className="bg-warning rounded-full h-2" 
                    style={{ width: `${(bySeverity.medium / Math.max(totalComplaints, 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold">{bySeverity.medium}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-destructive">High Severity</p>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div 
                    className="bg-destructive rounded-full h-2" 
                    style={{ width: `${(bySeverity.high / Math.max(totalComplaints, 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold">{bySeverity.high}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Theme Analysis */}
      <ComplaintThemeAnalysis />

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Complaints by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {['clinical_care', 'staff_attitude', 'waiting_times', 'communication', 'prescriptions'].map((category) => {
              const count = complaintsData.complaints.filter((c: any) => c.category === category).length;
              const percentage = Math.round((count / Math.max(totalComplaints, 1)) * 100);
              
              return (
                <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{category.replace('_', ' ')}</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary rounded-full h-2" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Response Time Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Average Response Times</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <p className="font-medium">48-Hour Acknowledgment</p>
              </div>
              <p className="text-3xl font-bold">1.2 days</p>
              <p className="text-sm text-muted-foreground">Average acknowledgment time</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <p className="font-medium">30-Day Final Response</p>
              </div>
              <p className="text-3xl font-bold">
                {complaintsData.analytics?.avg_completion_days || 0} days
              </p>
              <p className="text-sm text-muted-foreground">Average resolution time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
