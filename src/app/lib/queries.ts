/**
 * Centralized Query System for Crossramp Dashboard
 * 
 * This file contains all read-model queries following CQRS architecture.
 * Queries are separated from commands and return read-optimized data.
 * 
 * Configuration is loaded at runtime from /config.js (no rebuild needed!)
 */

import { isMockQueriesEnabled, getApiBaseUrl, getEnvironment } from '../config/runtime';

// ============================================================================
// CONFIGURATION
// ============================================================================

const isMockMode = () => isMockQueriesEnabled();
const getAPIBaseURL = () => getApiBaseUrl();

export { isMockMode };

// ============================================================================
// TYPES
// ============================================================================

export interface QueryOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface DateRangeParams {
  from: string; // ISO date
  to: string; // ISO date
}

// ============================================================================
// BALANCES / ACCOUNTS
// ============================================================================

export interface BalanceState {
  available: string;
  locked: string;
  toReceive: string;
  blocked: string;
}

export interface NetworkAccount {
  id: string;
  network: string;
  internalCode: string;
  balances: BalanceState;
  transactions: AccountTransaction[];
}

export interface CurrencyGroup {
  currency: string;
  accounts: NetworkAccount[];
}

export interface AccountTransaction {
  id: string;
  date: string;
  description: string;
  debit?: string;
  credit?: string;
  resultingBalance: string;
}

// Mock data generator
const generateMockAccounts = (): CurrencyGroup[] => [
  {
    currency: 'USDT',
    accounts: [
      {
        id: 'usdt-trx',
        network: 'TRX',
        internalCode: 'ACC-USDT-TRX-001',
        balances: {
          available: '12,480.90',
          locked: '1,200.00',
          toReceive: '450.50',
          blocked: '0.00',
        },
        transactions: [
          {
            id: 'tx1',
            date: '2025-12-17 14:32',
            description: 'Payment received from merchant #3421',
            credit: '1,450.00',
            resultingBalance: '12,480.90',
          },
          {
            id: 'tx2',
            date: '2025-12-17 11:20',
            description: 'Withdrawal to external wallet',
            debit: '2,500.00',
            resultingBalance: '11,030.90',
          },
        ],
      },
      {
        id: 'usdt-sol',
        network: 'SOL',
        internalCode: 'ACC-USDT-SOL-002',
        balances: {
          available: '8,320.45',
          locked: '0.00',
          toReceive: '120.00',
          blocked: '0.00',
        },
        transactions: [],
      },
    ],
  },
  {
    currency: 'BTC',
    accounts: [
      {
        id: 'btc-main',
        network: 'Bitcoin',
        internalCode: 'ACC-BTC-MAIN-001',
        balances: {
          available: '0.45123000',
          locked: '0.00000000',
          toReceive: '0.01500000',
          blocked: '0.00000000',
        },
        transactions: [],
      },
    ],
  },
  {
    currency: 'BRL',
    accounts: [
      {
        id: 'brl-pix',
        network: 'PIX',
        internalCode: 'ACC-BRL-PIX-001',
        balances: {
          available: '45,892.35',
          locked: '2,100.00',
          toReceive: '8,450.00',
          blocked: '0.00',
        },
        transactions: [],
      },
    ],
  },
];

export async function queryAccounts(options?: QueryOptions): Promise<CurrencyGroup[]> {
  if (isMockMode()) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockAccounts();
  }

  const response = await fetch(`${getAPIBaseURL()}/accounts`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// DASHBOARD (OVERVIEW)
// ============================================================================

/**
 * Balance information for the Dashboard hero section
 * Category A: Manual refresh + on tab focus
 */
export interface AvailableBalance {
  amount: number;
  currency: string;
  settles_in: string;
  updated_at: string; // ISO timestamp
}

/**
 * Today's activity snapshot for Dashboard
 * Category B: 60s polling when idle
 */
export interface TodaySnapshot {
  payments_received: {
    amount: number;
    currency: string;
  };
  payments_pending: {
    amount: number;
    currency: string;
  };
  fees: {
    amount: number;
    currency: string;
  };
  date: string; // ISO date (YYYY-MM-DD)
}

/**
 * Recent transaction for Dashboard activity feed
 */
export interface RecentTransaction {
  id: string;
  type: 'received' | 'sent';
  amount: {
    value: number;
    currency: string;
  };
  description: string;
  timestamp: string; // ISO timestamp
}

/**
 * Payment status breakdown for Dashboard
 * Category B: 60s polling when idle
 */
export interface PaymentStatus {
  completed: {
    count: number;
    percentage: number;
  };
  pending: {
    count: number;
    percentage: number;
  };
  cancelled_or_expired: {
    count: number;
    percentage: number;
  };
  total: number;
}

// Mock data generators
const generateMockBalance = (): AvailableBalance => ({
  amount: 12480.90,
  currency: 'BRL',
  settles_in: 'USDT',
  updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
});

const generateMockTodaySnapshot = (): TodaySnapshot => ({
  payments_received: {
    amount: 3240.00,
    currency: 'BRL',
  },
  payments_pending: {
    amount: 580.00,
    currency: 'BRL',
  },
  fees: {
    amount: 42.15,
    currency: 'BRL',
  },
  date: new Date().toISOString().split('T')[0], // Today YYYY-MM-DD
});

const generateMockRecentTransactions = (): RecentTransaction[] => [
  {
    id: 'tx_001',
    type: 'received',
    amount: {
      value: 1450.00,
      currency: 'BRL',
    },
    description: 'Payment from merchant #3421',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
  },
  {
    id: 'tx_002',
    type: 'received',
    amount: {
      value: 890.00,
      currency: 'BRL',
    },
    description: 'Payment from merchant #2891',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
  },
  {
    id: 'tx_003',
    type: 'sent',
    amount: {
      value: 2500.00,
      currency: 'BRL',
    },
    description: 'Withdrawal to wallet',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
  },
];

const generateMockPaymentStatus = (): PaymentStatus => ({
  completed: {
    count: 24,
    percentage: 75,
  },
  pending: {
    count: 6,
    percentage: 20,
  },
  cancelled_or_expired: {
    count: 2,
    percentage: 5,
  },
  total: 32,
});

/**
 * Query: Get available balance
 * Endpoint: GET /api/balance/available
 * Category A: Manual refresh only (no auto-polling)
 */
export async function queryAvailableBalance(
  options?: QueryOptions
): Promise<AvailableBalance> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return generateMockBalance();
  }

  const response = await fetch(`${getAPIBaseURL()}/balance/available`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch available balance: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get today's activity snapshot
 * Endpoint: GET /api/dashboard/today
 * Category B: 60s polling when user is idle
 */
export async function queryDashboardToday(
  options?: QueryOptions
): Promise<TodaySnapshot> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 280));
    return generateMockTodaySnapshot();
  }

  const response = await fetch(`${getAPIBaseURL()}/dashboard/today`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch today's snapshot: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get recent transactions
 * Endpoint: GET /api/transactions/recent?limit=3
 * Category B: 60s polling when user is idle
 */
export async function queryRecentTransactions(
  params?: { limit?: number },
  options?: QueryOptions
): Promise<{ transactions: RecentTransaction[] }> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 220));
    const limit = params?.limit || 3;
    return {
      transactions: generateMockRecentTransactions().slice(0, limit),
    };
  }

  const url = new URL(`${getAPIBaseURL()}/transactions/recent`);
  if (params?.limit) {
    url.searchParams.set('limit', params.limit.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recent transactions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get payment status breakdown for today
 * Endpoint: GET /api/dashboard/payment-status?date=YYYY-MM-DD
 * Category B: 60s polling when user is idle
 */
export async function queryPaymentStatus(
  params?: { date?: string },
  options?: QueryOptions
): Promise<PaymentStatus> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return generateMockPaymentStatus();
  }

  const url = new URL(`${getAPIBaseURL()}/dashboard/payment-status`);
  if (params?.date) {
    url.searchParams.set('date', params.date);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch payment status: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// WITHDRAW (BALANCES & WHITELIST)
// ============================================================================

/**
 * Account with balance for withdraw form
 * Category A: Manual refresh before withdrawal
 */
export interface AccountBalance {
  id: string;
  currency_code: string;
  balance: string; // Decimal string (e.g., "12480.90")
  network?: string; // Optional network identifier (e.g., "TRX", "ETH", "SOL")
}

/**
 * Whitelisted crypto wallet address
 * Category B: Load once when opening withdraw page
 */
export interface WhitelistedWallet {
  id: string;
  label: string;
  address: string;
  network: string; // Must match account network for same-currency withdrawals
  status: 'active' | 'inactive' | 'pending';
}

/**
 * Whitelisted PIX address for BRL withdrawals
 * Category B: Load once when opening withdraw page
 */
export interface WhitelistedPix {
  id: string;
  label: string;
  address: string; // PIX key (email, phone, CPF/CNPJ, random key)
  type: 'Email' | 'Phone' | 'CPF' | 'CNPJ' | 'Random'; // PIX key type
  status: 'active' | 'inactive' | 'pending';
}

// Mock data generators
const generateMockBalances = (): AccountBalance[] => [
  {
    id: 'TRX_USDT_S2UZ',
    currency_code: 'TRX_USDT_S2UZ',
    balance: '12480.90',
    network: 'TRX',
  },
  {
    id: 'SOL_USDT_EWAY',
    currency_code: 'SOL_USDT_EWAY',
    balance: '8320.45',
    network: 'SOL',
  },
  {
    id: 'USDT_ERC20',
    currency_code: 'USDT_ERC20',
    balance: '5230.10',
    network: 'ETH',
  },
  {
    id: 'USDC',
    currency_code: 'USDC',
    balance: '15680.00',
    network: 'ETH',
  },
  {
    id: 'SOL_USDC_PTHX',
    currency_code: 'SOL_USDC_PTHX',
    balance: '9450.25',
    network: 'SOL',
  },
  {
    id: 'USDC_BASECHAIN_ETH_5I5C',
    currency_code: 'USDC_BASECHAIN_ETH_5I5C',
    balance: '3250.00',
    network: 'ETH',
  },
  {
    id: 'BRL',
    currency_code: 'BRL',
    balance: '42890.50',
    network: 'PIX',
  },
];

const generateMockWhitelistedWallets = (): WhitelistedWallet[] => [
  {
    id: 'wallet-1',
    label: 'Treasury Wallet',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    network: 'ETH',
    status: 'active',
  },
  {
    id: 'wallet-2',
    label: 'Operations Wallet',
    address: 'TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX',
    network: 'TRX',
    status: 'active',
  },
  {
    id: 'wallet-3',
    label: 'Cold Storage',
    address: '9wFFyRfZBsuAHA4YcuxcXLKwMxJR43S7fF97mUn7fEVp',
    network: 'SOL',
    status: 'active',
  },
  {
    id: 'wallet-4',
    label: 'Partner Settlement',
    address: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    network: 'ETH',
    status: 'active',
  },
  {
    id: 'wallet-5',
    label: 'Backup Wallet',
    address: 'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq',
    network: 'SOL',
    status: 'active',
  },
];

const generateMockWhitelistedPix = (): WhitelistedPix[] => [
  {
    id: 'pix-1',
    label: 'Company Account',
    address: 'company@bank.com',
    type: 'Email',
    status: 'active',
  },
  {
    id: 'pix-2',
    label: 'Treasury PIX',
    address: '+55 11 98765-4321',
    type: 'Phone',
    status: 'active',
  },
  {
    id: 'pix-3',
    label: 'Operations PIX',
    address: '12.345.678/0001-90',
    type: 'CNPJ',
    status: 'active',
  },
];

/**
 * Query: Get user account balances
 * Endpoint: GET /api/balances
 * Category A: Manual refresh only - critical data before withdrawal
 */
export async function queryBalances(
  options?: QueryOptions
): Promise<{ accounts: AccountBalance[] }> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 280));
    return {
      accounts: generateMockBalances(),
    };
  }

  const response = await fetch(`${getAPIBaseURL()}/balances`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get whitelisted crypto wallet addresses
 * Endpoint: GET /api/whitelist/wallets
 * Category B: Load once when opening withdraw page
 */
export async function queryWhitelistedWallets(
  options?: QueryOptions
): Promise<{ wallets: WhitelistedWallet[] }> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 240));
    return {
      wallets: generateMockWhitelistedWallets(),
    };
  }

  const response = await fetch(`${getAPIBaseURL()}/whitelist/wallets`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch whitelisted wallets: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get whitelisted PIX addresses
 * Endpoint: GET /api/whitelist/pix
 * Category B: Load once when opening withdraw page
 */
export async function queryWhitelistedPix(
  options?: QueryOptions
): Promise<{ pix_addresses: WhitelistedPix[] }> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 220));
    return {
      pix_addresses: generateMockWhitelistedPix(),
    };
  }

  const response = await fetch(`${getAPIBaseURL()}/whitelist/pix`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch whitelisted PIX addresses: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// WHITELIST MANAGEMENT
// ============================================================================

/**
 * Crypto wallet address within a whitelist group
 * Category B: Load once when opening crypto tab
 */
export interface WhitelistAddress {
  id: string;
  address: string;
  currency: string; // e.g., "USDT", "USDC"
  network: string; // e.g., "ETH", "TRX", "SOL"
  status: 'active' | 'pending' | 'rejected';
  reason: string;
  added_date: string; // YYYY-MM-DD format
}

/**
 * Whitelist group containing multiple addresses
 * Category B: Load once when opening crypto tab
 */
export interface WhitelistGroup {
  id: string;
  label: string;
  reason: string;
  created_date: string; // YYYY-MM-DD format
  addresses: WhitelistAddress[];
}

/**
 * PIX key entry in whitelist
 * Category B: Load once when opening PIX tab
 */
export interface PIXKey {
  id: string;
  label: string;
  pix_key: string; // The actual PIX key value
  type: 'Email' | 'Phone' | 'CPF' | 'CNPJ' | 'Random';
  status: 'active' | 'pending' | 'rejected';
  reason: string;
  added_date: string; // YYYY-MM-DD format
}

// Mock data generators
const generateMockWhitelistGroups = (): WhitelistGroup[] => [
  {
    id: 'group-1',
    label: 'Treasury Wallets',
    reason: 'Primary treasury management wallets for holding company funds',
    created_date: '2024-01-10',
    addresses: [
      {
        id: 'addr-1',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        currency: 'USDT',
        network: 'ETH',
        status: 'active',
        reason: 'Main Ethereum treasury wallet',
        added_date: '2024-01-15',
      },
      {
        id: 'addr-2',
        address: 'TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX',
        currency: 'USDT',
        network: 'TRX',
        status: 'active',
        reason: 'Tron treasury for lower fees',
        added_date: '2024-01-16',
      },
      {
        id: 'addr-3',
        address: '9wFFyRfZBsuAHA4YcuxcXLKwMxJR43S7fF97mUn7fEVp',
        currency: 'USDT',
        network: 'SOL',
        status: 'pending',
        reason: 'Solana treasury wallet',
        added_date: '2024-01-18',
      },
    ],
  },
  {
    id: 'group-2',
    label: 'Partner Settlements',
    reason: 'Wallets for settling payments with business partners',
    created_date: '2024-01-12',
    addresses: [
      {
        id: 'addr-4',
        address: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
        currency: 'USDC',
        network: 'ETH',
        status: 'active',
        reason: 'Partner A settlement wallet',
        added_date: '2024-01-14',
      },
    ],
  },
  {
    id: 'group-3',
    label: 'Cold Storage',
    reason: 'Long-term cold storage wallets for security',
    created_date: '2024-01-05',
    addresses: [],
  },
];

const generateMockPIXKeys = (): PIXKey[] => [
  {
    id: 'pix-1',
    label: 'Company Account',
    pix_key: 'company@bank.com',
    type: 'Email',
    status: 'active',
    reason: 'Primary company account',
    added_date: '2024-01-10',
  },
  {
    id: 'pix-2',
    label: 'Treasury PIX',
    pix_key: '+55 11 98765-4321',
    type: 'Phone',
    status: 'pending',
    reason: 'Treasury operations',
    added_date: '2024-01-15',
  },
];

/**
 * Query: Get whitelist groups with crypto wallet addresses
 * Endpoint: GET /api/whitelist/groups
 * Category B: Load once when opening crypto tab
 */
export async function queryWhitelistGroups(
  options?: QueryOptions
): Promise<{ groups: WhitelistGroup[] }> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 260));
    return {
      groups: generateMockWhitelistGroups(),
    };
  }

  const response = await fetch(`${getAPIBaseURL()}/whitelist/groups`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch whitelist groups: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get whitelisted PIX keys
 * Endpoint: GET /api/whitelist/pix-keys
 * Category B: Load once when opening PIX tab
 * 
 * Note: This is different from queryWhitelistedPix (used in Withdraw).
 * This endpoint returns additional metadata like total_count and max_allowed.
 */
export async function queryPIXKeys(
  options?: QueryOptions
): Promise<{ pix_keys: PIXKey[]; total_count: number; max_allowed: number }> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 230));
    const pixKeys = generateMockPIXKeys();
    return {
      pix_keys: pixKeys,
      total_count: pixKeys.length,
      max_allowed: 5,
    };
  }

  const response = await fetch(`${getAPIBaseURL()}/whitelist/pix-keys`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PIX keys: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Payment Template - Reusable checkout configuration preset
 */
export interface PaymentTemplate {
  id: string;
  name: string;
  currency_code: string;
  currency_display: string; // Human-readable: "BRL", "USDT (TRX)", etc.
  network_display: string | null; // "TRX", "ETH", null for fiat
  button_color: string; // Hex color: "#ff4c00"
  logo_url: string | null; // CDN URL after S3 upload, or null
  fee_behavior: 'customer_pays' | 'merchant_absorbs';
  charge_network_fee_to_customer: boolean; // Only relevant for crypto
  split_enabled: boolean;
  split_percentage: number | null; // 0.01-99.99 if split_enabled
  split_flat_fee: number | null; // Optional flat fee for split
  split_destination_address: string | null; // Crypto address for splits
  show_powered_by: boolean; // Show "Powered by Crossramp" badge
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  usage_count: number; // How many payment links use this template
}

/**
 * Request params for listing templates
 */
export interface ListTemplatesRequest {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'name' | 'usage_count';
  sort_order?: 'asc' | 'desc';
}

/**
 * Response for listing templates with pagination
 */
export interface ListTemplatesResponse {
  templates: PaymentTemplate[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

/**
 * Request params for template details
 */
export interface TemplateDetailsRequest {
  template_id: string;
}

/**
 * Response for template details (includes recent usage)
 */
export interface TemplateDetailsResponse extends PaymentTemplate {
  recent_payments: {
    payment_id: string;
    amount: number;
    currency_code: string;
    created_at: string;
  }[];
}

// Mock data generator for templates
const generateMockTemplates = (): PaymentTemplate[] => [
  {
    id: 'tpl_8x7n2m9k',
    name: 'Standard Checkout',
    currency_code: 'BRL',
    currency_display: 'BRL',
    network_display: null,
    button_color: '#ff4c00',
    logo_url: 'https://cdn.crossramp.com/logos/merchant123.png',
    fee_behavior: 'customer_pays',
    charge_network_fee_to_customer: false,
    split_enabled: false,
    split_percentage: null,
    split_flat_fee: null,
    split_destination_address: null,
    show_powered_by: true,
    created_at: '2025-01-10T14:32:00Z',
    updated_at: '2025-01-10T14:32:00Z',
    usage_count: 47,
  },
  {
    id: 'tpl_9y8o3n0l',
    name: 'Premium Split',
    currency_code: 'TRX_USDT_S2UZ',
    currency_display: 'USDT (TRX)',
    network_display: 'TRX',
    button_color: '#2563eb',
    logo_url: null,
    fee_behavior: 'merchant_absorbs',
    charge_network_fee_to_customer: true,
    split_enabled: true,
    split_percentage: 15.0,
    split_flat_fee: 3.00,
    split_destination_address: 'TJA9WfVjCvHvKSgN5bHSKvXJP8xKvhKqq1',
    show_powered_by: false,
    created_at: '2025-01-15T10:20:00Z',
    updated_at: '2025-01-16T08:45:00Z',
    usage_count: 23,
  },
  {
    id: 'tpl_1a2b3c4d',
    name: 'Express Payment',
    currency_code: 'ETH_USDC_VUSD',
    currency_display: 'USDC (ETH)',
    network_display: 'ETH',
    button_color: '#26a17b',
    logo_url: 'https://cdn.crossramp.com/logos/express.svg',
    fee_behavior: 'customer_pays',
    charge_network_fee_to_customer: false,
    split_enabled: false,
    split_percentage: null,
    split_flat_fee: null,
    split_destination_address: null,
    show_powered_by: true,
    created_at: '2025-01-20T16:10:00Z',
    updated_at: '2025-01-20T16:10:00Z',
    usage_count: 8,
  },
];

// Mock data generator for template details
const generateMockTemplateDetails = (templateId: string): TemplateDetailsResponse => {
  const template = generateMockTemplates().find(t => t.id === templateId);
  if (!template) throw new Error('Template not found');
  
  return {
    ...template,
    recent_payments: [
      {
        payment_id: 'pay_abc123xyz',
        amount: 150.00,
        currency_code: template.currency_code,
        created_at: '2025-01-22T10:15:00Z',
      },
      {
        payment_id: 'pay_def456uvw',
        amount: 85.50,
        currency_code: template.currency_code,
        created_at: '2025-01-21T14:30:00Z',
      },
      {
        payment_id: 'pay_ghi789rst',
        amount: 220.00,
        currency_code: template.currency_code,
        created_at: '2025-01-20T09:45:00Z',
      },
    ],
  };
};

/**
 * Query: List payment templates with pagination
 * Endpoint: GET /api/templates/list?page=1&limit=10&sort_by=created_at&sort_order=desc
 * Category: C (Load once on mount + after write actions)
 */
export async function queryTemplatesList(
  params?: ListTemplatesRequest,
  options?: QueryOptions
): Promise<ListTemplatesResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const templates = generateMockTemplates();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    
    // Simple mock pagination
    const startIndex = (page - 1) * limit;
    const paginatedTemplates = templates.slice(startIndex, startIndex + limit);
    
    return {
      templates: paginatedTemplates,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(templates.length / limit),
        total_count: templates.length,
        per_page: limit,
      },
    };
  }

  // Build URL with query parameters
  const url = new URL(`${getAPIBaseURL()}/api/templates/list`);
  if (params?.page) url.searchParams.set('page', params.page.toString());
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.sort_by) url.searchParams.set('sort_by', params.sort_by);
  if (params?.sort_order) url.searchParams.set('sort_order', params.sort_order);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get template details by ID
 * Endpoint: GET /api/templates/details?template_id=tpl_8x7n2m9k
 * Category: C (Load on-demand when Edit clicked)
 */
export async function queryTemplateDetails(
  params: TemplateDetailsRequest,
  options?: QueryOptions
): Promise<TemplateDetailsResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return generateMockTemplateDetails(params.template_id);
  }

  const url = new URL(`${getAPIBaseURL()}/api/templates/details`);
  url.searchParams.set('template_id', params.template_id);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch template details: ${response.statusText}`);
  }

  return response.json();
}

// Legacy function names for backward compatibility (DEPRECATED - use queryTemplatesList instead)
export async function queryTemplates(
  params?: PaginationParams,
  options?: QueryOptions
): Promise<PaymentTemplate[]> {
  const response = await queryTemplatesList(
    { page: 1, limit: params?.limit || 100 },
    options
  );
  return response.templates;
}

// Legacy function for backward compatibility (DEPRECATED - use queryTemplateDetails instead)
export async function queryTemplateById(
  templateId: string,
  options?: QueryOptions
): Promise<PaymentTemplate> {
  const response = await queryTemplateDetails({ template_id: templateId }, options);
  // Return without recent_payments for backward compatibility
  const { recent_payments, ...template } = response;
  return template;
}

// ============================================================================
// TRANSACTIONS / PAYMENTS
// ============================================================================

export type TransactionStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type TransactionType = 'payment_in' | 'payment_out' | 'withdrawal' | 'deposit';

export interface Transaction {
  id: string;
  date: string; // ISO date
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  currency: string;
  from?: string;
  to?: string;
  description?: string;
  fee?: string;
  network?: string;
  txHash?: string;
}

const generateMockTransactions = (): Transaction[] => [
  {
    id: 'tx_001',
    date: new Date('2024-12-22T14:30:00Z').toISOString(),
    type: 'payment_in',
    status: 'completed',
    amount: '1,450.00',
    currency: 'BRL',
    from: 'customer@example.com',
    to: 'merchant@crossramp.io',
    description: 'PIX Payment',
    fee: '14.50',
  },
  {
    id: 'tx_002',
    date: new Date('2024-12-22T12:15:00Z').toISOString(),
    type: 'withdrawal',
    status: 'processing',
    amount: '500.00',
    currency: 'USDT',
    to: 'TRx...abc123',
    description: 'Withdrawal to wallet',
    fee: '2.50',
    network: 'TRX',
  },
  {
    id: 'tx_003',
    date: new Date('2024-12-21T18:45:00Z').toISOString(),
    type: 'payment_in',
    status: 'completed',
    amount: '890.00',
    currency: 'BRL',
    from: 'user@example.com',
    description: 'PIX Payment',
    fee: '8.90',
  },
];

export async function queryTransactions(
  params?: {
    dateRange?: DateRangeParams;
    status?: TransactionStatus;
    type?: TransactionType;
  } & PaginationParams,
  options?: QueryOptions
): Promise<Transaction[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return generateMockTransactions();
  }

  const url = new URL(`${getAPIBaseURL()}/transactions`);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.offset) url.searchParams.set('offset', params.offset.toString());
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.type) url.searchParams.set('type', params.type);
  if (params?.dateRange) {
    url.searchParams.set('from', params.dateRange.from);
    url.searchParams.set('to', params.dateRange.to);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// WHITELIST
// ============================================================================

export interface WhitelistEntry {
  id: string;
  type: 'pix' | 'wallet';
  address: string;
  label: string;
  network?: string;
  currency?: string;
  addedAt: string; // ISO date
  lastUsed?: string; // ISO date
}

const generateMockWhitelist = (): WhitelistEntry[] => [
  {
    id: 'wl_001',
    type: 'pix',
    address: 'john.silva@example.com',
    label: 'John Silva - Personal',
    addedAt: new Date('2024-11-15').toISOString(),
    lastUsed: new Date('2024-12-20').toISOString(),
  },
  {
    id: 'wl_002',
    type: 'wallet',
    address: 'TRx7KWf3G2VJ8Hn3mP9QxYz2L4RtNbKpXs',
    label: 'Company Wallet - USDT',
    network: 'TRX',
    currency: 'USDT',
    addedAt: new Date('2024-12-01').toISOString(),
    lastUsed: new Date('2024-12-22').toISOString(),
  },
];

export async function queryWhitelist(
  params?: { type?: 'pix' | 'wallet' } & PaginationParams,
  options?: QueryOptions
): Promise<WhitelistEntry[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 180));
    const list = generateMockWhitelist();
    return params?.type ? list.filter(item => item.type === params.type) : list;
  }

  const url = new URL(`${getAPIBaseURL()}/whitelist`);
  if (params?.type) url.searchParams.set('type', params.type);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.offset) url.searchParams.set('offset', params.offset.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch whitelist: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// DISPUTES
// ============================================================================

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';

export type DisputeType =
  | 'fraudulent_transaction'
  | 'goods_not_received'
  | 'service_not_rendered'
  | 'not_as_described'
  | 'defective_or_damaged'
  | 'refund_not_processed'
  | 'duplicate_or_incorrect'
  | 'other';

export interface Dispute {
  id: string;
  payment_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_reason: string;
  dispute_type: DisputeType;
  merchant_defense: string | null;
  defense_submitted_at: string | null;
  date: string; // ISO date when dispute opened
  status: DisputeStatus;
  is_refunded: boolean;
  refund_id: string | null;
  refund_amount: string | null;
  refund_date: string | null;
  is_infraction: boolean;
  infraction_reason: string | null;
  infraction_severity: 'low' | 'medium' | 'high' | null;
  deadline: string; // ISO date
  amount: string;
  currency: string;
  created_at: string; // ISO date
  updated_at: string; // ISO date
}

export interface DisputeDetails extends Dispute {
  transaction_details: {
    method: string; // "PIX" | "Crypto"
    network: string | null;
    pix_key: string | null;
    wallet_address: string | null;
    transaction_hash: string | null;
    transaction_date: string; // ISO date
  };
  client_info: {
    email: string;
    phone: string | null;
    ip_address: string;
    user_agent: string;
  };
  timeline: DisputeTimelineEvent[];
}

export interface DisputeTimelineEvent {
  event: string; // "dispute_opened" | "defense_submitted" | "refund_processed" | etc.
  description: string;
  timestamp: string; // ISO date
  actor: string; // "customer" | "merchant" | "system"
}

export interface ListDisputesRequest {
  date_from?: string; // ISO date
  date_to?: string; // ISO date
  status?: DisputeStatus | 'all';
  page?: number;
  limit?: number;
}

export interface ListDisputesResponse {
  disputes: Dispute[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
  };
}

export interface SearchDisputeRequest {
  query: string; // Dispute ID, Payment ID, or Client Name
}

export interface SearchDisputeResponse {
  found: boolean;
  dispute?: Dispute;
}

export interface DisputeDetailsRequest {
  dispute_id: string;
}

const generateMockDisputes = (): Dispute[] => [
  {
    id: 'dsp_001',
    payment_id: 'tx_001',
    client_name: 'João Silva',
    client_email: 'joao.silva@example.com',
    client_phone: '+55 11 98765-4321',
    client_reason: 'I never received the product I ordered. The seller claims it was shipped but tracking shows no delivery.',
    dispute_type: 'goods_not_received',
    merchant_defense: null,
    defense_submitted_at: null,
    date: new Date('2025-12-18T14:30:00Z').toISOString(),
    status: 'open',
    is_refunded: false,
    refund_id: null,
    refund_amount: null,
    refund_date: null,
    is_infraction: false,
    infraction_reason: null,
    infraction_severity: null,
    deadline: new Date('2025-12-25T14:30:00Z').toISOString(),
    amount: '450.00',
    currency: 'BRL',
    created_at: new Date('2025-12-18T14:30:00Z').toISOString(),
    updated_at: new Date('2025-12-18T14:30:00Z').toISOString(),
  },
  {
    id: 'dsp_002',
    payment_id: 'tx_003',
    client_name: 'Maria Santos',
    client_email: 'maria.santos@example.com',
    client_phone: '+55 21 99876-5432',
    client_reason: 'The item I received is completely different from what was advertised. It appears to be a counterfeit.',
    dispute_type: 'not_as_described',
    merchant_defense: 'Product matches description. Customer may have unrealistic expectations based on photos.',
    defense_submitted_at: new Date('2025-12-17T15:00:00Z').toISOString(),
    date: new Date('2025-12-17T09:15:00Z').toISOString(),
    status: 'under_review',
    is_refunded: false,
    refund_id: null,
    refund_amount: null,
    refund_date: null,
    is_infraction: false,
    infraction_reason: null,
    infraction_severity: null,
    deadline: new Date('2025-12-24T09:15:00Z').toISOString(),
    amount: '890.00',
    currency: 'BRL',
    created_at: new Date('2025-12-17T09:15:00Z').toISOString(),
    updated_at: new Date('2025-12-17T15:00:00Z').toISOString(),
  },
  {
    id: 'dsp_003',
    payment_id: 'tx_008',
    client_name: 'Carlos Oliveira',
    client_email: 'carlos.oliveira@example.com',
    client_phone: null,
    client_reason: 'This transaction is fraudulent. My card was stolen and I did not authorize this purchase.',
    dispute_type: 'fraudulent_transaction',
    merchant_defense: 'Transaction was verified with 3D Secure. Customer may be attempting to avoid payment.',
    defense_submitted_at: new Date('2025-12-15T18:00:00Z').toISOString(),
    date: new Date('2025-12-15T16:45:00Z').toISOString(),
    status: 'resolved',
    is_refunded: true,
    refund_id: 'rfd_5a3f2e1c7b9d',
    refund_amount: '1120.00',
    refund_date: new Date('2025-12-16T10:00:00Z').toISOString(),
    is_infraction: true,
    infraction_reason: 'Merchant failed to verify customer identity adequately',
    infraction_severity: 'high',
    deadline: new Date('2025-12-22T16:45:00Z').toISOString(),
    amount: '1120.00',
    currency: 'BRL',
    created_at: new Date('2025-12-15T16:45:00Z').toISOString(),
    updated_at: new Date('2025-12-16T10:00:00Z').toISOString(),
  },
  {
    id: 'dsp_004',
    payment_id: 'tx_012',
    client_name: 'Ana Costa',
    client_email: 'ana.costa@example.com',
    client_phone: '+55 11 91234-5678',
    client_reason: 'I was charged twice for the same order. I need a refund for the duplicate charge.',
    dispute_type: 'duplicate_or_incorrect',
    merchant_defense: 'Technical error caused duplicate charge. Full refund issued immediately.',
    defense_submitted_at: new Date('2025-12-14T12:00:00Z').toISOString(),
    date: new Date('2025-12-14T11:20:00Z').toISOString(),
    status: 'closed',
    is_refunded: true,
    refund_id: 'rfd_8c1b4d2f6e3a',
    refund_amount: '340.00',
    refund_date: new Date('2025-12-14T13:00:00Z').toISOString(),
    is_infraction: false,
    infraction_reason: null,
    infraction_severity: null,
    deadline: new Date('2025-12-21T11:20:00Z').toISOString(),
    amount: '340.00',
    currency: 'BRL',
    created_at: new Date('2025-12-14T11:20:00Z').toISOString(),
    updated_at: new Date('2025-12-14T13:00:00Z').toISOString(),
  },
  {
    id: 'dsp_005',
    payment_id: 'tx_015',
    client_name: 'Pedro Alves',
    client_email: 'pedro.alves@example.com',
    client_phone: '+55 31 98765-1234',
    client_reason: 'The product arrived damaged. The packaging was opened and the item inside was broken.',
    dispute_type: 'defective_or_damaged',
    merchant_defense: null,
    defense_submitted_at: null,
    date: new Date('2025-12-16T13:45:00Z').toISOString(),
    status: 'open',
    is_refunded: false,
    refund_id: null,
    refund_amount: null,
    refund_date: null,
    is_infraction: false,
    infraction_reason: null,
    infraction_severity: null,
    deadline: new Date('2025-12-23T13:45:00Z').toISOString(),
    amount: '675.00',
    currency: 'BRL',
    created_at: new Date('2025-12-16T13:45:00Z').toISOString(),
    updated_at: new Date('2025-12-16T13:45:00Z').toISOString(),
  },
  {
    id: 'dsp_006',
    payment_id: 'tx_019',
    client_name: 'Lucia Ferreira',
    client_email: 'lucia.ferreira@example.com',
    client_phone: '+55 21 91234-9876',
    client_reason: 'I returned the product 2 weeks ago as agreed but still have not received my refund.',
    dispute_type: 'refund_not_processed',
    merchant_defense: 'Refund was processed on 2025-12-10. Customer should check with their bank.',
    defense_submitted_at: new Date('2025-12-13T11:00:00Z').toISOString(),
    date: new Date('2025-12-13T10:30:00Z').toISOString(),
    status: 'under_review',
    is_refunded: false,
    refund_id: null,
    refund_amount: null,
    refund_date: null,
    is_infraction: false,
    infraction_reason: null,
    infraction_severity: null,
    deadline: new Date('2025-12-20T10:30:00Z').toISOString(),
    amount: '2300.00',
    currency: 'BRL',
    created_at: new Date('2025-12-13T10:30:00Z').toISOString(),
    updated_at: new Date('2025-12-13T11:00:00Z').toISOString(),
  },
  {
    id: 'dsp_007',
    payment_id: 'tx_021',
    client_name: 'Roberto Lima',
    client_email: 'roberto.lima@example.com',
    client_phone: '+55 11 99999-8888',
    client_reason: 'I ordered a premium product but received a cheap knockoff. This is clearly fraudulent.',
    dispute_type: 'not_as_described',
    merchant_defense: null,
    defense_submitted_at: null,
    date: new Date('2025-12-19T08:20:00Z').toISOString(),
    status: 'open',
    is_refunded: false,
    refund_id: null,
    refund_amount: null,
    refund_date: null,
    is_infraction: true,
    infraction_reason: 'Multiple complaints received for selling counterfeit goods',
    infraction_severity: 'high',
    deadline: new Date('2025-12-22T08:20:00Z').toISOString(),
    amount: '3450.00',
    currency: 'BRL',
    created_at: new Date('2025-12-19T08:20:00Z').toISOString(),
    updated_at: new Date('2025-12-19T08:20:00Z').toISOString(),
  },
];

/**
 * Query: List Disputes
 * Endpoint: GET /api/disputes/list?date_from=...&date_to=...&status=...&page=...&limit=...
 * Category: B (Load once + refetch every 60s)
 */
export async function queryDisputesList(
  params: ListDisputesRequest,
  options?: QueryOptions
): Promise<ListDisputesResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 380));
    
    const allDisputes = generateMockDisputes();
    
    // Filter by status
    let filtered = allDisputes;
    if (params.status && params.status !== 'all') {
      filtered = allDisputes.filter(d => d.status === params.status);
    }
    
    // Filter by date range
    if (params.date_from || params.date_to) {
      filtered = filtered.filter(d => {
        const disputeDate = new Date(d.date).getTime();
        const fromTime = params.date_from ? new Date(params.date_from).getTime() : 0;
        const toTime = params.date_to ? new Date(params.date_to).getTime() : Date.now();
        return disputeDate >= fromTime && disputeDate <= toTime;
      });
    }
    
    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = filtered.slice(startIndex, endIndex);
    
    return {
      disputes: paginated,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(filtered.length / limit),
        total_count: filtered.length,
      },
    };
  }

  const url = new URL(`${getAPIBaseURL()}/disputes/list`);
  if (params.date_from) url.searchParams.set('date_from', params.date_from);
  if (params.date_to) url.searchParams.set('date_to', params.date_to);
  if (params.status && params.status !== 'all') url.searchParams.set('status', params.status);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch disputes list: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Search Dispute
 * Endpoint: GET /api/disputes/search?query=...
 * Category: B (On-demand search)
 */
export async function queryDisputeSearch(
  params: SearchDisputeRequest,
  options?: QueryOptions
): Promise<SearchDisputeResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const allDisputes = generateMockDisputes();
    const query = params.query.toLowerCase().trim();
    
    const found = allDisputes.find(d =>
      d.id.toLowerCase() === query ||
      d.payment_id.toLowerCase() === query ||
      d.client_name.toLowerCase().includes(query)
    );
    
    return found ? { found: true, dispute: found } : { found: false };
  }

  const url = new URL(`${getAPIBaseURL()}/disputes/search`);
  url.searchParams.set('query', params.query);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to search dispute: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get Dispute Details
 * Endpoint: GET /api/disputes/details?dispute_id=...
 * Category: B (Load on modal open)
 */
export async function queryDisputeDetails(
  params: DisputeDetailsRequest,
  options?: QueryOptions
): Promise<DisputeDetails> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 320));
    
    const dispute = generateMockDisputes().find(d => d.id === params.dispute_id);
    
    if (!dispute) {
      throw new Error('Dispute not found');
    }
    
    // Mock details with timeline
    return {
      ...dispute,
      transaction_details: {
        method: 'PIX',
        network: null,
        pix_key: 'joao.silva@example.com',
        wallet_address: null,
        transaction_hash: null,
        transaction_date: dispute.date,
      },
      client_info: {
        email: dispute.client_email,
        phone: dispute.client_phone,
        ip_address: '203.0.113.42',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeline: [
        {
          event: 'dispute_opened',
          description: 'Customer opened dispute',
          timestamp: dispute.date,
          actor: 'customer',
        },
        ...(dispute.defense_submitted_at ? [{
          event: 'defense_submitted',
          description: 'Merchant submitted defense',
          timestamp: dispute.defense_submitted_at,
          actor: 'merchant',
        }] : []),
        ...(dispute.refund_date ? [{
          event: 'refund_processed',
          description: `Refund of ${dispute.currency} ${dispute.refund_amount} processed`,
          timestamp: dispute.refund_date,
          actor: 'system',
        }] : []),
      ],
    };
  }

  const url = new URL(`${getAPIBaseURL()}/disputes/details`);
  url.searchParams.set('dispute_id', params.dispute_id);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dispute details: ${response.statusText}`);
  }

  return response.json();
}

// Legacy function for backward compatibility (DEPRECATED - use queryDisputesList instead)
export async function queryDisputes(
  params?: { status?: DisputeStatus } & PaginationParams,
  options?: QueryOptions
): Promise<Dispute[]> {
  const response = await queryDisputesList(
    {
      status: params?.status,
      page: params?.page,
      limit: params?.limit,
    },
    options
  );
  return response.disputes;
}

// ============================================================================
// API KEYS (Developers)
// ============================================================================

export interface APIKey {
  id: string;                         // "apk_001"
  name: string;                       // "Production API"
  key_prefix: string;                 // "pk_live_"
  key_masked: string;                 // "pk_live_••••••••••••••••1234"
  key_last_4: string;                 // "1234"
  status: 'active' | 'waiting_approval' | 'disabled';
  created_at: string;                 // ISO date
  created_by: string;                 // email
  created_by_user_id: string;         // "usr_123"
  last_used_at: string | null;        // ISO date or null
  environment: 'production' | 'staging' | 'development';  // NOT 'live'/'test'
  permissions: string[];              // ["read:payments", "write:payments"]
  ip_whitelist: string[];             // ["203.0.113.0/24"]
  rate_limit: number;                 // 1000
}

export interface APIKeysResponse {
  api_keys: APIKey[];
  total_count: number;
  active_count: number;
  waiting_approval_count: number;
  disabled_count: number;
}

const generateMockAPIKeys = (): APIKey[] => [
  {
    id: 'apk_001',
    name: 'Production API',
    key_prefix: 'pk_live_',
    key_masked: 'pk_live_••••••••••••••••1234',
    key_last_4: '1234',
    status: 'active',
    created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
    created_by: 'admin@company.com',
    created_by_user_id: 'usr_123',
    last_used_at: new Date('2025-12-22T10:30:00Z').toISOString(),
    environment: 'production',
    permissions: ['read:payments', 'write:payments', 'read:balances'],
    ip_whitelist: ['203.0.113.0/24'],
    rate_limit: 1000,
  },
  {
    id: 'apk_002',
    name: 'Staging Environment',
    key_prefix: 'pk_test_',
    key_masked: 'pk_test_••••••••••••••••5678',
    key_last_4: '5678',
    status: 'waiting_approval',
    created_at: new Date('2024-12-18T14:30:00Z').toISOString(),
    created_by: 'dev@company.com',
    created_by_user_id: 'usr_456',
    last_used_at: null,
    environment: 'staging',
    permissions: ['read:payments', 'read:balances'],
    ip_whitelist: [],
    rate_limit: 100,
  },
  {
    id: 'apk_003',
    name: 'Development Key',
    key_prefix: 'pk_dev_',
    key_masked: 'pk_dev_••••••••••••••••9012',
    key_last_4: '9012',
    status: 'active',
    created_at: new Date('2024-11-01T09:00:00Z').toISOString(),
    created_by: 'dev@company.com',
    created_by_user_id: 'usr_456',
    last_used_at: new Date('2025-12-20T15:45:00Z').toISOString(),
    environment: 'development',
    permissions: ['read:payments'],
    ip_whitelist: [],
    rate_limit: 50,
  },
];

export async function queryAPIKeys(
  params?: { 
    environment?: 'production' | 'staging' | 'development';
    status?: 'active' | 'waiting_approval' | 'disabled';
  },
  options?: QueryOptions
): Promise<APIKeysResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    let keys = generateMockAPIKeys();
    
    // Filter by environment
    if (params?.environment) {
      keys = keys.filter(k => k.environment === params.environment);
    }
    
    // Filter by status
    if (params?.status) {
      keys = keys.filter(k => k.status === params.status);
    }
    
    // Calculate counts
    const allKeys = generateMockAPIKeys();
    return {
      api_keys: keys,
      total_count: allKeys.length,
      active_count: allKeys.filter(k => k.status === 'active').length,
      waiting_approval_count: allKeys.filter(k => k.status === 'waiting_approval').length,
      disabled_count: allKeys.filter(k => k.status === 'disabled').length,
    };
  }

  // Real API call - use documented endpoint
  const url = new URL(`${getAPIBaseURL()}/api/api-keys/list`);
  if (params?.environment) url.searchParams.set('environment', params.environment);
  if (params?.status) url.searchParams.set('status', params.status);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch API keys: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// SECURITY / MFA
// ============================================================================

export type MFAStatus = 'not_activated' | 'pending' | 'active';

export interface MFAInfo {
  status: MFAStatus;
  activatedDate?: string; // ISO date
  lastUsed?: string; // ISO date
}

const generateMockMFAInfo = (): MFAInfo => ({
  status: 'not_activated',
  activatedDate: undefined,
  lastUsed: undefined,
});

export async function queryMFAStatus(options?: QueryOptions): Promise<MFAInfo> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return generateMockMFAInfo();
  }

  const response = await fetch(`${getAPIBaseURL()}/security/mfa`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch MFA status: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// COMPANY PROFILE / KYC
// ============================================================================

export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export interface CompanyProfile {
  id: string;
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  kyc: {
    status: KYCStatus;
    submittedAt?: string; // ISO date
    approvedAt?: string; // ISO date
    rejectedAt?: string; // ISO date
    rejectionReason?: string;
  };
}

const generateMockCompanyProfile = (): CompanyProfile => ({
  id: 'company_001',
  companyName: 'Example Ltda',
  cnpj: '12.345.678/0001-90',
  email: 'company@example.com',
  phone: '+55 11 98765-4321',
  address: {
    street: 'Av. Paulista',
    number: '1000',
    complement: 'Sala 500',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    country: 'Brazil',
  },
  kyc: {
    status: 'approved',
    submittedAt: new Date('2024-11-01').toISOString(),
    approvedAt: new Date('2024-11-15').toISOString(),
  },
});

export async function queryCompanyProfile(options?: QueryOptions): Promise<CompanyProfile> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return generateMockCompanyProfile();
  }

  const response = await fetch(`${getAPIBaseURL()}/company/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch company profile: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// COMPANY KYC STATUS
// ============================================================================

export interface KYCDocumentStatus {
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string; // ISO 8601
  approved_at?: string; // ISO 8601
  rejected_at?: string; // ISO 8601
  rejection_reason?: string;
}

export interface CompanyKYCStatus {
  status: 'verified' | 'pending' | 'not_started';
  ubo_name: string;
  verified_at?: string; // ISO 8601
  verified_by?: string;
  verification_level?: 'basic' | 'full';
  documents_submitted?: {
    cpf?: KYCDocumentStatus;
    proof_of_address?: KYCDocumentStatus;
    company_articles?: KYCDocumentStatus;
    ubo_declaration?: KYCDocumentStatus;
  };
  pending_requirements: string[];
  next_review_date?: string; // ISO 8601
  notes?: string;
}

const generateMockKYCStatus = (): CompanyKYCStatus => ({
  status: 'verified',
  ubo_name: 'Maria Silva Santos',
  verified_at: '2024-10-15T16:45:00Z',
  verified_by: 'ops_user_001',
  verification_level: 'full',
  documents_submitted: {
    cpf: {
      status: 'approved',
      submitted_at: '2024-10-10T10:00:00Z',
      approved_at: '2024-10-15T16:45:00Z',
    },
    proof_of_address: {
      status: 'approved',
      submitted_at: '2024-10-10T10:05:00Z',
      approved_at: '2024-10-15T16:45:00Z',
    },
    company_articles: {
      status: 'approved',
      submitted_at: '2024-10-10T10:10:00Z',
      approved_at: '2024-10-15T16:45:00Z',
    },
    ubo_declaration: {
      status: 'approved',
      submitted_at: '2024-10-10T10:15:00Z',
      approved_at: '2024-10-15T16:45:00Z',
    },
  },
  pending_requirements: [],
  next_review_date: '2025-10-15T00:00:00Z',
  notes: 'All documents verified successfully',
});

/**
 * Query: Get company KYC verification status
 * Endpoint: GET /api/company/kyc-status
 * Category: C (Load once on page mount, rarely changes)
 */
export async function queryCompanyKYCStatus(options?: QueryOptions): Promise<CompanyKYCStatus> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return generateMockKYCStatus();
  }

  const response = await fetch(`${getAPIBaseURL()}/api/company/kyc-status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch KYC status: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// COMPANY REPUTATION SCORE
// ============================================================================

export type ReputationLevel = 'blocked' | 'low' | 'average' | 'good' | 'excellent';

export interface ReputationFactor {
  value: number | string;
  weight: number;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface ReputationLevelInfo {
  level: ReputationLevel;
  min_score?: number;
  max_score?: number;
  benefits?: string[];
  penalties?: string[];
  score_gap?: number;
  score_buffer?: number;
}

export interface CompanyReputationScore {
  current_score: number;
  level: ReputationLevel;
  level_range: {
    min: number;
    max: number;
  };
  previous_score: number;
  score_change_30d: number;
  score_trend: 'improving' | 'stable' | 'declining';
  fee_multiplier: number;
  fee_adjustment_percent: number;
  benefits_applied: string[];
  penalties_applied: string[];
  next_level?: ReputationLevelInfo;
  previous_level?: ReputationLevelInfo;
  last_updated: string; // ISO 8601
  factors: {
    payment_success_rate: ReputationFactor;
    chargeback_rate: ReputationFactor;
    dispute_rate: ReputationFactor;
    kyc_compliance: ReputationFactor;
    account_age_days: ReputationFactor;
  };
}

const generateMockReputationScore = (): CompanyReputationScore => ({
  current_score: 75,
  level: 'good',
  level_range: {
    min: 60,
    max: 80,
  },
  previous_score: 72,
  score_change_30d: 3,
  score_trend: 'improving',
  fee_multiplier: 1.0,
  fee_adjustment_percent: 0,
  benefits_applied: [
    'Standard settlement time (T+1)',
    'No transaction limits',
    'Standard support response time (24h)',
  ],
  penalties_applied: ['None'],
  next_level: {
    level: 'excellent',
    min_score: 80,
    benefits: [
      'Reduced fees (-20%)',
      'Priority settlement (T+0)',
      'Priority support (4h response)',
    ],
    score_gap: 5,
  },
  previous_level: {
    level: 'average',
    max_score: 60,
    penalties: [
      'Increased fees (+20%)',
      'Extended settlement (T+2)',
      'Potential transaction limits',
    ],
    score_buffer: 15,
  },
  last_updated: new Date().toISOString(),
  factors: {
    payment_success_rate: {
      value: 98.5,
      weight: 0.3,
      impact: 'positive',
    },
    chargeback_rate: {
      value: 0.2,
      weight: 0.25,
      impact: 'positive',
    },
    dispute_rate: {
      value: 0.5,
      weight: 0.2,
      impact: 'neutral',
    },
    kyc_compliance: {
      value: 'verified',
      weight: 0.15,
      impact: 'positive',
    },
    account_age_days: {
      value: 347,
      weight: 0.1,
      impact: 'positive',
    },
  },
});

/**
 * Query: Get company reputation score and breakdown
 * Endpoint: GET /api/company/reputation-score
 * Category: B (Soft refresh 30s when page visible)
 */
export async function queryCompanyReputationScore(options?: QueryOptions): Promise<CompanyReputationScore> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return generateMockReputationScore();
  }

  const response = await fetch(`${getAPIBaseURL()}/api/company/reputation-score`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch reputation score: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// COMPANY FEE TIER
// ============================================================================

export interface FeeTierInfo {
  tier_id: string;
  tier_name: string;
  min_volume?: number;
  max_volume?: number;
  base_fee_percent: number;
  volume_needed?: number;
}

export interface CompanyFeeTier {
  current_tier: FeeTierInfo;
  last_month_volume: number;
  last_month_currency: string;
  current_base_fee: number;
  reputation_multiplier: number;
  final_fee_percent: number;
  fee_adjustment_percent: number;
  next_tier?: FeeTierInfo;
  previous_tier?: FeeTierInfo;
  all_tiers: FeeTierInfo[];
  last_updated: string; // ISO 8601
  calculation_period: string;
}

const generateMockFeeTier = (): CompanyFeeTier => ({
  current_tier: {
    tier_id: 'tier_2',
    tier_name: 'R$ 1M - R$ 2.5M',
    min_volume: 1000000,
    max_volume: 2500000,
    base_fee_percent: 1.75,
  },
  last_month_volume: 1800000,
  last_month_currency: 'BRL',
  current_base_fee: 1.75,
  reputation_multiplier: 1.0,
  final_fee_percent: 1.75,
  fee_adjustment_percent: 0,
  next_tier: {
    tier_id: 'tier_3',
    tier_name: 'R$ 2.5M - R$ 5M',
    min_volume: 2500000,
    max_volume: 5000000,
    base_fee_percent: 1.5,
    volume_needed: 700000,
  },
  previous_tier: {
    tier_id: 'tier_1',
    tier_name: 'R$ 500k - R$ 1M',
    max_volume: 1000000,
    base_fee_percent: 2.0,
  },
  all_tiers: [
    {
      tier_id: 'tier_0',
      tier_name: 'Up to R$ 500k',
      max_volume: 500000,
      base_fee_percent: 2.5,
    },
    {
      tier_id: 'tier_1',
      tier_name: 'R$ 500k - R$ 1M',
      min_volume: 500000,
      max_volume: 1000000,
      base_fee_percent: 2.0,
    },
    {
      tier_id: 'tier_2',
      tier_name: 'R$ 1M - R$ 2.5M',
      min_volume: 1000000,
      max_volume: 2500000,
      base_fee_percent: 1.75,
    },
    {
      tier_id: 'tier_3',
      tier_name: 'R$ 2.5M - R$ 5M',
      min_volume: 2500000,
      max_volume: 5000000,
      base_fee_percent: 1.5,
    },
    {
      tier_id: 'tier_4',
      tier_name: 'Above R$ 5M',
      min_volume: 5000000,
      base_fee_percent: 1.25,
    },
  ],
  last_updated: new Date().toISOString(),
  calculation_period: '2024-11-01 to 2024-11-30',
});

/**
 * Query: Get company fee tier based on monthly volume
 * Endpoint: GET /api/company/fee-tier
 * Category: B (Soft refresh 30s when page visible)
 */
export async function queryCompanyFeeTier(options?: QueryOptions): Promise<CompanyFeeTier> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return generateMockFeeTier();
  }

  const response = await fetch(`${getAPIBaseURL()}/api/company/fee-tier`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch fee tier: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// ANALYTICS / REPORTS
// ============================================================================

export interface ChartDataPoint {
  name: string; // Date or label
  [key: string]: string | number; // Flexible values (revenue, expenses, count, etc.)
}

// ============================================================================
// Analytics - Aggregated Metrics
// ============================================================================

export interface AnalyticsMetricsRequest {
  date_from: string; // ISO 8601 date string
  date_to: string; // ISO 8601 date string
  timezone?: string; // IANA timezone (e.g., "America/Sao_Paulo")
}

export interface AnalyticsMetricsResponse {
  total_volume: {
    amount: number;
    currency: string;
    change_percent: number | null;
  };
  total_payments: {
    count: number;
    change_percent: number | null;
  };
  avg_conversion_rate: {
    rate: number;
    change_percent: number | null;
  };
  net_fees: {
    fees_received: number;
    fees_paid: number;
    net: number;
    currency: string;
    change_percent: number | null;
  };
  period: {
    from: string;
    to: string;
  };
}

const generateMockAnalyticsMetrics = (params: AnalyticsMetricsRequest): AnalyticsMetricsResponse => {
  const from = new Date(params.date_from);
  const to = new Date(params.date_to);
  const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate realistic data based on period length
  const dailyVolume = 35000 + Math.random() * 15000;
  const totalVolume = dailyVolume * daysDiff;
  const dailyPayments = 25 + Math.floor(Math.random() * 15);
  const totalPayments = dailyPayments * daysDiff;
  
  return {
    total_volume: {
      amount: totalVolume,
      currency: 'BRL',
      change_percent: Math.random() > 0.4 ? (Math.random() * 25) : -(Math.random() * 15),
    },
    total_payments: {
      count: totalPayments,
      change_percent: Math.random() > 0.5 ? (Math.random() * 20) : -(Math.random() * 10),
    },
    avg_conversion_rate: {
      rate: 65 + Math.random() * 15,
      change_percent: Math.random() > 0.5 ? (Math.random() * 5) : -(Math.random() * 8),
    },
    net_fees: {
      fees_received: totalVolume * 0.03,
      fees_paid: totalVolume * 0.01,
      net: totalVolume * 0.02,
      currency: 'BRL',
      change_percent: Math.random() > 0.6 ? (Math.random() * 18) : -(Math.random() * 12),
    },
    period: {
      from: params.date_from,
      to: params.date_to,
    },
  };
};

/**
 * Query: Get aggregated analytics metrics for a date range
 * Endpoint: GET /api/analytics/metrics
 * Category: B (60s polling when idle)
 */
export async function queryAnalyticsMetrics(
  params: AnalyticsMetricsRequest,
  options?: QueryOptions
): Promise<AnalyticsMetricsResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockAnalyticsMetrics(params);
  }

  const url = new URL(`${getAPIBaseURL()}/api/analytics/metrics`);
  url.searchParams.set('date_from', params.date_from);
  url.searchParams.set('date_to', params.date_to);
  if (params.timezone) {
    url.searchParams.set('timezone', params.timezone);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch analytics metrics: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Analytics - Time Series Data
// ============================================================================

export async function queryPaymentsOverview(
  params: DateRangeParams,
  options?: QueryOptions
): Promise<ChartDataPoint[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate mock data based on date range
    const from = new Date(params.from);
    const to = new Date(params.to);
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      return {
        name: date.toISOString().split('T')[0],
        pix: Math.floor(Math.random() * 50) + 10,
        usdt: Math.floor(Math.random() * 30) + 5,
        usdc: Math.floor(Math.random() * 20) + 3,
      };
    });
  }

  const url = new URL(`${getAPIBaseURL()}/analytics/payments-overview`);
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch payments overview: ${response.statusText}`);
  }

  return response.json();
}

export async function queryVolumeOverview(
  params: DateRangeParams,
  options?: QueryOptions
): Promise<ChartDataPoint[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const from = new Date(params.from);
    const to = new Date(params.to);
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      return {
        name: date.toISOString().split('T')[0],
        volume: Math.floor(Math.random() * 100000) + 50000,
      };
    });
  }

  const url = new URL(`${getAPIBaseURL()}/analytics/volume-overview`);
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch volume overview: ${response.statusText}`);
  }

  return response.json();
}

export async function queryConversionRates(
  params: DateRangeParams,
  options?: QueryOptions
): Promise<ChartDataPoint[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const from = new Date(params.from);
    const to = new Date(params.to);
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      return {
        name: date.toISOString().split('T')[0],
        rate: (Math.random() * 2 + 4).toFixed(2), // 4-6%
      };
    });
  }

  const url = new URL(`${getAPIBaseURL()}/analytics/conversion-rates`);
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversion rates: ${response.statusText}`);
  }

  return response.json();
}

export async function queryFees(
  params: DateRangeParams,
  options?: QueryOptions
): Promise<ChartDataPoint[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const from = new Date(params.from);
    const to = new Date(params.to);
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      return {
        name: date.toISOString().split('T')[0],
        fees: Math.floor(Math.random() * 500) + 100,
      };
    });
  }

  const url = new URL(`${getAPIBaseURL()}/analytics/fees`);
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch fees: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// PAYMENTS / TRANSACTIONS
// ============================================================================

export interface PaymentListRequest {
  date_from: string;      // ISO 8601
  date_to: string;        // ISO 8601
  type?: 'all' | 'received' | 'sent';
  page: number;
  limit: number;
  sort_by?: 'date' | 'amount';
  sort_order?: 'asc' | 'desc';
}

export interface Payment {
  id: string;
  type: 'received' | 'sent';
  amount: string;
  amount_display: string;
  amount_crypto: string;
  currency_crypto: string;
  currency_fiat: string;
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled' | 'refunded';
  date: string;
  fee: string;
  fee_display: string;
  external_id: string;
  client_id: string;
  process: 'onramp' | 'offramp';
  // Full details (for modal)
  created_at: string;
  updated_at: string;
  address: string;
  checkout_url: string;
  template: string;
  entry_value: string;
  entry_currency: string;
  exit_value: string;
  exit_currency: string;
  effective_rate: string;
  base_rate: string;
  wallet: string;
  tx_hash: string;
  blockchain_explorer_url?: string;
  state: string;
  expiration_date: string;
  expired: boolean;
  is_refundable: boolean;
  refund_deadline?: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface PaymentSearchRequest {
  query: string;  // Can be tx ID, external ID, client ID, tx hash, address, wallet
}

export interface PaymentSearchResponse {
  found: boolean;
  payment?: Payment;
}

// Mock data generator
const generateMockPayment = (index: number, type: 'received' | 'sent', status: 'completed' | 'pending' | 'failed' = 'completed'): Payment => {
  const isReceived = type === 'received';
  const amountBRL = isReceived ? (Math.random() * 3000 + 300) : (Math.random() * 2500 + 500);
  const amountCrypto = amountBRL / 5.08;
  const fee = amountBRL * 0.01;
  
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 10);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const dateStr = date.toISOString();
  
  const txId = `tx_${String(index).padStart(3, '0')}`;
  const externalId = Math.random() > 0.5 ? `ORD-${Math.floor(Math.random() * 9000 + 1000)}` : '---';
  const clientId = `0${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
  const wallet = `0x${Math.random().toString(16).substring(2, 42).padEnd(40, '0')}`;
  
  const basePayment: Payment = {
    id: txId,
    type,
    amount: amountBRL.toFixed(2),
    amount_display: `R$ ${amountBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    amount_crypto: amountCrypto.toFixed(2),
    currency_crypto: 'USDT',
    currency_fiat: 'BRL',
    description: isReceived 
      ? `Payment from merchant #${Math.floor(Math.random() * 9000 + 1000)}`
      : `Withdrawal to wallet ${wallet.substring(0, 6)}...${wallet.substring(38)}`,
    status,
    date: dateStr,
    fee: fee.toFixed(2),
    fee_display: `R$ ${fee.toFixed(2)}`,
    external_id: externalId,
    client_id: clientId,
    process: isReceived ? 'onramp' : 'offramp',
    created_at: dateStr,
    updated_at: new Date(date.getTime() + 2 * 60 * 1000).toISOString(),
    address: isReceived ? `NOX${Math.random().toString(36).substring(2, 32).toUpperCase()}` : `WIT${Math.random().toString(36).substring(2, 32).toUpperCase()}`,
    checkout_url: isReceived ? `https://checkout.crossramp.io/e2e/${Math.random().toString(36).substring(2)}` : '---',
    template: isReceived ? (Math.random() > 0.5 ? 'fast_usdt_base' : 'standard_usdt_trx') : '---',
    entry_value: isReceived ? amountBRL.toFixed(2) : amountCrypto.toFixed(2),
    entry_currency: isReceived ? 'BRL' : 'USDT',
    exit_value: isReceived ? amountCrypto.toFixed(2) : amountBRL.toFixed(2),
    exit_currency: isReceived ? 'USDT' : 'BRL',
    effective_rate: '5.08',
    base_rate: '5.08',
    wallet: status === 'completed' ? wallet : '---',
    tx_hash: status === 'completed' ? wallet : '---',
    blockchain_explorer_url: status === 'completed' ? `https://etherscan.io/tx/${wallet}` : undefined,
    state: status === 'completed' ? 'Completed' : status === 'pending' ? 'Pending' : 'Failed',
    expiration_date: isReceived ? new Date(date.getTime() + 15 * 60 * 1000).toISOString() : '---',
    expired: false,
    is_refundable: isReceived && status === 'completed' && daysAgo <= 7,
    refund_deadline: isReceived && status === 'completed' ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
  };
  
  return basePayment;
};

const generateMockPaymentsList = (params: PaymentListRequest): PaymentListResponse => {
  // Generate a pool of mock payments
  const allPayments: Payment[] = [];
  for (let i = 0; i < 73; i++) {
    const type = Math.random() > 0.6 ? 'received' : 'sent';
    const status = Math.random() > 0.9 ? 'pending' : 'completed';
    allPayments.push(generateMockPayment(i + 1, type, status));
  }
  
  // Apply type filter
  let filteredPayments = allPayments;
  if (params.type && params.type !== 'all') {
    filteredPayments = allPayments.filter(p => p.type === params.type);
  }
  
  // Apply date filter (simplified - just check if payment is within range)
  const fromDate = new Date(params.date_from);
  const toDate = new Date(params.date_to);
  filteredPayments = filteredPayments.filter(p => {
    const paymentDate = new Date(p.date);
    return paymentDate >= fromDate && paymentDate <= toDate;
  });
  
  // Sort
  const sortBy = params.sort_by || 'date';
  const sortOrder = params.sort_order || 'desc';
  filteredPayments.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'amount') {
      comparison = parseFloat(a.amount) - parseFloat(b.amount);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  // Paginate
  const totalCount = filteredPayments.length;
  const totalPages = Math.ceil(totalCount / params.limit);
  const startIndex = (params.page - 1) * params.limit;
  const endIndex = startIndex + params.limit;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
  
  return {
    payments: paginatedPayments,
    pagination: {
      current_page: params.page,
      total_pages: totalPages,
      total_count: totalCount,
      per_page: params.limit,
    },
  };
};

/**
 * Query: List payments with pagination and filters
 * Endpoint: GET /api/payments/list
 * Category: B (60s polling when idle)
 */
export async function queryPaymentsList(
  params: PaymentListRequest,
  options?: QueryOptions
): Promise<PaymentListResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockPaymentsList(params);
  }

  const url = new URL(`${getAPIBaseURL()}/api/payments/list`);
  url.searchParams.set('date_from', params.date_from);
  url.searchParams.set('date_to', params.date_to);
  if (params.type) url.searchParams.set('type', params.type);
  url.searchParams.set('page', String(params.page));
  url.searchParams.set('limit', String(params.limit));
  if (params.sort_by) url.searchParams.set('sort_by', params.sort_by);
  if (params.sort_order) url.searchParams.set('sort_order', params.sort_order);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch payments list: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Search for a payment by identifier
 * Endpoint: GET /api/payments/search
 * Category: B (on-demand)
 */
export async function queryPaymentSearch(
  params: PaymentSearchRequest,
  options?: QueryOptions
): Promise<PaymentSearchResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Generate mock payments and search
    const mockData = generateMockPaymentsList({
      date_from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      date_to: new Date().toISOString(),
      page: 1,
      limit: 100,
    });
    
    const query = params.query.toLowerCase();
    const found = mockData.payments.find(p => 
      p.id.toLowerCase().includes(query) ||
      p.external_id.toLowerCase().includes(query) ||
      p.client_id.includes(query) ||
      p.tx_hash.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query) ||
      p.wallet.toLowerCase().includes(query)
    );
    
    return {
      found: !!found,
      payment: found,
    };
  }

  const url = new URL(`${getAPIBaseURL()}/api/payments/search`);
  url.searchParams.set('query', params.query);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to search payment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get full payment details
 * Endpoint: GET /api/payments/details/{payment_id}
 * Category: B (on-demand - modal open)
 */
export async function queryPaymentDetails(
  payment_id: string,
  options?: QueryOptions
): Promise<Payment> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Try to find in mock data, otherwise generate one
    const mockData = generateMockPaymentsList({
      date_from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      date_to: new Date().toISOString(),
      page: 1,
      limit: 100,
    });
    
    const found = mockData.payments.find(p => p.id === payment_id);
    if (found) return found;
    
    // Generate a mock payment if not found
    return generateMockPayment(1, 'received', 'completed');
  }

  const url = new URL(`${getAPIBaseURL()}/api/payments/details/${payment_id}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch payment details: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// REPUTATION STATEMENT
// ============================================================================

export interface ReputationData {
  period: string;
  totalTransactions: number;
  totalVolume: string;
  currency: string;
  successRate: string; // Percentage
  averageTransactionTime: string; // e.g., "2.5 min"
  disputeRate: string; // Percentage
}

const generateMockReputationData = (): ReputationData => ({
  period: 'Last 30 days',
  totalTransactions: 1234,
  totalVolume: '450,892.35',
  currency: 'BRL',
  successRate: '99.2%',
  averageTransactionTime: '2.5 min',
  disputeRate: '0.3%',
});

export async function queryReputationStatement(
  params?: DateRangeParams,
  options?: QueryOptions
): Promise<ReputationData> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 220));
    return generateMockReputationData();
  }

  const url = new URL(`${getAPIBaseURL()}/reputation/statement`);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch reputation statement: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// WITHDRAWAL ACCOUNTS DATA
// ============================================================================

export interface WithdrawalAccount {
  id: string;
  currency_code: string;
  network: string;
  balance_available: string;
  balance_locked: string;
  internal_code: string;
}

const generateMockWithdrawalAccounts = (): WithdrawalAccount[] => [
  {
    id: 'acc_001',
    currency_code: 'USDT',
    network: 'TRX',
    balance_available: '12,480.90',
    balance_locked: '1,200.00',
    internal_code: 'ACC-USDT-TRX-001',
  },
  {
    id: 'acc_002',
    currency_code: 'USDC',
    network: 'SOL',
    balance_available: '8,320.45',
    balance_locked: '0.00',
    internal_code: 'ACC-USDC-SOL-002',
  },
  {
    id: 'acc_003',
    currency_code: 'BRL',
    network: 'PIX',
    balance_available: '45,892.35',
    balance_locked: '2,100.00',
    internal_code: 'ACC-BRL-PIX-001',
  },
];

export async function queryWithdrawalAccounts(
  options?: QueryOptions
): Promise<WithdrawalAccount[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return generateMockWithdrawalAccounts();
  }

  const response = await fetch(`${getAPIBaseURL()}/withdrawal/accounts`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch withdrawal accounts: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// USERS / TEAM MANAGEMENT
// ============================================================================

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'analyst';
  status: 'active' | 'inactive';
  avatar?: string;
  lastLogin?: string; // ISO date
  createdAt: string; // ISO date
}

const generateMockUsers = (): TeamUser[] => [
  {
    id: '1',
    name: 'Alex Morgan',
    email: 'alex@example.com',
    role: 'admin',
    status: 'active',
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    role: 'operator',
    status: 'active',
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-03-20').toISOString(),
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    role: 'analyst',
    status: 'active',
    lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-06-10').toISOString(),
  },
  {
    id: '4',
    name: 'Emma Davis',
    email: 'emma@example.com',
    role: 'operator',
    status: 'inactive',
    createdAt: new Date('2024-02-28').toISOString(),
  },
];

export async function queryTeamUsers(
  params?: { role?: string; status?: string } & PaginationParams,
  options?: QueryOptions
): Promise<TeamUser[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    let users = generateMockUsers();
    
    if (params?.role) {
      users = users.filter(u => u.role === params.role);
    }
    if (params?.status) {
      users = users.filter(u => u.status === params.status);
    }
    
    return users;
  }

  const url = new URL(`${getAPIBaseURL()}/team/users`);
  if (params?.role) url.searchParams.set('role', params.role);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.offset) url.searchParams.set('offset', params.offset.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch team users: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// STATEMENT TRANSACTIONS
// ============================================================================

export interface StatementTransaction {
  id: string;
  date: string; // ISO date
  description: string;
  type: 'debit' | 'credit';
  amount: string;
  currency: string;
  balance: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

const generateMockStatementTransactions = (): StatementTransaction[] => [
  {
    id: 'stmt_001',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    description: 'Payment received - Invoice #12345',
    type: 'credit',
    amount: '5,420.00',
    currency: 'BRL',
    balance: '48,920.35',
    status: 'completed',
    reference: 'INV-12345',
  },
  {
    id: 'stmt_002',
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    description: 'Withdrawal to TRx7KWf3...KpXs',
    type: 'debit',
    amount: '2,100.00',
    currency: 'USDT',
    balance: '10,380.90',
    status: 'completed',
    reference: 'WD-789',
  },
  {
    id: 'stmt_003',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    description: 'Payment received - Customer #4521',
    type: 'credit',
    amount: '1,850.00',
    currency: 'BRL',
    balance: '43,500.35',
    status: 'completed',
  },
  {
    id: 'stmt_004',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Fee deduction - Monthly',
    type: 'debit',
    amount: '125.50',
    currency: 'BRL',
    balance: '41,650.35',
    status: 'completed',
  },
  {
    id: 'stmt_005',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Payment received - Invoice #12340',
    type: 'credit',
    amount: '8,200.00',
    currency: 'BRL',
    balance: '41,775.85',
    status: 'completed',
    reference: 'INV-12340',
  },
];

export async function queryStatementTransactions(
  params?: {
    dateRange?: DateRangeParams;
    currency?: string;
    type?: 'debit' | 'credit';
  } & PaginationParams,
  options?: QueryOptions
): Promise<StatementTransaction[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    let transactions = generateMockStatementTransactions();
    
    if (params?.currency) {
      transactions = transactions.filter(t => t.currency === params.currency);
    }
    if (params?.type) {
      transactions = transactions.filter(t => t.type === params.type);
    }
    
    return transactions;
  }

  const url = new URL(`${getAPIBaseURL()}/statement/transactions`);
  if (params?.currency) url.searchParams.set('currency', params.currency);
  if (params?.type) url.searchParams.set('type', params.type);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.offset) url.searchParams.set('offset', params.offset.toString());
  if (params?.dateRange) {
    url.searchParams.set('from', params.dateRange.from);
    url.searchParams.set('to', params.dateRange.to);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch statement transactions: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// STATEMENT (Financial Ledger) - New API Contract
// ============================================================================

export interface StatementEntry {
  id: string;
  date: string;
  debit: number;
  credit: number;
  balance_before: number;
  resulting_balance: number;
  currency: string;
  info: string;
  account: string;
  account_id: string;
  linked_transaction_id?: string | null;
  linked_transaction_type?: string;
  category: string;
  reconciliation_status: string;
  created_at: string;
}

export interface StatementListResponse {
  entries: StatementEntry[];
  summary: {
    total_debits: number;
    total_credits: number;
    net_change: number;
    starting_balance: number;
    ending_balance: number;
    currency: string;
  };
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface StatementSearchResponse {
  found: boolean;
  entry?: StatementEntry;
}

export interface StatementAccount {
  account_id: string;
  account_name: string;
  currency: string;
  current_balance: number;
  account_type: string;
}

export interface StatementAccountsResponse {
  accounts: StatementAccount[];
}

// Mock data generator for statement entries
const generateMockStatementEntries = (): StatementEntry[] => {
  const now = Date.now();
  return [
    {
      id: 'stmt_001',
      date: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      debit: 0,
      credit: 15000,
      balance_before: 50000,
      resulting_balance: 65000,
      currency: 'BRL',
      info: 'Payment received from Customer ABC - Invoice #12345',
      account: 'BRL Main Account',
      account_id: 'acc_brl_001',
      linked_transaction_id: 'tx_001',
      linked_transaction_type: 'payment_in',
      category: 'payment_received',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_002',
      date: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      debit: 2500,
      credit: 0,
      balance_before: 52500,
      resulting_balance: 50000,
      currency: 'BRL',
      info: 'Withdrawal to USDT wallet - 0x742d...a94f',
      account: 'BRL Main Account',
      account_id: 'acc_brl_001',
      linked_transaction_id: 'wd_001',
      linked_transaction_type: 'withdrawal',
      category: 'withdrawal',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_003',
      date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 0,
      credit: 8750,
      balance_before: 43750,
      resulting_balance: 52500,
      currency: 'BRL',
      info: 'PIX payment received - E2E: E18236120202012041234567890AB',
      account: 'BRL Main Account',
      account_id: 'acc_brl_001',
      linked_transaction_id: 'tx_002',
      linked_transaction_type: 'payment_in',
      category: 'payment_received',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_004',
      date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 150,
      credit: 0,
      balance_before: 43900,
      resulting_balance: 43750,
      currency: 'BRL',
      info: 'Transaction fee - Payment processing',
      account: 'BRL Main Account',
      account_id: 'acc_brl_001',
      linked_transaction_id: null,
      linked_transaction_type: 'fee',
      category: 'fee_processing',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_005',
      date: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 0,
      credit: 25000,
      balance_before: 18900,
      resulting_balance: 43900,
      currency: 'BRL',
      info: 'Bulk payment received from Partner XYZ',
      account: 'BRL Main Account',
      account_id: 'acc_brl_001',
      linked_transaction_id: 'tx_003',
      linked_transaction_type: 'payment_in',
      category: 'payment_received',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_006',
      date: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 5000,
      credit: 0,
      balance_before: 23900,
      resulting_balance: 18900,
      currency: 'USD',
      info: 'Withdrawal request - Account ending in 4567',
      account: 'USD Account',
      account_id: 'acc_usd_001',
      linked_transaction_id: 'wd_002',
      linked_transaction_type: 'withdrawal',
      category: 'withdrawal',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_007',
      date: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 0,
      credit: 12000,
      balance_before: 11900,
      resulting_balance: 23900,
      currency: 'BRL',
      info: 'Payment received - Order #ORD-9876',
      account: 'BRL Main Account',
      account_id: 'acc_brl_001',
      linked_transaction_id: 'tx_004',
      linked_transaction_type: 'payment_in',
      category: 'payment_received',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_008',
      date: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 300,
      credit: 0,
      balance_before: 12200,
      resulting_balance: 11900,
      currency: 'BRL',
      info: 'Monthly service fee',
      account: 'BRL Main Account',
      account_id: 'acc_brl_001',
      linked_transaction_id: null,
      linked_transaction_type: 'fee',
      category: 'fee_monthly',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_009',
      date: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 0,
      credit: 3500,
      balance_before: 8700,
      resulting_balance: 12200,
      currency: 'USDC',
      info: 'Refund processed - Transaction #TX-1122',
      account: 'USDC Account',
      account_id: 'acc_usdc_001',
      linked_transaction_id: 'rf_001',
      linked_transaction_type: 'refund',
      category: 'refund_received',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_010',
      date: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 1000,
      credit: 0,
      balance_before: 9700,
      resulting_balance: 8700,
      currency: 'BRL',
      info: 'Withdrawal to PIX - Key: email@example.com',
      account: 'BRL Main Account',
      account_id: 'acc_brl_001',
      linked_transaction_id: 'wd_003',
      linked_transaction_type: 'withdrawal',
      category: 'withdrawal',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_011',
      date: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 0,
      credit: 7200,
      balance_before: 2500,
      resulting_balance: 9700,
      currency: 'USD',
      info: 'Payment received - Invoice #INV-5544',
      account: 'USD Account',
      account_id: 'acc_usd_001',
      linked_transaction_id: 'tx_005',
      linked_transaction_type: 'payment_in',
      category: 'payment_received',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'stmt_012',
      date: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
      debit: 450,
      credit: 0,
      balance_before: 2950,
      resulting_balance: 2500,
      currency: 'USDC',
      info: 'International transfer fee',
      account: 'USDC Account',
      account_id: 'acc_usdc_001',
      linked_transaction_id: null,
      linked_transaction_type: 'fee',
      category: 'fee_network',
      reconciliation_status: 'reconciled',
      created_at: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

/**
 * Query: Get statement list with filters
 * Category B - Soft refresh 60s
 */
export async function queryStatementList(
  params: {
    date_from: string;
    date_to: string;
    direction: 'all' | 'incoming' | 'outgoing';
    account: string;
    page: number;
    limit: number;
    sort_by: string;
    sort_order: 'asc' | 'desc';
  },
  options?: QueryOptions
): Promise<StatementListResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let entries = generateMockStatementEntries();
    
    // Apply direction filter
    if (params.direction === 'incoming') {
      entries = entries.filter(e => e.credit > e.debit);
    } else if (params.direction === 'outgoing') {
      entries = entries.filter(e => e.debit > e.credit);
    }
    
    // Apply account filter
    if (params.account !== 'all') {
      entries = entries.filter(e => e.account_id === params.account);
    }
    
    // Apply date filter
    const fromDate = new Date(params.date_from);
    const toDate = new Date(params.date_to);
    entries = entries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= fromDate && entryDate <= toDate;
    });
    
    // Sort
    if (params.sort_order === 'desc') {
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    // Calculate summary
    const total_debits = entries.reduce((sum, e) => sum + e.debit, 0);
    const total_credits = entries.reduce((sum, e) => sum + e.credit, 0);
    
    // Paginate
    const total = entries.length;
    const totalPages = Math.ceil(total / params.limit);
    const start = (params.page - 1) * params.limit;
    const paginatedEntries = entries.slice(start, start + params.limit);
    
    return {
      entries: paginatedEntries,
      summary: {
        total_debits,
        total_credits,
        net_change: total_credits - total_debits,
        starting_balance: entries.length > 0 ? entries[entries.length - 1].balance_before : 0,
        ending_balance: entries.length > 0 ? entries[0].resulting_balance : 0,
        currency: 'BRL',
      },
      pagination: {
        current_page: params.page,
        total_pages: totalPages,
        total_count: total,
        per_page: params.limit,
      },
    };
  }

  const response = await fetch(`${getAPIBaseURL()}/statement/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch statement list: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Search statement by ID
 * Category B - On-demand
 */
export async function queryStatementSearch(
  params: {
    query: string;
  },
  options?: QueryOptions
): Promise<StatementSearchResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const entries = generateMockStatementEntries();
    const found = entries.find(e => e.id.toLowerCase() === params.query.toLowerCase());
    
    if (found) {
      return { found: true, entry: found };
    }
    return { found: false };
  }

  const url = new URL(`${getAPIBaseURL()}/statement/search`);
  url.searchParams.set('query', params.query);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to search statement: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query: Get accounts list
 * Category C - Load once
 */
export async function queryStatementAccounts(
  options?: QueryOptions
): Promise<StatementAccountsResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      accounts: [
        {
          account_id: 'acc_brl_001',
          account_name: 'BRL Main Account',
          currency: 'BRL',
          current_balance: 65000,
          account_type: 'main',
        },
        {
          account_id: 'acc_usd_001',
          account_name: 'USD Account',
          currency: 'USD',
          current_balance: 12500,
          account_type: 'secondary',
        },
        {
          account_id: 'acc_usdc_001',
          account_name: 'USDC Account',
          currency: 'USDC',
          current_balance: 8700,
          account_type: 'crypto',
        },
      ],
    };
  }

  const response = await fetch(`${getAPIBaseURL()}/statement/accounts`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch statement accounts: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// REPUTATION RECORDS
// ============================================================================

export interface ReputationRecord {
  id: string;
  date: string; // ISO date
  event: string;
  score: number;
  impact: 'positive' | 'neutral' | 'negative';
  category: string;
  description?: string;
}

const generateMockReputationRecords = (): ReputationRecord[] => [
  {
    id: 'REP-001',
    date: new Date('2024-12-15T10:30:00Z').toISOString(),
    event: 'Successful Payment',
    score: 5,
    impact: 'positive',
    category: 'Payment',
    description: 'Payment completed within SLA',
  },
  {
    id: 'REP-002',
    date: new Date('2024-12-14T15:20:00Z').toISOString(),
    event: 'Dispute Resolved',
    score: 10,
    impact: 'positive',
    category: 'Customer Service',
    description: 'Dispute resolved in favor of merchant',
  },
  {
    id: 'REP-003',
    date: new Date('2024-12-13T09:45:00Z').toISOString(),
    event: 'Failed Transaction',
    score: -3,
    impact: 'negative',
    category: 'Payment',
    description: 'Transaction failed due to insufficient funds',
  },
  {
    id: 'REP-004',
    date: new Date('2024-12-12T14:00:00Z').toISOString(),
    event: 'High Volume Day',
    score: 15,
    impact: 'positive',
    category: 'Volume',
    description: 'Processed over 1000 transactions',
  },
];

export async function queryReputationRecords(
  params?: {
    dateRange?: DateRangeParams;
    category?: string;
    impact?: 'positive' | 'neutral' | 'negative';
  } & PaginationParams,
  options?: QueryOptions
): Promise<ReputationRecord[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 220));
    let records = generateMockReputationRecords();
    
    if (params?.category) {
      records = records.filter(r => r.category === params.category);
    }
    if (params?.impact) {
      records = records.filter(r => r.impact === params.impact);
    }
    
    return records;
  }

  const url = new URL(`${getAPIBaseURL()}/reputation/records`);
  if (params?.category) url.searchParams.set('category', params.category);
  if (params?.impact) url.searchParams.set('impact', params.impact);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.offset) url.searchParams.set('offset', params.offset.toString());
  if (params?.dateRange) {
    url.searchParams.set('from', params.dateRange.from);
    url.searchParams.set('to', params.dateRange.to);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch reputation records: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generic query wrapper with error handling and auth token injection
 */
export async function executeQuery<T>(
  queryFn: (options?: QueryOptions) => Promise<T>,
  getAuthToken?: () => Promise<string | undefined>
): Promise<T> {
  try {
    const headers: Record<string, string> = {};
    
    if (getAuthToken && !isMockMode()) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return await queryFn({ headers });
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
}

/**
 * Check if mock mode is enabled
 */
export function getMockModeInfo() {
  return {
    enabled: isMockMode(),
    apiBaseUrl: getAPIBaseURL(),
    environment: getEnvironment(),
  };
}