# API Contract: Whitelist Management Endpoints

**Document Version:** 1.0  
**Last Updated:** December 23, 2024  
**Owner:** Frontend Team  
**Target:** Bastion Service Backend Team

---

## Overview

This document defines the **frontend-first API contract** for the Whitelist Management page. The Bastion service must implement these endpoints to match the exact structure expected by the frontend application.

**Frontend Implementation Status:** ✅ Complete  
**Backend Implementation Status:** ⚠️ Pending

---

## Authentication & Authorization

All endpoints require:
1. **Authentication:** Bearer token in `Authorization` header
2. **Authorization:** User must have **Admin role** (`user_admin_crossramp`)

```
Authorization: Bearer <JWT_TOKEN>
```

**Non-Admin users should receive 403 Forbidden.**

---

## Endpoints

### 1. Get Whitelist Groups with Crypto Addresses

**Endpoint:** `GET /api/whitelist/groups`  
**Query Category:** **B** (Load once when opening Crypto Wallets tab)  
**Frontend Function:** `queryWhitelistGroups()` in `/src/app/lib/queries.ts`

#### Request

```http
GET /api/whitelist/groups
Authorization: Bearer <JWT_TOKEN>
```

No query parameters or request body.

#### Response (Success - 200 OK)

```json
{
  "groups": [
    {
      "id": "group-1",
      "label": "Treasury Wallets",
      "reason": "Primary treasury management wallets for holding company funds",
      "created_date": "2024-01-10",
      "addresses": [
        {
          "id": "addr-1",
          "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          "currency": "USDT",
          "network": "ETH",
          "status": "active",
          "reason": "Main Ethereum treasury wallet",
          "added_date": "2024-01-15"
        },
        {
          "id": "addr-2",
          "address": "TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX",
          "currency": "USDT",
          "network": "TRX",
          "status": "active",
          "reason": "Tron treasury for lower fees",
          "added_date": "2024-01-16"
        },
        {
          "id": "addr-3",
          "address": "9wFFyRfZBsuAHA4YcuxcXLKwMxJR43S7fF97mUn7fEVp",
          "currency": "USDT",
          "network": "SOL",
          "status": "pending",
          "reason": "Solana treasury wallet",
          "added_date": "2024-01-18"
        }
      ]
    },
    {
      "id": "group-2",
      "label": "Partner Settlements",
      "reason": "Wallets for settling payments with business partners",
      "created_date": "2024-01-12",
      "addresses": [
        {
          "id": "addr-4",
          "address": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
          "currency": "USDC",
          "network": "ETH",
          "status": "active",
          "reason": "Partner A settlement wallet",
          "added_date": "2024-01-14"
        }
      ]
    },
    {
      "id": "group-3",
      "label": "Cold Storage",
      "reason": "Long-term cold storage wallets for security",
      "created_date": "2024-01-05",
      "addresses": []
    }
  ]
}
```

**Field Definitions:**

**Group Level:**
- `groups` (array, required): Array of whitelist group objects
- `groups[].id` (string, required): Unique group ID
- `groups[].label` (string, required): User-friendly group name
  - Max 100 characters
  - Must be unique per merchant
- `groups[].reason` (string, required): Explanation for why group was created
  - Max 500 characters
  - Used for audit trail
- `groups[].created_date` (string, required): Date group was created
  - Format: `YYYY-MM-DD`
- `groups[].addresses` (array, required): Array of crypto wallet addresses in this group
  - Can be empty array `[]`

**Address Level:**
- `addresses[].id` (string, required): Unique address ID
- `addresses[].address` (string, required): Full cryptocurrency wallet address
  - ETH format: 42 chars starting with `0x`
  - TRX format: 34 chars starting with `T`
  - SOL format: 32-44 chars base58
- `addresses[].currency` (string, required): Cryptocurrency type
  - Enum: `USDT`, `USDC` (may expand in future)
- `addresses[].network` (string, required): Blockchain network
  - Examples: `ETH`, `TRX`, `SOL`, `AVAX`, `TON`
- `addresses[].status` (string, required): Address approval status
  - Enum: `active`, `pending`, `rejected`
  - Frontend displays different badge colors per status
- `addresses[].reason` (string, required): Explanation for why address was added
  - Max 500 characters
  - Used for audit trail
- `addresses[].added_date` (string, required): Date address was added to group
  - Format: `YYYY-MM-DD`

**Business Logic:**
- Return all groups for the authenticated user's company
- Include empty groups (groups with `addresses: []`)
- Order groups by `created_date` DESC (newest first)
- Order addresses within group by `added_date` ASC (oldest first)
- **Constraint:** Each group can have at most 1 address per `currency + network` combination
  - Example: Group can have USDT-ETH and USDT-TRX, but NOT two USDT-ETH addresses
- **Limit:** Max 5 groups per merchant (optional, mentioned in banner)

#### Response (Error)

```json
{
  "error": "string",
  "message": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows skeleton loaders (3 animated boxes)
- Error state: Shows error message with "Retry" button
- Empty state: Shows "No groups yet. Create your first group to start whitelisting addresses."
- Success state: Displays groups as collapsible cards
- First group auto-expanded, others collapsed
- Refetch after creating group or adding address

---

### 2. Get Whitelisted PIX Keys

**Endpoint:** `GET /api/whitelist/pix-keys`  
**Query Category:** **B** (Load once when opening PIX Keys tab)  
**Frontend Function:** `queryPIXKeys()` in `/src/app/lib/queries.ts`

**Note:** This endpoint is different from `/api/whitelist/pix` used in Withdraw feature. This one returns additional metadata (`total_count`, `max_allowed`) for whitelist management UI.

#### Request

```http
GET /api/whitelist/pix-keys
Authorization: Bearer <JWT_TOKEN>
```

No query parameters or request body.

#### Response (Success - 200 OK)

```json
{
  "pix_keys": [
    {
      "id": "pix-1",
      "label": "Company Account",
      "pix_key": "company@bank.com",
      "type": "Email",
      "status": "active",
      "reason": "Primary company account",
      "added_date": "2024-01-10"
    },
    {
      "id": "pix-2",
      "label": "Treasury PIX",
      "pix_key": "+55 11 98765-4321",
      "type": "Phone",
      "status": "pending",
      "reason": "Treasury operations",
      "added_date": "2024-01-15"
    }
  ],
  "total_count": 2,
  "max_allowed": 5
}
```

**Field Definitions:**
- `pix_keys` (array, required): Array of PIX key objects
- `pix_keys[].id` (string, required): Unique PIX entry ID
- `pix_keys[].label` (string, required): User-friendly label/name
  - Max 100 characters
- `pix_keys[].pix_key` (string, required): The actual PIX key value
  - Format varies by type (see validation rules below)
- `pix_keys[].type` (string, required): PIX key type
  - Enum: `Email`, `Phone`, `CPF`, `CNPJ`, `Random`
- `pix_keys[].status` (string, required): PIX key approval status
  - Enum: `active`, `pending`, `rejected`
  - New PIX keys start as `pending` (ownership validation required)
- `pix_keys[].reason` (string, required): Explanation for why PIX key was added
  - Max 500 characters
- `pix_keys[].added_date` (string, required): Date PIX key was added
  - Format: `YYYY-MM-DD`
- `total_count` (number, required): Total number of PIX keys (same as `pix_keys.length`)
  - Used for badge display: "2 of 5 PIX keys used"
- `max_allowed` (number, required): Maximum PIX keys allowed
  - Always `5` (business constraint)

**PIX Key Format Validation:**
- **Email:** Standard RFC 5322 email format (e.g., `company@bank.com`)
- **Phone:** Brazilian format `+55 XX XXXXX-XXXX` or `+55 XX XXXX-XXXX`
  - Backend should normalize (remove spaces/hyphens) before storing
  - Frontend displays formatted version
- **CPF:** 11 digits with checksum validation (e.g., `123.456.789-00`)
  - Backend normalizes to `12345678900`
  - Frontend displays formatted
- **CNPJ:** 14 digits with checksum validation (e.g., `12.345.678/0001-90`)
  - Backend normalizes to `12345678000190`
  - Frontend displays formatted
- **Random:** Alphanumeric 32 characters (UUID style)

**Business Logic:**
- Return all PIX keys for the authenticated user's company
- Order by `added_date` ASC (oldest first)
- **Critical constraint:** Maximum 5 PIX keys per merchant
- Frontend disables "Add PIX Key" button when `total_count >= max_allowed`
- All PIX keys start with `status: "pending"` until ownership is validated
- Ownership validation: PIX key must be registered under merchant's CNPJ/CPF

#### Response (Error)

```json
{
  "error": "string",
  "message": "string"
}
```

**Frontend Behavior:**
- Loading state: Shows skeleton loaders (2 animated rows)
- Error state: Shows error message with "Retry" button
- Empty state: Shows "No PIX keys whitelisted yet. Add your first PIX key to enable BRL withdrawals."
- Success state: Displays PIX keys in table
- Badge shows "{total_count} of 5 PIX keys used"
- "Add PIX Key" button disabled if `total_count >= 5`
- Warning banner: "All PIX keys must be under the same ownership as your company registration"
- Refetch after adding PIX key

---

## Error Handling

All endpoints follow consistent error response format:

### HTTP Status Codes

- **200 OK:** Successful request
- **400 Bad Request:** Invalid request parameters
- **401 Unauthorized:** Missing or invalid authentication token
- **403 Forbidden:** User is not Admin (lacks required role)
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

// 403 Forbidden (User not Admin)
{
  "error": "FORBIDDEN",
  "message": "Only Admin users can manage whitelist"
}

// 500 Internal Server Error
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred. Please try again later."
}
```

---

## Frontend Mock Data

The frontend currently operates in **mock mode** with realistic data generators:

**Whitelist Groups:**
```json
{
  "groups": [
    {
      "id": "group-1",
      "label": "Treasury Wallets",
      "reason": "Primary treasury management wallets for holding company funds",
      "created_date": "2024-01-10",
      "addresses": [
        { "id": "addr-1", "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "currency": "USDT", "network": "ETH", "status": "active", "reason": "Main Ethereum treasury wallet", "added_date": "2024-01-15" },
        { "id": "addr-2", "address": "TXYZPZUhEBGJHSN2H8MNKVdGmGQu3mF7sX", "currency": "USDT", "network": "TRX", "status": "active", "reason": "Tron treasury for lower fees", "added_date": "2024-01-16" },
        { "id": "addr-3", "address": "9wFFyRfZBsuAHA4YcuxcXLKwMxJR43S7fF97mUn7fEVp", "currency": "USDT", "network": "SOL", "status": "pending", "reason": "Solana treasury wallet", "added_date": "2024-01-18" }
      ]
    },
    {
      "id": "group-2",
      "label": "Partner Settlements",
      "reason": "Wallets for settling payments with business partners",
      "created_date": "2024-01-12",
      "addresses": [
        { "id": "addr-4", "address": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72", "currency": "USDC", "network": "ETH", "status": "active", "reason": "Partner A settlement wallet", "added_date": "2024-01-14" }
      ]
    },
    {
      "id": "group-3",
      "label": "Cold Storage",
      "reason": "Long-term cold storage wallets for security",
      "created_date": "2024-01-05",
      "addresses": []
    }
  ]
}
```

**PIX Keys:**
```json
{
  "pix_keys": [
    { "id": "pix-1", "label": "Company Account", "pix_key": "company@bank.com", "type": "Email", "status": "active", "reason": "Primary company account", "added_date": "2024-01-10" },
    { "id": "pix-2", "label": "Treasury PIX", "pix_key": "+55 11 98765-4321", "type": "Phone", "status": "pending", "reason": "Treasury operations", "added_date": "2024-01-15" }
  ],
  "total_count": 2,
  "max_allowed": 5
}
```

---

## Implementation Checklist for Backend Team

### Phase 1: Basic Implementation
- [ ] Implement `GET /api/whitelist/groups`
  - [ ] Return mock/static data initially
  - [ ] Add authentication middleware
  - [ ] Add Admin role authorization (403 for non-Admin)
  - [ ] Return correct response structure (groups array)
- [ ] Implement `GET /api/whitelist/pix-keys`
  - [ ] Return PIX keys for user's company
  - [ ] Include `total_count` and `max_allowed` fields
  - [ ] Enforce max 5 PIX keys constraint

### Phase 2: Real Data Integration
- [ ] Connect groups endpoint to whitelist database
- [ ] Nest addresses within groups (eager loading)
- [ ] Connect PIX keys endpoint to PIX whitelist database
- [ ] Ensure proper ordering (groups DESC, addresses ASC)

### Phase 3: Business Logic & Validation
- [ ] Enforce unique `currency + network` per group constraint
- [ ] Enforce max 5 groups per merchant (optional)
- [ ] Enforce max 5 PIX keys per merchant (required)
- [ ] Validate PIX key formats (Email, Phone, CPF, CNPJ, Random)
- [ ] Implement PIX key ownership validation (async background job)

### Phase 4: Status Management
- [ ] Implement status transitions for addresses:
  - New address → `pending` (if KYC not verified or high-risk)
  - New address → `active` (if KYC verified and low-risk)
  - Manual approval → `pending` → `active` or `rejected`
- [ ] Implement status transitions for PIX keys:
  - New PIX key → `pending` (always)
  - Ownership validated → `active`
  - Ownership failed → `rejected`
- [ ] Send webhooks/notifications when status changes

### Phase 5: Production Readiness
- [ ] Add monitoring/logging for all endpoints
- [ ] Add caching (Category B - static data)
- [ ] Add error tracking
- [ ] Document runbook for operations team
- [ ] Load testing for concurrent Admin users

---

## Frontend Integration Flow

### User Flow Example (Crypto Wallets)

1. **User opens Whitelist page, switches to "Crypto Wallets" tab:**
   - Frontend calls `GET /api/whitelist/groups`
   - Displays groups as collapsible cards

2. **User creates new group:**
   - Opens "Create Group" dialog
   - Fills in label + reason
   - MFA modal appears
   - After MFA: `POST /api/commands/whitelist/group/create`
   - On success: Refetches `/api/whitelist/groups`
   - New group appears, auto-expanded

3. **User adds address to group:**
   - Clicks "Add Address" on group
   - Selects currency + network + pastes address
   - Fills in reason
   - MFA modal appears
   - After MFA: `POST /api/commands/whitelist/address/add`
   - On success: Refetches `/api/whitelist/groups`
   - Address appears in group table with status badge

### User Flow Example (PIX Keys)

1. **User opens Whitelist page, stays on "PIX Keys" tab:**
   - Frontend calls `GET /api/whitelist/pix-keys`
   - Displays PIX keys in table
   - Badge shows "2 of 5 PIX keys used"

2. **User adds PIX key:**
   - Clicks "Add PIX Key"
   - Selects type (Email, Phone, CPF, CNPJ, Random)
   - Enters PIX key value + label + reason
   - MFA modal appears
   - After MFA: `POST /api/commands/whitelist/pix/add`
   - On success: Refetches `/api/whitelist/pix-keys`
   - PIX key appears in table with `status: "pending"`
   - Badge updates to "3 of 5 PIX keys used"

3. **Backend ownership validation (async):**
   - Background job validates PIX key ownership via bank API
   - If valid: Status changes `pending` → `active`
   - If invalid: Status changes `pending` → `rejected`
   - Webhook/email notification sent to merchant

---

## Business Rules & Constraints

### Whitelist Groups
- **Max 5 groups per merchant** (optional limit, shown in banner)
- **Unique group labels** within a merchant
- **Empty groups allowed** (addresses can be added later)
- **Soft delete recommended** (mark as inactive, don't hard delete for audit trail)

### Crypto Wallet Addresses
- **Unique `currency + network` per group** (critical constraint)
  - Example: Group can have USDT-ETH and USDT-TRX, but NOT two USDT-ETH
  - Frontend prevents this in UI; backend must also validate
- **Status logic:**
  - KYC verified + low-risk merchant → `active` immediately
  - Otherwise → `pending` until manual approval
- **Address format validation:**
  - ETH: Hex starting with `0x`, 42 chars
  - TRX: Base58 starting with `T`, 34 chars
  - SOL: Base58, 32-44 chars
- **Audit trail:** Log all additions with user ID, timestamp, IP, reason

### PIX Keys
- **Max 5 PIX keys per merchant** (hard limit)
- **Unique PIX key values** within a merchant (no duplicates)
- **Format validation per type:**
  - Email: RFC 5322
  - Phone: Brazilian format `+55 XX XXXXX-XXXX`
  - CPF: 11 digits with checksum
  - CNPJ: 14 digits with checksum
  - Random: 32 alphanumeric chars
- **Ownership validation required:**
  - PIX key must be registered under merchant's CNPJ/CPF
  - Can be async (background job)
  - Status: `pending` → `active` (valid) or `rejected` (invalid)
- **Format normalization:** Remove spaces/hyphens before storing

### Withdrawal Integration
- Withdraw page depends on whitelist:
  - `/api/whitelist/wallets` (different endpoint!) returns flattened active addresses
  - `/api/whitelist/pix` returns active PIX keys
- Only `status: "active"` entries appear in withdraw dropdowns
- If no active addresses, withdraw form shows empty state

---

## Testing Contract

### Manual Testing Endpoints

**Postman/cURL Examples:**

```bash
# 1. Get Whitelist Groups
curl -X GET \
  'https://api.crossramp.io/api/whitelist/groups' \
  -H 'Authorization: Bearer <TOKEN>'

# 2. Get PIX Keys
curl -X GET \
  'https://api.crossramp.io/api/whitelist/pix-keys' \
  -H 'Authorization: Bearer <TOKEN>'
```

### Expected Frontend Integration Test Cases

1. **Happy Path:**
   - All queries succeed → Tabs populated → User can create groups/add addresses/add PIX keys

2. **Loading States:**
   - Initial tab switch shows skeleton loaders

3. **Error States:**
   - Groups API fails → Error message with retry button
   - PIX API fails → Error message with retry button

4. **Empty States:**
   - No groups → "No groups yet. Create your first group..."
   - No PIX keys → "No PIX keys whitelisted yet..."
   - Empty group → "No addresses in this group yet..."

5. **Status Badges:**
   - `status: "active"` → Green badge
   - `status: "pending"` → Gray badge
   - `status: "rejected"` → Red badge (future)

6. **PIX Limit Enforcement:**
   - `total_count < 5` → "Add PIX Key" button enabled
   - `total_count >= 5` → "Add PIX Key" button disabled with tooltip

7. **Role Restrictions:**
   - Admin users get 200 OK
   - Non-Admin users get 403 Forbidden

---

## Contact

**Frontend Team Lead:** [Your Name]  
**Slack Channel:** #crossramp-frontend  
**Documentation:** `/docs/FEATURE_WHITELIST.md`  

For questions about this API contract, please reach out to the frontend team.

---

**Document Status:** ✅ Ready for Backend Implementation  
**Next Review Date:** After backend implementation complete
