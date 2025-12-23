# API Contract: Dashboard (Overview) Endpoints

**Document Version:** 1.0  
**Last Updated:** December 23, 2024  
**Owner:** Frontend Team  
**Target:** Bastion Service Backend Team

---

## Overview

This document defines the **frontend-first API contract** for the Dashboard (Overview) page. The Bastion service must implement these endpoints to match the exact structure expected by the frontend application.

**Frontend Implementation Status:** ✅ Complete  
**Backend Implementation Status:** ⚠️ Pending

---

## Authentication

All endpoints require authentication via Bearer token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

The JWT token should contain:
- User ID
- Role claims (admin, operations, analyst, developer)
- Company/Tenant ID

---

## Endpoints

### 1. Get Available Balance

**Endpoint:** `GET /api/balance/available`  
**Query Category:** **A** (Manual refresh only - no auto-polling)  
**Frontend Function:** `queryAvailableBalance()` in `/src/app/lib/queries.ts`

#### Request

```http
GET /api/balance/available
Authorization: Bearer <JWT_TOKEN>
```

No query parameters or request body.

#### Response (Success - 200 OK)

```json
{
  "amount": 12480.90,
  "currency": "BRL",
  "settles_in": "USDT",
  "updated_at": "2024-12-23T14:32:00Z"
}
```

**Field Definitions:**
- `amount` (number, required): Available balance amount as decimal number
- `currency` (string, required): Currency code (e.g., "BRL", "USD", "USDT")
- `settles_in` (string, required): Settlement currency code (e.g., "USDT", "USDC")
- `updated_at` (string, required): ISO 8601 timestamp of when balance was last updated

#### Response (Error)

```json
{
  "error": "string",
  "message": "string",
  "code": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows skeleton loader
- Error state: Shows "Failed to load balance" with manual refresh button
- Success: Displays formatted currency with "Updated X min ago" relative time

---

### 2. Get Today's Snapshot

**Endpoint:** `GET /api/dashboard/today`  
**Query Category:** **B** (60-second auto-polling when user is idle)  
**Frontend Function:** `queryDashboardToday()` in `/src/app/lib/queries.ts`

#### Request

```http
GET /api/dashboard/today
Authorization: Bearer <JWT_TOKEN>
```

**Optional Query Parameters:**
- `timezone` (string, optional): IANA timezone (e.g., "America/Sao_Paulo")
  - If provided, "today" should be calculated in user's timezone
  - If not provided, use server timezone or default to UTC

#### Response (Success - 200 OK)

```json
{
  "payments_received": {
    "amount": 3240.00,
    "currency": "BRL"
  },
  "payments_pending": {
    "amount": 580.00,
    "currency": "BRL"
  },
  "fees": {
    "amount": 42.15,
    "currency": "BRL"
  },
  "date": "2024-12-23"
}
```

**Field Definitions:**
- `payments_received.amount` (number, required): Total payments received today
- `payments_received.currency` (string, required): Currency code
- `payments_pending.amount` (number, required): Total payments pending today
- `payments_pending.currency` (string, required): Currency code
- `fees.amount` (number, required): Total fees charged today
- `fees.currency` (string, required): Currency code
- `date` (string, required): ISO 8601 date (YYYY-MM-DD) representing "today"

**Business Logic:**
- "Today" should be calculated from 00:00:00 to 23:59:59 in the specified timezone
- All amounts should be positive numbers (use 0 for zero values, not negative)
- If no transactions today, return zeros (not null)

#### Response (Error)

```json
{
  "error": "string",
  "message": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows 3 skeleton rows
- Error state: Shows "Unable to load today's data"
- Empty state: Shows zeros (R$ 0,00)
- Auto-refreshes every 60 seconds

---

### 3. Get Recent Transactions

**Endpoint:** `GET /api/transactions/recent`  
**Query Category:** **B** (60-second auto-polling when user is idle)  
**Frontend Function:** `queryRecentTransactions({ limit: 3 })` in `/src/app/lib/queries.ts`

#### Request

```http
GET /api/transactions/recent?limit=3
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `limit` (integer, optional, default: 10, max: 50): Number of transactions to return
  - Frontend always uses `limit=3` for Dashboard view

#### Response (Success - 200 OK)

```json
{
  "transactions": [
    {
      "id": "tx_001",
      "type": "received",
      "amount": {
        "value": 1450.00,
        "currency": "BRL"
      },
      "description": "Payment from merchant #3421",
      "timestamp": "2024-12-23T13:45:00Z"
    },
    {
      "id": "tx_002",
      "type": "received",
      "amount": {
        "value": 890.00,
        "currency": "BRL"
      },
      "description": "Payment from merchant #2891",
      "timestamp": "2024-12-23T12:30:00Z"
    },
    {
      "id": "tx_003",
      "type": "sent",
      "amount": {
        "value": 2500.00,
        "currency": "BRL"
      },
      "description": "Withdrawal to wallet",
      "timestamp": "2024-12-23T08:15:00Z"
    }
  ]
}
```

**Field Definitions:**
- `transactions` (array, required): Array of transaction objects
- `transactions[].id` (string, required): Unique transaction ID
- `transactions[].type` (string, required): Transaction type - either "received" or "sent"
- `transactions[].amount.value` (number, required): Transaction amount as decimal
- `transactions[].amount.currency` (string, required): Currency code
- `transactions[].description` (string, required): Human-readable description
- `transactions[].timestamp` (string, required): ISO 8601 timestamp

**Business Logic:**
- Return transactions ordered by `timestamp` DESC (newest first)
- Maximum `limit` is 50 (frontend uses 3)
- If no transactions exist, return empty array `{ "transactions": [] }`

#### Response (Error)

```json
{
  "error": "string",
  "message": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows 3 skeleton transaction rows
- Error state: Shows "Unable to load recent transactions"
- Empty state: Shows "No recent transactions" + motivational message
- Auto-refreshes every 60 seconds
- Displays relative time ("10 min ago", "1h ago") using date-fns

---

### 4. Get Payment Status

**Endpoint:** `GET /api/dashboard/payment-status`  
**Query Category:** **B** (60-second auto-polling when user is idle)  
**Frontend Function:** `queryPaymentStatus({ date: 'YYYY-MM-DD' })` in `/src/app/lib/queries.ts`

#### Request

```http
GET /api/dashboard/payment-status?date=2024-12-23
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `date` (string, optional): ISO 8601 date (YYYY-MM-DD)
  - If not provided, default to today
  - Frontend always sends current date

#### Response (Success - 200 OK)

```json
{
  "completed": {
    "count": 24,
    "percentage": 75
  },
  "pending": {
    "count": 6,
    "percentage": 20
  },
  "cancelled_or_expired": {
    "count": 2,
    "percentage": 5
  },
  "total": 32
}
```

**Field Definitions:**
- `completed.count` (integer, required): Number of completed payments
- `completed.percentage` (integer, required): Percentage of total (0-100)
- `pending.count` (integer, required): Number of pending payments
- `pending.percentage` (integer, required): Percentage of total (0-100)
- `cancelled_or_expired.count` (integer, required): Number of cancelled/expired payments
- `cancelled_or_expired.percentage` (integer, required): Percentage of total (0-100)
- `total` (integer, required): Total number of payments (sum of all counts)

**Business Logic:**
- Percentages must sum to 100 (or close due to rounding)
- If `total` is 0, all counts should be 0 and all percentages should be 0
- Percentages should be rounded to nearest integer
- Status categories:
  - **Completed:** Payment successfully processed and settled
  - **Pending:** Payment initiated but not yet completed
  - **Cancelled or Expired:** Payment link expired or cancelled by user/system

#### Response (Error)

```json
{
  "error": "string",
  "message": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows 3 skeleton progress bars
- Error state: Shows "Unable to load payment status"
- Empty state (total=0): Shows "No payments yet"
- Auto-refreshes every 60 seconds
- Renders horizontal progress bars with colors:
  - Completed: `#ff4c00` (orange)
  - Pending: `#ffb400` (amber)
  - Cancelled: muted gray

---

## Error Handling

All endpoints should follow consistent error response format:

### HTTP Status Codes

- **200 OK:** Successful request
- **400 Bad Request:** Invalid request parameters
- **401 Unauthorized:** Missing or invalid authentication token
- **403 Forbidden:** User doesn't have permission for this resource
- **404 Not Found:** Resource not found
- **500 Internal Server Error:** Server-side error
- **503 Service Unavailable:** Service temporarily unavailable

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context (optional)"
  }
}
```

**Example Error Responses:**

```json
// 401 Unauthorized
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired authentication token"
}

// 403 Forbidden
{
  "error": "FORBIDDEN",
  "message": "User does not have permission to access this resource"
}

// 500 Internal Server Error
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred. Please try again later."
}
```

---

## Frontend Mock Data

The frontend currently operates in **mock mode** with realistic data generators. Here are the mock values for testing:

**Balance:**
```json
{
  "amount": 12480.90,
  "currency": "BRL",
  "settles_in": "USDT",
  "updated_at": "<2 minutes ago ISO timestamp>"
}
```

**Today Snapshot:**
```json
{
  "payments_received": { "amount": 3240.00, "currency": "BRL" },
  "payments_pending": { "amount": 580.00, "currency": "BRL" },
  "fees": { "amount": 42.15, "currency": "BRL" },
  "date": "<Today YYYY-MM-DD>"
}
```

**Recent Transactions:**
```json
{
  "transactions": [
    { "id": "tx_001", "type": "received", "amount": { "value": 1450.00, "currency": "BRL" }, "description": "Payment from merchant #3421", "timestamp": "<10 min ago>" },
    { "id": "tx_002", "type": "received", "amount": { "value": 890.00, "currency": "BRL" }, "description": "Payment from merchant #2891", "timestamp": "<1 hour ago>" },
    { "id": "tx_003", "type": "sent", "amount": { "value": 2500.00, "currency": "BRL" }, "description": "Withdrawal to wallet", "timestamp": "<5 hours ago>" }
  ]
}
```

**Payment Status:**
```json
{
  "completed": { "count": 24, "percentage": 75 },
  "pending": { "count": 6, "percentage": 20 },
  "cancelled_or_expired": { "count": 2, "percentage": 5 },
  "total": 32
}
```

---

## Implementation Checklist for Backend Team

### Phase 1: Basic Implementation
- [ ] Implement `GET /api/balance/available`
  - [ ] Return mock/static data initially
  - [ ] Add authentication middleware
  - [ ] Return correct response structure
- [ ] Implement `GET /api/dashboard/today`
  - [ ] Calculate "today" based on timezone parameter
  - [ ] Return zeros if no data available
- [ ] Implement `GET /api/transactions/recent`
  - [ ] Respect `limit` parameter (max 50)
  - [ ] Order by timestamp DESC
  - [ ] Return empty array if no transactions
- [ ] Implement `GET /api/dashboard/payment-status`
  - [ ] Calculate percentages correctly
  - [ ] Handle zero total case

### Phase 2: Real Data Integration
- [ ] Connect balance endpoint to actual account balance system
- [ ] Aggregate today's payment data from transaction database
- [ ] Query recent transactions from transaction table
- [ ] Calculate payment status from payment state machine

### Phase 3: Performance Optimization
- [ ] Add caching for balance (Category A - manual refresh)
- [ ] Add caching for dashboard queries (Category B - 60s TTL)
- [ ] Add database indexes for date range queries
- [ ] Implement query optimization for recent transactions

### Phase 4: Production Readiness
- [ ] Add monitoring/logging for all endpoints
- [ ] Add rate limiting
- [ ] Add error tracking
- [ ] Load testing for concurrent users
- [ ] Document runbook for operations team

---

## Testing Contract

### Manual Testing Endpoints

**Postman/cURL Examples:**

```bash
# 1. Get Balance
curl -X GET \
  'https://api.crossramp.io/api/balance/available' \
  -H 'Authorization: Bearer <TOKEN>'

# 2. Get Today's Snapshot
curl -X GET \
  'https://api.crossramp.io/api/dashboard/today?timezone=America/Sao_Paulo' \
  -H 'Authorization: Bearer <TOKEN>'

# 3. Get Recent Transactions
curl -X GET \
  'https://api.crossramp.io/api/transactions/recent?limit=3' \
  -H 'Authorization: Bearer <TOKEN>'

# 4. Get Payment Status
curl -X GET \
  'https://api.crossramp.io/api/dashboard/payment-status?date=2024-12-23' \
  -H 'Authorization: Bearer <TOKEN>'
```

### Expected Frontend Integration Test Cases

1. **Happy Path:**
   - All queries succeed → UI shows data correctly
   - Auto-refresh works after 60s for Category B queries

2. **Loading States:**
   - Initial page load shows skeleton loaders
   - Manual refresh shows refresh icon animation

3. **Error States:**
   - API returns 500 → UI shows error messages
   - Network timeout → UI shows retry button

4. **Empty States:**
   - No transactions → "No recent transactions" message
   - Zero payments → "No payments yet" message

5. **Edge Cases:**
   - Balance = 0 → Shows "R$ 0,00"
   - Total payments = 0 → All percentages = 0
   - Very large numbers → Formatted with thousand separators

---

## Contact

**Frontend Team Lead:** [Your Name]  
**Slack Channel:** #crossramp-frontend  
**Documentation:** `/docs/FEATURE_OVERVIEW.md`  

For questions about this API contract, please reach out to the frontend team.

---

**Document Status:** ✅ Ready for Backend Implementation  
**Next Review Date:** After backend implementation complete
