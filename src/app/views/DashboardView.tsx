import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useStrings } from '../hooks/useStrings';
import { useQuery } from '../hooks/useQuery';
import { ReceivePaymentModal } from '../components/modals/ReceivePaymentModal';
import { useAuth } from '../contexts/AuthContext';
import {
  queryAvailableBalance,
  queryDashboardToday,
  queryRecentTransactions,
  queryPaymentStatus,
  type AvailableBalance,
  type TodaySnapshot,
  type RecentTransaction,
  type PaymentStatus,
} from '../lib/queries';

// Mobile-first Dashboard following private banking / neo-broker aesthetic
// Calm, trustworthy, spacing-based hierarchy

interface DashboardViewProps {
  onNavigate?: (navId: string) => void;
  onNavigateToAnalytics?: (dateRange?: { from: string; to: string }) => void;
}

export function DashboardView({ onNavigate, onNavigateToAnalytics }: DashboardViewProps) {
  const { t } = useStrings();
  const { hasRole } = useAuth();
  const [isReceivePaymentModalOpen, setReceivePaymentModalOpen] = useState(false);

  // Check if user can perform write actions (Admin or Operations only)
  const canPerformActions = hasRole(['admin', 'operations']);

  // ========================================================================
  // QUERIES
  // ========================================================================

  // Category A: Manual refresh only (no auto-polling)
  const {
    data: balance,
    loading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useQuery<AvailableBalance>(queryAvailableBalance);

  // Category B: 60s polling when user is idle
  const {
    data: todaySnapshot,
    loading: todayLoading,
    error: todayError,
  } = useQuery<TodaySnapshot>(queryDashboardToday, undefined, {
    refetchInterval: 60000, // 60 seconds
  });

  const {
    data: recentTransactionsData,
    loading: transactionsLoading,
    error: transactionsError,
  } = useQuery<{ transactions: RecentTransaction[] }>(
    () => queryRecentTransactions({ limit: 3 }),
    { limit: 3 },
    { refetchInterval: 60000 } // 60 seconds
  );

  const {
    data: paymentStatus,
    loading: statusLoading,
    error: statusError,
  } = useQuery<PaymentStatus>(
    () => queryPaymentStatus({ date: new Date().toISOString().split('T')[0] }),
    { date: new Date().toISOString().split('T')[0] },
    { refetchInterval: 60000 } // 60 seconds
  );

  // ========================================================================
  // HELPERS
  // ========================================================================

  // Helper to get today's date range (start of day to end of day)
  const getTodayDateRange = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return {
      from: startOfDay.toISOString(),
      to: endOfDay.toISOString(),
    };
  };

  const handleViewTodayDetails = () => {
    const todayRange = getTodayDateRange();
    onNavigateToAnalytics?.(todayRange);
  };

  // Format currency BRL
  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    if (currency === 'BRL') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(amount);
    }
    return `${currency} ${amount.toFixed(2)}`;
  };

  // Format relative time
  const formatRelativeTime = (isoDate: string) => {
    try {
      return formatDistanceToNow(new Date(isoDate), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Mobile-First: Primary Balance Section (Hero) - No card, spacing defines hierarchy */}
      <div className="space-y-2">
        <p className="text-muted-foreground" style={{ fontSize: '13px' }}>
          {t('dashboard.balance.label')}
        </p>

        {/* Balance Amount */}
        {balanceLoading ? (
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        ) : balanceError ? (
          <div className="space-y-2">
            <p
              style={{
                fontFamily: 'Manrope',
                fontSize: '32px',
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                opacity: 0.5,
              }}
            >
              --
            </p>
            <p className="text-sm text-destructive">Failed to load balance</p>
          </div>
        ) : balance ? (
          <>
            <div className="flex items-center gap-3">
              <p
                style={{
                  fontFamily: 'Manrope',
                  fontSize: '32px',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {formatCurrency(balance.amount, balance.currency)}
              </p>
              {/* Manual Refresh Button (Category A) */}
              <button
                onClick={() => refetchBalance()}
                className="size-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                title="Refresh balance"
              >
                <RefreshCw className="size-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground" style={{ fontSize: '12px' }}>
              <span>
                {balance.currency} · settles in {balance.settles_in}
              </span>
              <span className="size-1 bg-muted-foreground/40 rounded-full" />
              <span>Updated {formatRelativeTime(balance.updated_at)}</span>
            </div>
          </>
        ) : (
          <p
            style={{
              fontFamily: 'Manrope',
              fontSize: '32px',
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              opacity: 0.5,
            }}
          >
            --
          </p>
        )}
      </div>

      {/* Primary Actions - Text-only buttons, flat - Only visible for Admin/Operations */}
      {canPerformActions && (
        <div className="flex items-center gap-3">
          <button
            className="flex-1 md:flex-none md:px-8 h-11 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            onClick={() => setReceivePaymentModalOpen(true)}
          >
            {t('dashboard.action.receive')}
          </button>
          <button
            className="flex-1 md:flex-none md:px-8 h-11 border border-border bg-card text-foreground rounded-xl hover:bg-muted/50 transition-colors"
            onClick={() => onNavigate?.('withdraw')}
          >
            {t('dashboard.action.withdraw')}
          </button>
        </div>
      )}

      {/* Today Snapshot Card - First and only prominent card */}
      <div className="bg-card rounded-md p-6 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: 'Manrope', fontSize: '18px', fontWeight: 500 }}>
            {t('dashboard.today.title')}
          </h2>
          <button className="text-primary text-sm hover:underline" onClick={handleViewTodayDetails}>
            {t('dashboard.today.viewDetails')}
          </button>
        </div>

        {/* Numeric rows - no visuals */}
        {todayLoading ? (
          <div className="space-y-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : todayError ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Unable to load today's data</p>
          </div>
        ) : todaySnapshot ? (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{t('dashboard.today.paymentsReceived')}</span>
              <span style={{ fontFamily: 'Manrope', fontSize: '15px', fontWeight: 500 }}>
                {formatCurrency(todaySnapshot.payments_received.amount, todaySnapshot.payments_received.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{t('dashboard.today.paymentsPending')}</span>
              <span style={{ fontFamily: 'Manrope', fontSize: '15px', fontWeight: 500 }}>
                {formatCurrency(todaySnapshot.payments_pending.amount, todaySnapshot.payments_pending.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{t('dashboard.today.fees')}</span>
              <span style={{ fontFamily: 'Manrope', fontSize: '15px', fontWeight: 500 }}>
                {formatCurrency(todaySnapshot.fees.amount, todaySnapshot.fees.currency)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Recent Transactions - Mobile-First */}
      <div className="bg-card rounded-md p-6 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: 'Manrope', fontSize: '18px', fontWeight: 500 }}>
            {t('dashboard.recent.title')}
          </h2>
          <button
            className="flex items-center gap-1 text-primary text-sm hover:underline"
            onClick={() => onNavigate?.('statement')}
          >
            {t('dashboard.recent.viewAll')}
            <ChevronRight className="size-4" />
          </button>
        </div>

        {transactionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : transactionsError ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Unable to load recent transactions</p>
          </div>
        ) : recentTransactionsData?.transactions && recentTransactionsData.transactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactionsData.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3">
                <div
                  className={`size-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'received' ? 'bg-foreground/5' : 'bg-muted'
                  }`}
                >
                  {tx.type === 'received' ? (
                    <ArrowDownLeft className="size-4 text-foreground" />
                  ) : (
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.timestamp)}</p>
                </div>
                <p
                  className={`font-medium ${
                    tx.type === 'received' ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  style={{ fontFamily: 'Manrope', fontSize: '14px' }}
                >
                  {tx.type === 'received' ? '+' : '-'}
                  {formatCurrency(tx.amount.value, tx.amount.currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No recent transactions</p>
            {canPerformActions && (
              <p className="text-sm text-foreground mt-2">Ready to receive your first payment?</p>
            )}
          </div>
        )}
      </div>

      {/* Payment Status - Subtle, at-a-glance only */}
      <div className="bg-card rounded-md p-6 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontFamily: 'Manrope', fontSize: '18px', fontWeight: 500 }}>
          {t('dashboard.status.title')}
        </h2>

        {statusLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : statusError ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Unable to load payment status</p>
          </div>
        ) : paymentStatus && paymentStatus.total > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard.status.completed')}</span>
                <span style={{ fontFamily: 'Manrope', fontWeight: 500 }}>{paymentStatus.completed.count}</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${paymentStatus.completed.percentage}%`, backgroundColor: '#ff4c00' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard.status.pending')}</span>
                <span style={{ fontFamily: 'Manrope', fontWeight: 500 }}>{paymentStatus.pending.count}</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${paymentStatus.pending.percentage}%`, backgroundColor: '#ffb400' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard.status.cancelledOrExpired')}</span>
                <span style={{ fontFamily: 'Manrope', fontWeight: 500 }}>
                  {paymentStatus.cancelled_or_expired.count}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-muted-foreground/60 rounded-full"
                  style={{ width: `${paymentStatus.cancelled_or_expired.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No payments yet</p>
          </div>
        )}
      </div>

      {/* Receive Payment Modal */}
      <ReceivePaymentModal isOpen={isReceivePaymentModalOpen} onClose={() => setReceivePaymentModalOpen(false)} />
    </div>
  );
}