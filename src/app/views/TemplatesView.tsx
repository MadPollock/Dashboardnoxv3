import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Lock, Trash2, Copy, Edit, MoreVertical, FileText, HelpCircle, ChevronLeft, ChevronRight, Upload, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Separator } from '../components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useStrings } from '../hooks/useStrings';
import { useQuery } from '../hooks/useQuery';
import { useAuth } from '../contexts/AuthContext';
import { CURRENCIES, getCurrencyByCode } from '../config/currencies';
import {
  queryTemplatesList,
  queryTemplateDetails,
  type ListTemplatesRequest,
  type PaymentTemplate,
  type TemplateDetailsResponse,
} from '../lib/queries';
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  type CreateTemplateCommand,
  type UpdateTemplateCommand,
  type DeleteTemplateCommand,
  type DuplicateTemplateCommand,
} from '../lib/commands';
import { CommandContext } from '../lib/commandClient';
import { useUserPreferences } from '../store/userPreferences';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Address validation regexes for different networks
const ADDRESS_PATTERNS: Record<string, { regex: RegExp; format: string }> = {
  TRX: { regex: /^T[A-Za-z0-9]{33}$/, format: 'Tron address (starts with T, 34 characters)' },
  ETH: { regex: /^0x[a-fA-F0-9]{40}$/, format: 'Ethereum address (starts with 0x, 42 characters)' },
  MATIC: { regex: /^0x[a-fA-F0-9]{40}$/, format: 'Polygon address (starts with 0x, 42 characters)' },
  SOL: { regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, format: 'Solana address (Base58 format, 32-44 characters)' },
  BTC: { regex: /^(1|3|bc1)[a-zA-Z0-9]{25,42}$/, format: 'Bitcoin address (starts with 1, 3, or bc1)' },
};

export function TemplatesView() {
  const strings = useStrings();
  const { getAccessToken, user, loginWithMFA } = useAuth();
  const completeOnboardingStep = useUserPreferences((state) => state.completeOnboardingStep);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Query templates list - params change triggers refetch
  const { data: templatesResponse, loading, error, refetch } = useQuery(
    () => queryTemplatesList({ page: currentPage, limit: itemsPerPage, sort_by: 'created_at', sort_order: 'desc' }),
    { page: currentPage, limit: itemsPerPage } // params object for dependency tracking
  );

  const templates = templatesResponse?.templates || [];
  const pagination = templatesResponse?.pagination;

  // Sheet state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateData, setEditingTemplateData] = useState<TemplateDetailsResponse | null>(null);
  const [loadingTemplateDetails, setLoadingTemplateDetails] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    currency_code: '',
    button_color: '#ff4c00',
    logo_file: null as File | null,
    logo_preview: null as string | null,
    remove_logo: false,
    fee_behavior: 'customer_pays' as 'customer_pays' | 'merchant_absorbs',
    charge_network_fee_to_customer: false,
    split_enabled: false,
    split_percentage: '',
    split_flat_fee: '',
    split_destination_address: '',
    show_powered_by: true,
  });

  // Loading states for commands
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get selected currency details
  const selectedCurrency = useMemo(() => {
    if (!formData.currency_code) return null;
    return getCurrencyByCode(formData.currency_code);
  }, [formData.currency_code]);

  // Check if currency supports splits
  const currencySupportsSplits = useMemo(() => {
    if (!selectedCurrency) return false;
    // Fiat currencies don't support splits
    const fiatCurrencies = ['BRL', 'EUR', 'MXN', 'ARS', 'COP'];
    return !fiatCurrencies.includes(formData.currency_code);
  }, [selectedCurrency, formData.currency_code]);

  // Get helper text for split address
  const splitAddressHelper = useMemo(() => {
    if (!selectedCurrency || !selectedCurrency.network) return '';
    const pattern = ADDRESS_PATTERNS[selectedCurrency.network];
    return pattern ? `Enter ${pattern.format}` : '';
  }, [selectedCurrency]);

  // Validate split address
  const validateSplitAddress = (address: string): boolean => {
    if (!address || !selectedCurrency || !selectedCurrency.network) return false;
    const pattern = ADDRESS_PATTERNS[selectedCurrency.network];
    return pattern ? pattern.regex.test(address) : false;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      currency_code: '',
      button_color: '#ff4c00',
      logo_file: null,
      logo_preview: null,
      remove_logo: false,
      fee_behavior: 'customer_pays',
      charge_network_fee_to_customer: false,
      split_enabled: false,
      split_percentage: '',
      split_flat_fee: '',
      split_destination_address: '',
      show_powered_by: true,
    });
    setEditingTemplateId(null);
    setEditingTemplateData(null);
  };

  // Handle logo file selection
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      e.target.value = '';
      return;
    }

    // Validate file format
    const validFormats = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validFormats.includes(file.type)) {
      toast.error('Logo must be PNG, JPG, or SVG');
      e.target.value = '';
      return;
    }

    // Create preview
    const preview = await fileToBase64(file);
    setFormData(prev => ({ ...prev, logo_file: file, logo_preview: preview, remove_logo: false }));
  };

  // Handle logo removal
  const handleLogoRemove = () => {
    setFormData(prev => ({ 
      ...prev, 
      logo_file: null, 
      logo_preview: null, 
      remove_logo: true 
    }));
  };

  // Handle edit click - load template details
  const handleEditClick = async (templateId: string) => {
    setLoadingTemplateDetails(true);
    try {
      const accessToken = await getAccessToken();
      const details = await queryTemplateDetails(
        { template_id: templateId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      setEditingTemplateData(details);
      setEditingTemplateId(templateId);
      
      // Populate form with existing data
      setFormData({
        name: details.name,
        currency_code: details.currency_code,
        button_color: details.button_color,
        logo_file: null,
        logo_preview: details.logo_url,
        remove_logo: false,
        fee_behavior: details.fee_behavior,
        charge_network_fee_to_customer: details.charge_network_fee_to_customer,
        split_enabled: details.split_enabled,
        split_percentage: details.split_percentage?.toString() || '',
        split_flat_fee: details.split_flat_fee?.toString() || '',
        split_destination_address: details.split_destination_address || '',
        show_powered_by: details.show_powered_by,
      });
      
      setIsEditOpen(true);
    } catch (error) {
      console.error('Failed to load template details:', error);
      toast.error('Failed to load template details');
    } finally {
      setLoadingTemplateDetails(false);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.name) {
      toast.error('Template name is required');
      return false;
    }

    if (!formData.currency_code && !editingTemplateId) {
      toast.error('Currency is required');
      return false;
    }

    if (formData.split_enabled) {
      if (!formData.split_percentage || parseFloat(formData.split_percentage) < 0.01 || parseFloat(formData.split_percentage) > 99.99) {
        toast.error('Split percentage must be between 0.01 and 99.99');
        return false;
      }

      if (!formData.split_destination_address) {
        toast.error('Split destination address is required when splits are enabled');
        return false;
      }

      if (!validateSplitAddress(formData.split_destination_address)) {
        toast.error(`Invalid address format. ${splitAddressHelper}`);
        return false;
      }
    }

    return true;
  };

  // Handle create template
  const handleCreateTemplate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Step 1: Trigger MFA
      const mfaToken = await loginWithMFA();

      // Step 2: Convert logo to base64 if provided
      let logo_file_base64: string | null = null;
      if (formData.logo_file) {
        logo_file_base64 = await fileToBase64(formData.logo_file);
      }

      // Step 3: Build command payload
      const payload: CreateTemplateCommand = {
        name: formData.name,
        currency_code: formData.currency_code,
        button_color: formData.button_color,
        logo_file_base64,
        fee_behavior: formData.fee_behavior,
        charge_network_fee_to_customer: formData.charge_network_fee_to_customer,
        split_enabled: formData.split_enabled,
        split_percentage: formData.split_enabled ? parseFloat(formData.split_percentage) : null,
        split_flat_fee: formData.split_enabled && formData.split_flat_fee ? parseFloat(formData.split_flat_fee) : null,
        split_destination_address: formData.split_enabled ? formData.split_destination_address : null,
        show_powered_by: formData.show_powered_by,
      };

      // Step 4: Submit command
      const context: CommandContext = { accessToken: mfaToken, user };
      const response = await createTemplate(payload, context);

      if (response.success) {
        toast.success('Template created successfully');
        setIsCreateOpen(false);
        resetForm();
        refetch();
        
        // Complete onboarding step 3 (template)
        completeOnboardingStep('template');
      } else {
        toast.error(response.message || 'Failed to create template');
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update template
  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !validateForm()) return;

    setIsSubmitting(true);
    try {
      // Step 1: Trigger MFA
      const mfaToken = await loginWithMFA();

      // Step 2: Convert logo to base64 if new file selected
      let logo_file_base64: string | null | undefined = undefined;
      if (formData.remove_logo) {
        logo_file_base64 = null; // Explicitly remove logo
      } else if (formData.logo_file) {
        logo_file_base64 = await fileToBase64(formData.logo_file);
      }
      // If undefined, backend keeps existing logo

      // Step 3: Build command payload (only changed fields)
      const payload: UpdateTemplateCommand = {
        template_id: editingTemplateId,
        name: formData.name,
        button_color: formData.button_color,
        logo_file_base64,
        fee_behavior: formData.fee_behavior,
        charge_network_fee_to_customer: formData.charge_network_fee_to_customer,
        split_enabled: formData.split_enabled,
        split_percentage: formData.split_enabled ? parseFloat(formData.split_percentage) : null,
        split_flat_fee: formData.split_enabled && formData.split_flat_fee ? parseFloat(formData.split_flat_fee) : null,
        split_destination_address: formData.split_enabled ? formData.split_destination_address : null,
        show_powered_by: formData.show_powered_by,
      };

      // Step 4: Submit command
      const context: CommandContext = { accessToken: mfaToken, user };
      const response = await updateTemplate(payload, context);

      if (response.success) {
        toast.success('Template updated successfully');
        setIsEditOpen(false);
        resetForm();
        refetch();
      } else {
        toast.error(response.message || 'Failed to update template');
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete template
  const handleDeleteTemplate = async (templateId: string) => {
    setIsSubmitting(true);
    try {
      // Step 1: Trigger MFA
      const mfaToken = await loginWithMFA();

      // Step 2: Submit command
      const payload: DeleteTemplateCommand = { template_id: templateId };
      const context: CommandContext = { accessToken: mfaToken, user };
      const response = await deleteTemplate(payload, context);

      if (response.success) {
        toast.success('Template deleted successfully');
        refetch();
      } else if (response.error_code === 'TEMPLATE_IN_USE') {
        const count = response.metadata?.active_payment_links || 0;
        toast.error(`Cannot delete template. It's being used by ${count} active payment links.`, {
          description: 'Please reassign or archive them first.',
        });
      } else {
        toast.error(response.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle duplicate template
  const handleDuplicateTemplate = async (templateId: string, originalName: string) => {
    setIsSubmitting(true);
    try {
      // Step 1: Trigger MFA
      const mfaToken = await loginWithMFA();

      // Step 2: Submit command
      const payload: DuplicateTemplateCommand = {
        template_id: templateId,
        new_name: `${originalName} (Copy)`,
      };
      const context: CommandContext = { accessToken: mfaToken, user };
      const response = await duplicateTemplate(payload, context);

      if (response.success) {
        toast.success('Template duplicated successfully');
        refetch();
        // Scroll to top to see new template (it appears first in list)
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(response.message || 'Failed to duplicate template');
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      toast.error('Failed to duplicate template', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Empty state check
  const isEmpty = templates.length === 0 && !loading;

  // Render form fields (shared between create and edit)
  const renderForm = () => (
    <div className="space-y-8 px-4">
      {/* Section 1 - Basics */}
      <div className="space-y-4">
        <div>
          <h3 style={{ fontFamily: 'Manrope', fontSize: '14px' }} className="text-foreground mb-3">
            Basics
          </h3>
          <Separator />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-name">Template Name *</Label>
          <Input
            id="template-name"
            placeholder="e.g., Standard Checkout, Premium Split"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">Max 100 characters, must be unique</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency *</Label>
          {editingTemplateId ? (
            <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
              <p className="text-sm text-foreground">
                {selectedCurrency?.pretty_name || formData.currency_code}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">Currency cannot be changed after template creation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <Select value={formData.currency_code} onValueChange={(val) => setFormData(prev => ({ ...prev, currency_code: val }))}>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.currency_code} value={currency.currency_code}>
                    {currency.pretty_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Section 2 - Fees */}
      <div className="space-y-4">
        <div>
          <h3 style={{ fontFamily: 'Manrope', fontSize: '14px' }} className="text-foreground mb-3">
            Fees
          </h3>
          <Separator />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="fee-behavior">Customer Pays Fees</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs leading-relaxed">
                      If enabled, processing fees are added to the total (customer pays). 
                      If disabled, fees are deducted from settlement (merchant absorbs).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.fee_behavior === 'customer_pays' ? 'Fee added to checkout total' : 'Fee deducted from settlement'}
            </p>
          </div>
          <Switch
            id="fee-behavior"
            checked={formData.fee_behavior === 'customer_pays'}
            onCheckedChange={(checked) => setFormData(prev => ({ 
              ...prev, 
              fee_behavior: checked ? 'customer_pays' : 'merchant_absorbs' 
            }))}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="network-fee">Charge Network Fee to Customer</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs leading-relaxed">
                      For crypto payments only. If enabled, blockchain gas fees are added to the customer's total.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">Only applies to cryptocurrency payments</p>
          </div>
          <Switch
            id="network-fee"
            checked={formData.charge_network_fee_to_customer}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, charge_network_fee_to_customer: checked }))}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="split">Enable Split Payments</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs leading-relaxed">
                      Automatically split payments to a partner wallet. Only available for cryptocurrency.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {!currencySupportsSplits && formData.currency_code && (
              <p className="text-xs text-amber-600">Splits not supported for fiat currencies</p>
            )}
          </div>
          <Switch
            id="split"
            checked={formData.split_enabled}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, split_enabled: checked }))}
            disabled={!currencySupportsSplits}
          />
        </div>

        {formData.split_enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/30 ml-2">
            <div className="space-y-2">
              <Label htmlFor="split-percentage">Split Percentage (%) *</Label>
              <Input
                id="split-percentage"
                type="number"
                placeholder="15.0"
                value={formData.split_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, split_percentage: e.target.value }))}
                min="0.01"
                max="99.99"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">Between 0.01% and 99.99%</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flat-fee">Split Flat Fee (Optional)</Label>
              <Input
                id="flat-fee"
                type="number"
                placeholder="5.00"
                value={formData.split_flat_fee}
                onChange={(e) => setFormData(prev => ({ ...prev, split_flat_fee: e.target.value }))}
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">Additional fixed amount for partner</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="split-address">Destination Address *</Label>
              <Input
                id="split-address"
                placeholder={selectedCurrency?.network === 'TRX' ? 'TJA9WfVj...' : '0x742d35Cc...'}
                value={formData.split_destination_address}
                onChange={(e) => setFormData(prev => ({ ...prev, split_destination_address: e.target.value }))}
              />
              {splitAddressHelper && (
                <p className="text-xs text-muted-foreground">{splitAddressHelper}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 3 - Branding */}
      <div className="space-y-4">
        <div>
          <h3 style={{ fontFamily: 'Manrope', fontSize: '14px' }} className="text-foreground mb-3">
            Branding
          </h3>
          <Separator />
        </div>

        <div className="space-y-2">
          <Label htmlFor="button-color">Button Color</Label>
          <div className="flex items-center gap-3">
            <Input
              id="button-color"
              type="color"
              value={formData.button_color}
              onChange={(e) => setFormData(prev => ({ ...prev, button_color: e.target.value }))}
              className="w-20 h-10 cursor-pointer"
            />
            <Input
              type="text"
              value={formData.button_color}
              onChange={(e) => setFormData(prev => ({ ...prev, button_color: e.target.value }))}
              className="flex-1"
              placeholder="#ff4c00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Logo</Label>
          
          {/* Logo Preview or Upload */}
          {formData.logo_preview && !formData.remove_logo ? (
            <div className="relative w-full h-32 border border-border rounded-md overflow-hidden bg-muted/30 flex items-center justify-center">
              <img 
                src={formData.logo_preview} 
                alt="Logo preview" 
                className="max-w-full max-h-full object-contain p-2"
              />
              <button
                type="button"
                onClick={handleLogoRemove}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="logo"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
            >
              <Upload className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload logo</p>
              <Input
                id="logo"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
              />
            </label>
          )}
          
          <p className="text-xs text-muted-foreground">
            PNG, JPG, or SVG. Max 2MB.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="powered-by">Show "Powered by Crossramp"</Label>
            <p className="text-xs text-muted-foreground">
              {formData.show_powered_by ? 'Badge visible (Lite Mode)' : 'White-label mode'}
            </p>
          </div>
          <Switch
            id="powered-by"
            checked={formData.show_powered_by}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_powered_by: checked }))}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 pt-4 pb-6">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            if (editingTemplateId) {
              setIsEditOpen(false);
            } else {
              setIsCreateOpen(false);
            }
            resetForm();
          }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={editingTemplateId ? handleUpdateTemplate : handleCreateTemplate}
          disabled={isSubmitting || (!formData.name || (!formData.currency_code && !editingTemplateId))}
        >
          <Lock className="size-3.5" />
          {isSubmitting ? 'Processing...' : editingTemplateId ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div>
          <h1 style={{ fontFamily: 'Manrope' }}>Payment Templates</h1>
          <p className="text-muted-foreground mt-1.5 max-w-3xl">
            Create reusable checkout configurations with specific currency, fee, and branding settings for your payment links.
          </p>
        </div>

        {/* Loading State */}
        {loading && templates.length === 0 && (
          <Card>
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <p className="text-sm text-destructive mb-4">Unable to load templates. Please try again.</p>
              <Button onClick={() => refetch()} variant="outline">
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {isEmpty && !loading && !error && (
          <Card className="border-dashed">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="size-7 text-muted-foreground/50" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontFamily: 'Manrope' }} className="text-foreground mb-2">
                No templates yet
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                Create your first template to start accepting payments with consistent settings.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="gap-2"
                variant="default"
              >
                <Lock className="size-3.5" />
                Create Template
              </Button>
            </div>
          </Card>
        )}

        {/* Templates List */}
        {!isEmpty && !loading && !error && (
          <>
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pagination?.total_count || 0} {pagination?.total_count === 1 ? 'template' : 'templates'}
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="gap-2"
              >
                <Lock className="size-3.5" />
                <Plus className="size-4" />
                <span className="hidden sm:inline">Create Template</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </div>

            {/* Templates Grid */}
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id} className="hover:bg-muted/30 transition-colors">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start gap-3">
                          {template.logo_url && (
                            <img 
                              src={template.logo_url} 
                              alt={template.name}
                              className="size-12 object-contain rounded-md border border-border flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 style={{ fontFamily: 'Manrope' }} className="text-foreground mb-1 truncate">
                              {template.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Created {new Date(template.created_at).toLocaleDateString()} • {template.usage_count} {template.usage_count === 1 ? 'payment link' : 'payment links'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Currency</p>
                            <p className="text-sm text-foreground">{template.currency_display}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Fee Behavior</p>
                            <p className="text-sm text-foreground">
                              {template.fee_behavior === 'customer_pays' ? 'Customer Pays' : 'Merchant Absorbs'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Button Color</p>
                            <div className="flex items-center gap-2">
                              <div 
                                className="size-5 rounded-md border border-border" 
                                style={{ backgroundColor: template.button_color }}
                              />
                              <p className="text-sm text-foreground">{template.button_color}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Split Payments</p>
                            <p className="text-sm text-foreground">
                              {template.split_enabled ? `${template.split_percentage}%` : 'Disabled'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(template.id)}>
                            <Edit className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template.id, template.name)}>
                            <Copy className="size-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[2.5rem]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.total_pages))}
                  disabled={currentPage === pagination.total_pages}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Create Template Sheet */}
        <Sheet open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader className="pb-6">
              <SheetTitle style={{ fontFamily: 'Manrope' }}>Create Payment Template</SheetTitle>
              <SheetDescription>
                Configure a reusable checkout preset with currency, fees, and branding settings.
              </SheetDescription>
            </SheetHeader>
            {renderForm()}
          </SheetContent>
        </Sheet>

        {/* Edit Template Sheet */}
        <Sheet open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) resetForm();
        }}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader className="pb-6">
              <SheetTitle style={{ fontFamily: 'Manrope' }}>Edit Payment Template</SheetTitle>
              <SheetDescription>
                Update template settings. Currency cannot be changed after creation.
              </SheetDescription>
            </SheetHeader>
            {loadingTemplateDetails ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-2">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Loading template details...</p>
                </div>
              </div>
            ) : (
              renderForm()
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}