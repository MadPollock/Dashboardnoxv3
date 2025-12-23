# Query Normalization - Migration Checklist

## Overview

This checklist tracks the migration of all views from hardcoded mock data to the centralized query system in `/src/app/lib/queries.ts`.

---

## Views Migration Status

### ✅ COMPLETED

- [x] **TemplatesView** - Reference implementation complete
  - Uses `useQuery` hook
  - Uses `queryTemplates` from queries.ts
  - Refetch on create/delete
  - Loading and error states handled

### 🔄 IN PROGRESS

- [ ] **AccountsView** (Balances page)
  - Query: `queryAccounts()`
  - Mock data: 3 currency groups (USDT, BTC, BRL)
  - Remove hardcoded `accountsData` array
  - Add loading skeleton
  - Add error fallback

- [ ] **TransactionsView**
  - Query: `queryTransactions(params)`
  - Mock data: 3 sample transactions
  - Support filters: dateRange, status, type
  - Add pagination support
  - Remove hardcoded transaction arrays

### 📋 TODO

- [ ] **WhitelistView**
  - Query: `queryWhitelist(params)`
  - Mock data: 2 whitelist entries (PIX + wallet)
  - Support type filter: 'pix' | 'wallet'
  - Remove hardcoded whitelist data

- [ ] **WithdrawView** (Withdrawal Request Form)
  - Query: `queryWithdrawalAccounts()`
  - Mock data: 3 withdrawal accounts
  - Query: `queryWhitelist({ type: 'wallet' })` for crypto
  - Query: `queryWhitelist({ type: 'pix' })` for PIX addresses
  - Remove hardcoded accounts, wallets, PIX arrays

- [ ] **DisputesView**
  - Query: `queryDisputes(params)`
  - Mock data: 1 active dispute
  - Support status filter
  - Add pagination

- [ ] **APIIntegrationView**
  - Query: `queryAPIKeys(params)`
  - Mock data: 2 API keys (live + test)
  - Support environment filter
  - Remove hardcoded `mockAPIKeys` array

- [ ] **SecurityView**
  - Query: `queryMFAStatus()`
  - Mock data: MFA not activated
  - Handle 3 states: not_activated, pending, active
  - Remove hardcoded `mockMFAData`

- [ ] **CompanyProfileView**
  - Query: `queryCompanyProfile()`
  - Mock data: Approved company profile
  - Display KYC status banner
  - Remove hardcoded company data

- [ ] **ReputationStatementView**
  - Query: `queryReputationStatement(params)`
  - Mock data: Last 30 days metrics
  - Support date range filtering
  - Remove hardcoded metrics

### 🎨 ANALYTICS COMPONENTS

- [ ] **PaymentsOverviewChart**
  - Query: `queryPaymentsOverview(dateRange)`
  - Currently: `generateMockData()` function
  - Replace with: `useQueryWithDeps`
  - Dependencies: `[dateRange]`

- [ ] **VolumeOverviewChart**
  - Query: `queryVolumeOverview(dateRange)`
  - Currently: `generateMockData()` function
  - Replace with: `useQueryWithDeps`

- [ ] **ConversionRateChart**
  - Query: `queryConversionRates(dateRange)`
  - Currently: `generateMockData()` function
  - Replace with: `useQueryWithDeps`

- [ ] **FeesChart**
  - Query: `queryFees(dateRange)`
  - Currently: `generateMockData()` function
  - Replace with: `useQueryWithDeps`

### 📄 MODALS

- [ ] **ReceivePaymentModal**
  - Query: `queryTemplates()`
  - Currently: `mockTemplates` array
  - Fetch templates on modal open
  - Use same template data as TemplatesView

---

## Migration Pattern

For each view, follow this pattern:

### 1. Import Query and Hook

```typescript
import { useQuery } from '../hooks/useQuery';
import { queryYourData } from '../lib/queries';
```

### 2. Replace useState with useQuery

**Before:**
```typescript
const [data, setData] = useState([/* mock data */]);
```

**After:**
```typescript
const { data, loading, error, refetch } = useQuery(queryYourData);
```

### 3. Add Loading State

```typescript
if (loading) {
  return <div>Loading...</div>; // Or <Skeleton />
}
```

### 4. Add Error State

```typescript
if (error) {
  return <div>Error: {error.message}</div>;
}
```

### 5. Use Refetch After Mutations

```typescript
const handleCreate = async () => {
  // Call command API
  // await createSomething(...);
  
  // Reload data
  refetch();
};
```

---

## Testing Steps for Each View

After migrating each view:

1. **Test Mock Mode** (default)
   ```bash
   npm run dev
   ```
   - Verify data loads correctly
   - Check loading states
   - Verify no console errors

2. **Test Empty State**
   - Temporarily return empty array in mock generator
   - Verify empty state UI shows correctly

3. **Test Error State**
   - Temporarily throw error in mock generator
   - Verify error UI shows correctly

4. **Test Refetch**
   - Trigger a refetch action
   - Verify loading state appears briefly
   - Verify data updates

---

## Pull Request Checklist

When submitting PR for each view migration:

- [ ] Removed all hardcoded mock data arrays
- [ ] Imported query function from `queries.ts`
- [ ] Used `useQuery` or `useQueryWithDeps` hook
- [ ] Added loading state UI
- [ ] Added error state UI
- [ ] Updated refetch calls after mutations
- [ ] Tested in mock mode
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Updated this checklist

---

## Final Integration Testing

After all views are migrated:

### Phase 1: Mock Mode (Current)
```bash
VITE_ENABLE_MOCK_AUTH=true
VITE_ENABLE_MOCK_QUERIES=true
npm run dev
```

**Test:**
- All pages load
- All queries return mock data
- No console errors
- All loading states work
- All error states work (force errors)

### Phase 2: Real Auth + Mock Queries
```bash
VITE_ENABLE_MOCK_AUTH=false
VITE_ENABLE_MOCK_QUERIES=true
VITE_AUTH0_DOMAIN=crossramp-staging.auth0.com
VITE_AUTH0_CLIENT_ID=staging_client_id
npm run dev
```

**Test:**
- Login with Auth0
- All pages load with mock data
- Auth tokens attached to requests
- JWT claims accessible

### Phase 3: Real Everything (Homologation)
```bash
VITE_ENABLE_MOCK_AUTH=false
VITE_ENABLE_MOCK_QUERIES=false
VITE_API_BASE_URL=https://api-staging.crossramp.io/v1
npm run dev
```

**Test:**
- Login with Auth0
- All queries fetch from staging API
- All responses match TypeScript interfaces
- Error handling works for API errors
- Loading states work correctly
- Refetch works correctly

---

## Known Issues / Notes

### Date Handling

Some views convert ISO strings to Date objects:

```typescript
// queries.ts returns ISO strings
createdAt: "2025-01-10T00:00:00.000Z"

// Component needs Date objects
const templates = templatesData.map(t => ({
  ...t,
  createdAt: new Date(t.createdAt),
}));
```

**Action:** Consider if we should handle this in the query layer or component layer. Current approach (component layer) is fine for now.

### Pagination

Not all queries implement pagination yet. Some use client-side pagination (filtering array in component).

**Action:** Implement server-side pagination when backend is ready. Queries already support `PaginationParams`.

### Filtering

Some views have complex filters (date range, status, type). Currently done client-side on mock data.

**Action:** Backend should support these filters via query params. Query functions already accept filter params.

---

## Blocked / Waiting

- [ ] Backend API endpoints implementation
- [ ] API contract validation (response shapes match TypeScript types)
- [ ] Auth0 tenant setup for staging
- [ ] Staging environment URLs

---

## Timeline

**Week 1:** Migrate all views to centralized queries (mock mode)
**Week 2:** Test integration, fix issues, document API contracts
**Week 3:** Backend implements API endpoints matching contracts
**Week 4:** Integration testing with real API (homologation)
**Week 5:** Production deployment

---

## Questions for Backend Team

1. Will all endpoints support pagination? (`?limit=N&offset=N`)
2. Date format: ISO 8601 strings? (e.g., `2025-01-10T00:00:00.000Z`)
3. Error response format: `{ error: string, message: string }` ?
4. Auth: JWT in `Authorization: Bearer {token}` header?
5. API versioning: `/v1/` prefix?

---

## Success Criteria

✅ All views use centralized queries  
✅ Zero hardcoded mock data in view components  
✅ All queries in `queries.ts`  
✅ Mock mode works perfectly  
✅ Loading states consistent across app  
✅ Error handling consistent across app  
✅ Refetch mechanism works everywhere  
✅ TypeScript types match backend contracts  
✅ Ready to flip to real API  

---

**Last Updated:** December 22, 2024  
**Updated By:** AI Assistant  
**Status:** Migration in progress - TemplatesView complete, others pending
