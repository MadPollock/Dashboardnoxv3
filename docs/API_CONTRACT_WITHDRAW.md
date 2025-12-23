# API Contract: Withdraw Endpoints

**Document Version:** 1.0  
**Last Updated:** December 23, 2024  
**Owner:** Frontend Team  
**Target:** Bastion Service Backend Team

---

## Overview

This document defines the **frontend-first API contract** for the Withdraw page. The Bastion service must implement these endpoints to match the exact structure expected by the frontend application.

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
- Role claims (admin, operations) - **Only Admin and Operations can access withdraw**
- Company/Tenant ID

---

## Endpoints

### 1. Get User Account Balances

**Endpoint:** `GET /api/balances`  
**Query Category:** **A** (Manual refresh only - critical data before withdrawal)  
**Frontend Function:** `queryBalances()` in `/src/app/lib/queries.ts`

#### Request

```http
GET /api/balances
Authorization: Bearer <JWT_TOKEN>
```

No query parameters or request body.

#### Response (Success - 200 OK)

```json
{
  "accounts": [
    {
      "id": "TRX_USDT_S2UZ",
      "currency_code": "TRX_USDT_S2UZ",
      "balance": "12480.90",
      "network": "TRX"
    },
    {
      "id": "SOL_USDT_EWAY",
      "currency_code": "SOL_USDT_EWAY",
      "balance": "8320.45",
      "network": "SOL"
    },
    {
      "id": "USDT_ERC20",
      "currency_code": "USDT_ERC20",
      "balance": "5230.10",
      "network": "ETH"
    },
    {
      "id": "USDC",
      "currency_code": "USDC",
      "balance": "15680.00",
      "network": "ETH"
    },
    {
      "id": "BRL",
      "currency_code": "BRL",
      "balance": "42890.50",
      "network": "PIX"
    }
  ]
}
```

**Field Definitions:**
- `accounts` (array, required): Array of account objects
- `accounts[].id` (string, required): Unique account ID
- `accounts[].currency_code` (string, required): Currency code (must match CURRENCIES config in frontend)
  - Examples: `TRX_USDT_S2UZ`, `SOL_USDC_PTHX`, `USDT_ERC20`, `BRL`
- `accounts[].balance` (string, required): Available balance as decimal string
  - Format: Plain number (e.g., "12480.90"), no thousand separators
- `accounts[].network` (string, optional but recommended): Network identifier
  - Examples: `TRX`, `SOL`, `ETH`, `PIX`
  - Used for filtering whitelisted wallets

**Business Logic:**
- Return all accounts for the authenticated user's company
- Include accounts with zero balance (frontend will display them)
- Balance should be the **available** amount (not locked/pending)
- Do not include thousand separators in balance strings

#### Response (Error)

```json
{
  "error": "string",
  "message": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows skeleton loader in dropdown
- Error state: Disables entire form with error message + "Retry" button
- Empty state: Shows "No accounts available" in dropdown
- Refresh button: Manual refresh before each withdrawal (Category A behavior)

---

### 2. Get Whitelisted Crypto Wallets

**Endpoint:** `GET /api/whitelist/wallets`  
**Query Category:** **B** (Load once when opening withdraw page)  
**Frontend Function:** `queryWhitelistedWallets()` in `/src/app/lib/queries.ts`

#### Request

```http
GET /api/whitelist/wallets
Authorization: Bearer <JWT_TOKEN>
```

No query parameters or request body.

#### Response (Success - 200 OK)

```json
{
  "wallets": [
    {
      "id": "wallet-1",
      "label": "Treasury Wallet",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "network": "ETH",
      "status": "active"
    },
    {
      "id": "wallet-2",
      "label": "Operations Wallet",
      "address": "TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX",
      "network": "TRX",
      "status": "active"
    },
    {
      "id": "wallet-3",
      "label": "Cold Storage",
      "address": "9wFFyRfZBsuAHA4YcuxcXLKwMxJR43S7fF97mUn7fEVp",
      "network": "SOL",
      "status": "active"
    }
  ]
}
```

**Field Definitions:**
- `wallets` (array, required): Array of whitelisted wallet objects
- `wallets[].id` (string, required): Unique wallet ID
- `wallets[].label` (string, required): User-friendly label/name
- `wallets[].address` (string, required): Full cryptocurrency wallet address
- `wallets[].network` (string, required): Blockchain network identifier
  - Must match account `network` field for same-currency withdrawals
  - Examples: `ETH`, `TRX`, `SOL`, `Bitcoin`, `Base`
- `wallets[].status` (string, required): Wallet status
  - Enum: `active`, `inactive`, `pending`
  - Frontend only shows `active` wallets

**Business Logic:**
- Return all whitelisted wallets for the authenticated user's company
- Frontend filters to show only `status === 'active'`
- If no wallets exist, return empty array: `{ "wallets": [] }`
- Wallets should be pre-approved/verified before being listed

#### Response (Error)

```json
{
  "error": "string",
  "message": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows skeleton loader
- Error state: Shows "Unable to load whitelisted wallets. Please retry."
- Empty state: Shows "No whitelisted wallets available" in dropdown (disabled)
- Filters by network when "Same Currency" withdrawal selected
- Shows full address below dropdown after selection

---

### 3. Get Whitelisted PIX Addresses

**Endpoint:** `GET /api/whitelist/pix`  
**Query Category:** **B** (Load once when opening withdraw page)  
**Frontend Function:** `queryWhitelistedPix()` in `/src/app/lib/queries.ts`

#### Request

```http
GET /api/whitelist/pix
Authorization: Bearer <JWT_TOKEN>
```

No query parameters or request body.

#### Response (Success - 200 OK)

```json
{
  "pix_addresses": [
    {
      "id": "pix-1",
      "label": "Company Account",
      "address": "company@bank.com",
      "type": "Email",
      "status": "active"
    },
    {
      "id": "pix-2",
      "label": "Treasury PIX",
      "address": "+55 11 98765-4321",
      "type": "Phone",
      "status": "active"
    },
    {
      "id": "pix-3",
      "label": "Operations PIX",
      "address": "12.345.678/0001-90",
      "type": "CNPJ",
      "status": "active"
    }
  ]
}
```

**Field Definitions:**
- `pix_addresses` (array, required): Array of whitelisted PIX address objects
- `pix_addresses[].id` (string, required): Unique PIX entry ID
- `pix_addresses[].label` (string, required): User-friendly label/name
- `pix_addresses[].address` (string, required): PIX key value
  - Can be email, phone, CPF/CNPJ, or random key
- `pix_addresses[].type` (string, required): PIX key type
  - Enum: `Email`, `Phone`, `CPF`, `CNPJ`, `Random`
  - Used for display purposes in UI
- `pix_addresses[].status` (string, required): PIX address status
  - Enum: `active`, `inactive`, `pending`
  - Frontend only shows `active` addresses

**Business Logic:**
- Return all whitelisted PIX addresses for the authenticated user's company
- Frontend filters to show only `status === 'active'`
- If no PIX addresses exist, return empty array: `{ "pix_addresses": [] }`
- PIX keys should be validated before being added to whitelist

#### Response (Error)

```json
{
  "error": "string",
  "message": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows skeleton loader
- Error state: Shows "Unable to load PIX addresses. Please retry."
- Empty state: Shows "No whitelisted PIX addresses available" in dropdown (disabled)
- Only shown when "Convert to BRL" withdrawal selected
- Shows full PIX key below dropdown after selection

---

## Error Handling

All endpoints should follow consistent error response format:

### HTTP Status Codes

- **200 OK:** Successful request
- **400 Bad Request:** Invalid request parameters
- **401 Unauthorized:** Missing or invalid authentication token
- **403 Forbidden:** User doesn't have permission (not Admin or Operations role)
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

// 403 Forbidden (User not Admin/Operations)
{
  "error": "FORBIDDEN",
  "message": "Only Admin and Operations users can access withdraw functionality"
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

**Balances:**
```json
{
  "accounts": [
    { "id": "TRX_USDT_S2UZ", "currency_code": "TRX_USDT_S2UZ", "balance": "12480.90", "network": "TRX" },
    { "id": "SOL_USDT_EWAY", "currency_code": "SOL_USDT_EWAY", "balance": "8320.45", "network": "SOL" },
    { "id": "USDT_ERC20", "currency_code": "USDT_ERC20", "balance": "5230.10", "network": "ETH" },
    { "id": "USDC", "currency_code": "USDC", "balance": "15680.00", "network": "ETH" },
    { "id": "SOL_USDC_PTHX", "currency_code": "SOL_USDC_PTHX", "balance": "9450.25", "network": "SOL" },
    { "id": "USDC_BASECHAIN_ETH_5I5C", "currency_code": "USDC_BASECHAIN_ETH_5I5C", "balance": "3250.00", "network": "ETH" },
    { "id": "BRL", "currency_code": "BRL", "balance": "42890.50", "network": "PIX" }
  ]
}
```

**Whitelisted Wallets:**
```json
{
  "wallets": [
    { "id": "wallet-1", "label": "Treasury Wallet", "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "network": "ETH", "status": "active" },
    { "id": "wallet-2", "label": "Operations Wallet", "address": "TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX", "network": "TRX", "status": "active" },
    { "id": "wallet-3", "label": "Cold Storage", "address": "9wFFyRfZBsuAHA4YcuxcXLKwMxJR43S7fF97mUn7fEVp", "network": "SOL", "status": "active" },
    { "id": "wallet-4", "label": "Partner Settlement", "address": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72", "network": "ETH", "status": "active" },
    { "id": "wallet-5", "label": "Backup Wallet", "address": "CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq", "network": "SOL", "status": "active" }
  ]
}
```

**Whitelisted PIX:**
```json
{
  "pix_addresses": [
    { "id": "pix-1", "label": "Company Account", "address": "company@bank.com", "type": "Email", "status": "active" },
    { "id": "pix-2", "label": "Treasury PIX", "address": "+55 11 98765-4321", "type": "Phone", "status": "active" },
    { "id": "pix-3", "label": "Operations PIX", "address": "12.345.678/0001-90", "type": "CNPJ", "status": "active" }
  ]
}
```

---

## Implementation Checklist for Backend Team

### Phase 1: Basic Implementation
- [ ] Implement `GET /api/balances`
  - [ ] Return mock/static data initially
  - [ ] Add authentication middleware
  - [ ] Add role authorization (Admin + Operations only)
  - [ ] Return correct response structure
- [ ] Implement `GET /api/whitelist/wallets`
  - [ ] Return all whitelisted wallets for user's company
  - [ ] Include status field
- [ ] Implement `GET /api/whitelist/pix`
  - [ ] Return all whitelisted PIX addresses
  - [ ] Include PIX key type

### Phase 2: Real Data Integration
- [ ] Connect balances endpoint to actual account balance system
- [ ] Query whitelisted wallets from whitelist management database
- [ ] Query whitelisted PIX addresses from whitelist management database
- [ ] Ensure network field matches across balances and wallets

### Phase 3: Security & Validation
- [ ] Validate role access (403 for non-Admin/Operations users)
- [ ] Ensure balance reflects only **available** amount (not locked)
- [ ] Filter out inactive/pending whitelist entries (or return all and let frontend filter)
- [ ] Add rate limiting for balance refresh (Category A query)

### Phase 4: Production Readiness
- [ ] Add monitoring/logging for all endpoints
- [ ] Add caching for whitelist queries (Category B - static data)
- [ ] Add error tracking
- [ ] Document runbook for operations team
- [ ] Load testing for concurrent users

---

## Frontend Integration Flow

### User Flow Example

1. **User opens Withdraw page:**
   - Frontend calls `GET /api/balances` (Category A - manual)
   - Frontend calls `GET /api/whitelist/wallets` (Category B - once)
   - Frontend calls `GET /api/whitelist/pix` (Category B - once)

2. **User selects account:**
   - Dropdown populated with accounts from `/api/balances`
   - Shows balance next to each account

3. **User selects withdrawal type:**
   - If "Same Currency": Filters wallets by network
   - If "Convert to BRL": Shows PIX addresses

4. **User enters amount and submits:**
   - Frontend validates amount <= available balance
   - MFA modal appears (per-action MFA pattern)
   - After MFA, calls `POST /api/commands/withdrawals/request` (command, not query)
   - On success, refetches `/api/balances` to show updated balance

---

## Testing Contract

### Manual Testing Endpoints

**Postman/cURL Examples:**

```bash
# 1. Get Balances
curl -X GET \
  'https://api.crossramp.io/api/balances' \
  -H 'Authorization: Bearer <TOKEN>'

# 2. Get Whitelisted Wallets
curl -X GET \
  'https://api.crossramp.io/api/whitelist/wallets' \
  -H 'Authorization: Bearer <TOKEN>'

# 3. Get Whitelisted PIX
curl -X GET \
  'https://api.crossramp.io/api/whitelist/pix' \
  -H 'Authorization: Bearer <TOKEN>'
```

### Expected Frontend Integration Test Cases

1. **Happy Path:**
   - All queries succeed → Dropdowns populated → User can submit withdrawal

2. **Loading States:**
   - Initial page load shows skeleton loaders in dropdowns

3. **Error States:**
   - Balances API fails → Entire form disabled with error message
   - Wallets API fails → Wallet dropdown shows error message
   - PIX API fails → PIX dropdown shows error message

4. **Empty States:**
   - No accounts → "No accounts available"
   - No whitelisted wallets → "No whitelisted wallets available"
   - No PIX addresses → "No whitelisted PIX addresses available"

5. **Network Filtering:**
   - User selects USDT-TRX account + "Same Currency"
   - Wallet dropdown only shows wallets with `network: "TRX"`
   - If no TRX wallets, dropdown is empty

6. **Role Restrictions:**
   - Analyst/Developer users get 403 Forbidden
   - Admin/Operations users get 200 OK

---

## Business Rules & Constraints

### Balance Accuracy
- Balance must reflect **available** funds only (exclude locked/pending amounts)
- Backend should implement transactional locking during withdrawal to prevent overdraft
- If balance changes between page load and withdrawal submit, command should fail with "Insufficient balance"

### Whitelist Security
- Only `status: "active"` entries should be used for withdrawals (frontend filters, but backend should validate)
- Inactive/pending wallets should not be allowed as withdrawal destinations
- Adding new whitelist entries should require separate approval flow (not part of withdraw feature)

### Network Matching
- For same-currency withdrawals, destination wallet **must** match account network
- Backend should validate: `account.network === wallet.network`
- Example: USDT on TRX network can only withdraw to TRX wallet addresses

### BRL Special Case
- BRL accounts can **only** withdraw to PIX addresses (no crypto wallets)
- Frontend hides "Withdrawal Type" dropdown for BRL accounts
- Backend should reject if BRL account tries to withdraw to crypto wallet

### Conversion Rates (Future)
- When withdrawal_type = "brl", backend applies conversion rate (USDT/USDC → BRL)
- Rate should be fetched at time of withdrawal request, not at page load
- Frontend may add preview feature later (requires additional endpoint)

---

## Contact

**Frontend Team Lead:** [Your Name]  
**Slack Channel:** #crossramp-frontend  
**Documentation:** `/docs/FEATURE_WITHDRAW.md`  

For questions about this API contract, please reach out to the frontend team.

---

**Document Status:** ✅ Ready for Backend Implementation  
**Next Review Date:** After backend implementation complete
