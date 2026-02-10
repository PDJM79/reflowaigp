import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart3, Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ReportData {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  moduleBreakdown: Array<{
    name: string;
    completed: number;
    total: number;
    rate: number;
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

  const isAdmin = user?.isPracticeManager || user?.role === 'administrator';

  useEffect(() => {
    if (isAdmin) {
      fetchReportData();
    }
  }, [isAdmin, startDate, endDate, user]);

  const fetchReportData = async () => {
    if (!user?.practiceId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/tasks`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const tasks = await res.json();

      const filteredTasks = (tasks || []).filter((t: any) => {
        const created = new Date(t.createdAt);
        return created >= new Date(startDate) && created <= new Date(endDate);
      });

      const totalTasks = filteredTasks.length;
      const completedTasks = filteredTasks.filter((t: any) => t.status === 'complete').length;
      const overdueTasks = filteredTasks.filter((t: any) =>
        t.status !== 'complete' && new Date(t.dueAt) < new Date()
      ).length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const moduleGroups = filteredTasks.reduce((acc: any, task: any) => {
        const moduleName = task.module || 'Unknown';
        if (!acc[moduleName]) {
          acc[moduleName] = { total: 0, completed: 0 };
        }
        acc[moduleName].total++;
        if (task.status === 'complete') {
          acc[moduleName].completed++;
        }
        return acc;
      }, {} as Record<string, { total: number; completed: number }>);

      const moduleBreakdown = Object.entries(moduleGroups).map(([name, data]: [string, any]) => ({
        name: name.replace('_', ' '),
        completed: data.completed,
        total: data.total,
        rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      }));

      setReportData({
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate,
        moduleBreakdown,
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
            <p className="text-muted-foreground">Analyse task performance</p>
          </div>
        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-bold">{reportData.totalTasks}</p>
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
                      <p className="text-2xl font-bold">{reportData.completedTasks}</p>
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
                      <p className="text-2xl font-bold">{reportData.overdueTasks}</p>
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
                      <p className="text-sm font-medium text-muted-foreground">Modules</p>
                      <p className="text-2xl font-bold">{reportData.moduleBreakdown.length}</p>
                      <p className="text-xs text-muted-foreground">categories</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Module Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.moduleBreakdown.map((item) => (
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