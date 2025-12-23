/**
 * Centralized Command System for Crossramp Dashboard
 * 
 * This file contains all write-model commands following CQRS architecture.
 * Commands are separated from queries and handle all write operations.
 * 
 * Configuration is loaded at runtime from /config.js (no rebuild needed!)
 */

import { getApiBaseUrl, isMockQueriesEnabled } from '../config/runtime';
import { postCommand, CommandContext } from './commandClient';

// ============================================================================
// CONFIGURATION
// ============================================================================

const isMockMode = () => isMockQueriesEnabled();
const getAPIBaseURL = () => getApiBaseUrl();

export { isMockMode };

// ============================================================================
// COMMAND OPTIONS
// ============================================================================

export interface CommandOptions {
  signal?: AbortSignal;
  accessToken?: string;
  userId?: string;
  userRole?: string;
}

// ============================================================================
// TEMPLATES COMMANDS
// ============================================================================

/**
 * Command: Create Template
 * Endpoint: POST /api/commands/templates/create
 * MFA Required: Yes (via JWT token in Authorization header)
 */
export interface CreateTemplateCommand {
  name: string;
  currency_code: string;
  button_color: string; // Hex format: "#ff4c00"
  logo_file_base64?: string | null; // "data:image/png;base64,..." or null
  fee_behavior: 'customer_pays' | 'merchant_absorbs';
  charge_network_fee_to_customer: boolean;
  split_enabled: boolean;
  split_percentage?: number | null; // 0.01-99.99 if split_enabled
  split_flat_fee?: number | null; // Optional flat fee
  split_destination_address?: string | null; // Crypto address if split_enabled
  show_powered_by: boolean;
}

/**
 * Command: Update Template
 * Endpoint: POST /api/commands/templates/update
 * MFA Required: Yes
 * Note: currency_code is immutable and cannot be changed
 */
export interface UpdateTemplateCommand {
  template_id: string;
  name?: string;
  button_color?: string;
  logo_file_base64?: string | null; // Send null to remove logo
  fee_behavior?: 'customer_pays' | 'merchant_absorbs';
  charge_network_fee_to_customer?: boolean;
  split_enabled?: boolean;
  split_percentage?: number | null;
  split_flat_fee?: number | null;
  split_destination_address?: string | null;
  show_powered_by?: boolean;
  // currency_code is NOT allowed - it's immutable
}

/**
 * Command: Delete Template
 * Endpoint: POST /api/commands/templates/delete
 * MFA Required: Yes
 */
export interface DeleteTemplateCommand {
  template_id: string;
}

/**
 * Command: Duplicate Template
 * Endpoint: POST /api/commands/templates/duplicate
 * MFA Required: Yes
 */
export interface DuplicateTemplateCommand {
  template_id: string;
  new_name: string;
}

/**
 * Standard response for template commands
 */
export interface TemplateCommandResponse {
  success: boolean;
  template_id?: string; // Returned for create/duplicate
  message: string;
  error_code?: string; // For errors like "TEMPLATE_IN_USE"
  metadata?: Record<string, unknown>; // Additional error context
}

/**
 * Create a new payment template
 */
export async function createTemplate(
  payload: CreateTemplateCommand,
  context: CommandContext
): Promise<TemplateCommandResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate validation error occasionally for testing
    if (payload.name === 'ERROR_TEST') {
      throw new Error('Template name already exists');
    }
    
    return {
      success: true,
      template_id: `tpl_${Math.random().toString(36).substring(2, 11)}`,
      message: 'Template created successfully',
    };
  }

  return postCommand<TemplateCommandResponse>(
    'templates/create',
    payload,
    context
  );
}

/**
 * Update an existing payment template
 */
export async function updateTemplate(
  payload: UpdateTemplateCommand,
  context: CommandContext
): Promise<TemplateCommandResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    return {
      success: true,
      template_id: payload.template_id,
      message: 'Template updated successfully',
    };
  }

  return postCommand<TemplateCommandResponse>(
    'templates/update',
    payload,
    context
  );
}

/**
 * Delete a payment template
 */
export async function deleteTemplate(
  payload: DeleteTemplateCommand,
  context: CommandContext
): Promise<TemplateCommandResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Simulate "in use" error for specific template ID
    if (payload.template_id === 'tpl_8x7n2m9k') {
      return {
        success: false,
        error_code: 'TEMPLATE_IN_USE',
        message: 'Cannot delete template with 3 active payment links. Archive or reassign them first.',
        metadata: {
          active_payment_links: 3,
          pending_payments: 0,
        },
      };
    }
    
    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  return postCommand<TemplateCommandResponse>(
    'templates/delete',
    payload,
    context
  );
}

/**
 * Duplicate an existing payment template
 */
export async function duplicateTemplate(
  payload: DuplicateTemplateCommand,
  context: CommandContext
): Promise<TemplateCommandResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    return {
      success: true,
      template_id: `tpl_${Math.random().toString(36).substring(2, 11)}`,
      message: 'Template duplicated successfully',
    };
  }

  return postCommand<TemplateCommandResponse>(
    'templates/duplicate',
    payload,
    context
  );
}

// ============================================================================
// PAYMENT COMMANDS
// ============================================================================

export interface CreatePaymentLinkPayload {
  templateId: string;
  amount?: string;
  description?: string;
  expiresIn?: number; // minutes
}

export interface CreatePaymentLinkResponse {
  link: string;
  paymentId: string;
  expiresAt: string;
}

export async function createPaymentLink(
  payload: CreatePaymentLinkPayload,
  options: CommandOptions
): Promise<CreatePaymentLinkResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      link: `https://checkout.crossramp.io/pay/${Math.random().toString(36).substring(2, 15)}`,
      paymentId: `pay_${Math.random().toString(36).substring(2, 15)}`,
      expiresAt: new Date(Date.now() + (payload.expiresIn || 60) * 60 * 1000).toISOString(),
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/payment/create-link`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify({
      ...payload,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to create payment link: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// WITHDRAWAL COMMANDS
// ============================================================================

export interface CreateWithdrawalPayload {
  amount: string;
  currency: string;
  network: string;
  destinationAddress: string;
  destinationTag?: string;
}

export interface CreateWithdrawalResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: string;
  currency: string;
  network: string;
  estimatedCompletionTime: string;
}

export async function createWithdrawal(
  payload: CreateWithdrawalPayload,
  options: CommandOptions
): Promise<CreateWithdrawalResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      id: `wd_${Math.random().toString(36).substring(2, 15)}`,
      status: 'pending',
      amount: payload.amount,
      currency: payload.currency,
      network: payload.network,
      estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/withdraw`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify({
      ...payload,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to create withdrawal: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// WHITELIST COMMANDS
// ============================================================================

export interface AddWhitelistAddressPayload {
  address: string;
  label: string;
  network: string;
  currency: string;
}

export interface AddWhitelistAddressResponse {
  id: string;
  address: string;
  label: string;
  network: string;
  currency: string;
  status: 'pending' | 'active';
  createdAt: string;
}

export async function addWhitelistAddress(
  payload: AddWhitelistAddressPayload,
  options: CommandOptions
): Promise<AddWhitelistAddressResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: `wl_${Math.random().toString(36).substring(2, 15)}`,
      ...payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/whitelist/add`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify({
      ...payload,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to add whitelist address: ${response.statusText}`);
  }

  return response.json();
}

export async function removeWhitelistAddress(
  addressId: string,
  options: CommandOptions
): Promise<void> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  const url = `${getAPIBaseURL()}/api/commands/whitelist/${addressId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to remove whitelist address: ${response.statusText}`);
  }
}

// ============================================================================
// REPORT COMMANDS
// ============================================================================

export interface RequestReportPayload {
  type: 'transactions' | 'balances' | 'statement' | 'tax';
  format: 'pdf' | 'csv' | 'xlsx';
  dateFrom: string; // ISO date
  dateTo: string; // ISO date
  email?: string; // Optional - send to specific email
}

export interface RequestReportResponse {
  reportId: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedCompletionTime: string;
  downloadUrl?: string; // Available when completed
}

export async function requestReport(
  payload: RequestReportPayload,
  options: CommandOptions
): Promise<RequestReportResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      reportId: `rpt_${Math.random().toString(36).substring(2, 15)}`,
      status: 'processing',
      estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/report/request`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to request report: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// USER MANAGEMENT COMMANDS
// ============================================================================

export interface CreateUserPayload {
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'analyst';
}

export interface CreateUserResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'analyst';
  status: 'pending_invite';
  inviteSentAt: string;
}

export async function createUser(
  payload: CreateUserPayload,
  options: CommandOptions
): Promise<CreateUserResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: `usr_${Math.random().toString(36).substring(2, 15)}`,
      ...payload,
      status: 'pending_invite',
      inviteSentAt: new Date().toISOString(),
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/user`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify({
      ...payload,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// API KEYS COMMANDS
// ============================================================================

export interface CreateAPIKeyPayload {
  name: string;
  environment: 'production' | 'staging' | 'development';
  permissions: string[];
  ip_whitelist?: string[];
  rate_limit?: number;
  webhook_url?: string;
  notes?: string;
}

export interface CreateAPIKeyResponse {
  id: string;
  name: string;
  key_full: string; // Only shown once!
  key_masked: string;
  key_last_4: string;
  status: 'waiting_approval' | 'active';
  created_at: string;
  created_by: string;
  webhook_secret?: string;
  warning: string;
}

export async function createAPIKey(
  payload: CreateAPIKeyPayload,
  options: CommandOptions
): Promise<CreateAPIKeyResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const keyPrefix = payload.environment === 'production' 
      ? 'pk_live_' 
      : payload.environment === 'staging' 
      ? 'pk_test_' 
      : 'pk_dev_';
    
    const keySuffix = Math.random().toString(36).substring(2, 6);
    const keyFull = `${keyPrefix}${Math.random().toString(36).substring(2, 30)}${keySuffix}`;
    
    return {
      id: `apk_${Math.random().toString(36).substring(2, 15)}`,
      name: payload.name,
      key_full: keyFull,
      key_masked: `${keyPrefix}••••••••••••••••${keySuffix}`,
      key_last_4: keySuffix,
      status: 'waiting_approval',
      created_at: new Date().toISOString(),
      created_by: 'user@company.com',
      webhook_secret: payload.webhook_url ? `whsec_${Math.random().toString(36).substring(2, 30)}` : undefined,
      warning: "Save this key now. You won't be able to see it again.",
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/api-keys/create`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify({
      ...payload,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to create API key: ${response.statusText}`);
  }

  return response.json();
}

export interface DisableAPIKeyPayload {
  api_key_id: string;
  reason: string;
}

export async function disableAPIKey(
  payload: DisableAPIKeyPayload,
  options: CommandOptions
): Promise<void> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  const url = `${getAPIBaseURL()}/api/commands/api-keys/disable`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify({
      ...payload,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to disable API key: ${response.statusText}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get command mode info for debugging
 */
export function getCommandModeInfo() {
  return {
    mockMode: isMockMode(),
    apiBaseUrl: getAPIBaseURL(),
  };
}

// ============================================================================
// SECURITY / MFA COMMANDS
// ============================================================================

export interface ActivateMFAPayload {
  // No payload needed - backend will send email with QR code
}

export interface ActivateMFAResponse {
  status: 'pending';
  message: string;
  email_sent: boolean;
}

/**
 * Initiate MFA activation - Backend sends email with QR code
 */
export async function activateMFA(
  payload: ActivateMFAPayload,
  options: CommandOptions
): Promise<ActivateMFAResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      status: 'pending',
      message: 'MFA activation email sent',
      email_sent: true,
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/security/mfa/activate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to activate MFA: ${response.statusText}`);
  }

  return response.json();
}

export interface ConfirmMFAPayload {
  mfa_code: string; // 6-digit code from authenticator app
}

export interface ConfirmMFAResponse {
  status: 'active';
  message: string;
  activated_at: string; // ISO date
}

/**
 * Confirm MFA activation with verification code
 */
export async function confirmMFA(
  payload: ConfirmMFAPayload,
  options: CommandOptions
): Promise<ConfirmMFAResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      status: 'active',
      message: 'MFA successfully activated',
      activated_at: new Date().toISOString(),
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/security/mfa/confirm`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to confirm MFA: ${response.statusText}`);
  }

  return response.json();
}

export interface DeactivateMFAPayload {}

export interface DeactivateMFAResponse {
  status: 'not_activated';
  message: string;
}

/**
 * Deactivate MFA (requires MFA-elevated JWT)
 */
export async function deactivateMFA(
  payload: DeactivateMFAPayload,
  options: CommandOptions
): Promise<DeactivateMFAResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      status: 'not_activated',
      message: 'MFA successfully deactivated',
    };
  }

  const url = `${getAPIBaseURL()}/api/commands/security/mfa/deactivate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
  body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to deactivate MFA: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// DISPUTES COMMANDS
// ============================================================================

/**
 * Command: Submit Dispute Defense
 * Endpoint: POST /api/commands/disputes/submitDefense
 * MFA Required: Yes (via JWT token in Authorization header)
 */
export interface SubmitDisputeDefenseCommand {
  dispute_id: string;
  defense_text: string; // min 50 chars, max 2000 chars
  attachments?: string[]; // Base64 data URIs, max 5 files, 10MB each
}

export interface DisputeCommandResponse {
  success: boolean;
  message: string;
  error_code?: string; // "DEADLINE_EXPIRED" | "ALREADY_DEFENDED" | "INSUFFICIENT_BALANCE"
  metadata?: Record<string, unknown>;
}

/**
 * Submit defense for a dispute
 */
export async function submitDisputeDefense(
  payload: SubmitDisputeDefenseCommand,
  context: CommandContext
): Promise<DisputeCommandResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 900));
    
    // Validation simulation
    if (payload.defense_text.length < 50) {
      throw new Error('Defense text must be at least 50 characters');
    }
    
    return {
      success: true,
      message: 'Defense submitted successfully. Dispute status updated to Under Review',
    };
  }

  return postCommand<DisputeCommandResponse>(
    'disputes/submitDefense',
    payload,
    context
  );
}

/**
 * Command: Refund and Resolve Dispute
 * Endpoint: POST /api/commands/disputes/refundAndResolve
 * MFA Required: Yes
 */
export interface RefundAndResolveDisputeCommand {
  dispute_id: string;
  payment_id: string;
  refund_amount: string; // Decimal string: "450.00"
  refund_reason: string; // max 500 chars
  mark_as_resolved: boolean; // Usually true
}

/**
 * Process refund and resolve dispute
 */
export async function refundAndResolveDispute(
  payload: RefundAndResolveDisputeCommand,
  context: CommandContext
): Promise<DisputeCommandResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Simulate insufficient balance error
    if (parseFloat(payload.refund_amount) > 10000) {
      return {
        success: false,
        message: 'Insufficient balance. You have R$ 8,450.00 available but R$ 10,000.00 is required for this refund.',
        error_code: 'INSUFFICIENT_BALANCE',
        metadata: {
          available_balance: '8450.00',
          required_amount: payload.refund_amount,
        },
      };
    }
    
    return {
      success: true,
      message: 'Refund processed successfully. Dispute marked as resolved.',
    };
  }

  return postCommand<DisputeCommandResponse>(
    'disputes/refundAndResolve',
    payload,
    context
  );
}

/**
 * Command: Contest Infraction
 * Endpoint: POST /api/commands/disputes/contestInfraction
 * MFA Required: Yes
 */
export interface ContestInfractionCommand {
  dispute_id: string;
  contest_reason: string; // min 100 chars, max 2000 chars
  supporting_evidence?: string[]; // Base64 data URIs, max 10 files, 10MB each
}

/**
 * Contest an infraction on a dispute
 */
export async function contestDisputeInfraction(
  payload: ContestInfractionCommand,
  context: CommandContext
): Promise<DisputeCommandResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Validation simulation
    if (payload.contest_reason.length < 100) {
      throw new Error('Contest reason must be at least 100 characters');
    }
    
    return {
      success: true,
      message: 'Infraction contest submitted. Review within 3 business days.',
    };
  }

  return postCommand<DisputeCommandResponse>(
    'disputes/contestInfraction',
    payload,
    context
  );
}

// ============================================================================
// PAYMENTS COMMANDS
// ============================================================================

/**
 * Command: Refund Payment
 * Endpoint: POST /api/commands/payments/refund
 * MFA Required: Yes (via JWT token in Authorization header)
 */
export interface RefundPaymentCommand {
  payment_id: string;
  refund_amount: string;
  refund_reason: string;
  full_refund: boolean;
  notify_customer: boolean;
}

export interface RefundPaymentResponse {
  success: boolean;
  refund_id: string;
  refund_amount: string;
  estimated_delivery: string; // e.g., "1-3 business days"
  message: string;
}

export async function commandRefundPayment(
  command: RefundPaymentCommand,
  context: CommandContext
): Promise<RefundPaymentResponse> {
  if (isMockMode()) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock validation errors
    if (!command.payment_id || command.payment_id === '') {
      throw new Error('Payment ID is required');
    }
    
    if (!command.refund_reason || command.refund_reason.trim() === '') {
      throw new Error('Refund reason is required');
    }
    
    if (command.refund_reason.length > 500) {
      throw new Error('Refund reason must not exceed 500 characters');
    }
    
    const refundAmount = parseFloat(command.refund_amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      throw new Error('Invalid refund amount');
    }
    
    // Mock success response
    return {
      success: true,
      refund_id: `rfd_${Math.random().toString(36).substring(2, 12)}`,
      refund_amount: command.refund_amount,
      estimated_delivery: '1-3 business days',
      message: `Refund processed successfully. Customer will receive R$ ${command.refund_amount} within 1-3 business days.`,
    };
  }

  const payload = {
    payment_id: command.payment_id,
    refund_amount: command.refund_amount,
    refund_reason: command.refund_reason,
    full_refund: command.full_refund,
    notify_customer: command.notify_customer,
  };

  return postCommand<RefundPaymentResponse>(
    'payments/refund',
    payload,
    context
  );
}

/**
 * Command: Cancel Payment
 * Endpoint: POST /api/commands/payments/cancel
 * MFA Required: Yes (via JWT token in Authorization header)
 */
export interface CancelPaymentCommand {
  payment_id: string;
  cancellation_reason: string;
}

export interface CancelPaymentResponse {
  success: boolean;
  message: string;
}

export async function commandCancelPayment(
  command: CancelPaymentCommand,
  context: CommandContext
): Promise<CancelPaymentResponse> {
  if (isMockMode()) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Mock validation errors
    if (!command.payment_id || command.payment_id === '') {
      throw new Error('Payment ID is required');
    }
    
    if (!command.cancellation_reason || command.cancellation_reason.trim() === '') {
      throw new Error('Cancellation reason is required');
    }
    
    if (command.cancellation_reason.length > 500) {
      throw new Error('Cancellation reason must not exceed 500 characters');
    }
    
    // Mock success response
    return {
      success: true,
      message: 'Payment cancelled successfully',
    };
  }

  const payload = {
    payment_id: command.payment_id,
    cancellation_reason: command.cancellation_reason,
  };

  return postCommand<CancelPaymentResponse>(
    'payments/cancel',
    payload,
    context
  );
}