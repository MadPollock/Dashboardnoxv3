/**
 * SecurityView - Security settings and MFA management
 */

import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, AlertTriangle, Lock, ExternalLink, Smartphone, QrCode, Mail } from 'lucide-react';
import { useStrings } from '../hooks/useStrings';
import { Button } from '../components/ui/button';
import { queryMFAStatus, MFAInfo, MFAStatus } from '../lib/queries';
import { activateMFA, confirmMFA } from '../lib/commands';
import { useAuth } from '../contexts/AuthContext';

export function SecurityView() {
  const { t } = useStrings();
  const { getAccessToken } = useAuth();
  const [mfaInfo, setMfaInfo] = useState<MFAInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch MFA status on mount
  useEffect(() => {
    const fetchMFAStatus = async () => {
      try {
        setIsLoading(true);
        const token = await getAccessToken();
        const data = await queryMFAStatus({
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setMfaInfo(data);
      } catch (error) {
        console.error('Failed to fetch MFA status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMFAStatus();
  }, [getAccessToken]);

  const handleActivateMFA = async () => {
    try {
      const token = await getAccessToken();
      const response = await activateMFA({}, {
        accessToken: token,
      });

      if (response.email_sent) {
        alert(t('security.mfa.emailSent'));
        
        // Update local state to pending
        setMfaInfo({
          status: 'pending',
          activatedDate: undefined,
          lastUsed: undefined,
        });
      }
    } catch (error) {
      console.error('Failed to activate MFA:', error);
      alert('Failed to activate MFA. Please try again.');
    }
  };

  const handleConfirmMFA = async () => {
    try {
      // Prompt user for MFA code (temporary solution until Auth0 popup is implemented)
      const code = prompt('Enter your 6-digit MFA code from your authenticator app:');
      if (!code) return;

      const token = await getAccessToken();
      const response = await confirmMFA(
        { mfa_code: code },
        { accessToken: token }
      );

      // Update local state to active
      setMfaInfo({
        status: 'active',
        activatedDate: response.activated_at,
        lastUsed: response.activated_at,
      });
    } catch (error) {
      console.error('Failed to confirm MFA:', error);
      alert('Failed to confirm MFA. Please check your code and try again.');
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">{t('security.title')}</h1>
          <p className="text-muted-foreground">{t('security.subtitle')}</p>
        </div>
        <div className="bg-card rounded-md border border-border p-6 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <p className="text-muted-foreground">Loading MFA status...</p>
        </div>
      </div>
    );
  }

  const mfaStatus = mfaInfo?.status || 'not_activated';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t('security.title')}</h1>
        <p className="text-muted-foreground">{t('security.subtitle')}</p>
      </div>

      {/* MFA Status Banner */}
      {mfaStatus === 'active' ? (
        <div className="bg-warning/10 rounded-md border border-warning/20 p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="size-10 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-muted-foreground">
                  {t('security.mfa.active.title')}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">
                  {t('security.mfa.active.badge')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {t('security.mfa.active.message')}
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">{t('security.mfa.active.activated')}: </span>
                  {formatDate(mfaInfo?.activatedDate || '2024-11-15')}
                </div>
                <div>
                  <span className="font-medium">{t('security.mfa.active.lastUsed')}: </span>
                  {formatDate(mfaInfo?.lastUsed || '2024-12-19')}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : mfaStatus === 'pending' ? (
        <div className="bg-warning/10 rounded-md border border-warning/20 p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center flex-shrink-0">
              <Lock className="size-10 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">
                  {t('security.mfa.pending.title')}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">
                  {t('security.mfa.pending.badge')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('security.mfa.pending.message')}
              </p>
              <Button
                onClick={handleConfirmMFA}
                variant="write"
              >
                <Lock className="size-4 mr-2" />
                {t('security.mfa.pending.cta')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-warning/10 rounded-md border border-warning/20 p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="size-10 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-secondary">
                  {t('security.mfa.notActivated.title')}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">
                  {t('security.mfa.notActivated.badge')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('security.mfa.notActivated.message')}
              </p>
              <Button
                onClick={handleActivateMFA}
                variant="write"
              >
                <Shield className="size-4 mr-2" />
                {t('security.mfa.notActivated.cta')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MFA Setup Guide - Only visible if not activated */}
      {mfaStatus === 'not_activated' && (
        <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-3 mb-6">
            <div className="size-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <Smartphone className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('security.mfa.guide.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('security.mfa.guide.subtitle')}</p>
            </div>
          </div>

          {/* Step-by-step guide */}
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 size-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">1</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">{t('security.mfa.guide.step1.title')}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('security.mfa.guide.step1.description')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://support.google.com/accounts/answer/1066447"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="" className="size-4" />
                    <span>Google Authenticator</span>
                    <ExternalLink className="size-3" />
                  </a>
                  <a
                    href="https://support.apple.com/en-us/HT204085"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    <img src="https://www.apple.com/favicon.ico" alt="" className="size-4" />
                    <span>Apple Passwords</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 size-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">2</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">{t('security.mfa.guide.step2.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('security.mfa.guide.step2.description')}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 size-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">3</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  {t('security.mfa.guide.step3.title')}
                  <QrCode className="size-4 text-muted-foreground" />
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('security.mfa.guide.step3.description')}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 size-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">4</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">{t('security.mfa.guide.step4.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('security.mfa.guide.step4.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <Mail className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground">
                  <span className="font-medium">{t('security.mfa.guide.note.title')}</span> {t('security.mfa.guide.note.message')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Security Information */}
      <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-start gap-3 mb-4">
          <Shield className="size-6 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">{t('security.info.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('security.info.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">{t('security.info.whatIsMFA.title')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('security.info.whatIsMFA.description')}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">{t('security.info.whyRequired.title')}</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li className="list-disc">{t('security.info.whyRequired.reason1')}</li>
              <li className="list-disc">{t('security.info.whyRequired.reason2')}</li>
              <li className="list-disc">{t('security.info.whyRequired.reason3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}