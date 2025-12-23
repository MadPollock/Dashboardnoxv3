import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Banner } from '../ui/banner';
import { ExternalLink, Copy, Check, X, Lock } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';
import { RefundConfirmationModal } from './RefundConfirmationModal';
import { MFAModal } from './MFAModal';
import { useAuth } from '../../contexts/AuthContext';
import { commandRefundPayment } from '../../lib/commands';
import { toast } from 'sonner';

interface PaymentDetailsModalProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canRefund?: boolean;
  onRefundSuccess?: () => void;
}

function formatDateTime(dateString: string): string {
  if (dateString === '---') return '---';
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value, copyable = false, link = false }: { label: string; value: string; copyable?: boolean; link?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        {link && value !== '---' ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium break-all hover:underline inline-flex items-center gap-1"
            style={{ fontFamily: 'Geist' }}
          >
            {value}
            <ExternalLink className="size-3 flex-shrink-0" />
          </a>
        ) : (
          <p className="text-sm font-medium break-all" style={{ fontFamily: 'Geist' }}>
            {value}
          </p>
        )}
        {copyable && value !== '---' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            {copied ? (
              <Check className="size-3 text-green-600" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PaymentDetailsModal({
  transaction,
  open,
  onOpenChange,
  canRefund,
  onRefundSuccess,
}: PaymentDetailsModalProps) {
  const { t } = useStrings();
  const { loginWithMFA, user } = useAuth();
  
  // Refund flow state
  const [isRefundConfirmOpen, setIsRefundConfirmOpen] = useState(false);
  const [isMFAOpen, setIsMFAOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Helper function to check if a payment is refundable
  const isRefundable = (tx: any): boolean => {
    const paymentDate = new Date(tx.date);
    const now = new Date();
    const diffInMs = now.getTime() - paymentDate.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    return (
      diffInDays <= 7 &&
      tx.type === 'received' &&
      (tx.state === 'Completed' || tx.state === 'Success')
    );
  };

  const handleRefundClick = () => {
    setIsRefundConfirmOpen(true);
  };

  const handleRefundConfirm = (reason: string) => {
    setRefundReason(reason);
    setIsRefundConfirmOpen(false);
    setIsMFAOpen(true);
  };

  const handleMFAVerify = async () => {
    setIsProcessingRefund(true);

    try {
      const mfaToken = await loginWithMFA();
      const refundAmount = transaction.amount || transaction.entryValue || '0';

      const result = await commandRefundPayment(
        {
          payment_id: transaction.id,
          refund_amount: refundAmount,
          refund_reason: refundReason,
          full_refund: true,
          notify_customer: true,
        },
        { accessToken: mfaToken, user }
      );

      if (result.success) {
        toast.success(result.message || t('payments.refund.success'));
        setIsMFAOpen(false);
        setRefundReason('');
        onOpenChange(false);
        onRefundSuccess?.();
      } else {
        toast.error(result.message || t('payments.refund.error'));
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      toast.error(t('payments.refund.error'));
      throw error;
    } finally {
      setIsProcessingRefund(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>
              Payment Details
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'Manrope' }}>
              View detailed information about the payment transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Refund Eligibility Banner */}
            {isRefundable(transaction) && canRefund && (
              <Banner
                variant="warning"
                icon={Lock}
                title={t('payments.refund.eligible.title')}
                description={t('payments.refund.eligible.description')}
                action={
                  <Button
                    variant="destructive"
                    onClick={handleRefundClick}
                    size="sm"
                    className="flex-shrink-0 w-full sm:w-auto"
                  >
                    <Lock className="size-4 mr-2" />
                    {t('payments.actions.refund')}
                  </Button>
                }
              />
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailRow
                label="Criado em"
                value={formatDateTime(transaction.createdAt)}
              />
              <DetailRow
                label="Atualizado em"
                value={formatDateTime(transaction.updatedAt)}
              />
            </div>

            <div className="h-px bg-border" />

            {/* Address and URL */}
            <div className="space-y-4">
              <DetailRow
                label="Endereço"
                value={transaction.address}
                copyable
              />
              {transaction.checkoutUrl !== '---' && (
                <DetailRow
                  label="URL"
                  value={transaction.checkoutUrl}
                  copyable
                  link
                />
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Template and Process */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailRow label="Template" value={transaction.template} />
              <DetailRow label="Processo" value={transaction.process} />
            </div>

            <div className="h-px bg-border" />

            {/* Entry Details */}
            <div className="space-y-3">
              <p
                className="text-sm font-medium text-muted-foreground"
                style={{ fontFamily: 'Manrope' }}
              >
                Entrada
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailRow label="Valor de entrada" value={transaction.entryValue} />
                <DetailRow label="Moeda de entrada" value={transaction.entryCurrency} />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Exit Details */}
            <div className="space-y-3">
              <p
                className="text-sm font-medium text-muted-foreground"
                style={{ fontFamily: 'Manrope' }}
              >
                Saída
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailRow label="Valor de saída" value={transaction.exitValue} />
                <DetailRow label="Moeda de saída" value={transaction.exitCurrency} />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailRow label="Cotação efetiva" value={transaction.effectiveRate} />
              <DetailRow label="Cotação base" value={transaction.baseRate} />
            </div>

            <div className="h-px bg-border" />

            {/* Client and External ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailRow label="Cliente" value={transaction.clientId} />
              <DetailRow label="ID Externo" value={transaction.externalId} />
            </div>

            <div className="h-px bg-border" />

            {/* Blockchain Details */}
            <div className="space-y-4">
              {transaction.wallet !== '---' && (
                <DetailRow label="Wallet" value={transaction.wallet} copyable />
              )}
              {transaction.txHash !== '---' && (
                <DetailRow label="TX_HASH" value={transaction.txHash} copyable />
              )}
            </div>

            <div className="h-px bg-border" />

            {/* State and Expiration */}
            <div className="space-y-4">
              <DetailRow label="Estado" value={transaction.state} />
              {transaction.expirationDate !== '---' && (
                <DetailRow
                  label="Data de expiração"
                  value={formatDateTime(transaction.expirationDate)}
                />
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Expirado
                </p>
                <div className="flex items-center gap-2">
                  {transaction.expired ? (
                    <>
                      <X className="size-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">Sim</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4 text-green-600" />
                      <span className="text-sm font-medium">Não</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RefundConfirmationModal
        isOpen={isRefundConfirmOpen}
        onClose={() => setIsRefundConfirmOpen(false)}
        onConfirm={handleRefundConfirm}
        amount={transaction.entryValue}
        paymentId={transaction.id}
      />

      <MFAModal
        isOpen={isMFAOpen}
        onClose={() => setIsMFAOpen(false)}
        onVerify={handleMFAVerify}
        actionDescription={`Refund ${transaction.entryValue} to payment ${transaction.id}`}
      />
    </>
  );
}