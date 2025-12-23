# API Contract: Statement

**Feature:** Statement (Financial Ledger)  
**Component:** `/src/app/views/StatementView.tsx`  
**Modal Component:** `/src/app/components/modals/StatementDetailsModal.tsx`  
**Navigation ID:** `statement`  
**Access Control:** Admin, Operations, Analyst (Read-only)

---

## Feature Overview

Statement is a read-only financial ledger view showing all account transactions with debit/credit entries, balance changes, and detailed transaction history. This is the accounting reconciliation page for auditors and financial analysis.

### User Story

**As** an administrator or financial analyst at Crossramp,  
**I want** to view a complete statement of all financial movements (debits and credits) across all my accounts with resulting balances and detailed history,  
**So that** I can reconcile accounts for auditing, track cash flow, validate all transactions were processed correctly, generate monthly accounting reports, and have a unified view of all financial operations.

---

## RBAC (Role-Based Access Control)

### Access Matrix

| Role | Can View Statement | Can Search | Can Export Report | Notes |
|------|-------------------|------------|-------------------|-------|
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes | Full read access |
| **Operations** | ✅ Yes | ✅ Yes | ✅ Yes | Full read access (same as Admin) |
| **Analyst** | ✅ Yes | ✅ Yes | ✅ Yes | Read-only access |
| **Developer** | ❌ No | ❌ No | ❌ No | No access (page hidden in nav) |

### Important Notes

- **100% Read-only:** Statement has NO write actions. All entries are system-generated.
- **No MFA required:** Since there are no write operations, no MFA flows are needed.
- **Audit trail:** Statement entries cannot be edited or deleted (immutable ledger).
- **Future write actions:** Potential future actions include adding notes, marking as reconciled, or manual categorization (not currently implemented).

---

## Query Actions (Reads)

### 1. Get Statement List

**Endpoint:** `GET /api/statement/list`  
**Category:** B (Soft refresh every 60 seconds)  
**Purpose:** Fetch paginated list of statement entries with filters

#### Request Headers
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

#### Request Body
```json
{
  "date_from": "2025-11-22T00:00:00Z",
  "date_to": "2025-12-22T23:59:59Z",
  "direction": "all",
  "account": "all",
  "page": 1,
  "limit": 10,
  "sort_by": "date",
  "sort_order": "desc"
}
```

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `date_from` | ISO 8601 DateTime | Yes | - | Start of date range (inclusive) |
| `date_to` | ISO 8601 DateTime | Yes | - | End of date range (inclusive) |
| `direction` | String | Yes | "all" | Filter by direction: "all", "incoming" (credit > debit), "outgoing" (debit > credit) |
| `account` | String | Yes | "all" | Account filter: "all" or specific account_id (e.g., "acc_brl_001") |
| `page` | Integer | Yes | 1 | Page number (1-indexed) |
| `limit` | Integer | Yes | 10 | Items per page |
| `sort_by` | String | Yes | "date" | Sort field (currently only "date" supported) |
| `sort_order` | String | Yes | "desc" | Sort order: "asc" or "desc" |

#### Response Body
```json
{
  "entries": [
    {
      "id": "stmt_001",
      "date": "2025-12-16T12:30:00Z",
      "debit": 0,
      "credit": 15000.00,
      "balance_before": 50000.00,
      "resulting_balance": 65000.00,
      "currency": "BRL",
      "info": "Payment received from Customer ABC - Invoice #12345",
      "account": "BRL Main Account",
      "account_id": "acc_brl_001",
      "linked_transaction_id": "tx_001",
      "linked_transaction_type": "payment_in",
      "category": "payment_received",
      "reconciliation_status": "reconciled",
      "created_at": "2025-12-16T12:30:00Z"
    }
  ],
  "summary": {
    "total_debits": 8400.00,
    "total_credits": 71450.00,
    "net_change": 63050.00,
    "starting_balance": 0,
    "ending_balance": 63050.00,
    "currency": "BRL"
  },
  "pagination": {
    "current_page": 1,
    "total_pages": 2,
    "total_count": 12,
    "per_page": 10
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `entries` | Array | List of statement entries for current page |
| `entries[].id` | String | Unique statement entry ID (e.g., "stmt_001") |
| `entries[].date` | ISO 8601 DateTime | Date/time of transaction |
| `entries[].debit` | Number | Amount leaving account (negative impact) |
| `entries[].credit` | Number | Amount entering account (positive impact) |
| `entries[].balance_before` | Number | Balance before this entry was applied |
| `entries[].resulting_balance` | Number | Balance after this entry (balance_before + credit - debit) |
| `entries[].currency` | String | Currency code (BRL, USD, USDC, etc.) |
| `entries[].info` | String | Human-readable description of transaction |
| `entries[].account` | String | Account name (e.g., "BRL Main Account") |
| `entries[].account_id` | String | Unique account identifier |
| `entries[].linked_transaction_id` | String (nullable) | ID of linked payment/withdrawal (null for fees/adjustments) |
| `entries[].linked_transaction_type` | String (nullable) | Type: payment_in, payment_out, withdrawal, refund, fee, conversion |
| `entries[].category` | String | Entry category (see Category Types below) |
| `entries[].reconciliation_status` | String | Status: pending, reconciled, disputed |
| `entries[].created_at` | ISO 8601 DateTime | When entry was created |
| `summary` | Object | Period summary statistics |
| `summary.total_debits` | Number | Sum of all debits in period |
| `summary.total_credits` | Number | Sum of all credits in period |
| `summary.net_change` | Number | Net change (total_credits - total_debits) |
| `summary.starting_balance` | Number | Balance at start of period |
| `summary.ending_balance` | Number | Balance at end of period |
| `summary.currency` | String | Currency (for single-currency views) |
| `pagination` | Object | Pagination metadata |

#### Error Handling

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions to view statement"
}
```

**400 Bad Request:**
```json
{
  "error": "Bad Request",
  "message": "Invalid date range: end date must be after start date"
}
```

**Frontend Behavior:**
- Display toast: "Failed to load statement"
- Show empty state with Retry button
- Retry button reloads the page

---

### 2. Search Statement by ID

**Endpoint:** `GET /api/statement/search`  
**Category:** B (On-demand search)  
**Purpose:** Quick search for specific statement entry by ID

#### Request Headers
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

#### Request Body
```json
{
  "query": "stmt_001"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | String | Yes | Statement transaction ID to search (e.g., "stmt_001") |

#### Response Body (Found)
```json
{
  "found": true,
  "entry": {
    "id": "stmt_001",
    "date": "2025-12-16T12:30:00Z",
    "debit": 0,
    "credit": 15000.00,
    "balance_before": 50000.00,
    "resulting_balance": 65000.00,
    "currency": "BRL",
    "info": "Payment received from Customer ABC - Invoice #12345",
    "account": "BRL Main Account",
    "account_id": "acc_brl_001",
    "linked_transaction_id": "tx_001",
    "linked_transaction_type": "payment_in",
    "category": "payment_received",
    "reconciliation_status": "reconciled",
    "created_at": "2025-12-16T12:30:00Z"
  }
}
```

#### Response Body (Not Found)
```json
{
  "found": false
}
```

#### Error Handling

**Frontend Behavior (found=false):**
- Display error message below search input: "Transaction not found"
- Do NOT open modal

**Frontend Behavior (found=true):**
- Open StatementDetailsModal with entry details
- Clear search input
- No toast notification

---

### 3. Get Accounts List

**Endpoint:** `GET /api/statement/accounts`  
**Category:** C (Load once on page mount)  
**Purpose:** Fetch list of all accounts for filter dropdown

#### Request Headers
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

#### Request Body
```json
{}
```

#### Response Body
```json
{
  "accounts": [
    {
      "account_id": "acc_brl_001",
      "account_name": "BRL Main Account",
      "currency": "BRL",
      "current_balance": 65000.00,
      "account_type": "main"
    },
    {
      "account_id": "acc_usd_001",
      "account_name": "USD Account",
      "currency": "USD",
      "current_balance": 12500.00,
      "account_type": "secondary"
    },
    {
      "account_id": "acc_usdc_001",
      "account_name": "USDC Account",
      "currency": "USDC",
      "current_balance": 8700.00,
      "account_type": "crypto"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `accounts` | Array | List of all merchant accounts |
| `accounts[].account_id` | String | Unique account identifier |
| `accounts[].account_name` | String | Display name for account |
| `accounts[].currency` | String | Account currency code |
| `accounts[].current_balance` | Number | Current account balance |
| `accounts[].account_type` | String | Type: main, secondary, crypto |

#### Error Handling

**Non-blocking error:**
- If this endpoint fails, frontend continues to work
- Account dropdown shows only "All Accounts" option
- No toast notification
- Console log error for debugging

---

### 4. Get Period Summary (Future)

**Endpoint:** `GET /api/statement/summary`  
**Category:** B (Load on demand for summary card)  
**Purpose:** Get detailed breakdown of period summary by account and category

**Note:** This endpoint is defined in spec but NOT currently implemented in frontend. Frontend uses `summary` field from `/api/statement/list` response instead.

#### Request Body
```json
{
  "date_from": "2025-11-22T00:00:00Z",
  "date_to": "2025-12-22T23:59:59Z",
  "account": "all"
}
```

#### Response Body
```json
{
  "period": {
    "from": "2025-11-22T00:00:00Z",
    "to": "2025-12-22T23:59:59Z"
  },
  "summary": {
    "total_debits": 8400.00,
    "total_credits": 71450.00,
    "net_change": 63050.00,
    "starting_balance": 0,
    "ending_balance": 63050.00,
    "currency": "BRL"
  },
  "breakdown_by_account": [
    {
      "account_id": "acc_brl_001",
      "account_name": "BRL Main Account",
      "debits": 5400.00,
      "credits": 60000.00,
      "net": 54600.00
    },
    {
      "account_id": "acc_usd_001",
      "account_name": "USD Account",
      "debits": 3000.00,
      "credits": 11450.00,
      "net": 8450.00
    }
  ],
  "breakdown_by_category": [
    {
      "category": "payment_received",
      "total": 58000.00
    },
    {
      "category": "withdrawal",
      "total": -7500.00
    },
    {
      "category": "fee",
      "total": -900.00
    }
  ]
}
```

---

## Command Actions (Writes)

**NONE.** Statement is 100% read-only.

All statement entries are created automatically by the system when other actions occur:
- Payments (in/out) generate entries
- Withdrawals generate entries
- Refunds generate entries
- Fees (processing, network, monthly) generate entries
- System adjustments (by Crossramp Ops) generate entries

---

## Category Types Reference

| Category | Debit | Credit | Description | Linked Type |
|----------|-------|--------|-------------|-------------|
| `payment_received` | 0 | ✓ | Payment in received from customer | `payment_in` |
| `payment_sent` | ✓ | 0 | Payment out sent (rare) | `payment_out` |
| `withdrawal` | ✓ | 0 | Merchant withdrew funds to bank/wallet | `withdrawal` |
| `refund_issued` | ✓ | 0 | Merchant processed refund for customer | `refund` |
| `refund_received` | 0 | ✓ | Merchant received refund from partner/provider | `refund` |
| `fee_processing` | ✓ | 0 | Transaction processing fee | `fee` |
| `fee_network` | ✓ | 0 | Blockchain network fee (gas) | `fee` |
| `fee_monthly` | ✓ | 0 | Monthly service fee | `fee` |
| `adjustment_credit` | 0 | ✓ | Manual credit adjustment (Crossramp Ops) | null |
| `adjustment_debit` | ✓ | 0 | Manual debit adjustment (Crossramp Ops) | null |
| `conversion` | ✓ | ✓ | Currency conversion (creates 2 entries) | `conversion` |
| `split_payment` | ✓ | 0 | Revenue share split to partner | `payment_in` |

---

## Query Refresh Strategy

### Category B Queries (Soft Refresh 60s)

**Endpoints:**
- `GET /api/statement/list`
- `GET /api/statement/search` (on-demand, no polling)
- `GET /api/statement/summary` (not currently used)

**Refresh Logic:**
```typescript
useEffect(() => {
  const fetchStatement = async () => { /* ... */ };
  
  fetchStatement();
  const interval = setInterval(fetchStatement, 60000); // 60s
  
  return () => clearInterval(interval);
}, [dateRange, directionFilter, accountFilter, currentPage]);
```

**Behavior:**
- Initial fetch on page load
- Soft refresh every 60 seconds while page is visible
- Re-fetch when filters change (date range, direction, account, page)
- Clear interval on unmount

### Category C Queries (Load Once)

**Endpoints:**
- `GET /api/statement/accounts`

**Refresh Logic:**
```typescript
useEffect(() => {
  const fetchAccounts = async () => { /* ... */ };
  fetchAccounts();
}, []); // Empty deps = load once
```

**Behavior:**
- Fetch once on component mount
- No polling
- Non-blocking error (frontend continues if fails)

---

## Multi-Currency Handling

### Scenario: Multiple Currencies in Statement

When merchant has accounts in multiple currencies (BRL, USD, USDC), statement list shows entries from all currencies mixed together.

**Frontend Behavior:**
- Display all entries in chronological order
- Each entry shows its own currency (BRL, USD, USDC)
- **Do NOT convert to single currency** (exchange rates fluctuate)
- Summary card shows breakdown by currency separately:
  ```
  BRL: +R$ 63,050 (71k credits - 8k debits)
  USD: +$2,450 (3k credits - 550 debits)
  USDC: +1,200 USDC (1.5k credits - 300 debits)
  ```

### Account Filtering

- `account: "all"` → Backend returns all entries from all accounts
- `account: "acc_brl_001"` → Backend filters only BRL Main Account entries
- Frontend uses account_id (not account_name) for filtering

---

## Edge Cases

### 1. Overdraft (Negative Balance)

**Scenario:** Merchant withdraws more than available balance (allowed with special agreement).

**Backend Response:**
```json
{
  "resulting_balance": -1500.00
}
```

**Frontend Behavior:**
- Display balance normally (negative sign shows automatically)
- Optional: Show "Overdraft" badge in red (future enhancement)

### 2. Conversion Entry (2 Entries for 1 Transaction)

**Scenario:** Merchant converts R$ 5,000 BRL → 1,000 USDT.

**Backend Response:** Creates 2 separate entries with same `linked_transaction_id`:
```json
[
  {
    "id": "stmt_100",
    "debit": 5000.00,
    "credit": 0,
    "currency": "BRL",
    "info": "Conversion to USDT",
    "linked_transaction_id": "conv_001"
  },
  {
    "id": "stmt_101",
    "debit": 0,
    "credit": 1000.00,
    "currency": "USDT",
    "info": "Conversion from BRL",
    "linked_transaction_id": "conv_001"
  }
]
```

**Frontend Behavior:**
- Display both entries separately in list
- Each entry has its own currency and balance
- Optional: Group visually with "Conversion" badge (future enhancement)

### 3. Entry Without linked_transaction_id

**Scenario:** Monthly fee or manual adjustment.

**Backend Response:**
```json
{
  "id": "stmt_200",
  "debit": 300.00,
  "credit": 0,
  "linked_transaction_id": null,
  "linked_transaction_type": "fee",
  "info": "Monthly service fee - December 2025"
}
```

**Frontend Behavior:**
- Display normally
- Modal does NOT show "View Payment" link
- `info` field provides sufficient description

### 4. Same Timestamp Ordering

**Scenario:** Payment R$ 1,000 at 12:30:00 + Fee R$ 15 also at 12:30:00.

**Backend Guarantee:**
- Credit entry (payment) always comes BEFORE debit entry (fee)
- Use `sequence_number` or microseconds to ensure correct order
- Ensures `balance_before` is correct for fee entry

**Example:**
```json
[
  {
    "id": "stmt_001",
    "date": "2025-12-16T12:30:00.000Z",
    "credit": 1000.00,
    "debit": 0,
    "balance_before": 50000.00,
    "resulting_balance": 51000.00
  },
  {
    "id": "stmt_002",
    "date": "2025-12-16T12:30:00.001Z",
    "debit": 15.00,
    "credit": 0,
    "balance_before": 51000.00,
    "resulting_balance": 50985.00
  }
]
```

---

## Frontend Implementation Summary

### Data Flow

```
Component Mount
  ↓
Fetch Accounts (Category C)
  ↓
Fetch Statement List (Category B)
  ↓
Start 60s Polling (Category B)
  ↓
User Changes Filters → Re-fetch
  ↓
User Searches by ID → Quick Search
  ↓
User Clicks Entry → Open Modal
  ↓
Component Unmount → Clear Intervals
```

### State Management

```typescript
// Filter state
const [directionFilter, setDirectionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
const [accountFilter, setAccountFilter] = useState<string>('all');
const [dateRange, setDateRange] = useState<DateRange>(last30Days);
const [currentPage, setCurrentPage] = useState(1);
const [generalSearchQuery, setGeneralSearchQuery] = useState('');

// Data state
const [statementData, setStatementData] = useState<StatementListResponse | null>(null);
const [accounts, setAccounts] = useState<Account[]>([]);
const [isLoadingStatement, setIsLoadingStatement] = useState(true);
const [error, setError] = useState<string | null>(null);

// Modal state
const [selectedTransaction, setSelectedTransaction] = useState<StatementTransaction | null>(null);
```

### Client-Side Filtering

General search filter (by description/account) is applied **client-side** after fetching data:

```typescript
const applyGeneralSearchFilter = (entries: StatementEntry[]): StatementEntry[] => {
  if (!generalSearchQuery.trim()) return entries;
  
  const query = generalSearchQuery.toLowerCase();
  return entries.filter(entry => 
    entry.info.toLowerCase().includes(query) ||
    entry.account.toLowerCase().includes(query) ||
    entry.id.toLowerCase().includes(query)
  );
};
```

Direction and account filters are applied **server-side** (via API params).

---

## Translations

All UI strings use the `useStrings()` hook with keys in `/src/app/content/strings.ts`:

**Example Keys:**
```typescript
'statement.title': 'Statement',
'statement.subtitle': 'View all account transactions and balance changes',
'statement.quickSearch.title': 'Quick Search',
'statement.quickSearch.placeholder': 'Transaction ID',
'statement.quickSearch.button': 'Search',
'statement.quickSearch.notFound': 'Transaction not found',
'statement.filters.direction': 'Direction',
'statement.filters.incoming': 'Incoming',
'statement.filters.outgoing': 'Outgoing',
'statement.filters.account': 'Account',
'statement.filters.allAccounts': 'All Accounts',
'statement.details.title': 'Transaction Details',
'statement.time.minutesAgo': '{minutes}m ago',
'statement.time.hoursAgo': '{hours}h ago',
'statement.time.daysAgo': '{days}d ago',
'statement.time.yesterday': 'Yesterday',
```

Full translations available in English, Portuguese, and Spanish.

---

## Testing Scenarios

### Functional Tests

1. **Basic Load:**
   - Open Statement page → Should fetch last 30 days
   - Verify loading spinner appears during fetch
   - Verify entries display after load

2. **Quick Search:**
   - Enter valid statement ID → Should open modal
   - Enter invalid ID → Should show "Transaction not found"
   - Clear search → Error message disappears

3. **Direction Filter:**
   - Click "Incoming" → Should show only credit entries
   - Click "Outgoing" → Should show only debit entries
   - Click "All" → Should show all entries

4. **Account Filter:**
   - Select "BRL Main Account" → Should show only BRL entries
   - Select "All Accounts" → Should show all accounts

5. **Date Range:**
   - Change to last 7 days → Should refetch with new range
   - Verify pagination resets to page 1

6. **General Search:**
   - Expand search bar → Enter "Invoice" → Should filter list client-side
   - Clear search → Full list returns

7. **Pagination:**
   - Click Next → Should fetch page 2
   - Click Previous → Should return to page 1
   - Verify page numbers update correctly

8. **Entry Click:**
   - Click any entry → Should open StatementDetailsModal
   - Verify all fields display correctly (ID, date, debit, credit, balances)
   - Click Close → Modal disappears

9. **Request Report:**
   - Click "Request Report" → Should open RequestReportModal
   - Select date range and format → Request should succeed

### Edge Case Tests

1. **Empty State:** No transactions → Should show "No transactions found"
2. **Error State:** API fails → Should show error with Retry button
3. **Negative Balance:** Entry with resulting_balance < 0 → Should display normally
4. **Multi-Currency:** Mix of BRL, USD, USDC → Should display correctly
5. **Long Description:** Very long `info` text → Should truncate properly

### Performance Tests

1. **60s Polling:** Leave page open → Should refetch every 60 seconds
2. **Filter Change:** Change filter → Should cancel old request, start new one
3. **Component Unmount:** Navigate away → Should clear intervals

---

## Related Documentation

- **Feature Spec:** `/docs/FEATURE_STATEMENT.md` (Comprehensive product documentation)
- **Architecture:** `/docs/ARCHITECTURE_QUERIES.md` (Query category system)
- **UI Strings:** `/src/app/content/strings.ts` (Translation keys)
- **RBAC:** See "Access Matrix" section above

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-23 | 1.0 | Initial API contract with full query integration |

---

## Notes for Backend Engineers

1. **GET with Body:** Spec uses GET with JSON body. Consider using query params instead for RESTful best practices.
2. **Immutable Ledger:** Statement entries must NEVER be editable or deletable. This is an audit requirement.
3. **Timestamp Precision:** Use microseconds or sequence_number to ensure correct ordering for same-timestamp entries.
4. **Multi-Currency Summary:** When `account: "all"`, return separate summaries per currency (don't convert).
5. **Direction Filter:** `incoming` = `credit > debit`, `outgoing` = `debit > credit`.
6. **Account Filter:** Use account_id (not account_name) for filtering.
7. **Pagination:** Always return `total_count` for frontend to calculate page numbers.
8. **Search:** `/api/statement/search` should search ONLY by exact `id` match (case-insensitive).
