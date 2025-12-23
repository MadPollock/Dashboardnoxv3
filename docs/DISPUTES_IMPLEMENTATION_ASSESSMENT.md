# Disputes Feature - Implementation Assessment

**Assessment Date:** 2025-12-23  
**Assessed Files:**
- `/src/app/views/DisputesView.tsx`
- `/src/app/components/admin/DisputeDetailsModal.tsx`
- `/src/app/components/admin/RefundConfirmationModal.tsx`

**Compared Against:**
- `/docs/API_CONTRACT_DISPUTES.md` (Canonical API specification)
- `/docs/FEATURE_DISPUTES.md` (Product requirements)

---

## Executive Summary

**Status:** 🟡 **Partially Implemented** - Good UI foundation, but **NO backend integration**

The Disputes feature has a **well-designed UI** that matches most UX requirements from FEATURE_DISPUTES.md, but it's currently using **hardcoded mock data** and has **no integration with queries.ts or commands.ts**. The implementation needs significant work to connect to the actual CQRS architecture.

---

## ✅ What's Working (UI/UX Layer)

### DisputesView.tsx - Strong UI Foundation

1. **✅ Two-tier filtering system** - Implemented correctly
   - Date range selector with last 30 days default
   - Status filter pills (All, Open, Under Review, Resolved, Closed)
   - Active pill with `bg-foreground` as specified

2. **✅ Quick Search** - Fully functional
   - Search by Dispute ID, Payment ID, or Client Name
   - Shows "Dispute not found" error
   - Opens modal on successful search

3. **✅ Expandable general search** - Implemented
   - Collapses/expands on click
   - Separate from quick search as specified

4. **✅ List view cards** - Match spec perfectly
   - AlertCircle icon (red bg for infractions, gray otherwise)
   - Client name + badges (status, refunded, infraction)
   - Dispute ID + Payment ID in subtitle
   - Amount + relative time ("2 hours ago")
   - Dispute type display
   - Client reason preview (2 lines with ellipsis via `line-clamp-2`)
   - Deadline warning with Clock icon for < 3 days

5. **✅ Pagination** - Correct implementation
   - 10 items per page
   - ChevronLeft/Right navigation
   - "Showing X-Y of Z" display

6. **✅ Request Report button** - Present in header
   - Opens RequestReportModal
   - Correct icon and placement

7. **✅ Relative time formatting** - Implemented
   - "X minutes ago", "X hours ago", "Yesterday", "X days ago"

8. **✅ Responsive design** - Code structure supports mobile

### DisputeDetailsModal.tsx - Complete UI

1. **✅ Full-screen modal** - Correct (max-w-3xl)
2. **✅ Sticky header** - With dispute ID and status badges
3. **✅ Deadline warning banner** - Shows for urgent disputes (< 3 days)
4. **✅ Overview grid** - All 6 fields present (client, amount, payment ID, type, dates)
5. **✅ Client reason card** - bg-muted as specified
6. **✅ Merchant defense card** - bg-muted if exists, dashed border if empty
7. **✅ Infraction details section** - bg-destructive/10, only shows if `is_infraction: true`
8. **✅ Refund status banner** - Shows for refunded disputes
9. **✅ Footer sticky with action buttons** - Correct layout
10. **✅ Submit Defense button** - Green "write" variant (only if defense empty)
11. **✅ Refund & Resolve button** - Red "destructive" variant
12. **✅ Get Refund Receipt button** - Shows for refunded disputes

### RefundConfirmationModal.tsx - Correct Flow

1. **✅ Double-confirm pattern** - RefundConfirmationModal → MFAModal
2. **✅ Refund reason input** - Textarea with validation (min 10 chars, max 500)
3. **✅ Warning banners** - Irreversibility warning + balance warning
4. **✅ Refund details display** - Amount, Payment ID, Dispute ID

---

## 🔴 Critical Gaps (Backend Integration)

### 1. **NO Integration with queries.ts**

**Problem:** DisputesView uses hardcoded `mockDisputes` array instead of calling API queries.

**What's Missing:**
- No call to `queryDisputesList()` from `/src/app/lib/queries.ts`
- No loading states
- No error handling for failed queries
- No auto-refresh (spec requires 60s polling)
- Date range selector is cosmetic (doesn't filter data from API)
- Status filters work only on mock data (not real API params)

**Expected Implementation:**
```typescript
import { queryDisputesList, ListDisputesRequest } from '../lib/queries';
import { useQuery } from '../hooks/useQuery';

const { data, loading, error, refetch } = useQuery(
  () => queryDisputesList({
    date_from: dateRange.from,
    date_to: dateRange.to,
    status: selectedFilter === 'all' ? undefined : selectedFilter,
    page: currentPage,
    limit: 10
  }),
  {
    date_from: dateRange.from,
    date_to: dateRange.to,
    status: selectedFilter,
    page: currentPage,
    limit: 10
  },
  { refetchInterval: 60000 } // 60s auto-refresh
);
```

**Impact:** 🔴 **Critical** - Feature doesn't fetch real data

---

### 2. **NO Integration with commands.ts**

**Problem:** DisputeDetailsModal has placeholder TODOs for write actions.

**What's Missing:**

#### a) Submit Defense Command
- **Current:** Button exists but does nothing (no onClick handler)
- **Expected:** 
  ```typescript
  import { submitDisputeDefense } from '../lib/commands';
  import { useAuth } from '../contexts/AuthContext';
  
  const handleSubmitDefense = async (defenseText: string, attachments: string[]) => {
    const { loginWithMFA, user } = useAuth();
    const mfaToken = await loginWithMFA();
    
    await submitDisputeDefense({
      dispute_id: dispute.id,
      defense_text: defenseText,
      attachments: attachments
    }, { accessToken: mfaToken, user });
    
    refetch(); // Refetch disputes list
    onClose();
  };
  ```
- **Impact:** 🔴 **Critical** - Cannot submit defense

#### b) Refund and Resolve Command
- **Current:** `handleMFAVerify()` only has `console.log()`
- **Expected:**
  ```typescript
  import { refundAndResolveDispute } from '../lib/commands';
  
  const handleMFAVerify = async () => {
    const { loginWithMFA, user } = useAuth();
    const mfaToken = await loginWithMFA();
    
    await refundAndResolveDispute({
      dispute_id: dispute.id,
      payment_id: dispute.payment_id,
      refund_amount: dispute.amount,
      refund_reason: refundReason,
      mark_as_resolved: true
    }, { accessToken: mfaToken, user });
    
    refetch();
    onClose();
  };
  ```
- **Impact:** 🔴 **Critical** - Cannot process refunds

#### c) Contest Infraction Command
- **Current:** Not implemented at all
- **Expected:** Need to add:
  - "Contest Infraction" button in modal footer (only if `is_infraction: true`)
  - ContestInfractionModal component (similar to RefundConfirmationModal)
  - Integration with `contestDisputeInfraction()` command
- **Impact:** 🟡 **Medium** - Less common action but specified in requirements

#### d) Download Refund Receipt
- **Current:** Button exists but only has `console.log()`
- **Expected:**
  ```typescript
  const handleDownloadReceipt = async () => {
    const token = await getAccessToken();
    const url = `/api/disputes/refund-receipt?refund_id=${dispute.refund_id}&dispute_id=${dispute.id}`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `refund_receipt_${dispute.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  ```
- **Impact:** 🟡 **Medium** - Read-only action, less critical

---

### 3. **Missing TypeScript Interfaces Alignment**

**Problem:** Local interfaces don't match API contract.

**Current Interface (DisputesView.tsx line 21-38):**
```typescript
interface Dispute {
  id: string;
  payment_id: string;
  client_reason: string;
  dispute_type: DisputeType;
  merchant_defense: string;
  date: string;
  status: DisputeStatus;
  is_refunded: boolean;
  refund_id?: string;
  is_infraction: boolean;
  infraction_reason: string;
  infraction_severity: 'low' | 'medium' | 'high' | null;
  deadline: string;
  amount: string;
  clientName: string; // ❌ Should be client_name
}
```

**Expected Interface (from API_CONTRACT_DISPUTES.md):**
```typescript
export interface Dispute {
  id: string;
  payment_id: string;
  client_name: string; // ✅ snake_case per backend contract
  client_email: string; // ❌ MISSING
  client_phone: string | null; // ❌ MISSING
  client_reason: string;
  dispute_type: DisputeType;
  merchant_defense: string | null; // ✅ Should be nullable
  defense_submitted_at: string | null; // ❌ MISSING
  date: string;
  status: DisputeStatus;
  is_refunded: boolean;
  refund_id: string | null;
  refund_amount: string | null; // ❌ MISSING
  refund_date: string | null; // ❌ MISSING
  is_infraction: boolean;
  infraction_reason: string | null; // ✅ Should be nullable
  infraction_severity: 'low' | 'medium' | 'high' | null;
  deadline: string;
  amount: string;
  currency: string; // ❌ MISSING
  created_at: string; // ❌ MISSING
  updated_at: string; // ❌ MISSING
}
```

**What to Do:**
1. Import `Dispute` interface from `/src/app/lib/queries.ts` (once added there)
2. Remove local interface definition
3. Update mock data to match API contract field names

**Impact:** 🟡 **Medium** - Causes runtime errors when real API is connected

---

### 4. **Missing Submit Defense UI**

**Problem:** "Submit Defense" button exists but has no form/modal to collect defense text and attachments.

**What's Missing:**
- DefenseFormModal component (similar to RefundConfirmationModal)
- Textarea for defense text (min 50 chars, max 2000 chars per spec)
- File upload for attachments (max 5 files, 10MB each, PDF/JPG/PNG)
- Base64 conversion for attachment files
- Validation logic

**Expected Modal Structure:**
```typescript
<DefenseFormModal
  isOpen={isDefenseModalOpen}
  onClose={() => setIsDefenseModalOpen(false)}
  onSubmit={handleDefenseSubmit}
  disputeId={dispute.id}
  minChars={50}
  maxChars={2000}
  maxAttachments={5}
  maxFileSize={10 * 1024 * 1024} // 10MB
/>
```

**Impact:** 🔴 **Critical** - Cannot submit defense (primary write action)

---

### 5. **Missing Search API Integration**

**Problem:** Quick search uses in-memory filter instead of `/api/disputes/search` endpoint.

**Current Implementation:**
```typescript
const foundDispute = mockDisputes.find(dsp => 
  dsp.id.toLowerCase() === query ||
  dsp.payment_id.toLowerCase() === query ||
  dsp.clientName.toLowerCase().includes(query)
);
```

**Expected Implementation:**
```typescript
import { queryDisputeSearch } from '../lib/queries';

const handleQuickSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!searchQuery.trim()) return;
  
  setIsSearching(true);
  setSearchError('');
  
  try {
    const result = await queryDisputeSearch({ query: searchQuery.trim() });
    
    if (result.found) {
      setSelectedDispute(result.dispute);
      setSearchQuery('');
    } else {
      setSearchError(t('disputes.quickSearch.notFound'));
    }
  } catch (error) {
    setSearchError('Search failed. Please try again.');
  } finally {
    setIsSearching(false);
  }
};
```

**Impact:** 🟡 **Medium** - Search works on mock data but won't scale to real API

---

### 6. **Missing Dispute Details API Call**

**Problem:** Modal receives full dispute object from parent, but spec requires loading details on modal open.

**Current Flow:**
```typescript
// DisputesView passes full dispute object
<DisputeDetailsModal
  dispute={selectedDispute}
  isOpen={!!selectedDispute}
  onClose={() => setSelectedDispute(null)}
/>
```

**Expected Flow (per API_CONTRACT_DISPUTES.md):**
```typescript
// DisputesView only passes dispute ID
<DisputeDetailsModal
  disputeId={selectedDispute?.id}
  isOpen={!!selectedDispute}
  onClose={() => setSelectedDispute(null)}
/>

// Inside DisputeDetailsModal:
const { data: disputeDetails, loading, error } = useQuery(
  () => queryDisputeDetails({ dispute_id: disputeId }),
  { dispute_id: disputeId },
  { skip: !disputeId }
);
```

**Why This Matters:**
- List query returns lightweight data
- Details query returns full timeline, transaction details, client info
- Reduces initial page load data

**Impact:** 🟢 **Low** - Works for now but not optimal architecture

---

### 7. **Missing Timeline Section**

**Problem:** Modal doesn't show dispute timeline as specified in API contract.

**What's Missing:**
```typescript
<div>
  <h3>Timeline</h3>
  {disputeDetails?.timeline.map((event) => (
    <div key={event.timestamp}>
      <p>{event.event}</p>
      <p>{event.description}</p>
      <p>{event.timestamp}</p>
      <p>Actor: {event.actor}</p>
    </div>
  ))}
</div>
```

**Impact:** 🟢 **Low** - Nice-to-have, not critical for MVP

---

### 8. **Missing Empty State**

**Problem:** No empty state when `filteredDisputes.length === 0`.

**Expected (per FEATURE_DISPUTES.md):**
```tsx
{filteredDisputes.length === 0 && (
  <div className="text-center py-12">
    <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
    <h3>No disputes found for selected filters</h3>
    <p className="text-muted-foreground">
      Try adjusting date range or filters.
    </p>
  </div>
)}
```

**Impact:** 🟢 **Low** - UX polish, not critical

---

## 🟡 Medium Priority Issues

### 9. **No Loading States**

**Problem:** No skeleton loaders or spinners during data fetch.

**What to Add:**
```typescript
if (loading) {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-card rounded-md p-5 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
```

**Impact:** 🟡 **Medium** - UX degradation on slow networks

---

### 10. **No Error Handling**

**Problem:** No error states for failed queries/commands.

**What to Add:**
```typescript
if (error) {
  return (
    <Banner
      variant="alert"
      title="Failed to load disputes"
      description={error.message}
      action={
        <Button onClick={refetch} size="sm">
          Retry
        </Button>
      }
    />
  );
}
```

**Impact:** 🟡 **Medium** - Poor UX when API fails

---

### 11. **No RBAC (Role-Based Access Control)**

**Problem:** No checks for user role.

**What's Required (per FEATURE_DISPUTES.md):**
- Admin/Operations: Full access (read + write)
- Analyst: Read-only (no Submit Defense, no Refund buttons)
- Developer: No access (403)

**What to Add:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
const canWrite = user?.role === 'user_admin_crossramp' || 
                 user?.role === 'user_operations_crossramp';
const canRead = canWrite || user?.role === 'user_analyst_crossramp';

if (!canRead) {
  return <div>Access Denied</div>;
}

// In modal footer:
{canWrite && (
  <Button variant="write" onClick={handleSubmitDefense}>
    Submit Defense
  </Button>
)}
```

**Impact:** 🔴 **Critical** - Security issue

---

### 12. **MFA Integration Issues**

**Problem:** MFAModal is called but doesn't use Auth0 `loginWithMFA()`.

**Current Flow:**
```typescript
// DisputeDetailsModal.tsx line 131
const handleMFAVerify = () => {
  console.log('Processing refund for dispute:', dispute.id);
  // ... no actual MFA verification
};
```

**Expected Flow (per architecture):**
```typescript
const { loginWithMFA } = useAuth();

const handleRefundClick = async () => {
  // Step 1: Show confirmation modal
  setIsRefundConfirmOpen(true);
};

const handleRefundConfirm = async (reason: string) => {
  setRefundReason(reason);
  setIsRefundConfirmOpen(false);
  
  // Step 2: Trigger MFA (Auth0 popup)
  try {
    const mfaToken = await loginWithMFA();
    
    // Step 3: Submit command with MFA token
    await refundAndResolveDispute({
      dispute_id: dispute.id,
      payment_id: dispute.payment_id,
      refund_amount: parseAmount(dispute.amount),
      refund_reason: reason,
      mark_as_resolved: true
    }, { accessToken: mfaToken, user });
    
    toast.success('Refund processed successfully');
    refetch();
    onClose();
  } catch (error) {
    if (error.error_code === 'INSUFFICIENT_BALANCE') {
      toast.error(`Cannot process refund. ${error.message}`);
    } else {
      toast.error('Refund failed. Please try again.');
    }
  }
};
```

**Impact:** 🔴 **Critical** - MFA requirement not enforced

---

### 13. **Missing Translation Keys**

**Problem:** Uses translation keys that may not exist in `/src/app/content/strings.ts`.

**Keys Used:**
- `disputes.title`
- `disputes.subtitle`
- `disputes.quickSearch.*`
- `disputes.filter.*`
- `disputes.status.*`
- `disputes.type.*`
- `disputes.deadline.*`
- `disputes.modal.*`
- `disputes.severity.*`
- `refund.confirmation.*`

**What to Do:**
1. Check `/src/app/content/strings.ts` for these keys
2. Add missing translations for EN, PT, ES

**Impact:** 🟡 **Medium** - Shows raw keys instead of translated text

---

## 📊 Gap Summary Table

| Component | Feature | Status | Priority | Effort |
|-----------|---------|--------|----------|--------|
| DisputesView | List query integration | ❌ Missing | 🔴 Critical | 2h |
| DisputesView | Search query integration | ❌ Missing | 🟡 Medium | 1h |
| DisputesView | Loading states | ❌ Missing | 🟡 Medium | 1h |
| DisputesView | Error handling | ❌ Missing | 🟡 Medium | 1h |
| DisputesView | Empty state | ❌ Missing | 🟢 Low | 0.5h |
| DisputesView | RBAC checks | ❌ Missing | 🔴 Critical | 1h |
| DisputeDetailsModal | Details query integration | ❌ Missing | 🟢 Low | 1h |
| DisputeDetailsModal | Submit Defense UI | ❌ Missing | 🔴 Critical | 3h |
| DisputeDetailsModal | Submit Defense command | ❌ Missing | 🔴 Critical | 2h |
| DisputeDetailsModal | Refund command | ❌ Missing | 🔴 Critical | 2h |
| DisputeDetailsModal | Contest Infraction UI | ❌ Missing | 🟡 Medium | 3h |
| DisputeDetailsModal | Contest Infraction command | ❌ Missing | 🟡 Medium | 2h |
| DisputeDetailsModal | Download receipt | ❌ Missing | 🟡 Medium | 1h |
| DisputeDetailsModal | Timeline display | ❌ Missing | 🟢 Low | 2h |
| DisputeDetailsModal | MFA integration | ❌ Missing | 🔴 Critical | 2h |
| queries.ts | Dispute interfaces | ❌ Missing | 🔴 Critical | 1h |
| queries.ts | queryDisputesList | ❌ Missing | 🔴 Critical | 2h |
| queries.ts | queryDisputeSearch | ❌ Missing | 🟡 Medium | 1h |
| queries.ts | queryDisputeDetails | ❌ Missing | 🟢 Low | 1h |
| commands.ts | submitDisputeDefense | ❌ Missing | 🔴 Critical | 2h |
| commands.ts | refundAndResolveDispute | ❌ Missing | 🔴 Critical | 2h |
| commands.ts | contestDisputeInfraction | ❌ Missing | 🟡 Medium | 2h |
| strings.ts | Disputes translations | ⚠️ Unknown | 🟡 Medium | 2h |

**Total Effort Estimate:** ~35 hours

---

## 🎯 Recommended Implementation Order

### Phase 1: Foundation (Critical Path) - 10h
1. ✅ Add Dispute interfaces to `/src/app/lib/queries.ts` (1h)
2. ✅ Implement `queryDisputesList()` in queries.ts (2h)
3. ✅ Integrate list query into DisputesView with useQuery hook (2h)
4. ✅ Add loading states + error handling (2h)
5. ✅ Add RBAC checks (1h)
6. ✅ Verify translations in strings.ts (2h)

### Phase 2: Write Commands (Critical Path) - 12h
1. ✅ Implement `submitDisputeDefense()` in commands.ts (2h)
2. ✅ Implement `refundAndResolveDispute()` in commands.ts (2h)
3. ✅ Create DefenseFormModal component (3h)
4. ✅ Integrate Submit Defense command with MFA (2h)
5. ✅ Integrate Refund command with MFA (2h)
6. ✅ Add proper error handling for commands (1h)

### Phase 3: Secondary Features - 8h
1. ✅ Implement `queryDisputeSearch()` (1h)
2. ✅ Integrate search query (1h)
3. ✅ Implement download refund receipt (1h)
4. ✅ Implement `contestDisputeInfraction()` command (2h)
5. ✅ Create ContestInfractionModal component (3h)

### Phase 4: Polish - 5h
1. ✅ Implement `queryDisputeDetails()` for modal (1h)
2. ✅ Add timeline display (2h)
3. ✅ Add empty state (0.5h)
4. ✅ Test all flows end-to-end (1.5h)

---

## 🚀 Next Steps for Implementation (Step 4)

Based on this assessment, **Step 4: Implement/Update DisputesView** should focus on:

1. **Add TypeScript interfaces to queries.ts**
   - Copy interfaces from API_CONTRACT_DISPUTES.md
   - Export Dispute, DisputeDetails, DisputeTimelineEvent types

2. **Implement query functions in queries.ts**
   - `queryDisputesList()`
   - `queryDisputeSearch()`
   - `queryDisputeDetails()`

3. **Implement command functions in commands.ts**
   - `submitDisputeDefense()`
   - `refundAndResolveDispute()`
   - `contestDisputeInfraction()`

4. **Update DisputesView.tsx**
   - Replace mock data with useQuery hook
   - Add loading/error states
   - Add RBAC checks
   - Fix interface alignment (client_name vs clientName)

5. **Update DisputeDetailsModal.tsx**
   - Create DefenseFormModal component
   - Integrate Submit Defense command
   - Integrate Refund command with proper MFA
   - Add Contest Infraction flow

6. **Add missing translations to strings.ts**
   - All disputes.* keys
   - All refund.* keys
   - All severity.* keys

---

## Conclusion

The Disputes feature has a **solid UI foundation** that demonstrates good understanding of the UX requirements. However, it's currently a **non-functional prototype** due to complete lack of backend integration.

**Priority:** Focus on **Phase 1 (Foundation)** and **Phase 2 (Write Commands)** to get the feature to **MVP state** where users can actually list disputes, submit defenses, and process refunds.

**Estimated Time to MVP:** ~22 hours (Phase 1 + Phase 2)

**Key Blocker:** No query/command functions exist in queries.ts or commands.ts yet. These must be created first before the view components can be updated.
