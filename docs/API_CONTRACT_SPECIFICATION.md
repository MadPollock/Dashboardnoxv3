# API Contract Specification - Crossramp Dashboard

**Last Updated:** December 23, 2024  
**Version:** 2.0.0  
**Status:** ✅ Aligned with queries.ts

---

## Overview

This document specifies the exact API endpoints, request/response shapes, and environment values that the Crossramp Dashboard expects. All queries in `/src/app/lib/queries.ts` MUST match these contracts.

---

## Base URL Structure

```
Development:   https://api-dev.crossramp.io
Staging:       https://api-staging.crossramp.io  
Production:    https://api.crossramp.io
```

**Configuration:**
```javascript
// /public/config.js
window.__CROSSRAMP_CONFIG__ = {
  environment: 'development' | 'staging' | 'production',  // NOT 'live'/'test'
  api: {
    enabled: true,
    baseUrl: 'https://api-dev.crossramp.io'  // Full base URL
  }
};
```

---

## Environment Values

### ✅ Correct (Documented)
```typescript
environment: 'production' | 'staging' | 'development'
```

### ❌ Incorrect (Code had these)
```typescript
environment: 'live' | 'test'  // WRONG!
```

### API Key Prefixes by Environment
- `production` → `pk_live_` prefix
- `staging` → `pk_test_` prefix  
- `development` → `pk_dev_` prefix

---

## API Endpoints & Response Shapes

### 1. API Keys

#### List API Keys
```
GET /api/api-keys/list
```

**Response Shape:**
```typescript
{
  api_keys: Array<{
    id: string;                    // "apk_001"
    name: string;                  // "Production API"
    key_prefix: string;            // "pk_live_"
    key_masked: string;            // "pk_live_••••••••••••••••1234"
    key_last_4: string;            // "1234"
    status: 'active' | 'waiting_approval' | 'disabled';
    created_at: string;            // ISO date
    created_by: string;            // email
    created_by_user_id: string;    // "usr_123"
    last_used_at: string | null;   // ISO date or null
    environment: 'production' | 'staging' | 'development';  // NOT 'live'/'test'
    permissions: string[];         // ["read:payments", "write:payments"]
    ip_whitelist: string[];        // ["203.0.113.0/24"]
    rate_limit: number;            // 1000
  }>;
  total_count: number;
  active_count: number;
  waiting_approval_count: number;
  disabled_count: number;
}
```

**Current Code (WRONG):**
```typescript
// queries.ts line ~850
const url = new URL(`${getAPIBaseURL()}/api-keys`);  // ❌ Missing /api/ prefix
```

**Should Be:**
```typescript
const url = new URL(`${getAPIBaseURL()}/api/api-keys/list`);  // ✅
```

---

#### Get API Key Details
```
GET /api/api-keys/details?api_key_id={id}
```

**Response Shape:**
```typescript
{
  id: string;
  name: string;
  key_prefix: string;
  key_masked: string;
  key_last_4: string;
  status: 'active' | 'waiting_approval' | 'disabled';
  created_at: string;
  created_by: string;
  created_by_user_id: string;
  last_used_at: string | null;
  environment: 'production' | 'staging' | 'development';
  permissions: string[];
  ip_whitelist: string[];
  rate_limit: number;
  request_count_24h: number;
  request_count_7d: number;
  request_count_30d: number;
  last_request_ip: string;
  last_request_endpoint: string;
  webhook_url: string;
  webhook_secret: string;  // masked: "whsec_••••••••••••••••abcd"
  notes: string;
}
```

---

#### Get API Key Usage Stats
```
GET /api/api-keys/usage?api_key_id={id}&period={period}
```

**Query Params:**
- `api_key_id` (required): API key ID
- `period` (optional): "7d" | "30d" | "90d" (default: "7d")

**Response Shape:**
```typescript
{
  api_key_id: string;
  period: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  error_rate: number;           // percentage
  avg_response_time_ms: number;
  requests_by_day: Array<{
    date: string;               // "2025-12-16"
    count: number;
  }>;
  requests_by_endpoint: Array<{
    endpoint: string;
    count: number;
  }>;
  errors_by_code: Array<{
    code: number;
    message: string;
    count: number;
  }>;
  rate_limit_status: {
    limit: number;
    remaining: number;
    reset_at: string;           // ISO date
  };
}
```

---

### 2. Accounts & Balances

#### List Accounts
```
GET /api/accounts
```

**Response Shape:**
```typescript
Array<{
  currency: string;              // "USDT"
  accounts: Array<{
    id: string;
    network: string;             // "TRX"
    internalCode: string;        // "ACC-USDT-TRX-001"
    balances: {
      available: string;
      locked: string;
      toReceive: string;
      blocked: string;
    };
    transactions: Array<{
      id: string;
      date: string;
      description: string;
      debit?: string;
      credit?: string;
      resultingBalance: string;
    }>;
  }>;
}>
```

---

### 3. Templates

#### List Templates
```
GET /api/templates
```

**Response Shape:**
```typescript
Array<{
  id: string;
  name: string;
  currency: string;
  status: 'active' | 'inactive';
  createdAt: string;             // ISO date
}>
```

---

### 4. Transactions/Payments

#### List Transactions
```
GET /api/payments?page={page}&limit={limit}&status={status}
```

**Query Params:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status
- `from` (optional): Start date (ISO)
- `to` (optional): End date (ISO)

**Response Shape:**
```typescript
{
  data: Array<{
    id: string;
    type: 'received' | 'sent';
    amount: string;
    currency: string;
    status: 'completed' | 'pending' | 'failed';
    date: string;                // ISO date
    description: string;
    from?: string;
    to?: string;
    network?: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

### 5. Disputes

#### List Disputes
```
GET /api/disputes?page={page}&limit={limit}&status={status}
```

**Response Shape:**
```typescript
{
  data: Array<{
    id: string;
    payment_id: string;
    status: 'open' | 'under_review' | 'resolved' | 'closed';
    reason: string;
    amount: string;
    currency: string;
    created_at: string;          // ISO date
    updated_at: string;
    customer_email: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

### 6. Whitelist

#### List Whitelist Addresses
```
GET /api/whitelist
```

**Response Shape:**
```typescript
Array<{
  id: string;
  address: string;
  label: string;
  network: string;
  currency: string;
  status: 'active' | 'pending' | 'disabled';
  created_at: string;            // ISO date
}>
```

---

### 7. Team Users

#### List Team Users
```
GET /api/team/users?role={role}&status={status}
```

**Response Shape:**
```typescript
Array<{
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'analyst';
  status: 'active' | 'inactive';
  avatar?: string;
  lastLogin?: string;            // ISO date
  createdAt: string;             // ISO date
}>
```

---

### 8. PIX Keys

#### List PIX Keys
```
GET /api/pix/keys?status={status}
```

**Response Shape:**
```typescript
Array<{
  id: string;
  label: string;
  key: string;
  type: 'email' | 'phone' | 'cpf' | 'random';
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;             // ISO date
}>
```

---

### 9. Whitelist Groups

#### List Whitelist Groups
```
GET /api/whitelist/groups
```

**Response Shape:**
```typescript
Array<{
  id: string;
  label: string;
  entries: Array<{
    id: string;
    address: string;
    label: string;
    network: string;
    currency: string;
  }>;
}>
```

---

### 10. Statement Transactions

#### List Statement Transactions
```
GET /api/statement/transactions?currency={currency}&type={type}&from={from}&to={to}
```

**Response Shape:**
```typescript
Array<{
  id: string;
  date: string;                  // ISO date
  description: string;
  type: 'debit' | 'credit';
  amount: string;
  currency: string;
  balance: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}>
```

---

### 11. Reputation Records

#### List Reputation Records
```
GET /api/reputation/records?category={category}&impact={impact}&from={from}&to={to}
```

**Response Shape:**
```typescript
Array<{
  id: string;
  date: string;                  // ISO date
  event: string;
  score: number;
  impact: 'positive' | 'neutral' | 'negative';
  category: string;
  description?: string;
}>
```

---

### 12. Analytics

#### Payments Overview
```
GET /api/analytics/payments-overview?period={period}
```

**Query Params:**
- `period`: "7d" | "30d" | "90d" | "12m"

**Response Shape:**
```typescript
Array<{
  date: string;                  // "2025-12-16"
  value: number;
  category?: string;
}>
```

---

#### Volume Overview
```
GET /api/analytics/volume-overview?period={period}
```

**Response Shape:** Same as Payments Overview

---

#### Transaction Statistics
```
GET /api/analytics/transaction-stats?period={period}
```

**Response Shape:** Same as Payments Overview

---

### 13. Company Profile

#### Get Company Profile
```
GET /api/company/profile
```

**Response Shape:**
```typescript
{
  legalName: string;
  taxId: string;
  ubo: string;
  businessType: string;
  address: string;
  registrationNumber: string;
  phone: string;
  email: string;
}
```

---

### 14. Security / MFA

#### Get MFA Status
```
GET /api/security/mfa/status
```

**Response Shape:**
```typescript
{
  status: 'not_activated' | 'pending' | 'active';
  activatedDate?: string;        // ISO date
  lastUsed?: string;             // ISO date
  backupCodes?: number;          // count of unused backup codes
}
```

---

## Common Headers

### Request Headers
```
Authorization: Bearer {auth0_token}
Content-Type: application/json
x-user-id: {user_id}
x-user-role: {user_role}
x-user-metadata: {json_metadata}
```

### Response Headers
```
Content-Type: application/json
X-Request-ID: {request_id}
```

---

## Error Response Shape

All endpoints return errors in this format:

```typescript
{
  error: {
    code: string;                // "UNAUTHORIZED", "VALIDATION_ERROR"
    message: string;             // Human-readable message
    details?: Record<string, unknown>;
  };
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## Pagination Standard

All paginated endpoints use this format:

**Request:**
```
?page={number}&limit={number}&offset={number}
```

**Response:**
```typescript
{
  data: Array<T>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## Date Format

All dates MUST be ISO 8601 format:
```
2025-12-22T10:30:00Z
```

---

## Migration Checklist

### ✅ Fixed
- [x] Environment values: `production`/`staging`/`development`
- [x] Runtime config system in place
- [x] Centralized query system

### 🔄 To Fix in queries.ts
- [ ] API Keys endpoint: `/api-keys` → `/api/api-keys/list`
- [ ] API Keys response shape: Add missing fields
- [ ] All endpoints: Ensure `/api/` prefix
- [ ] Response shapes: Match documented types exactly
- [ ] Error handling: Use standard error shape
- [ ] Pagination: Use standard format

---

**Status:** Documentation Complete, Implementation Pending  
**Next Step:** Update `/src/app/lib/queries.ts` to match this specification
