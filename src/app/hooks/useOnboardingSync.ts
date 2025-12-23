/**
 * useOnboardingSync - Syncs onboarding state with Auth0 claims and backend queries
 * 
 * This hook implements Option A (Client-Side Computed Status):
 * - Steps 1 & 2 (KYC/MFA): Read from Auth0 JWT claims
 * - Steps 3 & 4 (Template/Payment): Query backend
 * 
 * Usage: Call once on app mount
 */

import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserPreferences } from '../store/userPreferences';
import { queryTemplatesList } from '../lib/queries';
import { queryPaymentsList } from '../lib/queries';

export function useOnboardingSync() {
  const { user } = useAuth();
  const completeOnboardingStep = useUserPreferences((state) => state.completeOnboardingStep);
  const setOnboardingStepStatus = useUserPreferences((state) => state.setOnboardingStepStatus);

  const syncOnboardingState = useCallback(async () => {
    if (!user) return;

    // STEP 1: KYC - Check if merchant metadata exists in app_metadata
    const merchantData = user.metadata.app?.merchant;
    if (merchantData && merchantData !== null) {
      completeOnboardingStep('kyc');
    }

    // STEP 2: MFA - Check if MFA is enabled in user metadata or claims
    // Auth0 typically stores MFA status in user_metadata or as a claim
    const mfaEnabled = user.metadata.user?.mfa_enabled || user.metadata.app?.mfa_enabled;
    if (mfaEnabled === true) {
      completeOnboardingStep('mfa');
    }

    // STEP 3: Template - Query backend to check if user has templates
    try {
      const templatesResponse = await queryTemplatesList({ page: 1, limit: 1 });
      if (templatesResponse.templates.length > 0) {
        completeOnboardingStep('template');
      }
    } catch (error) {
      console.error('[OnboardingSync] Failed to query templates:', error);
    }

    // STEP 4: Payment - Query backend to check if user has payments
    try {
      // Calculate date range for last 90 days
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);

      const paymentsResponse = await queryPaymentsList({
        date_from: from.toISOString().split('T')[0],
        date_to: to.toISOString().split('T')[0],
        page: 1,
        limit: 1,
      });

      if (paymentsResponse.payments.length > 0) {
        completeOnboardingStep('checkout');
      }
    } catch (error) {
      console.error('[OnboardingSync] Failed to query payments:', error);
    }
  }, [user, completeOnboardingStep]);

  // Sync on mount and when user changes
  useEffect(() => {
    syncOnboardingState();
  }, [syncOnboardingState]);

  // Return sync function for manual refresh
  return { syncOnboardingState };
}
