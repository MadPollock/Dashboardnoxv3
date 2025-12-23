/**
 * Centralized Currency Configuration
 * 
 * Maps API currency_code to user-friendly display names and network information.
 * All dropdowns and API calls should use this configuration for consistency.
 */

export interface CurrencyConfig {
  currency_code: string;      // API identifier (e.g., "TRX_USDT_S2UZ")
  pretty_name: string;         // User-friendly display name (e.g., "USDT (TRX)")
  currency: string;            // Base currency (e.g., "USDT")
  network: string;             // Network name (e.g., "Tron")
  is_fiat?: boolean;          // True for BRL, false for crypto
}

/**
 * Complete list of supported currencies across all networks.
 * Source of truth for the entire application.
 */
export const CURRENCIES: CurrencyConfig[] = [
  // Fiat
  {
    currency_code: 'BRL',
    pretty_name: 'BRL',
    currency: 'BRL',
    network: 'PIX',
    is_fiat: true,
  },

  // USDT variants
  {
    currency_code: 'TRX_USDT_S2UZ',
    pretty_name: 'USDT (TRX)',
    currency: 'USDT',
    network: 'Tron',
  },
  {
    currency_code: 'USDT_ERC20',
    pretty_name: 'USDT (ERC-20)',
    currency: 'USDT',
    network: 'Ethereum',
  },
  {
    currency_code: 'USDT2_AVAX',
    pretty_name: 'USDT (AVAX C-Chain)',
    currency: 'USDT',
    network: 'Avalanche C-Chain',
  },
  {
    currency_code: 'USDT_TON',
    pretty_name: 'USDT (TON)',
    currency: 'USDT',
    network: 'Ton',
  },
  {
    currency_code: 'SOL_USDT_EWAY',
    pretty_name: 'USDT (SOL)',
    currency: 'USDT',
    network: 'Solana',
  },

  // USDC variants
  {
    currency_code: 'USDC',
    pretty_name: 'USDC (ERC-20)',
    currency: 'USDC',
    network: 'Ethereum',
  },
  {
    currency_code: 'SOL_USDC_PTHX',
    pretty_name: 'USDC (SOL)',
    currency: 'USDC',
    network: 'Solana',
  },
  {
    currency_code: 'USDC_AVAX',
    pretty_name: 'USDC (AVAX)',
    currency: 'USDC',
    network: 'Avalanche C-Chain',
  },
  {
    currency_code: 'USDC_BASECHAIN_ETH_5I5C',
    pretty_name: 'USDC (Base)',
    currency: 'USDC',
    network: 'Base',
  },
  {
    currency_code: 'USDC_POLYGON_NXTB',
    pretty_name: 'USDC (Polygon)',
    currency: 'USDC',
    network: 'Polygon',
  },

  // Bitcoin
  {
    currency_code: 'BTC',
    pretty_name: 'Bitcoin',
    currency: 'BTC',
    network: 'Bitcoin',
  },
];

/**
 * Helper functions for currency operations
 */

/**
 * Get currency config by currency_code
 */
export function getCurrencyByCode(currency_code: string): CurrencyConfig | undefined {
  return CURRENCIES.find(c => c.currency_code === currency_code);
}

/**
 * Get all currencies for a specific base currency (e.g., all USDT variants)
 */
export function getCurrenciesByBaseCurrency(currency: string): CurrencyConfig[] {
  return CURRENCIES.filter(c => c.currency === currency);
}

/**
 * Get all crypto currencies (exclude fiat)
 */
export function getCryptoCurrencies(): CurrencyConfig[] {
  return CURRENCIES.filter(c => !c.is_fiat);
}

/**
 * Get all fiat currencies
 */
export function getFiatCurrencies(): CurrencyConfig[] {
  return CURRENCIES.filter(c => c.is_fiat);
}

/**
 * Get unique list of base currencies (USDT, USDC, BTC, BRL)
 */
export function getUniqueCurrencies(): string[] {
  return Array.from(new Set(CURRENCIES.map(c => c.currency)));
}

/**
 * Get all networks for a specific base currency
 */
export function getNetworksForCurrency(currency: string): string[] {
  return CURRENCIES
    .filter(c => c.currency === currency)
    .map(c => c.network);
}

/**
 * Get currency_code by base currency and network
 */
export function getCurrencyCodeByPair(currency: string, network: string): string | undefined {
  return CURRENCIES.find(c => c.currency === currency && c.network === network)?.currency_code;
}

/**
 * Check if a currency_code exists in the system
 */
export function isValidCurrencyCode(currency_code: string): boolean {
  return CURRENCIES.some(c => c.currency_code === currency_code);
}

/**
 * Format currency for display (pretty_name)
 */
export function formatCurrency(currency_code: string): string {
  return getCurrencyByCode(currency_code)?.pretty_name || currency_code;
}

/**
 * Get network name for a currency_code
 */
export function getNetworkForCode(currency_code: string): string | undefined {
  return getCurrencyByCode(currency_code)?.network;
}

/**
 * Get base currency for a currency_code
 */
export function getBaseCurrencyForCode(currency_code: string): string | undefined {
  return getCurrencyByCode(currency_code)?.currency;
}

/**
 * Group currencies by base currency for grouped select dropdowns
 */
export function getCurrenciesGroupedByBase(): Record<string, CurrencyConfig[]> {
  const grouped: Record<string, CurrencyConfig[]> = {};
  
  CURRENCIES.forEach(currency => {
    if (!grouped[currency.currency]) {
      grouped[currency.currency] = [];
    }
    grouped[currency.currency].push(currency);
  });
  
  return grouped;
}

/**
 * Get all USDT currency codes (for quick filtering)
 */
export function getUSDTCurrencyCodes(): string[] {
  return getCurrenciesByBaseCurrency('USDT').map(c => c.currency_code);
}

/**
 * Get all USDC currency codes (for quick filtering)
 */
export function getUSDCCurrencyCodes(): string[] {
  return getCurrenciesByBaseCurrency('USDC').map(c => c.currency_code);
}

/**
 * Check if currency is stablecoin
 */
export function isStablecoin(currency_code: string): boolean {
  const baseCurrency = getBaseCurrencyForCode(currency_code);
  return baseCurrency === 'USDT' || baseCurrency === 'USDC';
}

/**
 * Check if currency is BRL
 */
export function isBRL(currency_code: string): boolean {
  return currency_code === 'BRL';
}

/**
 * Check if currency is Bitcoin
 */
export function isBitcoin(currency_code: string): boolean {
  return currency_code === 'BTC';
}
