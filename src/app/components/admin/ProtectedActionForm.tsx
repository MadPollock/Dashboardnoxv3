import React, { useState, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { MFAModal } from './MFAModal';
import { Shield, Loader2 } from 'lucide-react';
import { CommandContext } from '../../lib/commandClient';
import { useAuth } from '../../contexts/AuthContext';
import { useStrings } from '../../hooks/useStrings';

interface ProtectedActionFormProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onSubmit: (data: Record<string, FormDataEntryValue>, context: CommandContext) => Promise<any>;
  requiresMFA?: boolean;
  actionDescription: string;
  successMessage?: string;
  hideCard?: boolean;
}

/**
 * ProtectedActionForm - Reusable component for secure write operations.
 * Implements two-phase submit: Standard → Step-Up MFA if required.
 * All write actions are clearly marked with security indicators.
 */
export function ProtectedActionForm({
  title,
  description,
  children,
  onSubmit,
  requiresMFA = true,
  actionDescription,
  successMessage,
  hideCard = false,
}: ProtectedActionFormProps) {
  const { getAccessToken, user } = useAuth();
  const { t } = useStrings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    if (requiresMFA) {
      // State A → State B: Trigger MFA modal
      setPendingData(data);
      setShowMFAModal(true);
    } else {
      // State A: Direct submit
      await executeSubmit(data);
    }
  };

  const handleMFAVerify = async (mfaCode: string) => {
    // State B: MFA verified, execute the command
    await executeSubmit({ ...pendingData, mfaCode });
    setShowMFAModal(false);
    setPendingData(null);
  };

  const executeSubmit = async (data: Record<string, FormDataEntryValue>) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const accessToken = await getAccessToken();
      const submissionContext: CommandContext = {
        accessToken,
        user,
        mfaCode: (data as any).mfaCode as string | undefined,
      };

      await onSubmit(data, submissionContext);
      setSubmitStatus('success');

      // Reset form on success
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      setSubmitStatus('error');
      console.error('Command failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {!hideCard ? (
        <Card className="border-primary/30 dark:border-primary/50">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Shield className="size-6 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {title}
                  <span className="text-xs px-2 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-full">
                    {t('write.badge')}</span>
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {children}

              {submitStatus === 'success' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {successMessage || t('protectedForm.success')}
                  </p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {t('protectedForm.error')}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="write"
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    {t('protectedForm.processing')}
                  </>
                ) : (
                  <>
                    <Shield className="size-4 mr-2" />
                    {requiresMFA ? t('protectedForm.submit.mfa') : t('protectedForm.submit')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {children}

          {submitStatus === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                {successMessage || t('protectedForm.success')}
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                {t('protectedForm.error')}
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            variant="write"
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                {t('protectedForm.processing')}
              </>
            ) : (
              <>
                <Shield className="size-4 mr-2" />
                {requiresMFA ? t('protectedForm.submit.mfa') : t('protectedForm.submit')}
              </>
            )}
          </Button>
        </form>
      )}

      <MFAModal
        isOpen={showMFAModal}
        onClose={() => {
          setShowMFAModal(false);
          setPendingData(null);
        }}
        onVerify={handleMFAVerify}
        actionDescription={actionDescription}
      />
    </>
  );
}