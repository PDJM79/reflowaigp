import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  REQUEST_TYPES,
  calculateTurnaroundDays,
  calculateDaysPending,
  type MedicalRequest,
  type TurnaroundMetrics,
} from './types';

interface TurnaroundAnalyticsProps {
  requests: MedicalRequest[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 70%, 50%)',
];

export function TurnaroundAnalytics({ requests }: TurnaroundAnalyticsProps) {
  const metrics = useMemo<TurnaroundMetrics>(() => {
    const completed = requests.filter((r) => r.status === 'sent' && r.sent_at);
    const pending = requests.filter((r) => r.status !== 'sent');

    // Average turnaround
    const turnaroundDays = completed
      .map((r) => calculateTurnaroundDays(r.received_at, r.sent_at))
      .filter((d): d is number => d !== null);
    const averageDays =
      turnaroundDays.length > 0
        ? Math.round(
            turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length
          )
        : 0;

    // Pending over 7 days
    const pendingOver7Days = pending.filter(
      (r) => calculateDaysPending(r.received_at) > 7
    ).length;

    // By type
    const byType = REQUEST_TYPES.reduce((acc, type) => {
      acc[type.value] = requests.filter(
        (r) => r.request_type === type.value
      ).length;
      return acc;
    }, {} as Record<string, number>);

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; count: number; avgDays: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthRequests = requests.filter((r) => {
        const date = new Date(r.received_at);
        return date >= monthStart && date <= monthEnd;
      });

      const monthCompleted = monthRequests.filter(
        (r) => r.status === 'sent' && r.sent_at
      );
      const monthTurnaround = monthCompleted
        .map((r) => calculateTurnaroundDays(r.received_at, r.sent_at))
        .filter((d): d is number => d !== null);

      monthlyTrend.push({
        month: format(monthDate, 'MMM'),
        count: monthRequests.length,
        avgDays:
          monthTurnaround.length > 0
            ? Math.round(
                monthTurnaround.reduce((a, b) => a + b, 0) /
                  monthTurnaround.length
              )
            : 0,
      });
    }

    return {
      averageDays,
      pendingOver7Days,
      totalReceived: requests.length,
      totalCompleted: completed.length,
      byType,
      monthlyTrend,
    };
  }, [requests]);

  // Pie chart data
  const pieData = REQUEST_TYPES.filter(
    (type) => metrics.byType[type.value] > 0
  ).map((type, index) => ({
    name: type.label,
    value: metrics.byType[type.value],
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Avg Turnaround
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageDays} days</div>
            <p className="text-xs text-muted-foreground">
              From received to sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Overdue (&gt;7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                metrics.pendingOver7Days > 0 ? 'text-destructive' : ''
              }`}
            >
              {metrics.pendingOver7Days}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalReceived}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalReceived > 0
                ? `${Math.round(
                    (metrics.totalCompleted / metrics.totalReceived) * 100
                  )}% completion rate`
                : 'No requests yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* By Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">By Request Type</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthlyTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Requests"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
