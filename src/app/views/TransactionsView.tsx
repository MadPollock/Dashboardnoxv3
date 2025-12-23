import React, { useState, useCallback } from 'react';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, FileDown, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PaymentDetailsModal } from '../components/admin/PaymentDetailsModal';
import { DateRangeSelector, DateRange } from '../components/analytics/DateRangeSelector';
import { RequestReportModal } from '../components/modals/RequestReportModal';
import { useStrings } from '../hooks/useStrings';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '../hooks/useQuery';
import { queryPaymentsList, queryPaymentSearch, Payment } from '../lib/queries';
import { toast } from 'sonner';

export function TransactionsView() {
  const { t } = useStrings();
  const { hasRole } = useAuth();
  
  // RBAC - Payments requires admin, operations, or analyst role
  const canView = hasRole(['admin', 'operations', 'analyst']);
  const canRefund = hasRole(['admin', 'operations']);
  
  // State
  const [selectedTransaction, setSelectedTransaction] = useState<Payment | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'received' | 'sent'>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Quick search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Initialize with last 30 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      from: thirtyDaysAgo.toISOString(),
      to: now.toISOString(),
    };
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Query: Fetch payments list
  const {
    data: paymentsData,
    loading,
    error,
    refetch
  } = useQuery(
    () => queryPaymentsList({
      date_from: dateRange.from,
      date_to: dateRange.to,
      type: selectedFilter,
      page: currentPage,
      limit: itemsPerPage,
      sort_by: 'date',
      sort_order: 'desc',
    }),
    [dateRange.from, dateRange.to, selectedFilter, currentPage],
    {
      pollingInterval: 60000, // Category B: 60s polling
    }
  );

  // Access control check
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'Manrope' }}>
          {t('payments.accessDenied.title')}
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('payments.accessDenied.description')}
        </p>
      </div>
    );
  }

  // Reset to page 1 when filters change
  const handleFilterChange = (filter: 'all' | 'received' | 'sent') => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setCurrentPage(1);
  };

  // Quick search handler
  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const result = await queryPaymentSearch({ query: searchQuery.trim() });
      
      if (result.found && result.payment) {
        setSelectedTransaction(result.payment);
        setSearchQuery('');
        setSearchError('');
      } else {
        setSearchError(t('payments.search.notFound'));
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(t('payments.search.error'));
      toast.error(t('payments.search.error'));
    } finally {
      setIsSearching(false);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 60) {
      return t('payments.time.minutesAgo', { minutes: diffInMins });
    } else if (diffInHours < 24) {
      return t('payments.time.hoursAgo', { hours: diffInHours });
    } else if (diffInDays === 1) {
      return t('payments.time.yesterday');
    } else {
      return t('payments.time.daysAgo', { days: diffInDays });
    }
  };

  const payments = paymentsData?.payments || [];
  const pagination = paymentsData?.pagination || {
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: itemsPerPage,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <h1 style={{ fontFamily: 'Manrope' }}>{t('payments.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('payments.subtitle')}
            </p>
          </div>
          <Button 
            onClick={() => setIsReportModalOpen(true)}
            className="w-full sm:w-auto"
            size="sm"
            variant="outline"
          >
            <FileDown className="size-4 mr-2" />
            {t('payments.requestReport')}
          </Button>
        </div>
      </div>

      {/* Quick Search Form */}
      <div className="bg-card rounded-md p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'Manrope' }}>
          {t('payments.quickSearch.title')}
        </h3>
        <form onSubmit={handleQuickSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('payments.quickSearch.placeholder')}
              className="w-full pl-10 pr-24 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-ring outline-none transition-all"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchError('');
              }}
              disabled={isSearching}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8"
            >
              {isSearching ? t('payments.quickSearch.searching') : t('payments.quickSearch.button')}
            </Button>
          </div>
          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}
        </form>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />

      {/* Filters */}
      <div className="bg-card rounded-lg p-4 space-y-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('payments.filter.all')}
          </button>
          <button
            onClick={() => handleFilterChange('received')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedFilter === 'received'
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('payments.filter.received')}
          </button>
          <button
            onClick={() => handleFilterChange('sent')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedFilter === 'sent'
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('payments.filter.sent')}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">{t('payments.loading')}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-card rounded-lg p-8 text-center space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <AlertCircle className="size-12 text-destructive mx-auto" />
          <div>
            <h3 className="font-medium mb-1" style={{ fontFamily: 'Manrope' }}>
              {t('payments.error')}
            </h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            {t('payments.retry')}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && payments.length === 0 && (
        <div className="bg-card rounded-lg p-12 text-center space-y-2" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="font-medium" style={{ fontFamily: 'Manrope' }}>
            {t('payments.empty.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('payments.empty.description')}
          </p>
        </div>
      )}

      {/* Transactions List */}
      {!loading && !error && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((tx) => (
            <div
              key={tx.id}
              onClick={() => setSelectedTransaction(tx)}
              className="bg-card rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'received' ? 'bg-foreground/5' : 'bg-muted'
                  }`}
                >
                  {tx.type === 'received' ? (
                    <ArrowDownLeft className="size-5" />
                  ) : (
                    <ArrowUpRight className="size-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-medium truncate" style={{ fontFamily: 'Manrope' }}>
                        {tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(tx.date)}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p
                        className={`font-mono font-semibold ${
                          tx.type === 'received' ? 'text-green-600' : ''
                        }`}
                        style={{ fontFamily: 'Geist' }}
                      >
                        {tx.type === 'received' ? '+' : '-'}
                        {tx.amount_display}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono" style={{ fontFamily: 'Geist' }}>
                        {tx.amount_crypto} {tx.currency_crypto}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono" style={{ fontFamily: 'Geist' }}>
                      {tx.id}
                    </code>
                    <Badge
                      variant={
                        tx.status === 'completed'
                          ? 'default'
                          : tx.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {tx.status === 'completed' && t('payments.status.completed')}
                      {tx.status === 'pending' && t('payments.status.pending')}
                      {tx.status === 'failed' && t('payments.status.failed')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              {t('payments.pagination.showing', {
                from: (pagination.current_page - 1) * pagination.per_page + 1,
                to: Math.min(pagination.current_page * pagination.per_page, pagination.total_count),
                total: pagination.total_count,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={pagination.current_page <= 1 || loading}
              >
                <ChevronLeft className="size-4 mr-1" />
                {t('payments.pagination.previous')}
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                {t('payments.pagination.page', {
                  current: pagination.current_page,
                  total: pagination.total_pages,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                disabled={pagination.current_page >= pagination.total_pages || loading}
              >
                {t('payments.pagination.next')}
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {selectedTransaction && (
        <PaymentDetailsModal
          transaction={selectedTransaction}
          open={!!selectedTransaction}
          onOpenChange={(open) => !open && setSelectedTransaction(null)}
          canRefund={canRefund}
          onRefundSuccess={() => {
            refetch();
            setSelectedTransaction(null);
          }}
        />
      )}

      {/* Request Report Modal */}
      <RequestReportModal
        open={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        reportType="transactions"
      />
    </div>
  );
}