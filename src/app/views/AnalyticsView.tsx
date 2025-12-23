import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent, Receipt, RefreshCw, AlertCircle } from 'lucide-react';
import { VolumeOverviewChart } from '../components/analytics/VolumeOverviewChart';
import { PaymentsOverviewChart } from '../components/analytics/PaymentsOverviewChart';
import { ConversionRateChart } from '../components/analytics/ConversionRateChart';
import { FeesChart } from '../components/analytics/FeesChart';
import { DateRangeSelector, DateRange } from '../components/analytics/DateRangeSelector';
import { useStrings } from '../hooks/useStrings';
import { useQuery } from '../hooks/useQuery';
import { useAuth } from '../contexts/AuthContext';
import {
  queryAnalyticsMetrics,
  queryVolumeOverview,
  queryPaymentsOverview,
  queryConversionRates,
  queryFees,
} from '../lib/queries';

interface AnalyticsViewProps {
  initialDateRange?: { from: string; to: string } | null;
}

export function AnalyticsView({ initialDateRange }: AnalyticsViewProps) {
  const { t } = useStrings();
  const { hasRole } = useAuth();
  
  // RBAC enforcement - Analytics requires admin, operations, or analyst role
  const hasAccess = hasRole(['admin', 'operations', 'analyst']);
  
  // Initialize with provided date range or default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (initialDateRange) {
      return initialDateRange;
    }
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      from: thirtyDaysAgo.toISOString(),
      to: now.toISOString(),
    };
  });
  
  // ============================================================================
  // QUERIES - Bucket 1: Aggregated Metrics
  // ============================================================================
  
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery(
    () => queryAnalyticsMetrics({
      date_from: dateRange.from,
      date_to: dateRange.to,
    }),
    [dateRange]
  );
  
  // ============================================================================
  // QUERIES - Bucket 2: Time Series Charts
  // ============================================================================
  
  const {
    data: volumeData,
    loading: volumeLoading,
    error: volumeError,
    refetch: refetchVolume,
  } = useQuery(
    () => queryVolumeOverview({
      from: dateRange.from,
      to: dateRange.to,
    }),
    [dateRange]
  );
  
  const {
    data: paymentsData,
    loading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments,
  } = useQuery(
    () => queryPaymentsOverview({
      from: dateRange.from,
      to: dateRange.to,
    }),
    [dateRange]
  );
  
  const {
    data: conversionData,
    loading: conversionLoading,
    error: conversionError,
    refetch: refetchConversion,
  } = useQuery(
    () => queryConversionRates({
      from: dateRange.from,
      to: dateRange.to,
    }),
    [dateRange]
  );
  
  const {
    data: feesData,
    loading: feesLoading,
    error: feesError,
    refetch: refetchFees,
  } = useQuery(
    () => queryFees({
      from: dateRange.from,
      to: dateRange.to,
    }),
    [dateRange]
  );
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleRefresh = () => {
    refetchMetrics();
    refetchVolume();
    refetchPayments();
    refetchConversion();
    refetchFees();
  };
  
  // ============================================================================
  // RBAC - ACCESS DENIED
  // ============================================================================
  
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'Manrope' }}>
          Access Denied
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          You do not have permission to view analytics. Please contact your administrator.
        </p>
      </div>
    );
  }
  
  // ============================================================================
  // RENDER - MAIN CONTENT
  // ============================================================================
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: 'Manrope' }}>{t('nav.analytics')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('analytics.pageDescription')}
        </p>
      </div>

      {/* Date Range Selector + Refresh Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
        <button
          onClick={handleRefresh}
          disabled={metricsLoading || volumeLoading || paymentsLoading || conversionLoading || feesLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`size-4 ${metricsLoading ? 'animate-spin' : ''}`} />
          <span>{t('analytics.refresh')}</span>
        </button>
      </div>

      {/* Metrics Rollup Cards */}
      {metricsError ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">{t('analytics.error')}</p>
            <p className="text-sm text-destructive/80 mt-1">{metricsError.message}</p>
            <button
              onClick={refetchMetrics}
              className="text-sm text-destructive underline mt-2 hover:no-underline"
            >
              {t('analytics.retry')}
            </button>
          </div>
        </div>
      ) : metricsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-md border border-border p-5 animate-pulse"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="h-6 bg-muted rounded w-1/2 mb-3" />
              <div className="h-8 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Volume Overview */}
          <div className="bg-card rounded-md border border-border p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="size-6 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('analytics.metrics.volumeOverview')}
                </h3>
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'Manrope' }}>
                R$ {metrics.total_volume.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {metrics.total_volume.change_percent !== null && (
                <div className="flex items-center gap-2 mt-2">
                  {metrics.total_volume.change_percent > 0 ? (
                    <>
                      <TrendingUp className="size-4 text-success" />
                      <span className="text-sm text-success font-medium">
                        +{metrics.total_volume.change_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : metrics.total_volume.change_percent < 0 ? (
                    <>
                      <TrendingDown className="size-4 text-destructive" />
                      <span className="text-sm text-destructive font-medium">
                        {metrics.total_volume.change_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t('analytics.metrics.volumeDescription')}
              </p>
            </div>
          </div>

          {/* Payments Overview */}
          <div className="bg-card rounded-md border border-border p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="size-6 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('analytics.metrics.paymentsOverview')}
                </h3>
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'Manrope' }}>
                {metrics.total_payments.count.toLocaleString('pt-BR')}
              </p>
              {metrics.total_payments.change_percent !== null && (
                <div className="flex items-center gap-2 mt-2">
                  {metrics.total_payments.change_percent > 0 ? (
                    <>
                      <TrendingUp className="size-4 text-success" />
                      <span className="text-sm text-success font-medium">
                        +{metrics.total_payments.change_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : metrics.total_payments.change_percent < 0 ? (
                    <>
                      <TrendingDown className="size-4 text-destructive" />
                      <span className="text-sm text-destructive font-medium">
                        {metrics.total_payments.change_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t('analytics.metrics.paymentsDescription')}
              </p>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-card rounded-md border border-border p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-3">
              <Percent className="size-6 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('analytics.metrics.conversionRate')}
                </h3>
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'Manrope' }}>
                {metrics.avg_conversion_rate.rate.toFixed(2)}%
              </p>
              {metrics.avg_conversion_rate.change_percent !== null && (
                <div className="flex items-center gap-2 mt-2">
                  {metrics.avg_conversion_rate.change_percent > 0 ? (
                    <>
                      <TrendingUp className="size-4 text-success" />
                      <span className="text-sm text-success font-medium">
                        +{metrics.avg_conversion_rate.change_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : metrics.avg_conversion_rate.change_percent < 0 ? (
                    <>
                      <TrendingDown className="size-4 text-destructive" />
                      <span className="text-sm text-destructive font-medium">
                        {metrics.avg_conversion_rate.change_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t('analytics.metrics.conversionDescription')}
              </p>
            </div>
          </div>

          {/* Fees */}
          <div className="bg-card rounded-md border border-border p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-3">
              <Receipt className="size-6 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('analytics.metrics.fees')}
                </h3>
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'Manrope' }}>
                R$ {metrics.net_fees.net.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {metrics.net_fees.change_percent !== null && (
                <div className="flex items-center gap-2 mt-2">
                  {metrics.net_fees.change_percent > 0 ? (
                    <>
                      <TrendingUp className="size-4 text-success" />
                      <span className="text-sm text-success font-medium">
                        +{metrics.net_fees.change_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : metrics.net_fees.change_percent < 0 ? (
                    <>
                      <TrendingDown className="size-4 text-destructive" />
                      <span className="text-sm text-destructive font-medium">
                        {metrics.net_fees.change_percent.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t('analytics.metrics.feesDescription')}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Charts Grid - 2x2 on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VolumeOverviewChart 
          dateRange={dateRange} 
          data={volumeData || []} 
          loading={volumeLoading}
          error={volumeError}
        />
        <PaymentsOverviewChart 
          dateRange={dateRange} 
          data={paymentsData || []} 
          loading={paymentsLoading}
          error={paymentsError}
        />
        <ConversionRateChart 
          dateRange={dateRange} 
          data={conversionData || []} 
          loading={conversionLoading}
          error={conversionError}
        />
        <FeesChart 
          dateRange={dateRange} 
          data={feesData || []} 
          loading={feesLoading}
          error={feesError}
        />
      </div>
    </div>
  );
}