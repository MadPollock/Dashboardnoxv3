import React, { useState } from 'react';
import { X, Copy, ExternalLink, Lock, CreditCard, AlertCircle, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useStrings } from '../../hooks/useStrings';
import { MFAModal } from '../admin/MFAModal';
import { createPaymentLink } from '../../lib/commands';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPreferences } from '../../store/userPreferences';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock templates - In production, this would come from the API
const mockTemplates = [
  { id: '1', name: 'Standard Checkout', currency: 'BRL' },
  { id: '2', name: 'USDC Payment', currency: 'USDC' },
  { id: '3', name: 'USDT Checkout', currency: 'USDT' },
];

type PaymentType = 'oneTime' | 'fixed';
type ValueMode = 'inform' | 'clientPicks';
type CurrencyMode = 'brl' | 'template';

export function ReceivePaymentModal({ isOpen, onClose }: ReceivePaymentModalProps) {
  const { t } = useStrings();
  const { getAccessTokenSilently } = useAuth();
  const completeOnboardingStep = useUserPreferences((state) => state.completeOnboardingStep);
  
  // Step management
  const [step, setStep] = useState<'selectType' | 'configure' | 'success'>('selectType');
  
  // Step 1: Payment type
  const [paymentType, setPaymentType] = useState<PaymentType>('oneTime');
  
  // Step 2: Configuration
  const [selectedTemplate, setSelectedTemplate] = useState(mockTemplates[0].id);
  const [valueMode, setValueMode] = useState<ValueMode>('inform');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('brl');
  const [amount, setAmount] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // MFA and result
  const [showMFA, setShowMFA] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleContinue = () => {
    setStep('configure');
  };

  const handleBack = () => {
    if (step === 'configure') {
      setStep('selectType');
    } else if (step === 'success') {
      setStep('configure');
    }
  };

  const handleCreatePaymentLink = () => {
    setShowMFA(true);
  };

  const handleMFASuccess = async (mfaCode: string) => {
    setShowMFA(false);
    
    try {
      const accessToken = await getAccessTokenSilently();

      // Create payment link via centralized command
      const response = await createPaymentLink(
        {
          templateId: selectedTemplate,
          amount: undefined, // Optional - template has default
          description: undefined, // Optional
          expiresIn: 60, // 60 minutes default
        },
        { accessToken, mfaCode }
      );

      setPaymentLink(response.link);
      setStep('success');
      toast.success(t('receivePayment.success.title'));
      
      // Complete onboarding step 4 (checkout)
      completeOnboardingStep('checkout');
    } catch (error) {
      console.error('Failed to create payment link:', error);
      toast.error('Failed to create payment link', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
      setStep('configure'); // Go back to configure step on error
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    toast.success(t('receivePayment.success.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    window.open(paymentLink, '_blank');
  };

  const handleClose = () => {
    // Reset state
    setStep('selectType');
    setPaymentType('oneTime');
    setSelectedTemplate(mockTemplates[0].id);
    setValueMode('inform');
    setCurrencyMode('brl');
    setAmount('');
    setWebhookUrl('');
    setRedirectUrl('');
    setAdvancedOpen(false);
    setPaymentLink('');
    setCopied(false);
    onClose();
  };

  const getSelectedTemplate = () => mockTemplates.find(t => t.id === selectedTemplate);
  const getPaymentTypeDescription = () => {
    return paymentType === 'oneTime' 
      ? t('receivePayment.type.oneTime.description')
      : t('receivePayment.type.fixed.description');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={handleClose} />
      
      {/* Modal Content */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-lg border border-border shadow-lg z-50">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 style={{ fontFamily: 'Manrope', fontSize: '20px', fontWeight: 600 }}>
            {t('receivePayment.modal.title')}
          </h2>
          <button
            onClick={handleClose}
            className="size-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Step 1: Select Type */}
          {step === 'selectType' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">{t('receivePayment.step1.title')}</h3>
              </div>

              {/* Payment Type Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('receivePayment.type.label')}</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                  className="w-full px-4 py-3 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="oneTime">{t('receivePayment.type.oneTime')}</option>
                  <option value="fixed">{t('receivePayment.type.fixed')}</option>
                </select>
              </div>

              {/* Description */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  {getPaymentTypeDescription()}
                </p>
              </div>

              {/* Continue Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleContinue}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {t('receivePayment.step1.continue')}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure Payment */}
          {step === 'configure' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">{t('receivePayment.step2.title')}</h3>
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('receivePayment.template.label')}</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-3 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {mockTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} • {template.currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value Mode Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="inform-value"
                    name="value-mode"
                    checked={valueMode === 'inform'}
                    onChange={() => setValueMode('inform')}
                    className="size-4 accent-primary cursor-pointer"
                  />
                  <label htmlFor="inform-value" className="text-sm font-medium cursor-pointer">
                    {t('receivePayment.value.inform')}
                  </label>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="client-picks"
                    name="value-mode"
                    checked={valueMode === 'clientPicks'}
                    onChange={() => setValueMode('clientPicks')}
                    className="size-4 accent-primary cursor-pointer"
                  />
                  <label htmlFor="client-picks" className="text-sm font-medium cursor-pointer">
                    {t('receivePayment.value.clientPicks')}
                  </label>
                </div>
              </div>

              {/* Currency Mode (only if inform value is selected) */}
              {valueMode === 'inform' && (
                <div className="space-y-3 pl-7">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="currency-brl"
                      name="currency-mode"
                      checked={currencyMode === 'brl'}
                      onChange={() => setCurrencyMode('brl')}
                      className="size-4 accent-primary cursor-pointer"
                    />
                    <label htmlFor="currency-brl" className="text-sm font-medium cursor-pointer">
                      {t('receivePayment.value.currency.brl')}
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="currency-template"
                      name="currency-mode"
                      checked={currencyMode === 'template'}
                      onChange={() => setCurrencyMode('template')}
                      className="size-4 accent-primary cursor-pointer"
                    />
                    <label htmlFor="currency-template" className="text-sm font-medium cursor-pointer">
                      {t('receivePayment.value.currency.template', { currency: getSelectedTemplate()?.currency || 'USD' })}
                    </label>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium">{t('receivePayment.value.amount.label')}</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t('receivePayment.value.amount.placeholder')}
                      className="w-full px-4 py-3 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {/* Advanced Settings */}
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg"
                >
                  <span className="text-sm font-medium">{t('receivePayment.advanced.title')}</span>
                  {advancedOpen ? (
                    <ChevronUp className="size-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-5 text-muted-foreground" />
                  )}
                </button>

                {advancedOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border mt-2 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('receivePayment.advanced.webhook.label')}</label>
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder={t('receivePayment.advanced.webhook.placeholder')}
                        className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('receivePayment.advanced.redirect.label')}</label>
                      <input
                        type="url"
                        value={redirectUrl}
                        onChange={(e) => setRedirectUrl(e.target.value)}
                        placeholder={t('receivePayment.advanced.redirect.placeholder')}
                        className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={handleBack}
                  className="px-6 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {t('receivePayment.back')}
                </button>
                <Button
                  onClick={handleCreatePaymentLink}
                  variant="write"
                  className="gap-2"
                >
                  <Lock className="size-4" />
                  {t('receivePayment.create.button')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="size-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('receivePayment.success.title')}</h3>
              </div>

              {/* Payment Link Display */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Payment Link</p>
                <p className="text-sm font-mono break-all text-foreground">{paymentLink}</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopyLink}
                  className="px-6 py-3 border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {t('receivePayment.success.copy')}
                </button>
                <button
                  onClick={handleOpenLink}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="size-4" />
                  {t('receivePayment.success.open')}
                </button>
              </div>

              {/* Close Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleClose}
                  className="px-8 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('receivePayment.close')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MFA Modal */}
      <MFAModal
        isOpen={showMFA}
        onClose={() => setShowMFA(false)}
        onSuccess={handleMFASuccess}
        actionDescription={t('receivePayment.create.button')}
      />
    </>
  );
}