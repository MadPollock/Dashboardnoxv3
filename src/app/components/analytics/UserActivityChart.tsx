import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useChartData } from '../../hooks/useChartData';
import { ChartContainer } from './ChartContainer';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';

export function UserActivityChart() {
  const { t } = useStrings();
  const { data, isLoading, error, refetch } = useChartData('user-activity-daily', {
    dataSource: 'api',
    refreshInterval: 45000,
  });

  return (
    <ChartContainer
      title={t('charts.userActivity.title')}
      description={t('charts.userActivity.description')}
      isLoading={isLoading}
      error={error}
      actions={
        <Button variant="ghost" size="icon" onClick={refetch}>
          <RefreshCw className="size-4" />
        </Button>
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey="active" 
            fill="#ff4c00"
            animationDuration={0}
            isAnimationActive={false}
          />
          <Bar 
            dataKey="inactive" 
            fill="#ffb400"
            animationDuration={0}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}