import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: Error | null;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * ChartContainer - Wrapper component for analytics widgets.
 * Separates presentation layer from data logic, following CQRS read pattern.
 */
export function ChartContainer({
  title,
  description,
  isLoading = false,
  error = null,
  children,
  actions,
}: ChartContainerProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="size-12 text-red-500 mb-2" />
            <p className="text-red-700 dark:text-red-400">Failed to load chart data</p>
            <p className="text-sm text-gray-500 mt-1">{error.message}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[200px] w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}