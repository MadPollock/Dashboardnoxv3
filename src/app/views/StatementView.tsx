import React, { useState } from 'react';
import { Search, FileDown, AlertCircle } from 'lucide-react';
import { useStrings } from '../hooks/useStrings';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '../hooks/useQuery';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DateRangeSelector, DateRange } from '../components/analytics/DateRangeSelector';
import { StatementDetailsModal, StatementTransaction } from '../components/modals/StatementDetailsModal';
import { RequestReportModal } from '../components/modals/RequestReportModal';
import { 
  queryStatementList, 
  queryStatementSearch, 
  queryStatementAccounts,
  StatementListResponse,
  StatementSearchResponse,
  StatementAccountsResponse 
} from '../lib/queries';
import { toast } from 'sonner';

export function StatementView() {
  const { t } = useStrings();
  const { hasRole } = useAuth();
  
  // RBAC - Statement requires admin, operations, or analyst role (all read-only)
  const canView = hasRole(['admin', 'operations', 'analyst']);
  
  const [selectedTransaction, setSelectedTransaction] = useState<StatementTransaction | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Quick search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter state
  const [directionFilter, setDirectionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
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

  // Query: Fetch accounts list (Category C - Load once)
  const {
    data: accountsData,
    loading: isLoadingAccounts,
  } = useQuery(
    () => queryStatementAccounts(),
    [],
    {
      // No polling for Category C
    }
  );

  // Query: Fetch statement data (Category B - Soft refresh 60s)
  const {
    data: statementData,
    loading: isLoadingStatement,
    error,
    refetch,
  } = useQuery(
    () => queryStatementList({
      date_from: dateRange.from,
      date_to: dateRange.to,
      direction: directionFilter,
      account: accountFilter,
      page: currentPage,
      limit: itemsPerPage,
      sort_by: 'date',
      sort_order: 'desc',
    }),
    [dateRange.from, dateRange.to, directionFilter, accountFilter, currentPage],
    {
      refetchInterval: 60000, // Category B: 60s polling
    }
  );

  // Access control check
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'Manrope' }}>
          {t('statement.accessDenied.title') || 'Access Denied'}
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('statement.accessDenied.description') || 'You do not have permission to view this page.'}
        </p>
      </div>
    );
  }

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setCurrentPage(1);
  };

  // Quick search by Statement ID
  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const data = await queryStatementSearch({ query: searchQuery.trim() });

      if (data.found && data.entry) {
        // Convert API entry to modal format
        const modalData: StatementTransaction = {
          id: data.entry.id,
          date: data.entry.date,
          debit: data.entry.debit,
          credit: data.entry.credit,
          balanceBefore: data.entry.balance_before,
          resultingBalance: data.entry.resulting_balance,
          currency: data.entry.currency,
          info: data.entry.info,
          account: data.entry.account,
        };
        
        setSelectedTransaction(modalData);
        setSearchQuery('');
        setSearchError('');
      } else {
        setSearchError(t('statement.quickSearch.notFound'));
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
      setSearchError('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return t('statement.time.minutesAgo', { minutes: diffInMinutes.toString() });
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return t('statement.time.hoursAgo', { hours: diffInHours.toString() });
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
      return t('statement.time.yesterday');
    }

    if (diffInDays < 7) {
      return t('statement.time.daysAgo', { days: diffInDays.toString() });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' ' + currency;
  };

  // Apply general search filter client-side
  const applyGeneralSearchFilter = (entries: any[]): any[] => {
    if (!generalSearchQuery.trim()) return entries;
    
    const query = generalSearchQuery.toLowerCase();
    return entries.filter(entry => 
      entry.info.toLowerCase().includes(query) ||
      entry.account.toLowerCase().includes(query) ||
      entry.id.toLowerCase().includes(query)
    );
  };

  // Get filtered entries
  const getFilteredEntries = () => {
    if (!statementData?.entries) return [];
    return applyGeneralSearchFilter(statementData.entries);
  };

  const filteredEntries = getFilteredEntries();
  const accounts = accountsData?.accounts || [];

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (statementData && currentPage < statementData.pagination.total_pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Error state
  if (error && !statementData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{t('errors.loadFailed') || 'Failed to load statement'}</p>
        <Button onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <h1 style={{ fontFamily: 'Manrope' }}>{t('statement.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('statement.subtitle')}
            </p>
          </div>
          <Button 
            onClick={() => setIsReportModalOpen(true)}
            className="w-full sm:w-auto"
            size="sm"
            variant="outline"
          >
            <FileDown className="size-4 mr-2" />
            {t('statement.requestReport')}
          </Button>
        </div>
      </div>

      {/* Quick Search Form */}
      <div className="bg-card rounded-lg p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'Manrope' }}>
          {t('statement.quickSearch.title')}
        </h3>
        <form onSubmit={handleQuickSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('statement.quickSearch.placeholder')}
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
              {isSearching ? t('statement.quickSearch.searching') : t('statement.quickSearch.button')}
            </Button>
          </div>
          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}
        </form>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />

      {/* Filters Row with Expandable Search */}
      <div className="bg-card rounded-lg p-4 space-y-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t('statement.filters.direction')}:</span>
            <button
              onClick={() => {
                setDirectionFilter('all');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                directionFilter === 'all'
                  ? 'bg-foreground text-background'
                  : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}
            >
              {t('statement.filters.all')}
            </button>
            <button
              onClick={() => {
                setDirectionFilter('incoming');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                directionFilter === 'incoming'
                  ? 'bg-foreground text-background'
                  : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}
            >
              {t('statement.filters.incoming')}
            </button>
            <button
              onClick={() => {
                setDirectionFilter('outgoing');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                directionFilter === 'outgoing'
                  ? 'bg-foreground text-background'
                  : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}
            >
              {t('statement.filters.outgoing')}
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t('statement.filters.account')}:</span>
            <Select value={accountFilter} onValueChange={(value) => {
              setAccountFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('statement.filters.allAccounts')}</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.account_id} value={account.account_id}>
                    {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expandable Search */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isSearchExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="relative pt-3 border-t border-border/50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('statement.search.placeholder')}
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
            <span>{t('statement.search.placeholder')}</span>
          </button>
        )}
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {isLoadingStatement ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin size-8 border-4 border-border border-t-foreground rounded-full"></div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          filteredEntries.map((transaction) => {
            const netAmount = transaction.credit - transaction.debit;
            const isPositive = netAmount > 0;

            return (
              <button
                key={transaction.id}
                onClick={() => {
                  const modalData: StatementTransaction = {
                    id: transaction.id,
                    date: transaction.date,
                    debit: transaction.debit,
                    credit: transaction.credit,
                    balanceBefore: transaction.balance_before,
                    resultingBalance: transaction.resulting_balance,
                    currency: transaction.currency,
                    info: transaction.info,
                    account: transaction.account,
                  };
                  setSelectedTransaction(modalData);
                }}
                className="w-full bg-card rounded-xl p-4 hover:bg-card/80 transition-all text-left border border-transparent hover:border-border/50"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium truncate">{transaction.info}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono">{transaction.id}</span> • <span>{transaction.account}</span> • {formatRelativeTime(transaction.date)}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p 
                      className={`font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}
                      style={{ fontFamily: 'Manrope' }}
                    >
                      {isPositive ? '+' : ''}{formatCurrency(Math.abs(netAmount), transaction.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Balance: {formatCurrency(transaction.resulting_balance, transaction.currency)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {statementData && statementData.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            {t('payments.pagination.showing', {
              from: ((currentPage - 1) * itemsPerPage + 1).toString(),
              to: Math.min(currentPage * itemsPerPage, statementData.pagination.total_count).toString(),
              total: statementData.pagination.total_count.toString(),
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              {t('payments.pagination.previous')}
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              {t('payments.pagination.page', {
                current: currentPage.toString(),
                total: statementData.pagination.total_pages.toString(),
              })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === statementData.pagination.total_pages}
            >
              {t('payments.pagination.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Statement Details Modal */}
      <StatementDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

      {/* Request Report Modal */}
      <RequestReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportType="statement"
      />
    </div>
  );
}