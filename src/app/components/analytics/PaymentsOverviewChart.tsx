import React from 'react';
import { ChartContainer } from './ChartContainer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';
import { DateRange } from './DateRangeSelector';

interface PaymentsDataPoint {
  name: string;
  pix?: number;
  usdt?: number;
  usdc?: number;
  [key: string]: string | number | undefined;
}

interface PaymentsOverviewChartProps {
  dateRange: DateRange;
  data: PaymentsDataPoint[];
  loading?: boolean;
  error?: Error | null;
}

export function PaymentsOverviewChart({ dateRange, data, loading, error }: PaymentsOverviewChartProps) {
  const { t } = useStrings();

  // Process data for chart display
  const chartData = React.useMemo(() => {
    return data.map((item) => {
      const total = (item.pix as number || 0) + (item.usdt as number || 0) + (item.usdc as number || 0);
      return {
        period: new Date(item.name).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        // Mock breakdown by status
        inCompleted: Math.floor(total * 0.4),
        inPending: Math.floor(total * 0.15),
        inExpired: Math.floor(total * 0.05),
        inCancelled: Math.floor(total * 0.03),
        outCompleted: Math.floor(total * 0.25),
        outPending: Math.floor(total * 0.08),
        outExpired: Math.floor(total * 0.03),
        outCancelled: Math.floor(total * 0.01),
      };
    });
  }, [data]);

  return (
    <ChartContainer
      title={t('analytics.paymentsOverview.title')}
      description={t('analytics.paymentsOverview.description')}
    >
      {loading ? (
        <div className="flex items-center justify-center h-[350px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">{t('analytics.loading')}</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[350px]">
          <div className="flex flex-col items-center gap-3 max-w-sm text-center">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm text-destructive">{t('analytics.error')}</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[350px]">
          <p className="text-sm text-muted-foreground max-w-sm text-center">
            {t('analytics.empty')}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              stroke="var(--border)"
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              stroke="var(--border)"
              label={{ value: t('analytics.paymentsOverview.yAxisLabel'), angle: -90, position: 'insideLeft', style: { fill: 'var(--muted-foreground)', fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--card-foreground)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px', color: 'var(--foreground)' }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  inCompleted: t('analytics.paymentsOverview.inCompleted'),
                  inPending: t('analytics.paymentsOverview.inPending'),
                  inExpired: t('analytics.paymentsOverview.inExpired'),
                  inCancelled: t('analytics.paymentsOverview.inCancelled'),
                  outCompleted: t('analytics.paymentsOverview.outCompleted'),
                  outPending: t('analytics.paymentsOverview.outPending'),
                  outExpired: t('analytics.paymentsOverview.outExpired'),
                  outCancelled: t('analytics.paymentsOverview.outCancelled'),
                };
                return labels[value] || value;
              }}
            />
            <Bar dataKey="inCompleted" stackId="in" fill="var(--chart-1)" />
            <Bar dataKey="inPending" stackId="in" fill="var(--chart-2)" />
            <Bar dataKey="inExpired" stackId="in" fill="var(--chart-3)" />
            <Bar dataKey="inCancelled" stackId="in" fill="var(--chart-4)" />
            <Bar dataKey="outCompleted" stackId="out" fill="var(--chart-5)" />
            <Bar dataKey="outPending" stackId="out" fill="var(--chart-6)" />
            <Bar dataKey="outExpired" stackId="out" fill="var(--chart-7)" />
            <Bar dataKey="outCancelled" stackId="out" fill="var(--chart-8)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}