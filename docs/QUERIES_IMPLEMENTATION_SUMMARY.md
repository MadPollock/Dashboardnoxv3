# Query Implementation Summary

**Document Version:** 1.0  
**Last Updated:** December 23, 2024  
**Status:** ✅ Complete

---

## Overview

This document summarizes the complete query implementation for the Crossramp Dashboard following the **frontend-first API development approach**. All queries are implemented with mock data generators and are ready for backend integration.

---

## Implementation Status

### ✅ Dashboard (Overview) - Complete

**View:** `/src/app/views/DashboardView.tsx`  
**Documentation:** `/docs/FEATURE_OVERVIEW.md`  
**API Contract:** `/docs/API_CONTRACT_DASHBOARD.md`

#### Queries Implemented (4 total)

| Query Function | Endpoint | Category | Status |
|----------------|----------|----------|--------|
| `queryAvailableBalance()` | GET `/api/balance/available` | A (Manual refresh) | ✅ Complete |
| `queryDashboardToday()` | GET `/api/dashboard/today` | B (60s polling) | ✅ Complete |
| `queryRecentTransactions()` | GET `/api/transactions/recent` | B (60s polling) | ✅ Complete |
| `queryPaymentStatus()` | GET `/api/dashboard/payment-status` | B (60s polling) | ✅ Complete |

#### Features
- ✅ Loading states (skeleton loaders)
- ✅ Error states (user-friendly messages)
- ✅ Empty states (motivational copy)
- ✅ Manual refresh button for balance
- ✅ Auto-polling (60s) for Today/Transactions/Status
- ✅ Currency formatting (BRL via Intl.NumberFormat)
- ✅ Relative time display ("10 min ago" using date-fns)
- ✅ Role restrictions (Admin + Operations see action buttons)

---

### ✅ Withdraw - Complete

**View:** `/src/app/views/WithdrawView.tsx`  
**Component:** `/src/app/components/admin/WithdrawalRequestForm.tsx`  
**Documentation:** `/docs/FEATURE_WITHDRAW.md`  
**API Contract:** `/docs/API_CONTRACT_WITHDRAW.md`

#### Queries Implemented (3 total)

| Query Function | Endpoint | Category | Status |
|----------------|----------|----------|--------|
| `queryBalances()` | GET `/api/balances` | A (Manual refresh) | ✅ Complete |
| `queryWhitelistedWallets()` | GET `/api/whitelist/wallets` | B (Load once) | ✅ Complete |
| `queryWhitelistedPix()` | GET `/api/whitelist/pix` | B (Load once) | ✅ Complete |

#### Features
- ✅ Loading states (skeleton loaders for dropdowns)
- ✅ Error states (critical error disables form)
- ✅ Empty states ("No accounts available", "No whitelisted wallets")
- ✅ Manual refresh button for balances
- ✅ Network filtering (matches wallet network to account network)
- ✅ BRL special handling (only shows PIX addresses)
- ✅ Status filtering (only active wallets/PIX shown)
- ✅ Refetch balances after successful withdrawal
- ✅ Role restrictions (Admin + Operations only)

---

### ✅ Whitelist Management - Complete

**View:** `/src/app/views/WhitelistView.tsx`  
**Documentation:** `/docs/FEATURE_WHITELIST.md`  
**API Contract:** `/docs/API_CONTRACT_WHITELIST.md`

#### Queries Implemented (2 total)

| Query Function | Endpoint | Category | Status |
|----------------|----------|----------|--------|
| `queryWhitelistGroups()` | GET `/api/whitelist/groups` | B (Load once per tab) | ✅ Complete |
| `queryPIXKeys()` | GET `/api/whitelist/pix-keys` | B (Load once per tab) | ✅ Complete |

#### Features
- ✅ Loading states (skeleton loaders for groups and PIX keys)
- ✅ Error states (error messages + retry button)
- ✅ Empty states ("No groups yet", "No PIX keys whitelisted yet")
- ✅ Two-tab layout with lazy loading (only loads data for active tab)
- ✅ Collapsible groups with address tables
- ✅ PIX limit enforcement (max 5, badge shows "2 of 5 used")
- ✅ Status badges (active/pending/rejected)
- ✅ Refetch after creating group/adding address/adding PIX key
- ✅ Role restrictions (Admin only)

---

## Architecture Pattern

### Frontend-First Development Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. FRONTEND DEFINES API CONTRACT                       │
│     - TypeScript interfaces in queries.ts               │
│     - Mock data generators                              │
│     - Real API endpoints defined                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│  2. DOCUMENTATION PUBLISHED                             │
│     - API_CONTRACT_*.md for each feature                │
│     - Exact request/response formats                    │
│     - Business logic requirements                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│  3. FRONTEND DEVELOPMENT (PARALLEL)                     │
│     - UI built with mock data                           │
│     - All states tested (loading, error, empty)         │
│     - Production-ready                                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│  4. BACKEND DEVELOPMENT (PARALLEL)                      │
│     - Bastion implements adapters                       │
│     - Transforms backend responses to match contract    │
│     - Tests against TypeScript interfaces               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│  5. INTEGRATION (SEAMLESS)                              │
│     - Toggle MOCK_QUERIES_ENABLED to false              │
│     - Zero frontend code changes                        │
│     - Deploy                                            │
└─────────────────────────────────────────────────────────┘
```

---

## Query Categories

### Category A: Manual Refresh Only
**Characteristics:**
- Critical data that affects financial decisions
- Must be explicitly refreshed by user
- No automatic polling
- Shows "Last updated" timestamp

**Examples:**
- `queryAvailableBalance()` - User must refresh before seeing current balance
- `queryBalances()` - User must refresh before withdrawal to avoid overdraft

**UI Pattern:**
```tsx
const { data, loading, error, refetch } = useQuery(queryAvailableBalance);

// Manual refresh button
<button onClick={() => refetch()}>
  <RefreshCw className="size-4" />
</button>
```

---

### Category B: Load Once or Auto-Polling
**Characteristics:**
- Relatively static data that changes infrequently
- Loaded once on page mount OR
- Auto-polling with 60s interval when user is idle

**Examples (Load Once):**
- `queryWhitelistedWallets()` - Whitelist rarely changes
- `queryWhitelistedPix()` - Whitelist rarely changes

**Examples (Auto-Polling):**
- `queryDashboardToday()` - Updates throughout the day
- `queryRecentTransactions()` - New transactions appear over time
- `queryPaymentStatus()` - Payment statuses change

**UI Pattern:**
```tsx
// Load once (no refetchInterval)
const { data, loading, error } = useQuery(queryWhitelistedWallets);

// Auto-polling (60s interval)
const { data, loading, error } = useQuery(
  queryDashboardToday,
  undefined,
  { refetchInterval: 60000 }
);
```

---

## File Structure

### Core Query System

```
/src/app/lib/
  ├── queries.ts              # All query functions + TypeScript interfaces
  └── commandClient.ts        # Command/write operations (separate file)

/src/app/hooks/
  └── useQuery.ts             # React hook for query execution
```

### Documentation

```
/docs/
  ├── FRONTEND_FIRST_APPROACH.md      # Philosophy & workflow guide
  ├── FEATURE_OVERVIEW.md             # Dashboard feature docs
  ├── FEATURE_WITHDRAW.md             # Withdraw feature docs
  ├── FEATURE_WHITELIST.md            # Whitelist Management feature docs
  ├── API_CONTRACT_DASHBOARD.md       # Dashboard API specs
  ├── API_CONTRACT_WITHDRAW.md        # Withdraw API specs
  ├── API_CONTRACT_WHITELIST.md       # Whitelist Management API specs
  ├── QUICK_START_QUERIES.md          # Developer quick reference
  └── QUERIES_IMPLEMENTATION_SUMMARY.md  # This file
```

---

## TypeScript Interfaces (Source of Truth)

All API contracts are defined as TypeScript interfaces in `/src/app/lib/queries.ts`:

### Dashboard Interfaces

```typescript
export interface AvailableBalance {
  amount: number;
  currency: string;
  settles_in: string;
  updated_at: string; // ISO timestamp
}

export interface TodaySnapshot {
  payments_received: { amount: number; currency: string; };
  payments_pending: { amount: number; currency: string; };
  fees: { amount: number; currency: string; };
  date: string; // YYYY-MM-DD
}

export interface RecentTransaction {
  id: string;
  type: 'received' | 'sent';
  amount: { value: number; currency: string; };
  description: string;
  timestamp: string; // ISO timestamp
}

export interface PaymentStatus {
  completed: { count: number; percentage: number; };
  pending: { count: number; percentage: number; };
  cancelled_or_expired: { count: number; percentage: number; };
  total: number;
}
```

### Withdraw Interfaces

```typescript
export interface AccountBalance {
  id: string;
  currency_code: string;
  balance: string; // Decimal string
  network?: string;
}

export interface WhitelistedWallet {
  id: string;
  label: string;
  address: string;
  network: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface WhitelistedPix {
  id: string;
  label: string;
  address: string;
  type: 'Email' | 'Phone' | 'CPF' | 'CNPJ' | 'Random';
  status: 'active' | 'inactive' | 'pending';
}
```

### Whitelist Management Interfaces

```typescript
export interface WhitelistAddress {
  id: string;
  address: string;
  currency: string; // e.g., "USDT", "USDC"
  network: string; // e.g., "ETH", "TRX", "SOL"
  status: 'active' | 'pending' | 'rejected';
  reason: string;
  added_date: string; // YYYY-MM-DD
}

export interface WhitelistGroup {
  id: string;
  label: string;
  reason: string;
  created_date: string; // YYYY-MM-DD
  addresses: WhitelistAddress[];
}

export interface PIXKey {
  id: string;
  label: string;
  pix_key: string;
  type: 'Email' | 'Phone' | 'CPF' | 'CNPJ' | 'Random';
  status: 'active' | 'pending' | 'rejected';
  reason: string;
  added_date: string; // YYYY-MM-DD
}
```

---

## Mock Mode Configuration

### Runtime Toggle (No Rebuild Required!)

```javascript
// /public/config.js
window.__CROSSRAMP_CONFIG__ = {
  MOCK_QUERIES_ENABLED: true,  // Toggle to false for production
  API_BASE_URL: 'https://api.crossramp.io',
  ENVIRONMENT: 'development',
};
```

### How It Works

```typescript
// queries.ts
const isMockMode = () => isMockQueriesEnabled(); // From config.js

export async function queryAvailableBalance(options?: QueryOptions) {
  if (isMockMode()) {
    // Return mock data (for development)
    await new Promise(resolve => setTimeout(resolve, 250));
    return generateMockBalance();
  }

  // Call real API (for production)
  const response = await fetch(`${getAPIBaseURL()}/balance/available`, { ... });
  return response.json();
}
```

---

## Mock Data Generators

All mock data generators are in `/src/app/lib/queries.ts` and provide realistic, dynamic data:

### Features
- ✅ Realistic values (e.g., balance: 12480.90, not 999999)
- ✅ Network delays simulated (200-300ms)
- ✅ Dynamic timestamps (e.g., "2 min ago", "10 min ago")
- ✅ Multiple scenarios (transactions, accounts, wallets)

### Example

```typescript
const generateMockBalance = (): AvailableBalance => ({
  amount: 12480.90,
  currency: 'BRL',
  settles_in: 'USDT',
  updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
});

const generateMockRecentTransactions = (): RecentTransaction[] => [
  {
    id: 'tx_001',
    type: 'received',
    amount: { value: 1450.00, currency: 'BRL' },
    description: 'Payment from merchant #3421',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
  },
  // ... more transactions
];
```

---

## Backend Integration Guide

### Step 1: Review API Contracts

Read the following documents:
- `/docs/API_CONTRACT_DASHBOARD.md`
- `/docs/API_CONTRACT_WITHDRAW.md`
- `/docs/API_CONTRACT_WHITELIST.md`
- `/docs/FRONTEND_FIRST_APPROACH.md`

### Step 2: Implement Bastion Adapters

For each endpoint, create an adapter that:
1. Authenticates JWT token
2. Fetches data from backend services (any protocol: gRPC, REST, GraphQL)
3. **Transforms response to match frontend TypeScript interface**
4. Returns exact JSON structure frontend expects

### Step 3: Test Against Frontend Contracts

Use the TypeScript interfaces as the source of truth:
- Every field must be present
- Field types must match (string vs number vs boolean)
- Enum values must match exactly

### Step 4: Deploy & Configure

1. Backend deploys Bastion adapters
2. Frontend updates `/public/config.js`:
   ```javascript
   MOCK_QUERIES_ENABLED: false
   ```
3. Zero frontend code changes needed!

---

## Error Handling Pattern

All queries follow the same error handling pattern:

### Frontend Pattern

```typescript
const { data, loading, error, refetch } = useQuery(querySomeData);

if (loading) {
  return <SkeletonLoader />;
}

if (error) {
  return (
    <ErrorMessage>
      Unable to load data. Please try again.
      <button onClick={refetch}>Retry</button>
    </ErrorMessage>
  );
}

if (!data || data.length === 0) {
  return <EmptyState>No data available</EmptyState>;
}

return <DataDisplay data={data} />;
```

### Backend Error Responses

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}  // Optional
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

---

## Testing Strategy

### Frontend Testing (Already Done)

✅ All queries tested with mock data:
- Loading states (skeleton loaders)
- Error states (error messages + retry buttons)
- Empty states (no data available messages)
- Success states (data displays correctly)

### Backend Testing (Bastion Team)

Backend should test:
1. **Contract Compliance:**
   - Response structure matches TypeScript interface
   - All required fields present
   - Field types correct

2. **Business Logic:**
   - Correct data returned for authenticated user
   - Role restrictions enforced (403 for unauthorized)
   - Filters applied correctly (e.g., only active wallets)

3. **Performance:**
   - Response time < 300ms for most queries
   - Caching for Category B queries (static data)
   - Rate limiting for Category A queries (manual refresh)

---

## Next Features to Implement

Following the same pattern, the next features to implement queries for:

### High Priority
1. **Templates** (partially done - already in queries.ts)
   - `queryTemplates()`
   - `queryTemplateById()`

2. **Transactions/Statement**
   - `queryTransactions()`
   - `queryStatementTransactions()`

3. **Balances View**
   - Uses existing `queryAccounts()` (already in queries.ts)

### Medium Priority
4. **Analytics/Reports**
   - `queryPaymentsOverview()`
   - `queryVolumeOverview()`
   - `queryConversionRates()`
   - `queryFees()`

5. **Whitelist Management** ✅ **DONE**
   - ✅ `queryWhitelistGroups()` - Implemented
   - ✅ `queryPIXKeys()` - Implemented

6. **API Keys (Developers)**
   - `queryAPIKeys()`

### Low Priority
7. **Disputes**
   - `queryDisputes()`

8. **Team Management**
   - `queryTeamUsers()`

9. **Security/MFA**
   - `queryMFAStatus()`

10. **Company Profile/KYC**
    - `queryCompanyProfile()`

---

## Key Takeaways

### ✅ Benefits Achieved

**For Frontend:**
- Complete UI before backend is ready
- All states tested with realistic data
- Zero code changes for backend integration
- Parallel development with backend team

**For Backend:**
- Clear, documented API contracts
- Flexible implementation (any protocol)
- TypeScript interfaces as source of truth
- Bastion layer handles transformation

**For Product:**
- Faster iteration on UX
- Working demos before backend done
- Predictable delivery timeline
- Reduced integration risk

---

### 📋 Summary Stats

**Total Queries Implemented:** 9 queries across 3 features  
**Total TypeScript Interfaces:** 13 interfaces  
**Total Mock Data Generators:** 9 generators  
**Total Documentation Pages:** 7 documents  
**Frontend Status:** ✅ Production-ready  
**Backend Status:** ⚠️ Pending implementation  

---

## Contact

**Frontend Team Lead:** [Your Name]  
**Slack Channel:** #crossramp-frontend  
**Questions:** Reach out in Slack or review documentation

---

**Document Status:** ✅ Complete  
**Last Updated:** December 23, 2024