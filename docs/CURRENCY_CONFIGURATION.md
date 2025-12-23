# Centralized Currency Configuration

## Overview

All currency and network information is centralized in `/src/app/config/currencies.ts`. This ensures consistency across dropdowns, API calls, and display logic throughout the application.

## Currency Data Structure

```typescript
interface CurrencyConfig {
  currency_code: string;      // API identifier (e.g., "TRX_USDT_S2UZ")
  pretty_name: string;         // User-friendly display (e.g., "USDT (TRX)")
  currency: string;            // Base currency (e.g., "USDT")
  network: string;             // Network name (e.g., "Tron")
  is_fiat?: boolean;          // True for BRL, false for crypto
}
```

## Supported Currencies

| currency_code | pretty_name | currency | network |
|---------------|-------------|----------|---------|
| `BRL` | BRL | BRL | PIX |
| `TRX_USDT_S2UZ` | USDT (TRX) | USDT | Tron |
| `USDT_ERC20` | USDT (ERC-20) | USDT | Ethereum |
| `USDT2_AVAX` | USDT (AVAX C-Chain) | USDT | Avalanche C-Chain |
| `USDT_TON` | USDT (TON) | USDT | Ton |
| `SOL_USDT_EWAY` | USDT (SOL) | USDT | Solana |
| `USDC` | USDC (ERC-20) | USDC | Ethereum |
| `SOL_USDC_PTHX` | USDC (SOL) | USDC | Solana |
| `USDC_AVAX` | USDC (AVAX) | USDC | Avalanche C-Chain |
| `USDC_BASECHAIN_ETH_5I5C` | USDC (Base) | USDC | Base |
| `USDC_POLYGON_NXTB` | USDC (Polygon) | USDC | Polygon |
| `BTC` | Bitcoin | BTC | Bitcoin |

## Helper Functions

### Basic Lookups

```typescript
// Get full currency config by currency_code
getCurrencyByCode('TRX_USDT_S2UZ')
// Returns: { currency_code: 'TRX_USDT_S2UZ', pretty_name: 'USDT (TRX)', currency: 'USDT', network: 'Tron' }

// Format currency for display
formatCurrency('TRX_USDT_S2UZ')
// Returns: "USDT (TRX)"

// Get network for a currency_code
getNetworkForCode('USDT_ERC20')
// Returns: "Ethereum"

// Get base currency
getBaseCurrencyForCode('SOL_USDC_PTHX')
// Returns: "USDC"
```

### Filtering

```typescript
// Get all variants of a base currency
getCurrenciesByBaseCurrency('USDT')
// Returns: Array of all USDT variants (TRX, ETH, SOL, AVAX, TON)

// Get all crypto currencies (exclude fiat)
getCryptoCurrencies()
// Returns: All currencies except BRL

// Get all fiat currencies
getFiatCurrencies()
// Returns: [BRL]

// Get unique base currencies
getUniqueCurrencies()
// Returns: ['BRL', 'USDT', 'USDC', 'BTC']

// Get all networks for a base currency
getNetworksForCurrency('USDT')
// Returns: ['Tron', 'Ethereum', 'Avalanche C-Chain', 'Ton', 'Solana']
```

### Reverse Lookup

```typescript
// Get currency_code from base currency + network
getCurrencyCodeByPair('USDT', 'Tron')
// Returns: "TRX_USDT_S2UZ"

getCurrencyCodeByPair('USDC', 'Base')
// Returns: "USDC_BASECHAIN_ETH_5I5C"
```

### Validation

```typescript
// Check if currency_code is valid
isValidCurrencyCode('TRX_USDT_S2UZ')
// Returns: true

// Check if currency is stablecoin
isStablecoin('USDC')
// Returns: true

// Check if currency is BRL
isBRL('BRL')
// Returns: true

// Check if currency is Bitcoin
isBitcoin('BTC')
// Returns: true
```

### Grouped Data

```typescript
// Get currencies grouped by base currency (for grouped selects)
getCurrenciesGroupedByBase()
// Returns:
// {
//   'BRL': [{ currency_code: 'BRL', ... }],
//   'USDT': [{ currency_code: 'TRX_USDT_S2UZ', ... }, { currency_code: 'USDT_ERC20', ... }, ...],
//   'USDC': [{ currency_code: 'USDC', ... }, { currency_code: 'SOL_USDC_PTHX', ... }, ...],
//   'BTC': [{ currency_code: 'BTC', ... }]
// }

// Get all USDT currency codes (quick filtering)
getUSDTCurrencyCodes()
// Returns: ['TRX_USDT_S2UZ', 'USDT_ERC20', 'USDT2_AVAX', 'USDT_TON', 'SOL_USDT_EWAY']

// Get all USDC currency codes
getUSDCCurrencyCodes()
// Returns: ['USDC', 'SOL_USDC_PTHX', 'USDC_AVAX', 'USDC_BASECHAIN_ETH_5I5C', 'USDC_POLYGON_NXTB']
```

## Usage Examples

### Dropdown: Select Account (Withdrawal Form)

```tsx
import { getCurrencyByCode } from '../../config/currencies';

// Display pretty_name but submit currency_code
<Select value={selectedAccount} onValueChange={setSelectedAccount}>
  {accountsData.map((account) => {
    const currencyInfo = getCurrencyByCode(account.currency_code);
    
    return (
      <SelectItem key={account.id} value={account.id}>
        {currencyInfo?.pretty_name} · Balance: {account.balance}
      </SelectItem>
    );
  })}
</Select>
```

### Dropdown: Select Currency + Network (Whitelist Form)

```tsx
import { getUniqueCurrencies, getNetworksForCurrency, getCurrencyCodeByPair } from '../../config/currencies';

const [selectedCurrency, setSelectedCurrency] = useState('');
const [selectedNetwork, setSelectedNetwork] = useState('');

// Currency dropdown
<Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
  {getUniqueCurrencies().filter(c => c !== 'BRL').map((currency) => (
    <SelectItem key={currency} value={currency}>
      {currency}
    </SelectItem>
  ))}
</Select>

// Network dropdown (depends on selected currency)
<Select value={selectedNetwork} onValueChange={setSelectedNetwork} disabled={!selectedCurrency}>
  {getNetworksForCurrency(selectedCurrency).map((network) => (
    <SelectItem key={network} value={network}>
      {network}
    </SelectItem>
  ))}
</Select>

// On form submit, convert to currency_code
const handleSubmit = () => {
  const currency_code = getCurrencyCodeByPair(selectedCurrency, selectedNetwork);
  // Send currency_code to API: "TRX_USDT_S2UZ"
};
```

### Filter Wallets by Network

```tsx
import { getCurrencyByCode } from '../../config/currencies';

const selectedCurrency = getCurrencyByCode(selectedAccount);

const filteredWallets = whitelistedWallets.filter(
  (wallet) => wallet.network === selectedCurrency?.network
);
```

### Display Currency in Tables

```tsx
import { formatCurrency } from '../../config/currencies';

<TableCell>
  {formatCurrency(transaction.currency_code)}
  {/* Displays: "USDT (TRX)" instead of "TRX_USDT_S2UZ" */}
</TableCell>
```

## API Integration

### Request Payloads

**Always send `currency_code` to the API**, not `pretty_name`:

```typescript
// ✅ CORRECT
POST /api/whitelist/address/add
{
  "currency_code": "TRX_USDT_S2UZ",  // API expects this
  "address": "TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX",
  "groupId": "group-1"
}

// ❌ INCORRECT
POST /api/whitelist/address/add
{
  "currency": "USDT",               // Too vague (which network?)
  "network": "TRX",                 // Don't send separately
  "pretty_name": "USDT (TRX)"       // Never send pretty_name
}
```

### Response Payloads

**API returns `currency_code`, frontend displays `pretty_name`**:

```typescript
// API response
{
  "accounts": [
    {
      "id": "acc_123",
      "currency_code": "TRX_USDT_S2UZ",  // API returns this
      "balance": "12480.90"
    }
  ]
}

// Frontend display
import { formatCurrency } from '../../config/currencies';

const displayName = formatCurrency(account.currency_code);
// Shows: "USDT (TRX)"
```

## Adding New Currencies

To add a new currency (e.g., USDT on Arbitrum):

1. Add entry to `CURRENCIES` array in `/src/app/config/currencies.ts`:

```typescript
{
  currency_code: 'USDT_ARBITRUM',
  pretty_name: 'USDT (Arbitrum)',
  currency: 'USDT',
  network: 'Arbitrum',
}
```

2. No changes needed in components (they automatically pick up new currency)
3. Update API to handle new `currency_code`
4. Update network mapping for wallet addresses (if new network type)

## Network Mappings

Network names must match exactly between:
- Currency config (`network` field)
- Whitelisted wallet addresses (`network` field)
- Withdrawal form filtering logic

### Tron
- **Network name:** `Tron` (or `TRX` for short form)
- **Address format:** Base58, starts with 'T', 34 characters
- **Example:** `TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX`

### Ethereum
- **Network name:** `Ethereum` (or `ETH` for short form)
- **Address format:** Hexadecimal, starts with '0x', 42 characters
- **Example:** `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

### Solana
- **Network name:** `Solana` (or `SOL` for short form)
- **Address format:** Base58, 32-44 characters
- **Example:** `9wFFyRfZBsuAHA4YcuxcXLKwMxJR43S7fF97mUn7fEVp`

### Other Networks
- **Base:** Ethereum-compatible (same address format as ETH)
- **Polygon:** Ethereum-compatible (same address format as ETH)
- **Avalanche C-Chain:** Ethereum-compatible (same address format as ETH)
- **Ton:** Base64-like encoding
- **Bitcoin:** Base58 or Bech32

## Best Practices

### ✅ DO

- **Always use `currency_code`** in API requests/responses
- **Display `pretty_name`** to users in UI
- **Use helper functions** instead of hardcoding currency lists
- **Centralize** all currency logic in `/src/app/config/currencies.ts`
- **Import** currency config in components that need it

### ❌ DON'T

- **Don't** hardcode currency/network lists in components
- **Don't** send `pretty_name` to API
- **Don't** create duplicate currency configs in different files
- **Don't** use string concatenation like `${currency}-${network}` (use `getCurrencyCodeByPair`)
- **Don't** assume network names (use `getNetworkForCode`)

## Migration Guide

If you have old code using custom formats like `"usdt-trx"` or `"USDT-ETH"`:

### Before (❌ Old way)

```typescript
const account = {
  id: 'usdt-trx',
  currency: 'USDT',
  network: 'TRX',
  balance: '12480.90'
};

// Send to API
POST /api/withdrawals/request
{
  "account_id": "usdt-trx"  // Custom format
}
```

### After (✅ New way)

```typescript
import { getCurrencyByCode } from '../../config/currencies';

const account = {
  id: 'TRX_USDT_S2UZ',        // Use actual currency_code
  currency_code: 'TRX_USDT_S2UZ',
  balance: '12480.90'
};

const currencyInfo = getCurrencyByCode(account.currency_code);
// Display: currencyInfo.pretty_name = "USDT (TRX)"

// Send to API
POST /api/withdrawals/request
{
  "account_id": "TRX_USDT_S2UZ"  // Official currency_code
}
```

## Testing

### Unit Tests (Recommended)

```typescript
import { getCurrencyByCode, getCurrencyCodeByPair, isStablecoin } from './currencies';

test('getCurrencyByCode returns correct config', () => {
  const result = getCurrencyByCode('TRX_USDT_S2UZ');
  expect(result?.currency).toBe('USDT');
  expect(result?.network).toBe('Tron');
});

test('getCurrencyCodeByPair returns correct code', () => {
  expect(getCurrencyCodeByPair('USDT', 'Tron')).toBe('TRX_USDT_S2UZ');
  expect(getCurrencyCodeByPair('USDC', 'Base')).toBe('USDC_BASECHAIN_ETH_5I5C');
});

test('isStablecoin identifies stablecoins', () => {
  expect(isStablecoin('TRX_USDT_S2UZ')).toBe(true);
  expect(isStablecoin('USDC')).toBe(true);
  expect(isStablecoin('BTC')).toBe(false);
  expect(isStablecoin('BRL')).toBe(false);
});
```

---

**Last Updated:** 2024-12-22  
**Maintained By:** Crossramp Engineering
