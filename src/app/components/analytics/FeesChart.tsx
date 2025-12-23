import React from 'react';
import { ChartContainer } from './ChartContainer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';
import { DateRange } from './DateRangeSelector';

interface FeesDataPoint {
  name: string;
  fees?: number;
  [key: string]: string | number | undefined;
}

interface FeesChartProps {
  dateRange: DateRange;
  data: FeesDataPoint[];
  loading?: boolean;
  error?: Error | null;
}

export function FeesChart({ dateRange, data, loading, error }: FeesChartProps) {
  const { t } = useStrings();

  // Process data for chart display
  const chartData = React.useMemo(() => {
    return data.map((item) => {
      const totalFees = item.fees || 0;
      return {
        period: new Date(item.name).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        feesPaid: totalFees * 0.35,
        feesReceived: totalFees * 0.65,
      };
    });
  }, [data]);

  return (
    <ChartContainer
      title={t('analytics.fees.title')}
      description={t('analytics.fees.description')}
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
              tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
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
                  feesPaid: t('analytics.fees.feesPaid'),
                  feesReceived: t('analytics.fees.feesReceived'),
                };
                return labels[value] || value;
              }}
            />
            <Bar dataKey="feesPaid" fill="var(--chart-2)" />
            <Bar dataKey="feesReceived" fill="var(--chart-1)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}