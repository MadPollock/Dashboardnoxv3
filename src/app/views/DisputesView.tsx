import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, FileDown, Clock } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { DisputeDetailsModal } from '../components/admin/DisputeDetailsModal';
import { DateRangeSelector, DateRange } from '../components/analytics/DateRangeSelector';
import { RequestReportModal } from '../components/modals/RequestReportModal';
import { useStrings } from '../hooks/useStrings';
import { useQuery } from '../hooks/useQuery';
import { useAuth } from '../contexts/AuthContext';
import { 
  queryDisputesList, 
  queryDisputeSearch, 
  Dispute, 
  DisputeStatus,
  DisputeType 
} from '../lib/queries';

export function DisputesView() {
  const { user } = useAuth();
  const { t } = useStrings();

  // RBAC: Check if user has access
  const canRead = user?.role === 'user_admin_crossramp' || 
                  user?.role === 'user_operations_crossramp' || 
                  user?.role === 'user_analyst_crossramp';

  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<DisputeStatus | 'all'>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Quick search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [generalSearchQuery, setGeneralSearchQuery] = useState('');
  
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

  // Fetch disputes list with auto-refresh every 60s
  const { data: disputesData, loading, error, refetch } = useQuery(
    (params) => queryDisputesList(params),
    {
      date_from: dateRange.from,
      date_to: dateRange.to,
      status: selectedFilter,
      page: currentPage,
      limit: itemsPerPage,
    },
    { 
      refetchInterval: 60000, // 60s auto-refresh
      enabled: canRead, // Only fetch if user has access
    }
  );

  // Reset to page 1 when filters change
  const handleFilterChange = (filter: DisputeStatus | 'all') => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setCurrentPage(1);
  };

  // Mock API call to search dispute by identifier
  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const result = await queryDisputeSearch({ query: searchQuery.trim() });
      
      if (result.found && result.dispute) {
        setSelectedDispute(result.dispute);
        setSearchQuery('');
        setSearchError('');
      } else {
        setSearchError(t('disputes.quickSearch.notFound'));
      }
    } catch (err) {
      setSearchError(t('disputes.quickSearch.error'));
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
      return t('disputes.time.minutesAgo', { minutes: diffInMins });
    } else if (diffInHours < 24) {
      return t('disputes.time.hoursAgo', { hours: diffInHours });
    } else if (diffInDays === 1) {
      return t('disputes.time.yesterday');
    } else {
      return t('disputes.time.daysAgo', { days: diffInDays });
    }
  };

  const getDaysUntilDeadline = (deadlineString: string): number => {
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffInMs = deadline.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  const getStatusBadgeVariant = (status: DisputeStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    return 'outline';
  };

  const getStatusBadgeClassName = (status: DisputeStatus): string => {
    switch (status) {
      case 'open':
        return 'border-yellow-500 text-yellow-600 dark:text-yellow-500 bg-transparent';
      case 'under_review':
        return 'border-orange-600 text-orange-600 dark:text-orange-500 bg-transparent';
      case 'resolved':
        return 'border-muted-foreground/40 text-muted-foreground bg-transparent';
      case 'closed':
        return 'border-destructive text-destructive bg-transparent';
      default:
        return '';
    }
  };

  const formatCurrency = (amount: string, currency: string): string => {
    const num = parseFloat(amount);
    if (currency === 'BRL') {
      return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Check access
  if (!canRead) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('common.accessDenied')}</h2>
          <p className="text-muted-foreground">{t('common.noPermission')}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !disputesData) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="space-y-3">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card rounded-md p-5 animate-pulse" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-start gap-4">
                <div className="size-10 bg-muted rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('disputes.error.title')}</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>{t('common.retry')}</Button>
        </div>
      </div>
    );
  }

  const disputes = disputesData?.disputes || [];
  const pagination = disputesData?.pagination || { current_page: 1, total_pages: 1, total_count: 0 };
  
  const fromItem = pagination.total_count === 0 ? 0 : (pagination.current_page - 1) * itemsPerPage + 1;
  const toItem = Math.min(pagination.current_page * itemsPerPage, pagination.total_count);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <h1 style={{ fontFamily: 'Manrope' }}>{t('disputes.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('disputes.subtitle')}
            </p>
          </div>
          <Button 
            onClick={() => setIsReportModalOpen(true)}
            className="w-full sm:w-auto"
            size="sm"
            variant="outline"
          >
            <FileDown className="size-4 mr-2" />
            {t('disputes.requestReport')}
          </Button>
        </div>
      </div>

      {/* Quick Search Form */}
      <div className="bg-card rounded-md p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'Manrope' }}>
          {t('disputes.quickSearch.title')}
        </h3>
        <form onSubmit={handleQuickSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('disputes.quickSearch.placeholder')}
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
              {isSearching ? t('disputes.quickSearch.searching') : t('disputes.quickSearch.button')}
            </Button>
          </div>
          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}
        </form>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />

      {/* Filters with Expandable Search */}
      <div className="bg-card rounded-lg p-4 space-y-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('disputes.filter.all')}
          </button>
          <button
            onClick={() => handleFilterChange('open')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedFilter === 'open'
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('disputes.filter.open')}
          </button>
          <button
            onClick={() => handleFilterChange('under_review')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedFilter === 'under_review'
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('disputes.filter.underReview')}
          </button>
          <button
            onClick={() => handleFilterChange('resolved')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedFilter === 'resolved'
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('disputes.filter.resolved')}
          </button>
          <button
            onClick={() => handleFilterChange('closed')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedFilter === 'closed'
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('disputes.filter.closed')}
          </button>
        </div>

        {/* Expandable Search */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isSearchExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="relative pt-3 border-t border-border/50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('disputes.search.placeholder')}
              value={generalSearchQuery}
              onChange={(e) => setGeneralSearchQuery(e.target.value)}
              onBlur={() => {
                if (!generalSearchQuery.trim()) {
                  setIsSearchExpanded(false);
                }
              }}
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-ring outline-none transition-all"
              autoFocus={isSearchExpanded}
            />
          </div>
        </div>

        {/* Search Toggle Button */}
        {!isSearchExpanded && (
          <button
            onClick={() => setIsSearchExpanded(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-3 border-t border-border/50 w-full"
          >
            <Search className="size-4" />
            <span>{t('disputes.search.placeholder')}</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {disputes.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('disputes.empty.title')}</h3>
          <p className="text-muted-foreground">
            {t('disputes.empty.message')}
          </p>
        </div>
      )}

      {/* Disputes List */}
      {disputes.length > 0 && (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const daysUntilDeadline = getDaysUntilDeadline(dispute.deadline);
            const isUrgent = daysUntilDeadline <= 3 && dispute.status !== 'closed' && dispute.status !== 'resolved';

            return (
              <div
                key={dispute.id}
                onClick={() => setSelectedDispute(dispute)}
                className="bg-card rounded-md p-5 hover:bg-muted/30 transition-all cursor-pointer"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    dispute.is_infraction 
                      ? 'bg-destructive/10' 
                      : 'bg-muted/50'
                  }`}>
                    <AlertCircle className={`size-5 ${
                      dispute.is_infraction 
                        ? 'text-destructive' 
                        : 'text-muted-foreground'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground" style={{ fontFamily: 'Manrope' }}>
                            {dispute.client_name}
                          </h3>
                          <Badge variant={getStatusBadgeVariant(dispute.status)} className={getStatusBadgeClassName(dispute.status)}>
                            {t(`disputes.status.${dispute.status}`)}
                          </Badge>
                          {dispute.is_refunded && (
                            <Badge variant="outline">
                              {t('disputes.badge.refunded')}
                            </Badge>
                          )}
                          {dispute.is_infraction && (
                            <Badge variant="destructive">
                              {t('disputes.badge.infraction')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{t('disputes.disputeId')}: {dispute.id}</span>
                          <span>•</span>
                          <span>{t('disputes.paymentId')}: {dispute.payment_id}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-foreground">{formatCurrency(dispute.amount, dispute.currency)}</p>
                        <p className="text-sm text-muted-foreground">{formatRelativeTime(dispute.date)}</p>
                      </div>
                    </div>

                    {/* Dispute Type */}
                    <p className="text-sm text-muted-foreground">
                      {t(`disputes.type.${dispute.dispute_type}`)}
                    </p>

                    {/* Client Reason Preview */}
                    <p className="text-sm text-foreground line-clamp-2">
                      {dispute.client_reason}
                    </p>

                    {/* Deadline Warning */}
                    {isUrgent && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <Clock className="size-4" />
                        <span>
                          {daysUntilDeadline === 0 
                            ? t('disputes.deadline.today')
                            : t('disputes.deadline.daysLeft', { days: daysUntilDeadline })
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronDown className="size-5 text-muted-foreground flex-shrink-0 rotate-[-90deg]" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            {t('disputes.pagination.showing', { from: fromItem, to: toItem, total: pagination.total_count })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={pagination.current_page === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('disputes.pagination.page', { current: pagination.current_page, total: pagination.total_pages })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(pagination.total_pages, p + 1))}
              disabled={pagination.current_page === pagination.total_pages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <DisputeDetailsModal
          dispute={selectedDispute}
          isOpen={!!selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onRefetch={refetch}
        />
      )}

      {/* Request Report Modal */}
      <RequestReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportType="disputes"
      />
    </div>
  );
}