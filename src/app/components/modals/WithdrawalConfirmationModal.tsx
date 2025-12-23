import React, { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';

interface WithdrawalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmationUrl: string;
}

export function WithdrawalConfirmationModal({
  isOpen,
  onClose,
  confirmationUrl,
}: WithdrawalConfirmationModalProps) {
  const { t } = useStrings();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Listen for messages from the embedded confirmation page
    const handleMessage = (event: MessageEvent) => {
      // Security: Verify the origin matches your checkout domain
      // Adjust this to match your actual checkout domain
      const allowedOrigins = [
        'https://checkout.noxpay.io',
        'https://checkout.crossramp.io',
        // Add other trusted domains here
      ];

      // In development, also allow localhost
      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push('http://localhost:3000');
        allowedOrigins.push('http://localhost:5173');
      }

      const isAllowedOrigin = allowedOrigins.some(origin => 
        event.origin.startsWith(origin)
      );

      if (!isAllowedOrigin) {
        console.warn('Received message from untrusted origin:', event.origin);
        return;
      }

      // Check if the message is a request to close the modal
      if (event.data === 'WITHDRAWAL_COMPLETE' || event.data?.type === 'WITHDRAWAL_COMPLETE') {
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold" style={{ fontFamily: 'Manrope' }}>
            {t('withdrawal.confirmation.title') || 'Confirm Withdrawal'}
          </h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Iframe Content */}
        <div className="relative flex-1 bg-muted/10">
          {/* Loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>

          {/* Embedded confirmation page */}
          <iframe
            ref={iframeRef}
            src={confirmationUrl}
            className="absolute inset-0 w-full h-full bg-white rounded-b-2xl"
            title="Withdrawal Confirmation"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
