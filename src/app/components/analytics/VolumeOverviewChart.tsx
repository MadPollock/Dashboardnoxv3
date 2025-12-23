import React from 'react';
import { ChartContainer } from './ChartContainer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';
import { DateRange } from './DateRangeSelector';

interface VolumeDataPoint {
  name: string;
  volume?: number;
  [key: string]: string | number | undefined;
}

interface VolumeOverviewChartProps {
  dateRange: DateRange;
  data: VolumeDataPoint[];
  loading?: boolean;
  error?: Error | null;
}

export function VolumeOverviewChart({ dateRange, data, loading, error }: VolumeOverviewChartProps) {
  const { t } = useStrings();

  // Process data for chart display
  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      period: new Date(item.name).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      paymentsIn: (item.volume as number) * 0.6 || 0, // Mock split
      paymentsOut: (item.volume as number) * 0.4 || 0, // Mock split
      combined: item.volume || 0,
    }));
  }, [data]);

  return (
    <ChartContainer
      title={t('analytics.volumeOverview.title')}
      description={t('analytics.volumeOverview.description')}
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
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--card-foreground)',
              }}
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
              labelStyle={{ color: 'var(--foreground)' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px', color: 'var(--foreground)' }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  paymentsIn: t('analytics.volumeOverview.paymentsIn'),
                  paymentsOut: t('analytics.volumeOverview.paymentsOut'),
                  combined: t('analytics.volumeOverview.combined'),
                };
                return labels[value] || value;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="paymentsIn" 
              stroke="var(--chart-1)" 
              strokeWidth={2}
              dot={{ fill: 'var(--chart-1)', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="paymentsOut" 
              stroke="var(--chart-2)" 
              strokeWidth={2}
              dot={{ fill: 'var(--chart-2)', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="combined" 
              stroke="var(--chart-3)" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'var(--chart-3)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}