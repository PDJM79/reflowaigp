import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart3, Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ReportData {
  totalProcesses: number;
  completedProcesses: number;
  overdueProcesses: number;
  completionRate: number;
  averageCompletionTime: number;
  processBreakdown: Array<{
    name: string;
    completed: number;
    total: number;
    rate: number;
  }>;
  dailyCompletion: Array<{
    date: string;
    completed: number;
  }>;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

export default function AdminReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchReportData();
    }
  }, [isAdmin, startDate, endDate]);

  const checkAdminAccess = async () => {
    if (!user) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, is_practice_manager, role')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      // Check if user is practice manager OR has administrator role
      const { data: roleData } = await supabase
        .from('role_assignments')
        .select('role')
        .eq('user_id', userData.id)
        .in('role', ['administrator', 'practice_manager']);

      setIsAdmin(userData.is_practice_manager || (roleData && roleData.length > 0));
    } catch (error) {
      console.error('Error checking admin access:', error);
    }
  };

  const fetchReportData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      // Fetch process instances in date range
      const { data: processes, error } = await supabase
        .from('process_instances')
        .select(`
          *,
          process_templates(name),
          step_instances(status, completed_at)
        `)
        .eq('practice_id', userData.practice_id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at');

      if (error) throw error;

      if (!processes) {
        setReportData({
          totalProcesses: 0,
          completedProcesses: 0,
          overdueProcesses: 0,
          completionRate: 0,
          averageCompletionTime: 0,
          processBreakdown: [],
          dailyCompletion: []
        });
        return;
      }

      // Calculate metrics
      const totalProcesses = processes.length;
      const completedProcesses = processes.filter(p => p.status === 'complete').length;
      const overdueProcesses = processes.filter(p => 
        p.status !== 'complete' && new Date(p.due_at) < new Date()
      ).length;
      const completionRate = totalProcesses > 0 ? (completedProcesses / totalProcesses) * 100 : 0;

      // Calculate average completion time
      const completedWithTime = processes.filter(p => p.completed_at && p.started_at);
      const averageCompletionTime = completedWithTime.length > 0 
        ? completedWithTime.reduce((acc, p) => {
            const start = new Date(p.started_at);
            const end = new Date(p.completed_at);
            return acc + (end.getTime() - start.getTime());
          }, 0) / completedWithTime.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Process breakdown by template
      const templateGroups = processes.reduce((acc, process) => {
        const templateName = process.process_templates?.name || 'Unknown';
        if (!acc[templateName]) {
          acc[templateName] = { total: 0, completed: 0 };
        }
        acc[templateName].total++;
        if (process.status === 'complete') {
          acc[templateName].completed++;
        }
        return acc;
      }, {} as Record<string, { total: number; completed: number }>);

      const processBreakdown = Object.entries(templateGroups).map(([name, data]) => ({
        name,
        completed: data.completed,
        total: data.total,
        rate: data.total > 0 ? (data.completed / data.total) * 100 : 0
      }));

      // Daily completion data
      const dailyGroups = processes
        .filter(p => p.completed_at)
        .reduce((acc, process) => {
          const date = format(new Date(process.completed_at), 'yyyy-MM-dd');
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const dailyCompletion = Object.entries(dailyGroups).map(([date, completed]) => ({
        date: format(new Date(date), 'MMM d'),
        completed
      }));

      setReportData({
        totalProcesses,
        completedProcesses,
        overdueProcesses,
        completionRate,
        averageCompletionTime,
        processBreakdown,
        dailyCompletion
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You need administrator or practice manager privileges to access this page.
              </p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/admin/calendar')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calendar
            </Button>
            <h1 className="text-3xl font-bold">Audit Reports</h1>
            <p className="text-muted-foreground">Analyze audit process performance</p>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Period
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 items-end">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchReportData} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading report data...</p>
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Processes</p>
                      <p className="text-2xl font-bold">{reportData.totalProcesses}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{reportData.completedProcesses}</p>
                      <p className="text-xs text-green-600 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {reportData.completionRate.toFixed(1)}% completion rate
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                      <p className="text-2xl font-bold">{reportData.overdueProcesses}</p>
                      <p className="text-xs text-red-600 flex items-center">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Needs attention
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg. Completion</p>
                      <p className="text-2xl font-bold">{reportData.averageCompletionTime.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">days</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Daily Completion Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Completions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      completed: {
                        label: "Completed",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.dailyCompletion}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="completed" fill="var(--color-completed)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Process Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Process Type Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.processBreakdown.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{item.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {item.completed}/{item.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${item.rate}%` }}
                            />
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-4">
                          {item.rate.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No data available for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}