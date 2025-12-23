import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { useStrings } from '../../hooks/useStrings';

export interface StatementTransaction {
  id: string;
  date: string;
  debit: number;
  credit: number;
  balanceBefore: number;
  resultingBalance: number;
  currency: string;
  info: string;
  account: string;
}

interface StatementDetailsModalProps {
  transaction: StatementTransaction | null;
  onClose: () => void;
}

export function StatementDetailsModal({ transaction, onClose }: StatementDetailsModalProps) {
  const { t } = useStrings();

  if (!transaction) return null;

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' ' + currency;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate net amount (credit - debit)
  const netAmount = transaction.credit - transaction.debit;
  const isPositive = netAmount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative bg-card rounded-md shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'Manrope' }}>
            {t('statement.details.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Transaction ID */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('statement.details.id')}</p>
            <p className="font-mono text-sm">{transaction.id}</p>
          </div>

          {/* Date */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('statement.details.date')}</p>
            <p className="font-medium">{formatDate(transaction.date)}</p>
          </div>

          {/* Amount */}
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-2">{t('statement.details.amount')}</p>
            <p 
              className={`text-2xl font-semibold ${
                isPositive ? 'text-success' : 'text-destructive'
              }`}
              style={{ fontFamily: 'Manrope' }}
            >
              {isPositive ? '+' : ''}{formatCurrency(netAmount, transaction.currency)}
            </p>
          </div>

          {/* Debit & Credit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('statement.details.debit')}</p>
              <p className="font-medium text-destructive">
                {transaction.debit > 0 ? '-' : ''}{formatCurrency(transaction.debit, transaction.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('statement.details.credit')}</p>
              <p className="font-medium text-success">
                {transaction.credit > 0 ? '+' : ''}{formatCurrency(transaction.credit, transaction.currency)}
              </p>
            </div>
          </div>

          {/* Balances */}
          <div className="border-t border-border/50 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{t('statement.details.balanceBefore')}</p>
              <p className="font-medium">{formatCurrency(transaction.balanceBefore, transaction.currency)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">{t('statement.details.resultingBalance')}</p>
              <p className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>
                {formatCurrency(transaction.resultingBalance, transaction.currency)}
              </p>
            </div>
          </div>

          {/* Currency */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('statement.details.currency')}</p>
            <p className="font-medium">{transaction.currency}</p>
          </div>

          {/* Info */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('statement.details.info')}</p>
            <p className="text-sm bg-muted/30 rounded-lg p-3">{transaction.info}</p>
          </div>

          {/* Account */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('statement.details.account')}</p>
            <p className="font-medium">{transaction.account}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border/50">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}