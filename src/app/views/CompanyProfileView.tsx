import React, { useState, useEffect } from 'react';
import { Building2, Award, TrendingUp, Info, ExternalLink, FileText, ChevronDown, ChevronUp, HelpCircle, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useStrings } from '../hooks/useStrings';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '../hooks/useQuery';
import { Button } from '../components/ui/button';
import { Banner } from '../components/ui/banner';
import {
  queryCompanyProfile,
  queryCompanyKYCStatus,
  queryCompanyReputationScore,
  queryCompanyFeeTier,
} from '../lib/queries';
import { toast } from 'sonner';

const reputationLevels = [
  { min: 0, max: 20, label: 'Blocked', color: '#a5a5a5', textColor: 'text-[#a5a5a5]', feeMultiplier: 0 }, // Blocked = no transactions
  { min: 20, max: 40, label: 'Low', color: '#ffd266', textColor: 'text-[#ffd266]', feeMultiplier: 1.5 }, // +50%
  { min: 40, max: 60, label: 'Average', color: '#ffc333', textColor: 'text-[#ffc333]', feeMultiplier: 1.2 }, // +20%
  { min: 60, max: 80, label: 'Good', color: '#ff7033', textColor: 'text-[#ff7033]', feeMultiplier: 1.0 }, // No change
  { min: 80, max: 100, label: 'Excellent', color: '#ff4c00', textColor: 'text-[#ff4c00]', feeMultiplier: 0.8 }, // -20%
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getCurrentReputationIndex(score: number): number {
  return reputationLevels.findIndex(r => r.min <= score && r.max > score);
}

interface CompanyProfileViewProps {
  onNavigate?: (view: string) => void;
}

export function CompanyProfileView({ onNavigate }: CompanyProfileViewProps) {
  const { t } = useStrings();
  const { hasRole } = useAuth();
  
  // RBAC - Company Profile requires admin, operations, or analyst role (all read-only)
  const canView = hasRole('admin'); // TODO: Add 'operations', 'analyst' when Auth0 is configured
  
  const [showPrevTooltip, setShowPrevTooltip] = useState(false);
  const [showNextTooltip, setShowNextTooltip] = useState(false);
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // Query: Fetch company profile (Category C - Load once on page mount)
  const {
    data: profileData,
    loading: isLoadingProfile,
    error: profileError,
  } = useQuery(
    () => queryCompanyProfile(),
    [],
    {
      // No polling for Category C
    }
  );

  // Query: Fetch KYC status (Category C - Load once)
  const {
    data: kycData,
    loading: isLoadingKYC,
    error: kycError,
  } = useQuery(
    () => queryCompanyKYCStatus(),
    [],
    {
      // No polling for Category C
    }
  );

  // Query: Fetch reputation score (Category B - Soft refresh 30s)
  const {
    data: reputationData,
    loading: isLoadingReputation,
    error: reputationError,
  } = useQuery(
    () => queryCompanyReputationScore(),
    [],
    {
      refetchInterval: 30000, // Category B: 30s polling
    }
  );

  // Query: Fetch fee tier (Category B - Soft refresh 30s)
  const {
    data: feeTierData,
    loading: isLoadingFeeTier,
    error: feeTierError,
  } = useQuery(
    () => queryCompanyFeeTier(),
    [],
    {
      refetchInterval: 30000, // Category B: 30s polling
    }
  );

  // Show error toasts
  useEffect(() => {
    if (profileError) {
      toast.error(t('companyProfile.errors.profile') || 'Failed to load company profile');
    }
  }, [profileError, t]);

  useEffect(() => {
    if (kycError) {
      toast.error(t('companyProfile.errors.kyc') || 'Failed to load KYC status');
    }
  }, [kycError, t]);

  useEffect(() => {
    if (reputationError) {
      toast.error(t('companyProfile.errors.reputation') || 'Failed to load reputation score');
    }
  }, [reputationError, t]);

  useEffect(() => {
    if (feeTierError) {
      toast.error(t('companyProfile.errors.feeTier') || 'Failed to load fee tier');
    }
  }, [feeTierError, t]);

  // Animate the reputation score on mount or when data changes
  useEffect(() => {
    if (!reputationData) return;
    
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = reputationData.current_score / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedScore(reputationData.current_score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(increment * currentStep));
      }
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [reputationData?.current_score]);

  const handleViewStatement = () => {
    if (onNavigate) {
      onNavigate('reputation-statement');
    }
  };

  const handleCompleteKYC = () => {
    // Navigate to KYC onboarding flow
    window.open('https://crossramp.com/kyc', '_blank');
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Access control check
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{t('common.accessDenied') || 'Access Denied'}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('common.accessDeniedMessage') || 'You do not have permission to view this page.'}
        </p>
      </div>
    );
  }

  // Loading state
  const isLoading = isLoadingProfile || isLoadingKYC || isLoadingReputation || isLoadingFeeTier;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // If all queries failed, show error state
  if (!profileData && !kycData && !reputationData && !feeTierData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="size-12 text-destructive" />
        <h2 className="text-xl font-semibold">{t('common.error') || 'Error'}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('companyProfile.errors.loadFailed') || 'Failed to load company profile data. Please try again later.'}
        </p>
      </div>
    );
  }

  const currentReputationIndex = getCurrentReputationIndex(reputationData?.current_score || 0);
  const currentReputation = reputationLevels[currentReputationIndex];
  const prevReputation = currentReputationIndex > 0 ? reputationLevels[currentReputationIndex - 1] : null;
  const nextReputation = currentReputationIndex < reputationLevels.length - 1 ? reputationLevels[currentReputationIndex + 1] : null;

  // Calculate actual fees
  const baseFeePercent = feeTierData?.current_base_fee || 0;
  const feeMultiplier = reputationData?.fee_multiplier || 1.0;
  const finalFeePercent = feeTierData?.final_fee_percent || 0;
  const feeAdjustmentPercent = reputationData?.fee_adjustment_percent || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t('companyProfile.title')}</h1>
        <p className="text-muted-foreground">{t('companyProfile.subtitle')}</p>
      </div>

      {/* KYC Status Banner */}
      {kycData?.status === 'verified' ? (
        <Banner
          variant="info"
          icon={ShieldCheck}
          title={t('companyProfile.kyc.verified.title')}
          description={
            <>
              {t('companyProfile.kyc.verified.message')} <span className="font-medium">{kycData.ubo_name}</span> on {formatDate(kycData.verified_at || '')}
            </>
          }
          badge={{ text: t('companyProfile.kyc.verified.badge'), variant: 'success' }}
        />
      ) : (
        <Banner
          variant="alert"
          icon={AlertTriangle}
          title={t('companyProfile.kyc.pending.title')}
          description={
            <>
              {kycData?.status === 'pending'
                ? t('companyProfile.kyc.pending.message')
                : t('companyProfile.kyc.notStarted.message')} <span className="font-medium">{kycData?.ubo_name || 'Unknown'}</span>
            </>
          }
          badge={{
            text: kycData?.status === 'pending' 
              ? t('companyProfile.kyc.pending.badge') 
              : t('companyProfile.kyc.notStarted.badge'),
            variant: 'warning'
          }}
          action={
            <Button
              onClick={handleCompleteKYC}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              size="sm"
            >
              {t('companyProfile.kyc.cta')}
            </Button>
          }
        />
      )}

      {/* Company Information Card */}
      <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="size-6 text-muted-foreground flex-shrink-0" />
          <div>
            <h2 className="font-semibold">{t('companyProfile.info.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('companyProfile.info.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Company Details */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('companyProfile.info.legalName')}</p>
              <p className="font-medium">{profileData?.companyName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('companyProfile.info.taxId')}</p>
              <p className="font-medium font-mono">{profileData?.cnpj || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('companyProfile.info.ubo')}</p>
              <p className="font-medium">{kycData?.ubo_name || 'N/A'}</p>
            </div>
          </div>

          {/* Right Column - Current Fee */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('companyProfile.info.currentFee')}</p>
            <div className="relative inline-block">
              <div
                className="flex items-center gap-2 cursor-help"
                onMouseEnter={() => setShowFeeTooltip(true)}
                onMouseLeave={() => setShowFeeTooltip(false)}
              >
                {feeMultiplier !== 1.0 && feeMultiplier !== 0 ? (
                  <>
                    <span className="font-medium font-mono line-through text-muted-foreground">
                      {baseFeePercent.toFixed(2)}%
                    </span>
                    <span className={`font-bold font-mono ${
                      feeMultiplier > 1 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {finalFeePercent.toFixed(2)}%
                    </span>
                  </>
                ) : feeMultiplier === 0 ? (
                  <span className="font-bold font-mono text-red-600 dark:text-red-400">
                    {t('companyProfile.info.blocked')}
                  </span>
                ) : (
                  <span className="font-medium font-mono">
                    {baseFeePercent.toFixed(2)}%
                  </span>
                )}
                <HelpCircle className="size-4 text-muted-foreground" />
              </div>
              
              {/* Tooltip */}
              {showFeeTooltip && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-muted rounded-lg shadow-lg border border-border p-4 z-10">
                  <p className="text-xs font-semibold mb-3">{t('companyProfile.info.feeBreakdown')}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('companyProfile.info.baseFee')}</span>
                      <span className="font-mono font-medium">{baseFeePercent.toFixed(2)}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('companyProfile.info.reputationAdjustment')}
                      </span>
                      <span className={`font-mono font-medium ${
                        feeAdjustmentPercent > 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : feeAdjustmentPercent < 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-muted-foreground'
                      }`}>
                        {feeAdjustmentPercent === 0 ? '-' : `${feeAdjustmentPercent > 0 ? '+' : ''}${feeAdjustmentPercent.toFixed(0)}%`}
                      </span>
                    </div>
                    
                    <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                      <span className="font-medium text-sm">{t('companyProfile.info.finalFee')}</span>
                      <span className={`font-bold font-mono ${
                        feeMultiplier === 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : feeMultiplier > 1 
                          ? 'text-red-600 dark:text-red-400' 
                          : feeMultiplier < 1
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-foreground'
                      }`}>
                        {feeMultiplier === 0 ? t('companyProfile.info.blocked') : `${finalFeePercent.toFixed(2)}%`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scores Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Reputational Score */}
        <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3 mb-6">
            <Award className="size-6 text-muted-foreground flex-shrink-0" />
            <div>
              <h2 className="font-semibold">{t('companyProfile.reputation.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('companyProfile.reputation.subtitle')}</p>
            </div>
          </div>

          {/* Reputation Gauge */}
          <div className="mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background: Show all segments as light gray outlines */}
                  {reputationLevels.map((level, idx) => {
                    const segmentLength = (188.4 / 100) * (level.max - level.min);
                    const previousSegments = reputationLevels.slice(0, idx).reduce((sum, l) => sum + (l.max - l.min), 0);
                    const offset = -(previousSegments * 188.4 / 100);
                    
                    return (
                      <circle
                        key={`bg-${idx}`}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-gray-200 dark:text-gray-700"
                        strokeDasharray={`${segmentLength} 251.2`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                    );
                  })}
                  
                  {/* Foreground: Draw filled colors for reached segments only */}
                  {reputationLevels.map((level, idx) => {
                    const segmentLength = (188.4 / 100) * (level.max - level.min);
                    const previousSegments = reputationLevels.slice(0, idx).reduce((sum, l) => sum + (l.max - l.min), 0);
                    const offset = -(previousSegments * 188.4 / 100);
                    const isActive = animatedScore >= level.min;
                    const isCurrent = animatedScore >= level.min && animatedScore < level.max;
                    
                    if (!isActive) return null;
                    
                    // If current level, only fill up to the current score
                    const fillLength = isCurrent 
                      ? ((animatedScore - level.min) / (level.max - level.min)) * segmentLength
                      : segmentLength;
                    
                    return (
                      <circle
                        key={`fill-${idx}`}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={level.color}
                        strokeWidth="8"
                        strokeDasharray={`${fillLength} 251.2`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>
                
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className={`text-3xl font-bold ${currentReputation.textColor}`}>
                    {animatedScore}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(`companyProfile.reputation.level.${currentReputation.label.toLowerCase()}`)}
                  </p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              {reputationLevels.map((level, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: level.color }} />
                  <span className="text-xs text-muted-foreground">
                    {level.min}-{level.max} {t(`companyProfile.reputation.level.${level.label.toLowerCase()}`)}
                  </span>
                </div>
              ))}
            </div>

            {/* Current Level Benefits & Penalties */}
            <div className="rounded-lg p-4 mb-4 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{t('companyProfile.reputation.currentStatus')}</h3>
                <div className="flex items-center gap-2">
                  {/* Previous Level Tooltip */}
                  {prevReputation && reputationData?.previous_level && (
                    <div className="relative">
                      <button
                        className="size-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        onMouseEnter={() => setShowPrevTooltip(true)}
                        onMouseLeave={() => setShowPrevTooltip(false)}
                      >
                        <ChevronDown className="size-4 text-red-600" />
                      </button>
                      {showPrevTooltip && (
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-muted rounded-lg shadow-lg border border-border p-3 z-10">
                          <p className="text-xs font-semibold mb-2 text-red-600 dark:text-red-400">
                            {t('companyProfile.reputation.ifDowngrade')}: {t(`companyProfile.reputation.level.${reputationData.previous_level.level}`)}
                          </p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium" style={{ color: '#ff4c00' }}>{t('companyProfile.policies.benefits')}:</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t(`companyProfile.reputation.benefits.${reputationData.previous_level.level}`)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[#dc2626] dark:text-[#dc2626]">{t('companyProfile.policies.penalties')}:</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t(`companyProfile.reputation.penalties.${reputationData.previous_level.level}`)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Next Level Tooltip */}
                  {nextReputation && reputationData?.next_level && (
                    <div className="relative">
                      <button
                        className="size-6 rounded-full flex items-center justify-center hover:bg-[#ff6b33] transition-colors"
                        style={{ backgroundColor: '#ff4c00' }}
                        onMouseEnter={() => setShowNextTooltip(true)}
                        onMouseLeave={() => setShowNextTooltip(false)}
                      >
                        <ChevronUp className="size-4 text-white" />
                      </button>
                      {showNextTooltip && (
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-muted rounded-lg shadow-lg border border-border p-3 z-10">
                          <p className="text-xs font-semibold mb-2" style={{ color: '#ff4c00' }}>
                            {t('companyProfile.reputation.ifUpgrade')}: {t(`companyProfile.reputation.level.${reputationData.next_level.level}`)}
                          </p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium" style={{ color: '#ff4c00' }}>{t('companyProfile.policies.benefits')}:</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t(`companyProfile.reputation.benefits.${reputationData.next_level.level}`)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[#dc2626] dark:text-[#dc2626]">{t('companyProfile.policies.penalties')}:</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t(`companyProfile.reputation.penalties.${reputationData.next_level.level}`)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: '#ff4c00' }}>
                    {t('companyProfile.reputation.benefitsApplied')}
                  </p>
                  <p className="text-sm text-foreground">
                    {reputationData?.benefits_applied?.join(', ') || t(`companyProfile.reputation.benefits.${currentReputation.label.toLowerCase()}`)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: '#dc2626' }}>
                    {t('companyProfile.reputation.penaltiesApplied')}
                  </p>
                  <p className="text-sm text-foreground">
                    {reputationData?.penalties_applied?.join(', ') || t(`companyProfile.reputation.penalties.${currentReputation.label.toLowerCase()}`)}
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => window.open('https://crossramp.com/reputation-score', '_blank')}
              >
                <span>{t('companyProfile.reputation.learnMore')}</span>
                <ExternalLink className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={handleViewStatement}
              >
                <span>{t('companyProfile.reputation.viewStatement')}</span>
                <FileText className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Fee Level */}
        <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="size-6 text-muted-foreground flex-shrink-0" />
            <div>
              <h2 className="font-semibold">{t('companyProfile.feeLevel.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('companyProfile.feeLevel.subtitle')}</p>
            </div>
          </div>

          {/* Current Volume */}
          <div className="rounded-lg p-4 mb-6 border border-border/50">
            <p className="text-sm text-muted-foreground mb-1">{t('companyProfile.feeLevel.lastMonth')}</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(feeTierData?.last_month_volume || 0)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('companyProfile.feeLevel.currentFee')}: <span className="font-semibold text-foreground">{baseFeePercent.toFixed(2)}%</span>
            </p>
          </div>

          {/* Tier Ladder */}
          <div className="space-y-3">
            {feeTierData?.all_tiers.map((tier, idx) => {
              const isActive = tier.tier_id === feeTierData.current_tier.tier_id;
              const isPassed = tier.base_fee_percent > feeTierData.current_tier.base_fee_percent;
              const isFuture = tier.base_fee_percent < feeTierData.current_tier.base_fee_percent;
              
              // Determine background color based on tier index
              const colorClasses = [
                'bg-primary/50',
                'bg-primary/60',
                'bg-primary/70',
                'bg-primary/80',
                'bg-primary'
              ];
              const tierColor = colorClasses[idx] || 'bg-primary';
              
              return (
                <div
                  key={tier.tier_id}
                  className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : isPassed
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isActive 
                      ? tierColor 
                      : isPassed 
                      ? 'bg-primary/30' 
                      : 'bg-muted'
                  }`}>
                    <span className="text-white text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      isActive 
                        ? 'text-primary' 
                        : isPassed 
                        ? 'text-primary/60' 
                        : 'text-muted-foreground'
                    }`}>
                      {tier.tier_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('companyProfile.feeLevel.feeRate')}: {tier.base_fee_percent.toFixed(2)}%</p>
                  </div>
                  {isActive && (
                    <div className="flex-shrink-0">
                      <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">
                        {t('companyProfile.feeLevel.current')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Reputation Policy */}
        <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-3 mb-4">
            <Info className="size-6 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">{t('companyProfile.policies.reputation.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('companyProfile.policies.reputation.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: '#ff4c00' }}>
                {t('companyProfile.policies.benefits')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li className="list-disc">{t('companyProfile.policies.reputation.benefits.1')}</li>
                <li className="list-disc">{t('companyProfile.policies.reputation.benefits.2')}</li>
                <li className="list-disc">{t('companyProfile.policies.reputation.benefits.3')}</li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                {t('companyProfile.policies.penalties')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li className="list-disc">{t('companyProfile.policies.reputation.penalties.1')}</li>
                <li className="list-disc">{t('companyProfile.policies.reputation.penalties.2')}</li>
                <li className="list-disc">{t('companyProfile.policies.reputation.penalties.3')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Fee Level Policy */}
        <div className="bg-card rounded-md border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-3 mb-4">
            <Info className="size-6 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">{t('companyProfile.policies.feeLevel.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('companyProfile.policies.feeLevel.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: '#ff4c00' }}>
                {t('companyProfile.policies.benefits')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li className="list-disc">{t('companyProfile.policies.feeLevel.benefits.1')}</li>
                <li className="list-disc">{t('companyProfile.policies.feeLevel.benefits.2')}</li>
                <li className="list-disc">{t('companyProfile.policies.feeLevel.benefits.3')}</li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t('companyProfile.policies.howItWorks')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li className="list-disc">{t('companyProfile.policies.feeLevel.howItWorks.1')}</li>
                <li className="list-disc">{t('companyProfile.policies.feeLevel.howItWorks.2')}</li>
                <li className="list-disc">{t('companyProfile.policies.feeLevel.howItWorks.3')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}