# Query Normalization - Homologation Preparation

## Overview

All queries have been centralized into `/src/app/lib/queries.ts` to prepare for homologation (testing/staging phase). This normalization ensures:

1. **Centralized data fetching** - All queries in one place
2. **Mock mode support** - Easy switching between mock data and real API
3. **Type safety** - Full TypeScript types for all data structures
4. **Consistent error handling** - Standardized approach across the app
5. **Ready for real API** - Just flip the environment variable

## Architecture

### Mock Mode Toggle

**Environment Variable:** `VITE_ENABLE_MOCK_QUERIES`
- **Default:** `true` (mock mode enabled for development/preview)
- **Production:** Set to `false` to use real API endpoints

```bash
# Development (mock data)
VITE_ENABLE_MOCK_QUERIES=true

# Production (real API)
VITE_ENABLE_MOCK_QUERIES=false
VITE_API_BASE_URL=https://api.crossramp.io/v1
```

### File Structure

```
/src/app/
├── lib/
│   ├── queries.ts          # ✅ All queries centralized here
│   └── commandClient.ts    # Commands (write actions)
├── hooks/
│   └── useQuery.ts         # ✅ React hooks for queries
└── views/
    └── TemplatesView.tsx   # ✅ Example: Updated to use centralized queries
```

## Implemented Queries

### 1. **Accounts / Balances** ✅

```typescript
queryAccounts(options?: QueryOptions): Promise<CurrencyGroup[]>
```

**Returns:** Account balances grouped by currency with transaction history
- USDT (TRX, SOL, ERC-20)
- BTC (Bitcoin)
- BRL (PIX)

**Mock Data:** 3 currency groups with multiple accounts

---

### 2. **Templates** ✅

```typescript
queryTemplates(params?: PaginationParams, options?: QueryOptions): Promise<Template[]>
queryTemplateById(templateId: string, options?: QueryOptions): Promise<Template>
```

**Returns:** Payment templates with configuration
- Name, currency, color
- Fee behavior, split configuration
- Creation date

**Mock Data:** 3 templates (Standard Checkout, Premium Split, Express Payment)

---

### 3. **Transactions / Payments** ✅

```typescript
queryTransactions(params?: {
  dateRange?: DateRangeParams;
  status?: TransactionStatus;
  type?: TransactionType;
} & PaginationParams, options?: QueryOptions): Promise<Transaction[]>
```

**Returns:** Transaction history with filters
- Type: payment_in, payment_out, withdrawal, deposit
- Status: pending, processing, completed, failed, cancelled
- Date range filtering

**Mock Data:** 3 sample transactions

---

### 4. **Whitelist** ✅

```typescript
queryWhitelist(params?: {
  type?: 'pix' | 'wallet';
} & PaginationParams, options?: QueryOptions): Promise<WhitelistEntry[]>
```

**Returns:** Whitelisted addresses (PIX keys and crypto wallets)
- PIX addresses (email, phone, CPF)
- Crypto wallets (USDT, USDC, BTC with network info)

**Mock Data:** 2 whitelist entries

---

### 5. **Disputes** ✅

```typescript
queryDisputes(params?: {
  status?: DisputeStatus;
} & PaginationParams, options?: QueryOptions): Promise<Dispute[]>
```

**Returns:** Customer disputes with status tracking
- Status: open, investigating, resolved, closed
- Transaction link, customer info
- Creation and resolution dates

**Mock Data:** 1 active dispute

---

### 6. **API Keys** ✅

```typescript
queryAPIKeys(params?: {
  environment?: 'live' | 'test';
}, options?: QueryOptions): Promise<APIKey[]>
```

**Returns:** Developer API keys
- Masked keys (sk_live_abc...xyz)
- Environment (live/test)
- Permissions, last used date

**Mock Data:** 2 API keys (1 live, 1 test)

---

### 7. **Security / MFA** ✅

```typescript
queryMFAStatus(options?: QueryOptions): Promise<MFAInfo>
```

**Returns:** MFA activation status
- Status: not_activated, pending, active
- Activation date, last used

**Mock Data:** MFA not activated

---

### 8. **Company Profile / KYC** ✅

```typescript
queryCompanyProfile(options?: QueryOptions): Promise<CompanyProfile>
```

**Returns:** Company information and KYC status
- Company name, CNPJ, contact info
- Address details
- KYC status: not_started, pending, approved, rejected

**Mock Data:** Approved company profile

---

### 9. **Analytics / Reports** ✅

```typescript
queryPaymentsOverview(params: DateRangeParams, options?: QueryOptions): Promise<ChartDataPoint[]>
queryVolumeOverview(params: DateRangeParams, options?: QueryOptions): Promise<ChartDataPoint[]>
queryConversionRates(params: DateRangeParams, options?: QueryOptions): Promise<ChartDataPoint[]>
queryFees(params: DateRangeParams, options?: QueryOptions): Promise<ChartDataPoint[]>
```

**Returns:** Time-series data for analytics charts
- Payments by type (PIX, USDT, USDC)
- Transaction volume over time
- Conversion rates
- Fee collection

**Mock Data:** Generated based on date range

---

### 10. **Reputation Statement** ✅

```typescript
queryReputationStatement(params?: DateRangeParams, options?: QueryOptions): Promise<ReputationData>
```

**Returns:** Merchant reputation metrics
- Total transactions, volume
- Success rate, average transaction time
- Dispute rate

**Mock Data:** Last 30 days metrics

---

### 11. **Withdrawal Accounts** ✅

```typescript
queryWithdrawalAccounts(options?: QueryOptions): Promise<WithdrawalAccount[]>
```

**Returns:** Accounts available for withdrawals
- Currency, network
- Available and locked balances
- Internal account codes

**Mock Data:** 3 withdrawal accounts (USDT/TRX, USDC/SOL, BRL/PIX)

---

## React Hooks

### `useQuery` Hook

Simple hook for loading data with loading/error states:

```typescript
import { useQuery } from '../hooks/useQuery';
import { queryTemplates } from '../lib/queries';

function MyComponent() {
  const { data, loading, error, refetch } = useQuery(queryTemplates);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data?.map(template => (
        <div key={template.id}>{template.name}</div>
      ))}
    </div>
  );
}
```

**Features:**
- Automatic auth token injection
- Loading and error states
- Manual refetch function
- Auto-refetch interval support

---

### `useQueryWithDeps` Hook

Hook for queries that depend on parameters:

```typescript
import { useQueryWithDeps } from '../hooks/useQuery';
import { queryTransactions } from '../lib/queries';

function TransactionsList({ status, dateRange }) {
  const { data, loading, error } = useQueryWithDeps(
    queryTransactions,
    { status, dateRange },
    [status, dateRange] // Dependencies
  );
  
  // Component logic...
}
```

---

### `usePaginatedQuery` Hook

Hook with built-in pagination support:

```typescript
import { usePaginatedQuery } from '../hooks/useQuery';
import { queryTemplates } from '../lib/queries';

function PaginatedTemplates() {
  const { 
    data, 
    loading, 
    page, 
    setPage, 
    hasNextPage, 
    hasPrevPage 
  } = usePaginatedQuery(queryTemplates, {
    page: 1,
    limit: 10
  });
  
  // Render with pagination controls...
}
```

---

## Migration Example: TemplatesView

**Before (Hardcoded Mock Data):**

```typescript
export function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      name: 'Standard Checkout',
      currency_code: 'BRL',
      // ... hardcoded data
    },
  ]);
  
  // ... component logic
}
```

**After (Centralized Query):**

```typescript
import { useQuery } from '../hooks/useQuery';
import { queryTemplates } from '../lib/queries';

export function TemplatesView() {
  // Fetch from centralized query system
  const { data: templatesData, loading, error, refetch } = useQuery(queryTemplates);
  
  // Convert ISO dates to Date objects for local use
  const templates: Template[] = React.useMemo(() => {
    if (!templatesData) return [];
    return templatesData.map(t => ({
      ...t,
      createdAt: new Date(t.createdAt),
    }));
  }, [templatesData]);
  
  // After create/delete operations, call refetch()
  const handleCreate = async () => {
    // await createTemplateCommand(...);
    refetch(); // Reload data from query
  };
}
```

---

## Next Steps for Homologation

### 1. **Update All Views** (In Progress)

Update remaining views to use centralized queries:

- [ ] AccountsView (Balances) - Update to use `queryAccounts`
- [ ] TransactionsView - Update to use `queryTransactions`
- [ ] WhitelistView - Update to use `queryWhitelist`
- [ ] DisputesView - Update to use `queryDisputes`
- [ ] APIIntegrationView - Update to use `queryAPIKeys`
- [ ] SecurityView - Update to use `queryMFAStatus`
- [ ] CompanyProfileView - Update to use `queryCompanyProfile`
- [ ] Analytics components - Update to use analytics queries
- [ ] WithdrawView - Update to use `queryWithdrawalAccounts`

### 2. **Backend API Integration**

When real backend is ready:

```bash
# Set environment variables
VITE_ENABLE_MOCK_QUERIES=false
VITE_API_BASE_URL=https://api-staging.crossramp.io/v1

# Or for production
VITE_API_BASE_URL=https://api.crossramp.io/v1
```

No code changes needed - queries automatically switch to real API!

### 3. **API Contract Validation**

Ensure backend API responses match TypeScript interfaces in `queries.ts`:

```typescript
// Example: Template response from backend must match
interface Template {
  id: string;
  name: string;
  currency_code: string;
  color: string;
  feeBehavior: string;
  extraPercentageFees: string;
  extraFlatFees: string;
  createdAt: string; // ISO date
}
```

### 4. **Error Handling**

All queries throw errors that can be caught:

```typescript
const { data, error } = useQuery(queryTemplates);

if (error) {
  // Show error toast or fallback UI
  toast.error(`Failed to load templates: ${error.message}`);
}
```

### 5. **Loading States**

All queries provide loading states:

```typescript
const { data, loading } = useQuery(queryTemplates);

if (loading) {
  return <Skeleton />; // Or spinner, loading card, etc.
}
```

### 6. **Authentication**

Auth tokens are automatically injected:

```typescript
// useQuery hook automatically calls getAccessToken() from AuthContext
const { data } = useQuery(queryTemplates);

// Behind the scenes:
// const token = await getAccessToken();
// headers['Authorization'] = `Bearer ${token}`;
```

---

## Testing Strategy

### Mock Mode (Current)

```bash
npm run dev
# All queries return mock data
# No backend needed
# Perfect for UI development
```

### Staging Mode

```bash
VITE_ENABLE_MOCK_QUERIES=false \
VITE_API_BASE_URL=https://api-staging.crossramp.io/v1 \
npm run dev
```

### Production Mode

```bash
VITE_ENABLE_MOCK_QUERIES=false \
VITE_API_BASE_URL=https://api.crossramp.io/v1 \
npm run build && npm run preview
```

---

## Benefits

✅ **Single source of truth** - All queries in one file  
✅ **Easy to mock** - Toggle environment variable  
✅ **Type-safe** - Full TypeScript support  
✅ **Consistent patterns** - Same hooks everywhere  
✅ **Backend-ready** - Just add real API endpoints  
✅ **Easy to test** - Mock mode for unit tests  
✅ **Error handling** - Standardized error states  
✅ **Loading states** - Consistent UX across app  
✅ **Auth integration** - Automatic token injection  
✅ **Refetch support** - Easy data refresh  

---

## API Endpoint Mapping (For Backend Team)

When implementing real APIs, use this mapping:

| Query Function | HTTP Method | Expected Endpoint |
|----------------|-------------|-------------------|
| `queryAccounts` | GET | `/accounts` |
| `queryTemplates` | GET | `/templates` |
| `queryTemplateById` | GET | `/templates/:id` |
| `queryTransactions` | GET | `/transactions` |
| `queryWhitelist` | GET | `/whitelist` |
| `queryDisputes` | GET | `/disputes` |
| `queryAPIKeys` | GET | `/api-keys` |
| `queryMFAStatus` | GET | `/security/mfa` |
| `queryCompanyProfile` | GET | `/company/profile` |
| `queryPaymentsOverview` | GET | `/analytics/payments-overview` |
| `queryVolumeOverview` | GET | `/analytics/volume-overview` |
| `queryConversionRates` | GET | `/analytics/conversion-rates` |
| `queryFees` | GET | `/analytics/fees` |
| `queryReputationStatement` | GET | `/reputation/statement` |
| `queryWithdrawalAccounts` | GET | `/withdrawal/accounts` |

All endpoints should:
- Accept `Authorization: Bearer {token}` header
- Return JSON responses matching TypeScript interfaces
- Support pagination via `?limit=N&offset=N` query params
- Support filtering via query params (e.g., `?status=completed&type=payment_in`)
- Return 401 for unauthenticated requests
- Return 403 for unauthorized requests
- Return 404 for not found resources
- Return 500 for server errors

---

## Summary

**Status:** ✅ Query system ready for homologation

**Completed:**
- Centralized all queries in `queries.ts`
- Created React hooks for easy consumption
- Implemented mock data for all queries
- Updated TemplatesView as reference implementation
- Added full TypeScript types
- Prepared environment variable configuration

**Next:** Update remaining views to use centralized queries, then flip the switch to real API! 🚀
