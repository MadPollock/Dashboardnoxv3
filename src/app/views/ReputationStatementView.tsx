import React, { useState } from 'react';
import { ArrowLeft, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { useStrings } from '../hooks/useStrings';
import { Button } from '../components/ui/button';
import { DateRangeSelector, DateRange } from '../components/analytics/DateRangeSelector';

// Mock reputation records
const mockReputationRecords = [
  {
    id: 'REP-001',
    date: '2024-12-15T10:30:00Z',
    name: 'Successful Payment Completion',
    pointsChange: 5,
    resultingPoints: 75,
  },
  {
    id: 'REP-002',
    date: '2024-12-14T15:45:00Z',
    name: 'Transaction Dispute Filed',
    pointsChange: -10,
    resultingPoints: 70,
  },
  {
    id: 'REP-003',
    date: '2024-12-12T09:20:00Z',
    name: 'High Volume Milestone Reached',
    pointsChange: 15,
    resultingPoints: 80,
  },
  {
    id: 'REP-004',
    date: '2024-12-10T14:10:00Z',
    name: 'On-Time Settlement',
    pointsChange: 3,
    resultingPoints: 65,
  },
  {
    id: 'REP-005',
    date: '2024-12-08T11:30:00Z',
    name: 'Compliance Check Passed',
    pointsChange: 10,
    resultingPoints: 62,
  },
  {
    id: 'REP-006',
    date: '2024-12-05T16:45:00Z',
    name: 'Late Payment Settlement',
    pointsChange: -5,
    resultingPoints: 52,
  },
  {
    id: 'REP-007',
    date: '2024-12-03T13:20:00Z',
    name: 'Successful Payment Completion',
    pointsChange: 5,
    resultingPoints: 57,
  },
  {
    id: 'REP-008',
    date: '2024-11-28T10:15:00Z',
    name: 'Monthly Review - Positive',
    pointsChange: 8,
    resultingPoints: 52,
  },
  {
    id: 'REP-009',
    date: '2024-11-25T14:30:00Z',
    name: 'Customer Complaint Resolved',
    pointsChange: 7,
    resultingPoints: 44,
  },
  {
    id: 'REP-010',
    date: '2024-11-22T09:45:00Z',
    name: 'Failed Compliance Check',
    pointsChange: -15,
    resultingPoints: 37,
  },
  {
    id: 'REP-011',
    date: '2024-11-20T16:00:00Z',
    name: 'Successful Payment Completion',
    pointsChange: 5,
    resultingPoints: 52,
  },
  {
    id: 'REP-012',
    date: '2024-11-18T11:20:00Z',
    name: 'High Transaction Success Rate',
    pointsChange: 12,
    resultingPoints: 47,
  },
  {
    id: 'REP-013',
    date: '2024-11-15T15:30:00Z',
    name: 'On-Time Settlement',
    pointsChange: 3,
    resultingPoints: 35,
  },
  {
    id: 'REP-014',
    date: '2024-11-12T10:10:00Z',
    name: 'Successful Payment Completion',
    pointsChange: 5,
    resultingPoints: 32,
  },
  {
    id: 'REP-015',
    date: '2024-11-08T14:45:00Z',
    name: 'Transaction Chargeback',
    pointsChange: -20,
    resultingPoints: 27,
  },
  {
    id: 'REP-016',
    date: '2024-11-05T09:30:00Z',
    name: 'Compliance Check Passed',
    pointsChange: 10,
    resultingPoints: 47,
  },
  {
    id: 'REP-017',
    date: '2024-11-01T16:20:00Z',
    name: 'Monthly Review - Positive',
    pointsChange: 8,
    resultingPoints: 37,
  },
  {
    id: 'REP-018',
    date: '2024-10-28T11:40:00Z',
    name: 'Successful Payment Completion',
    pointsChange: 5,
    resultingPoints: 29,
  },
  {
    id: 'REP-019',
    date: '2024-10-25T13:15:00Z',
    name: 'Customer Feedback - Positive',
    pointsChange: 6,
    resultingPoints: 24,
  },
  {
    id: 'REP-020',
    date: '2024-10-22T10:50:00Z',
    name: 'High Volume Milestone Reached',
    pointsChange: 15,
    resultingPoints: 18,
  },
];

const ITEMS_PER_PAGE = 10;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getReputationLevel(score: number): { label: string; color: string } {
  if (score < 20) return { label: 'Blocked', color: 'text-red-600 dark:text-red-400' };
  if (score < 40) return { label: 'Low', color: 'text-orange-500 dark:text-orange-400' };
  if (score < 60) return { label: 'Average', color: 'text-yellow-500 dark:text-yellow-400' };
  if (score < 80) return { label: 'Good', color: 'text-green-500 dark:text-green-400' };
  return { label: 'Excellent', color: 'text-emerald-600 dark:text-emerald-500' };
}

interface ReputationStatementViewProps {
  onBack?: () => void;
}

export function ReputationStatementView({ onBack }: ReputationStatementViewProps) {
  const { t } = useStrings();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Default date range: last 3 months
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setMonth(defaultStartDate.getMonth() - 3);
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: defaultStartDate.toISOString(),
    to: defaultEndDate.toISOString(),
  });

  // Filter records by date range
  const filteredRecords = mockReputationRecords.filter((record) => {
    const recordDate = new Date(record.date);
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    return recordDate >= fromDate && recordDate <= toDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setCurrentPage(1); // Reset to first page when date range changes
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-1">{t('reputationStatement.title')}</h1>
          <p className="text-muted-foreground">{t('reputationStatement.subtitle')}</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <DateRangeSelector
          value={dateRange}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* Records Table */}
      <div className="bg-card rounded-md border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                  {t('reputationStatement.table.date')}
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                  {t('reputationStatement.table.event')}
                </th>
                <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">
                  {t('reputationStatement.table.change')}
                </th>
                <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">
                  {t('reputationStatement.table.resultingScore')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <Award className="size-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">{t('reputationStatement.noRecords')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => {
                  const level = getReputationLevel(record.resultingPoints);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="text-sm text-foreground">{formatDate(record.date)}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-foreground">{record.name}</div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {record.pointsChange > 0 ? (
                            <TrendingUp className="size-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingDown className="size-4 text-red-600 dark:text-red-400" />
                          )}
                          <span
                            className={`text-sm font-semibold font-mono ${
                              record.pointsChange > 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {record.pointsChange > 0 ? '+' : ''}
                            {record.pointsChange}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-sm font-bold font-mono ${level.color}`}>
                            {record.resultingPoints}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${level.color} bg-current/10`}>
                            {t(`companyProfile.reputation.level.${level.label.toLowerCase()}`)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <div className="border-t border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('common.showing')} {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredRecords.length)}{' '}
                {t('common.of')} {filteredRecords.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  {t('common.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('common.page')} {currentPage} {t('common.of')} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}