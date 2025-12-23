# Payments Feature - Completion Assessment

**Date:** 2025-12-23  
**Feature:** Payments (Transactions) List & Details  
**Status:** 🟡 **PARTIALLY IMPLEMENTED** - Needs Query Integration

---

## 📊 **Executive Summary**

The Payments feature UI is **complete and functional** with mock data, but is **NOT integrated with the centralized query system**. The TransactionsView uses local mock arrays instead of calling query functions from `/src/app/lib/queries.ts`.

### **What Works:**
- ✅ Transaction list view with cards (received/sent)
- ✅ Type filter pills (All/Received/Sent)
- ✅ Quick search bar (UI only)
- ✅ Date range selector
- ✅ Payment details modal (all fields)
- ✅ Pagination UI (Previous/Next buttons)
- ✅ Request Report modal integration
- ✅ Refund flow UI (RefundConfirmationModal + MFAModal)
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Translations exist (EN/PT/ES)
- ✅ Relative time display ("2 hours ago")
- ✅ Copy buttons for technical fields
- ✅ Blockchain explorer links

### **What's Missing:**
- ❌ **Query functions NOT defined** in `/src/app/lib/queries.ts`:
  - `queryPaymentsList()` - List payments with pagination
  - `queryPaymentSearch()` - Search by identifier
  - `queryPaymentDetails()` - Get full payment details
- ❌ **Command functions NOT defined** in `/src/app/lib/commands.ts`:
  - `commandRefundPayment()` - Process refund
  - `commandCancelPayment()` - Cancel pending payment
- ❌ **No useQuery integration** - Components use local state
- ❌ **No RBAC enforcement** - Missing access control checks
- ❌ **No loading states** - No skeleton loaders
- ❌ **No error states** - No error handling/retry
- ❌ **Quick search NOT functional** - Doesn't call API
- ❌ **Pagination NOT functional** - No actual page navigation
- ❌ **Date range filter NOT applied** - Doesn't filter data
- ❌ **Type filter NOT applied** - Doesn't filter by received/sent
- ❌ **Refund eligibility check missing** - Shows button unconditionally
- ❌ **Missing translations** for error/loading states

---

## 🔍 **Detailed Gap Analysis**

### **Gap 1: Missing Query Functions**

**Current State:**
- TransactionsView uses `mockTransactions` array (hard-coded)
- No query functions in `/src/app/lib/queries.ts`

**Required Implementation:**

```typescript
// /src/app/lib/queries.ts

export interface PaymentListRequest {
  date_from: string;      // ISO 8601
  date_to: string;        // ISO 8601
  type?: 'all' | 'received' | 'sent';
  page: number;
  limit: number;
  sort_by?: 'date' | 'amount';
  sort_order?: 'asc' | 'desc';
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

// Query functions
export async function queryPaymentsList(
  params: PaymentListRequest,
  options?: QueryOptions
): Promise<PaymentListResponse> {
  // Implementation with mock data + real API integration
}

export async function queryPaymentSearch(
  params: PaymentSearchRequest,
  options?: QueryOptions
): Promise<PaymentSearchResponse> {
  // Implementation
}

export async function queryPaymentDetails(
  payment_id: string,
  options?: QueryOptions
): Promise<Payment> {
  // Implementation
}
```

**Estimated Time:** 2-3 hours

---

### **Gap 2: Missing Command Functions**

**Current State:**
- RefundConfirmationModal exists but doesn't call real command
- No command functions in `/src/app/lib/commands.ts`

**Required Implementation:**

```typescript
// /src/app/lib/commands.ts

export interface RefundPaymentRequest {
  payment_id: string;
  refund_amount: string;
  refund_reason: string;
  full_refund: boolean;
  notify_customer: boolean;
}

export interface CancelPaymentRequest {
  payment_id: string;
  cancellation_reason: string;
}

export async function commandRefundPayment(
  params: RefundPaymentRequest,
  mfaCode: string
): Promise<void> {
  // Implementation with MFA in JWT
}

export async function commandCancelPayment(
  params: CancelPaymentRequest,
  mfaCode: string
): Promise<void> {
  // Implementation
}
```

**Estimated Time:** 1-2 hours

---

### **Gap 3: No Query Integration in TransactionsView**

**Current State:**
```typescript
// Hard-coded mock data
const mockTransactions = [ ... ];
const [filteredTransactions, setFilteredTransactions] = useState(mockTransactions);
```

**Required Changes:**
```typescript
// Use centralized query system
const {
  data: paymentsData,
  loading,
  error,
  refetch
} = useQuery(
  () => queryPaymentsList({
    date_from: dateRange.from,
    date_to: dateRange.to,
    type: typeFilter,
    page: currentPage,
    limit: 10,
  }),
  [dateRange, typeFilter, currentPage]
);
```

**Estimated Time:** 2-3 hours

---

### **Gap 4: Missing RBAC Enforcement**

**Current State:**
- No role check in TransactionsView
- Refund button visible to all users

**Required Implementation:**
```typescript
import { useAuth } from '../contexts/AuthContext';

export function TransactionsView() {
  const { hasRole } = useAuth();
  
  // RBAC - Analytics requires admin, operations, or analyst role
  const canView = hasRole('admin'); // TODO: Add 'operations', 'analyst'
  const canRefund = hasRole('admin'); // TODO: Add 'operations' (analyst = read-only)
  
  if (!canView) {
    return <AccessDenied />;
  }
  
  // In modal
  {canRefund && payment.is_refundable && (
    <Button onClick={handleRefund}>Refund</Button>
  )}
}
```

**Estimated Time:** 30 minutes

---

### **Gap 5: Missing UI States**

**Missing Components:**

1. **Loading States:**
   - Skeleton loader for transaction cards
   - Loading spinner during search
   - Loading state in modal

2. **Error States:**
   - Error banner with retry button
   - Empty state (no transactions found)
   - Search not found state

3. **Pagination:**
   - Actual page navigation (currently UI only)
   - Disable Previous on page 1
   - Disable Next on last page

**Estimated Time:** 2-3 hours

---

### **Gap 6: Missing Translations**

**Required Strings (EN/PT/ES):**

```typescript
// English
'payments.loading': 'Loading payments...',
'payments.error': 'Failed to load payments',
'payments.retry': 'Retry',
'payments.empty': 'No payments found for the selected period',
'payments.search.notFound': 'Payment not found',
'payments.search.placeholder': 'Search by ID, Order ID, CPF, Tx Hash...',
'payments.refund.success': 'Refund processed successfully',
'payments.refund.error': 'Failed to process refund',
'payments.cancel.success': 'Payment cancelled successfully',
'payments.cancel.error': 'Failed to cancel payment',
```

**Estimated Time:** 1 hour

---

### **Gap 7: Quick Search Not Functional**

**Current State:**
- Search input exists but doesn't trigger API call
- No search results handling

**Required Implementation:**
```typescript
const handleQuickSearch = async (query: string) => {
  if (!query.trim()) return;
  
  setSearching(true);
  try {
    const result = await queryPaymentSearch({ query });
    if (result.found && result.payment) {
      setSelectedPayment(result.payment);
      setDetailsModalOpen(true);
    } else {
      toast.error(t('payments.search.notFound'));
    }
  } catch (error) {
    toast.error(t('payments.error'));
  } finally {
    setSearching(false);
  }
};
```

**Estimated Time:** 1 hour

---

## 📋 **Implementation Phases**

### **Phase 1: Add Query Functions** (2-3 hours)
1. Add TypeScript interfaces to `queries.ts`
2. Implement `queryPaymentsList()` with mock data generator
3. Implement `queryPaymentSearch()` with multi-field search
4. Implement `queryPaymentDetails()` (can reuse list data)
5. Test mock mode

### **Phase 2: Add Command Functions** (1-2 hours)
1. Add interfaces to `commands.ts`
2. Implement `commandRefundPayment()` with MFA handling
3. Implement `commandCancelPayment()` with MFA handling
4. Test with mock mode

### **Phase 3: Integrate Queries in TransactionsView** (2-3 hours)
1. Replace mock data with `useQuery` hooks
2. Add loading states (skeleton loaders)
3. Add error states (error banner + retry)
4. Add empty state
5. Connect date range filter to query
6. Connect type filter to query
7. Implement pagination

### **Phase 4: Implement Quick Search** (1 hour)
1. Connect search input to `queryPaymentSearch()`
2. Handle search results (open modal if found)
3. Add loading spinner during search
4. Add "not found" toast

### **Phase 5: Add RBAC Enforcement** (30 minutes)
1. Add `useAuth()` hook to TransactionsView
2. Check `hasRole()` for view access
3. Conditionally show refund button based on role
4. Add access denied page

### **Phase 6: Add Missing Translations** (1 hour)
1. Add all error/loading/empty state strings
2. Translate to Portuguese
3. Translate to Spanish

### **Phase 7: Connect Refund Flow** (1 hour)
1. Connect RefundConfirmationModal to `commandRefundPayment()`
2. Handle MFA flow with JWT token
3. Add success/error toast
4. Refetch payments list after success
5. Close modal after success

---

## ⏱️ **Time Estimates**

| Scope | Time | Notes |
|-------|------|-------|
| **Minimum Viable** | 6-8 hours | Phases 1-5 (queries + integration + RBAC) |
| **Recommended** | 8-10 hours | +Phase 6 (translations) + Phase 7 (refund flow) |
| **Full Polish** | 10-12 hours | +Advanced error handling, skeleton loaders, better UX |

---

## 🎯 **Current vs Target State**

| Feature | Current | Target |
|---------|---------|--------|
| **Query Integration** | ❌ 0% (mock data only) | ✅ 100% (centralized queries) |
| **Command Integration** | ❌ 0% (UI only) | ✅ 100% (MFA + backend) |
| **RBAC Enforcement** | ❌ 0% | ✅ 100% |
| **Loading States** | ❌ 0% | ✅ 100% |
| **Error States** | ❌ 0% | ✅ 100% |
| **Translations** | 🟡 60% (UI labels only) | ✅ 100% (including states) |
| **Quick Search** | ❌ 0% (non-functional) | ✅ 100% (API connected) |
| **Pagination** | 🟡 50% (UI only) | ✅ 100% (functional) |
| **Filters** | ❌ 0% (not applied) | ✅ 100% (date + type) |
| **Refund Flow** | 🟡 50% (UI + MFA modal) | ✅ 100% (command execution) |
| **Overall Status** | 🟡 **30% Complete** | ✅ **100% Target** |

---

## 🚀 **Recommended Next Steps**

1. **Start with Phase 1** (Add Query Functions) - This unblocks all other work
2. **Then Phase 3** (Integrate in View) - Makes the feature functional
3. **Then Phase 5** (RBAC) - Security critical
4. **Then Phase 2+7** (Commands + Refund Flow) - Enables write actions
5. **Finally Phase 6** (Translations) - Polish

**Total Estimated Time:** 8-10 hours for recommended scope

---

## 📝 **Notes**

- The UI is already excellent - just needs data integration
- PaymentDetailsModal is well-structured and reusable
- RefundConfirmationModal + MFAModal flow is already built
- Translations for UI labels already exist (good foundation)
- Main work is plumbing (queries + commands + integration)

**Status vs Templates/Disputes:**

| Feature | Templates | Disputes | **Payments** |
|---------|-----------|----------|--------------|
| Query Integration | ✅ 100% | ✅ 100% | ❌ **0%** |
| Command Integration | ✅ 100% | ✅ 100% | ❌ **0%** |
| RBAC | ✅ 100% | ✅ 100% | ❌ **0%** |
| Translations | ✅ 100% | ✅ 100% | 🟡 **60%** |
| **Overall** | ✅ 100% | ✅ 100% | 🟡 **30%** |

**Payments needs significant work to reach parity with completed features.**

---

**End of Assessment**
