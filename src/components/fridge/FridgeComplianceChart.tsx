import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DailyComplianceStats } from './types';

interface FridgeComplianceChartProps {
  stats: DailyComplianceStats[];
  isLoading?: boolean;
}

const chartConfig = {
  complianceRate: {
    label: 'Compliance Rate',
    color: 'hsl(var(--success))',
  },
  breaches: {
    label: 'Breaches',
    color: 'hsl(var(--destructive))',
  },
};

export function FridgeComplianceChart({ stats, isLoading }: FridgeComplianceChartProps) {
  const { averageCompliance, trend, chartData } = useMemo(() => {
    if (stats.length === 0) {
      return { averageCompliance: 0, trend: 0, chartData: [] };
    }

    const validStats = stats.filter(s => s.total > 0);
    const avg = validStats.length > 0 
      ? validStats.reduce((sum, s) => sum + s.complianceRate, 0) / validStats.length 
      : 0;

    // Calculate trend (compare first half to second half)
    const mid = Math.floor(validStats.length / 2);
    const firstHalf = validStats.slice(0, mid);
    const secondHalf = validStats.slice(mid);
    
    const firstAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, s) => sum + s.complianceRate, 0) / firstHalf.length 
      : 0;
    const secondAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, s) => sum + s.complianceRate, 0) / secondHalf.length 
      : 0;
    
    const trendValue = secondAvg - firstAvg;

    // Format chart data with day abbreviations
    const data = stats.map(s => ({
      ...s,
      dayLabel: new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short' }),
      displayDate: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }));

    return { averageCompliance: avg, trend: trendValue, chartData: data };
  }, [stats]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Weekly Compliance</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{Math.round(averageCompliance)}%</span>
            {trend !== 0 && (
              <div className={`flex items-center text-sm ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
                {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{Math.abs(Math.round(trend))}%</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available for this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="dayLabel" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name) => [
                        `${value}%`,
                        name === 'complianceRate' ? 'Compliance' : name
                      ]}
                    />
                  }
                />
                <Bar 
                  dataKey="complianceRate" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.complianceRate >= 90 
                        ? 'hsl(var(--success))' 
                        : entry.complianceRate >= 70 
                          ? 'hsl(var(--warning))' 
                          : 'hsl(var(--destructive))'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
