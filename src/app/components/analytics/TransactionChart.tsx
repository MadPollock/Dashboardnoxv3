import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartData } from '../../hooks/useChartData';
import { ChartContainer } from './ChartContainer';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';

export function TransactionChart() {
  const { t } = useStrings();
  const { data, isLoading, error, refetch } = useChartData('transactions-24h', {
    dataSource: 'api',
    refreshInterval: 60000,
  });

  return (
    <ChartContainer
      title={t('charts.transactions.title')}
      description={t('charts.transactions.description')}
      isLoading={isLoading}
      error={error}
      actions={
        <Button variant="ghost" size="icon" onClick={refetch}>
          <RefreshCw className="size-4" />
        </Button>
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff4c00" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ff4c00" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#ff4c00" 
            fillOpacity={1} 
            fill="url(#colorValue)"
            animationDuration={0}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}