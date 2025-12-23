import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useUserPreferences } from '../../store/userPreferences';
import { Button } from '../ui/button';
import { useStrings } from '../../hooks/useStrings';

interface SetupProgressBarProps {
  onNavChange: (navId: string) => void;
  onOpenReceivePayment?: () => void; // Callback to open receive payment modal
}

export function SetupProgressBar({ onNavChange, onOpenReceivePayment }: SetupProgressBarProps) {
  const { t } = useStrings();
  const step = useUserPreferences((state) => state.onboardingStep);
  const steps = useUserPreferences((state) => state.onboardingSteps);
  const totalSteps = Object.keys(steps).length;

  // Don't render if setup is complete
  if (step >= totalSteps) {
    return null;
  }

  const stepLabels = {
    kyc: t('onboarding.step.kyc.title'),
    mfa: t('onboarding.step.mfa.title'),
    template: t('onboarding.step.template.title'),
    checkout: t('onboarding.step.checkout.title'),
  } as const;

  // Map steps to their navigation targets
  const stepNavigationMap = {
    kyc: 'company-profile',
    mfa: 'security',
    template: 'templates',
    checkout: 'receive-payment-modal', // Special case - opens modal
  } as const;

  // Compute progress values
  const completedSteps = Object.values(steps).filter((status) => status === 'completed').length;
  const progress = (completedSteps / totalSteps) * 100;

  // Find the next incomplete step
  const nextStep = (Object.entries(steps).find(([_, status]) => status !== 'completed')?.[0] ??
    undefined) as keyof typeof stepLabels | undefined;

  const handleContinueSetup = () => {
    if (!nextStep) return;

    const navigationTarget = stepNavigationMap[nextStep];

    // Special case: checkout step opens receive payment modal
    if (navigationTarget === 'receive-payment-modal' && onOpenReceivePayment) {
      onOpenReceivePayment();
    } else {
      // Navigate to the appropriate view
      onNavChange(navigationTarget);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 border-b border-primary/20 sticky top-16 z-10">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Progress Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  {t('layout.brand.subtitle')} • Onboarding
                </span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {t('onboarding.progress', { completed: completedSteps, total: totalSteps })}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-2 w-full bg-background/50 dark:bg-background/30 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Next Step Hint - Shows below bar on mobile, inline on desktop */}
            {nextStep && (
              <div className="mt-1.5">
                <p className="text-xs text-muted-foreground">
                  Next: {stepLabels[nextStep]}
                </p>
              </div>
            )}
          </div>

          {/* Right: CTA Button */}
          {nextStep && (
            <Button
              size="sm"
              className="flex-shrink-0 gap-1.5 bg-primary hover:bg-primary/90"
              onClick={handleContinueSetup}
            >
              <span className="hidden sm:inline">{t('onboarding.scrollCta')}</span>
              <span className="sm:hidden">{t('onboarding.scrollCta')}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}