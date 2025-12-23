import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { useStrings } from '../../hooks/useStrings';
import { requestReport } from '../../lib/commands';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface RequestReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'transactions' | 'balances' | 'statement' | 'tax';
}

type ReportFormat = 'pdf' | 'csv' | 'xlsx';

export function RequestReportModal({ isOpen, onClose, reportType }: RequestReportModalProps) {
  const { t } = useStrings();
  const { getAccessTokenSilently } = useAuth();
  
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo.toISOString().slice(0, 16);
  });
  
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().slice(0, 16);
  });
  
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateDates = (): boolean => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    
    if (to <= from) {
      setError(t('requestReport.error.invalidRange'));
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateDates()) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const accessToken = await getAccessTokenSilently();

      const response = await requestReport(
        {
          type: reportType as 'transactions' | 'balances' | 'statement' | 'tax',
          format: format as 'pdf' | 'csv' | 'xlsx',
          dateFrom,
          dateTo,
        },
        { accessToken }
      );

      toast.success(t('requestReport.success'), {
        description: `Report ID: ${response.reportId}. You'll receive an email when it's ready.`,
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to request report:', error);
      setError(error instanceof Error ? error.message : 'Failed to request report');
      toast.error('Failed to request report', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className="relative bg-card rounded-md shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'Manrope' }}>
                {t('requestReport.title')}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t('requestReport.description')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-3">
              {t('requestReport.dateRange.label')}
            </label>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t('requestReport.dateRange.from')}
                </label>
                <input
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t('requestReport.dateRange.to')}
                </label>
                <input
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                  required
                />
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              {t('requestReport.format.label')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                disabled={isSubmitting}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-left disabled:opacity-50 ${
                  format === 'pdf'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    format === 'pdf' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {format === 'pdf' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="font-medium">{t('requestReport.format.pdf')}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                disabled={isSubmitting}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-left disabled:opacity-50 ${
                  format === 'csv'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    format === 'csv' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {format === 'csv' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="font-medium">{t('requestReport.format.csv')}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                disabled={isSubmitting}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-left disabled:opacity-50 ${
                  format === 'xlsx'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    format === 'xlsx' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {format === 'xlsx' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="font-medium">{t('requestReport.format.xlsx')}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Email Info */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">
              {t('requestReport.email.info')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="muted"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t('requestReport.button.cancel')}
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? '...' : t('requestReport.button.request')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}