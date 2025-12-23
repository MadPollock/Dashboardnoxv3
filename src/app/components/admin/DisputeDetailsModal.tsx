import React, { useState } from 'react';
import { X, AlertCircle, Clock, FileText, Shield, Lock, CheckCircle, Download } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Banner } from '../ui/banner';
import { Separator } from '../ui/separator';
import { useStrings } from '../../hooks/useStrings';
import { useAuth } from '../../contexts/AuthContext';
import { RefundConfirmationModal } from './RefundConfirmationModal';
import { DefenseFormModal } from '../modals/DefenseFormModal';
import { Dispute } from '../../lib/queries';
import { submitDisputeDefense, refundAndResolveDispute } from '../../lib/commands';
import { getApiBaseUrl } from '../../config/runtime';
import { toast } from 'sonner';

interface DisputeDetailsModalProps {
  dispute: Dispute;
  isOpen: boolean;
  onClose: () => void;
  onRefetch?: () => void;
}

export function DisputeDetailsModal({ dispute, isOpen, onClose, onRefetch }: DisputeDetailsModalProps) {
  const { t } = useStrings();
  const { user, loginWithMFA } = useAuth();

  // RBAC: Check if user can write
  const canWrite = user?.role === 'user_admin_crossramp' || user?.role === 'user_operations_crossramp';

  // State for defense submission
  const [isDefenseModalOpen, setIsDefenseModalOpen] = useState(false);
  const [isSubmittingDefense, setIsSubmittingDefense] = useState(false);

  // Refund flow state
  const [isRefundConfirmOpen, setIsRefundConfirmOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  if (!isOpen) return null;

  const getStatusBadgeVariant = (): 'outline' => {
    return 'outline';
  };

  const getStatusBadgeClassName = (status: string): string => {
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

  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | null): string => {
    switch (severity) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-orange-500';
      case 'low':
        return 'text-yellow-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getDaysUntilDeadline = (deadlineString: string): number => {
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffInMs = deadline.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: string, currency: string): string => {
    const num = parseFloat(amount);
    if (currency === 'BRL') {
      return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const daysUntilDeadline = getDaysUntilDeadline(dispute.deadline);
  const isUrgent = daysUntilDeadline <= 3 && dispute.status !== 'closed' && dispute.status !== 'resolved';

  // Submit Defense Handler
  const handleDefenseSubmit = async (defenseText: string, attachments: string[]) => {
    setIsSubmittingDefense(true);

    try {
      // Trigger MFA
      const mfaToken = await loginWithMFA();

      // Submit defense command
      const result = await submitDisputeDefense(
        {
          dispute_id: dispute.id,
          defense_text: defenseText,
          attachments: attachments.length > 0 ? attachments : undefined,
        },
        { accessToken: mfaToken, user }
      );

      if (result.success) {
        toast.success(t('disputes.defense.success'));
        setIsDefenseModalOpen(false);
        onRefetch?.();
        onClose();
      } else {
        toast.error(result.message || t('disputes.defense.failed'));
      }
    } catch (error: any) {
      console.error('Defense submission error:', error);
      
      if (error.message?.includes('Deadline')) {
        toast.error(t('disputes.defense.deadlineExpired'));
      } else if (error.message?.includes('50 characters')) {
        toast.error(t('disputes.defense.textTooShort', { min: 50 }));
      } else {
        toast.error(t('disputes.defense.failed'));
      }
    } finally {
      setIsSubmittingDefense(false);
    }
  };

  // Refund Flow Handlers
  const handleRefundClick = () => {
    setIsRefundConfirmOpen(true);
  };

  const handleRefundConfirm = async (reason: string) => {
    setRefundReason(reason);
    setIsRefundConfirmOpen(false);
    setIsProcessingRefund(true);

    try {
      // Trigger MFA
      const mfaToken = await loginWithMFA();

      // Process refund and resolve dispute
      const result = await refundAndResolveDispute(
        {
          dispute_id: dispute.id,
          payment_id: dispute.payment_id,
          refund_amount: dispute.amount,
          refund_reason: reason,
          mark_as_resolved: true,
        },
        { accessToken: mfaToken, user }
      );

      if (result.success) {
        toast.success(t('disputes.refund.success'));
        onRefetch?.();
        onClose();
      } else {
        // Handle specific error codes
        if (result.error_code === 'INSUFFICIENT_BALANCE') {
          const available = result.metadata?.available_balance || '0';
          const required = result.metadata?.required_amount || dispute.amount;
          toast.error(
            t('disputes.refund.insufficientBalance', {
              available: formatCurrency(available, dispute.currency),
              required: formatCurrency(required, dispute.currency),
            })
          );
        } else {
          toast.error(result.message || t('disputes.refund.failed'));
        }
      }
    } catch (error: any) {
      console.error('Refund processing error:', error);
      toast.error(t('disputes.refund.failed'));
    } finally {
      setIsProcessingRefund(false);
      setRefundReason('');
    }
  };

  const handleDownloadReceipt = async () => {
    if (!dispute.refund_id) return;

    try {
      const receiptUrl = new URL(`${getApiBaseUrl()}/api/disputes/refund-receipt`);
      receiptUrl.searchParams.set('refund_id', dispute.refund_id);
      receiptUrl.searchParams.set('dispute_id', dispute.id);

      window.open(receiptUrl.toString(), '_blank', 'noopener,noreferrer');
      toast.success(t('disputes.receipt.success'));
    } catch (error) {
      toast.error(t('disputes.receipt.failed'));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card rounded-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${
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
            <div>
              <h2 style={{ fontFamily: 'Manrope' }} className="font-semibold">
                {t('disputes.modal.title')}
              </h2>
              <p className="text-sm text-muted-foreground">{dispute.id}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isProcessingRefund || isSubmittingDefense}>
            <X className="size-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Row */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusBadgeVariant()} className={`text-xs ${getStatusBadgeClassName(dispute.status)}`}>
              {t(`disputes.status.${dispute.status}`)}
            </Badge>
            {dispute.is_refunded && (
              <Badge variant="outline" className="text-xs">
                {t('disputes.badge.refunded')}
              </Badge>
            )}
            {dispute.is_infraction && (
              <Badge variant="destructive" className="text-xs">
                {t('disputes.badge.infraction')}
              </Badge>
            )}
          </div>

          {/* Deadline Warning */}
          {isUrgent && (
            <Banner
              variant="warning"
              icon={Clock}
              title={daysUntilDeadline === 0 
                ? t('disputes.deadline.today')
                : t('disputes.deadline.daysLeft', { days: daysUntilDeadline })
              }
              description={t('disputes.modal.deadlineWarning', { date: formatDate(dispute.deadline) })}
            />
          )}

          {/* Overview Section */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
              <FileText className="size-4" />
              {t('disputes.modal.overview')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.clientName')}</p>
                <p className="text-sm font-medium">{dispute.client_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.amount')}</p>
                <p className="text-sm font-medium">{formatCurrency(dispute.amount, dispute.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.paymentId')}</p>
                <p className="text-sm font-medium font-mono">{dispute.payment_id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.disputeType')}</p>
                <p className="text-sm font-medium">{t(`disputes.type.${dispute.dispute_type}`)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.openedDate')}</p>
                <p className="text-sm font-medium">{formatDate(dispute.date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.deadline')}</p>
                <p className="text-sm font-medium">{formatDate(dispute.deadline)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Client Reason */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
              <AlertCircle className="size-4" />
              {t('disputes.modal.clientReason')}
            </h3>
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-sm leading-relaxed">{dispute.client_reason}</p>
            </div>
          </div>

          {/* Merchant Defense */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
              <Shield className="size-4" />
              {t('disputes.modal.merchantDefense')}
            </h3>
            {dispute.merchant_defense ? (
              <div className="space-y-2">
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm leading-relaxed">{dispute.merchant_defense}</p>
                </div>
                {dispute.defense_submitted_at && (
                  <p className="text-xs text-muted-foreground">
                    {t('disputes.modal.defenseSubmittedAt', { date: formatDate(dispute.defense_submitted_at) })}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-muted/30 border border-dashed border-border p-4">
                <p className="text-sm text-muted-foreground italic">
                  {t('disputes.modal.noDefense')}
                </p>
              </div>
            )}
          </div>

          {/* Infraction Details */}
          {dispute.is_infraction && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-destructive" style={{ fontFamily: 'Manrope' }}>
                  <AlertCircle className="size-4" />
                  {t('disputes.modal.infractionDetails')}
                </h3>
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.infractionReason')}</p>
                    <p className="text-sm">{dispute.infraction_reason}</p>
                  </div>
                  {dispute.infraction_severity && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.severity')}</p>
                      <p className={`text-sm font-medium ${getSeverityColor(dispute.infraction_severity)}`}>
                        {t(`disputes.severity.${dispute.infraction_severity}`)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Refund Status */}
          {dispute.is_refunded && dispute.refund_id && (
            <>
              <Separator />
              <div>
                <Banner
                  variant="info"
                  icon={CheckCircle}
                  title={t('disputes.modal.refundStatus')}
                  description={t('disputes.modal.refundProcessed')}
                />
                <div className="mt-4 bg-muted/30 rounded-lg p-4 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.refundId')}</p>
                    <p className="text-sm font-mono font-medium">{dispute.refund_id}</p>
                  </div>
                  {dispute.refund_amount && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.refundAmount')}</p>
                      <p className="text-sm font-medium">{formatCurrency(dispute.refund_amount, dispute.currency)}</p>
                    </div>
                  )}
                  {dispute.refund_date && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('disputes.modal.refundDate')}</p>
                      <p className="text-sm font-medium">{formatDate(dispute.refund_date)}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            {/* Quick action hints */}
            {!dispute.is_refunded && (dispute.status === 'open' || dispute.status === 'under_review') && canWrite && (
              <p className="text-xs text-muted-foreground">
                {dispute.is_infraction 
                  ? t('disputes.modal.quickResolveHint')
                  : t('disputes.modal.quickRefundHint')
                }
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <Button variant="outline" onClick={onClose} disabled={isProcessingRefund || isSubmittingDefense}>
              {t('disputes.modal.close')}
            </Button>
            
            {/* Get Refund Receipt button for refunded disputes */}
            {dispute.is_refunded && dispute.refund_id && (
              <Button 
                variant="default"
                onClick={handleDownloadReceipt}
                disabled={isProcessingRefund || isSubmittingDefense}
              >
                <Download className="size-4 mr-2" />
                {t('disputes.modal.getRefundReceipt')}
              </Button>
            )}
            
            {/* Submit Defense button - only if no defense yet and not refunded */}
            {canWrite && dispute.status === 'open' && !dispute.merchant_defense && !dispute.is_refunded && (
              <Button 
                variant="write" 
                onClick={() => setIsDefenseModalOpen(true)}
                disabled={isProcessingRefund || isSubmittingDefense}
              >
                <Shield className="size-4 mr-2" />
                {t('disputes.modal.submitDefense')}
              </Button>
            )}
            
            {/* Refund & Resolve button for any open/under_review dispute */}
            {canWrite && !dispute.is_refunded && (dispute.status === 'open' || dispute.status === 'under_review') && (
              <Button 
                variant="destructive"
                onClick={handleRefundClick}
                disabled={isProcessingRefund || isSubmittingDefense}
              >
                <Lock className="size-4 mr-2" />
                {isProcessingRefund ? t('disputes.refund.processing') : t('disputes.modal.refundAndResolve')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Defense Form Modal */}
      <DefenseFormModal
        isOpen={isDefenseModalOpen}
        onClose={() => setIsDefenseModalOpen(false)}
        onSubmit={handleDefenseSubmit}
        disputeId={dispute.id}
        minChars={50}
        maxChars={2000}
        maxAttachments={5}
        maxFileSize={10 * 1024 * 1024}
      />

      {/* Refund Confirmation Modal */}
      <RefundConfirmationModal
        isOpen={isRefundConfirmOpen}
        onClose={() => setIsRefundConfirmOpen(false)}
        onConfirm={handleRefundConfirm}
        amount={formatCurrency(dispute.amount, dispute.currency)}
        paymentId={dispute.payment_id}
        disputeId={dispute.id}
        isDispute={true}
      />
    </>
  );
}