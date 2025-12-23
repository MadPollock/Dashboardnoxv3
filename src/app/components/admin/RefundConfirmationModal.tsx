import React, { useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Banner } from '../ui/banner';
import { Textarea } from '../ui/textarea';
import { useStrings } from '../../hooks/useStrings';

interface RefundConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  amount?: string;
  paymentId?: string;
  disputeId?: string;
  isDispute?: boolean;
}

/**
 * RefundConfirmationModal - First step in refund flow
 * Collects refund reason and warns about irreversibility
 */
export function RefundConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  paymentId,
  disputeId,
  isDispute = false,
}: RefundConfirmationModalProps) {
  const { t } = useStrings();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError(t('refund.confirmation.reasonRequired'));
      return;
    }

    if (reason.trim().length < 10) {
      setError(t('refund.confirmation.reasonTooShort'));
      return;
    }

    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-lg bg-card rounded-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold" style={{ fontFamily: 'Manrope' }}>
                {isDispute ? t('refund.confirmation.disputeTitle') : t('refund.confirmation.title')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isDispute ? t('refund.confirmation.disputeSubtitle') : t('refund.confirmation.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Warning Banner */}
          <Banner
            variant="alert"
            icon={AlertTriangle}
            title={t('refund.confirmation.warningTitle')}
            description={t('refund.confirmation.warningMessage')}
          />

          {/* Balance Warning */}
          <Banner
            variant="warning"
            icon={AlertTriangle}
            title={t('refund.confirmation.balanceWarningTitle')}
            description={t('refund.confirmation.balanceWarningMessage')}
          />

          {/* Refund Details */}
          <div className="space-y-3">
            {amount && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('refund.confirmation.amount')}</span>
                <span className="font-medium" style={{ fontFamily: 'Geist' }}>{amount}</span>
              </div>
            )}
            {paymentId && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('refund.confirmation.paymentId')}</span>
                <span className="font-medium font-mono text-sm">{paymentId}</span>
              </div>
            )}
            {disputeId && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('refund.confirmation.disputeId')}</span>
                <span className="font-medium font-mono text-sm">{disputeId}</span>
              </div>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ fontFamily: 'Manrope' }}>
              {t('refund.confirmation.reasonLabel')} <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder={t('refund.confirmation.reasonPlaceholder')}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('refund.confirmation.reasonHint')}
                </p>
              )}
              <span className="text-xs text-muted-foreground">
                {reason.length}/500
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            {t('refund.confirmation.cancel')}
          </Button>
          <Button
            variant="write"
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            <Lock className="size-4 mr-2" />
            {t('refund.confirmation.continue')}
          </Button>
        </div>
      </div>
    </>
  );
}