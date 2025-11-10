import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailAnalytics } from '@/hooks/useEmailAnalytics';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  sent: 'hsl(var(--primary))',
  delivered: 'hsl(var(--success))',
  opened: 'hsl(220, 70%, 50%)',
  clicked: 'hsl(280, 70%, 50%)',
  bounced: 'hsl(var(--error))',
  failed: 'hsl(var(--destructive))',
  complained: 'hsl(10, 70%, 50%)',
};

export function EmailAnalyticsCharts() {
  const { t } = useTranslation();
  const { dailyStats, emailTypeStats, statusDistribution, loading } = useEmailAnalytics(30);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Delivery Trends Over Time */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>{t('email_logs.analytics.delivery_trends')}</CardTitle>
          <CardDescription>{t('email_logs.analytics.delivery_trends_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sent" 
                stroke={STATUS_COLORS.sent}
                strokeWidth={2}
                name="Sent"
              />
              <Line 
                type="monotone" 
                dataKey="delivered" 
                stroke={STATUS_COLORS.delivered}
                strokeWidth={2}
                name="Delivered"
              />
              <Line 
                type="monotone" 
                dataKey="opened" 
                stroke={STATUS_COLORS.opened}
                strokeWidth={2}
                name="Opened"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bounce Rate by Day */}
      <Card>
        <CardHeader>
          <CardTitle>{t('email_logs.analytics.bounce_trends')}</CardTitle>
          <CardDescription>{t('email_logs.analytics.bounce_trends_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar 
                dataKey="bounced" 
                fill={STATUS_COLORS.bounced}
                name="Bounced"
              />
              <Bar 
                dataKey="failed" 
                fill={STATUS_COLORS.failed}
                name="Failed"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Open Rate by Email Type */}
      <Card>
        <CardHeader>
          <CardTitle>{t('email_logs.analytics.open_rate_by_type')}</CardTitle>
          <CardDescription>{t('email_logs.analytics.open_rate_by_type_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emailTypeStats} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Open Rate (%)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="category"
                dataKey="type"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={150}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="openRate" 
                fill={STATUS_COLORS.opened}
                name="Open Rate %"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>{t('email_logs.analytics.status_distribution')}</CardTitle>
          <CardDescription>{t('email_logs.analytics.status_distribution_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ status, percent }) => 
                  `${status}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {statusDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={STATUS_COLORS[entry.status] || 'hsl(var(--muted))'}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
