import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '../ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';
import { Shield, XIcon } from 'lucide-react';
import { useStrings } from '../../hooks/useStrings';
import { cn } from '../ui/utils';

interface MFAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  actionDescription: string;
}

/**
 * MFAModal - Two-factor authentication modal for protected actions.
 * Displays a 6-digit OTP input and validates the code before executing the action.
 */
export function MFAModal({ isOpen, onClose, onVerify, actionDescription }: MFAModalProps) {
  const { t } = useStrings();
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (mfaCode.length !== 6) {
      setError(t('mfa.error'));
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await onVerify(mfaCode);
      // Reset on success
      setMfaCode('');
      onClose();
    } catch (err) {
      setError(t('mfa.invalid'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setMfaCode('');
    setError('');
    onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[70] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-md"
          )}
        >
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="size-6 text-primary flex-shrink-0" />
              <DialogPrimitive.Title className="text-xl font-bold">{t('mfa.title')}</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {t('mfa.description')}
              <br />
              <span className="font-medium text-foreground">{actionDescription}</span>
            </DialogPrimitive.Description>
          </div>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('mfa.prompt')}</p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={(value) => {
                    setMfaCode(value);
                    setError('');
                  }}
                  onComplete={handleVerify}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              {t('mfa.cancel')}
            </Button>
            <Button
              onClick={handleVerify}
              disabled={mfaCode.length !== 6 || isVerifying}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Shield className="size-4 mr-2" />
              {t('mfa.verify')}
            </Button>
          </div>

          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}