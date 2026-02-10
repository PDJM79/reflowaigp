import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, Download, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ComplaintThemeAnalysis } from '@/components/complaints/ComplaintThemeAnalysis';
import { ComplaintSLATracker } from '@/components/complaints/ComplaintSLATracker';

export default function ComplaintsPatientExperience() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isVolumeOpen, setIsVolumeOpen] = useState(true);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

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
    queryKey: ['complaints-dashboard', user?.practiceId, dateRange],
    queryFn: async () => {
      const practiceId = user?.practiceId;
      if (!practiceId) return null;

      const res = await fetch(`/api/practices/${practiceId}/complaints`, { credentials: 'include' });
      const complaints = res.ok ? await res.json() : [];

      return {
        complaints: Array.isArray(complaints) ? complaints : [],
        analytics: null,
      };
    },
    enabled: !!user?.practiceId && !!dateRange.start,
  });

  const handleExportPDF = async () => {
    if (!complaintsData) return;

    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const exporter = new DashboardPDFExporter({
      title: 'Complaints & Patient Experience Dashboard',
      subtitle: 'Patient Feedback, SLA Compliance, and Sentiment Analysis',
      dateRange,
    });

    exporter.addSection('SLA Compliance Summary');
    const onTrack = complaintsData.complaints.filter((c: any) => c.slaStatus === 'on_track' || c.slaStatus === 'completed').length;
    const atRisk = complaintsData.complaints.filter((c: any) => c.slaStatus === 'at_risk').length;
    const overdue = complaintsData.complaints.filter((c: any) => c.slaStatus === 'overdue').length;
    
    exporter.addMetricsGrid([
      { label: 'On Track', value: `${onTrack}`, subtitle: 'Meeting SLA deadlines' },
      { label: 'At Risk', value: `${atRisk}`, subtitle: 'Approaching deadline' },
      { label: 'Overdue', value: `${overdue}`, subtitle: 'Missed deadline' },
      { label: 'Total Complaints', value: `${totalComplaints}`, subtitle: 'Last 3 months' },
    ]);

    exporter.addSection('Complaint Volume by Severity');
    const severityRows = [
      ['Low Severity', bySeverity.low.toString(), `${Math.round((bySeverity.low / Math.max(totalComplaints, 1)) * 100)}%`],
      ['Medium Severity', bySeverity.medium.toString(), `${Math.round((bySeverity.medium / Math.max(totalComplaints, 1)) * 100)}%`],
      ['High Severity', bySeverity.high.toString(), `${Math.round((bySeverity.high / Math.max(totalComplaints, 1)) * 100)}%`],
    ];
    exporter.addTable(['Severity', 'Count', 'Percentage'], severityRows);

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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8" />
            Complaints & Patient Experience
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Feedback & SLA compliance</p>
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

      <ComplaintSLATracker />

      <Collapsible open={isVolumeOpen} onOpenChange={setIsVolumeOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Complaint Volume by Severity</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isVolumeOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <ComplaintThemeAnalysis />

      <Collapsible open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Complaints by Category</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2">
                {['clinical_care', 'staff_attitude', 'waiting_times', 'communication', 'prescriptions'].map((category) => {
                  const count = complaintsData.complaints.filter((c: any) => c.category === category).length;
                  const percentage = Math.round((count / Math.max(totalComplaints, 1)) * 100);
                  
                  return (
                    <div key={category} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                      <div className="flex-1 w-full">
                        <p className="font-medium capitalize text-sm sm:text-base">{category.replace('_', ' ')}</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                          <div 
                            className="bg-primary rounded-full h-2" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right self-start sm:self-center">
                        <p className="text-xl sm:text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{percentage}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Average Response Times</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="p-3 sm:p-4 border rounded-lg touch-manipulation">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                <p className="font-medium text-sm sm:text-base">48-Hour Acknowledgement</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">1.2 days</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Average acknowledgement time</p>
            </div>

            <div className="p-3 sm:p-4 border rounded-lg touch-manipulation">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                <p className="font-medium text-sm sm:text-base">30-Day Final Response</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">
                {complaintsData.analytics?.avgCompletionDays || 0} days
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Average resolution time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
