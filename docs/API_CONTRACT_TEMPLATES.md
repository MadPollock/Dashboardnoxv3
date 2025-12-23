# API Contract: Templates Feature

**Version:** 1.0  
**Last Updated:** 2025-12-23  
**Feature:** Payment Template Management (Create, Update, Delete, Duplicate)  
**Frontend Implementation:** `/src/app/views/TemplatesView.tsx`  
**TypeScript Interfaces:** `/src/app/lib/queries.ts` + `/src/app/lib/commands.ts`

---

## Overview

This document defines the API contract between the Crossramp frontend and Bastion backend service for the **Templates** feature. Templates are reusable checkout configuration presets that allow merchants to define payment settings (currency, fees, branding, splits) once and reuse them across multiple payment links.

**Architecture Pattern:** Strict CQRS
- **Queries:** Use `/api/templates/*` endpoints with GET requests
- **Commands:** Use `/api/commands/templates/*` endpoints with POST requests
- **MFA:** All write operations require MFA; code transits ONLY in JWT token (never in payload)

---

## TypeScript Interfaces

All TypeScript interfaces are defined in:
- **Queries:** `/src/app/lib/queries.ts`
- **Commands:** `/src/app/lib/commands.ts`

### Core Types

```typescript
export interface PaymentTemplate {
  id: string;
  name: string;
  currency_code: string;
  currency_display: string; // Human-readable: "BRL", "USDT (TRX)"
  network_display: string | null; // "TRX", "ETH", null for fiat
  button_color: string; // Hex: "#ff4c00"
  logo_url: string | null; // CDN URL or null
  fee_behavior: 'customer_pays' | 'merchant_absorbs';
  charge_network_fee_to_customer: boolean;
  split_enabled: boolean;
  split_percentage: number | null; // 0.01-99.99
  split_flat_fee: number | null;
  split_destination_address: string | null;
  show_powered_by: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  usage_count: number;
}
```

---

## Queries (Read Operations)

### 1. List Templates

**Purpose:** Retrieve paginated list of payment templates for a merchant.

**Endpoint:** `GET /api/templates/list`

**Query Parameters:**
```
?page=1
&limit=10
&sort_by=created_at
&sort_order=desc
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 10 | Items per page (max 100) |
| `sort_by` | string | No | "created_at" | Sort field: "created_at", "name", "usage_count" |
| `sort_order` | string | No | "desc" | Sort order: "asc" or "desc" |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "templates": [
    {
      "id": "tpl_8x7n2m9k",
      "name": "Standard Checkout",
      "currency_code": "BRL",
      "currency_display": "BRL",
      "network_display": null,
      "button_color": "#ff4c00",
      "logo_url": "https://cdn.crossramp.com/logos/merchant123.png",
      "fee_behavior": "customer_pays",
      "charge_network_fee_to_customer": false,
      "split_enabled": false,
      "split_percentage": null,
      "split_flat_fee": null,
      "split_destination_address": null,
      "show_powered_by": true,
      "created_at": "2025-01-10T14:32:00Z",
      "updated_at": "2025-01-10T14:32:00Z",
      "usage_count": 47
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_count": 2,
    "per_page": 10
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired access token"
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Forbidden",
  "message": "User does not have permission to view templates"
}
```

**Frontend Implementation:**
```typescript
import { queryTemplatesList, ListTemplatesRequest } from '../lib/queries';

const response = await queryTemplatesList(
  { page: 1, limit: 10, sort_by: 'created_at', sort_order: 'desc' },
  { headers: { Authorization: `Bearer ${accessToken}` } }
);
```

**Category:** C (Load once on mount + refetch after write actions)

---

### 2. Get Template Details

**Purpose:** Retrieve full details for a specific template, including recent payment history.

**Endpoint:** `GET /api/templates/details`

**Query Parameters:**
```
?template_id=tpl_8x7n2m9k
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `template_id` | string | Yes | Unique template identifier |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "id": "tpl_8x7n2m9k",
  "name": "Standard Checkout",
  "currency_code": "BRL",
  "currency_display": "BRL",
  "network_display": null,
  "button_color": "#ff4c00",
  "logo_url": "https://cdn.crossramp.com/logos/merchant123.png",
  "fee_behavior": "customer_pays",
  "charge_network_fee_to_customer": false,
  "split_enabled": false,
  "split_percentage": null,
  "split_flat_fee": null,
  "split_destination_address": null,
  "show_powered_by": true,
  "created_at": "2025-01-10T14:32:00Z",
  "updated_at": "2025-01-10T14:32:00Z",
  "usage_count": 47,
  "recent_payments": [
    {
      "payment_id": "pay_abc123xyz",
      "amount": 150.00,
      "currency_code": "BRL",
      "created_at": "2025-01-22T10:15:00Z"
    },
    {
      "payment_id": "pay_def456uvw",
      "amount": 85.50,
      "currency_code": "BRL",
      "created_at": "2025-01-21T14:30:00Z"
    }
  ]
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "NotFound",
  "message": "Template not found or does not belong to this merchant"
}
```

**Frontend Implementation:**
```typescript
import { queryTemplateDetails } from '../lib/queries';

const details = await queryTemplateDetails(
  { template_id: 'tpl_8x7n2m9k' },
  { headers: { Authorization: `Bearer ${accessToken}` } }
);
```

**Category:** C (Load on-demand when Edit clicked)

---

## Commands (Write Operations)

**IMPORTANT:** All commands require MFA step-up authentication. The MFA code transits **ONLY in the JWT token** via the `Authorization` header after successful `loginWithPopup()`. **DO NOT include `mfa_code` in the request payload.**

### 3. Create Template

**Purpose:** Create a new payment template.

**Endpoint:** `POST /api/commands/templates/create`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {mfa_access_token}
x-user-id: {user_id}
x-user-role: {user_role}
```

**Request Body:**
```json
{
  "name": "Standard Checkout",
  "currency_code": "BRL",
  "button_color": "#ff4c00",
  "logo_file_base64": "data:image/png;base64,iVBORw0KGg...",
  "fee_behavior": "customer_pays",
  "charge_network_fee_to_customer": false,
  "split_enabled": false,
  "split_percentage": null,
  "split_flat_fee": null,
  "split_destination_address": null,
  "show_powered_by": true
}
```

**Field Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 100 chars, unique per merchant |
| `currency_code` | string | Yes | Must exist in `/config/currencies.ts` (BRL, TRX_USDT_S2UZ, etc.) |
| `button_color` | string | Yes | Valid hex color (#RRGGBB) |
| `logo_file_base64` | string/null | No | Base64 data URI, decoded size ≤ 2MB, format: png/jpg/svg |
| `fee_behavior` | enum | Yes | "customer_pays" or "merchant_absorbs" |
| `charge_network_fee_to_customer` | boolean | Yes | Only relevant for crypto currencies |
| `split_enabled` | boolean | Yes | If true, split_percentage and split_destination_address are required |
| `split_percentage` | number/null | Conditional | Required if split_enabled=true, range 0.01-99.99 |
| `split_flat_fee` | number/null | No | Optional, decimal ≥ 0 |
| `split_destination_address` | string/null | Conditional | Required if split_enabled=true, valid address for currency network |
| `show_powered_by` | boolean | Yes | Show "Powered by Crossramp" badge |

**Logo Upload Workflow:**
1. Frontend: User selects file via `<input type="file" accept="image/png,image/jpeg,image/svg+xml" />`
2. Frontend: Validates size ≤ 2MB and format
3. Frontend: Converts to base64 data URI: `"data:image/png;base64,iVBORw0KGg..."`
4. Frontend: Sends base64 string in `logo_file_base64` field
5. Backend: Decodes base64 → uploads to S3 → returns `logo_url` in response
6. If `logo_file_base64` is null or omitted, template has no logo

**Success Response (200 OK):**
```json
{
  "success": true,
  "template_id": "tpl_8x7n2m9k",
  "message": "Template created successfully"
}
```

**Error Response (400 Bad Request) - Validation:**
```json
{
  "success": false,
  "error_code": "VALIDATION_ERROR",
  "message": "Template name already exists",
  "metadata": {
    "field": "name",
    "constraint": "unique"
  }
}
```

**Error Response (400 Bad Request) - Invalid Currency:**
```json
{
  "success": false,
  "error_code": "INVALID_CURRENCY",
  "message": "Currency code 'EUR' is not supported"
}
```

**Error Response (400 Bad Request) - Invalid Split Address:**
```json
{
  "success": false,
  "error_code": "INVALID_ADDRESS",
  "message": "Address format invalid for selected network (expected Tron address starting with T)"
}
```

**Error Response (403 Forbidden) - Missing MFA:**
```json
{
  "success": false,
  "error_code": "MFA_REQUIRED",
  "message": "Multi-factor authentication required for this operation"
}
```

**Frontend Implementation:**
```typescript
import { createTemplate, CreateTemplateCommand } from '../lib/commands';
import { useAuth0 } from '@auth0/auth0-react';

// Step 1: Trigger MFA via Auth0
const { getAccessTokenSilently, loginWithPopup, user } = useAuth0();
await loginWithPopup({ authorizationParams: { acr_values: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor' } });

// Step 2: Get fresh token with MFA claim
const mfaToken = await getAccessTokenSilently();

// Step 3: Submit command
const payload: CreateTemplateCommand = {
  name: 'Standard Checkout',
  currency_code: 'BRL',
  button_color: '#ff4c00',
  logo_file_base64: logoBase64String,
  fee_behavior: 'customer_pays',
  charge_network_fee_to_customer: false,
  split_enabled: false,
  show_powered_by: true,
};

const response = await createTemplate(payload, { accessToken: mfaToken, user });
```

---

### 4. Update Template

**Purpose:** Update an existing payment template. **Note:** `currency_code` is immutable and cannot be changed.

**Endpoint:** `POST /api/commands/templates/update`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {mfa_access_token}
x-user-id: {user_id}
x-user-role: {user_role}
```

**Request Body (Partial Update):**
```json
{
  "template_id": "tpl_8x7n2m9k",
  "name": "Updated Name",
  "button_color": "#2563eb",
  "logo_file_base64": null,
  "fee_behavior": "merchant_absorbs",
  "charge_network_fee_to_customer": true,
  "split_enabled": true,
  "split_percentage": 15.0,
  "split_flat_fee": 3.00,
  "split_destination_address": "TJA9WfVjCvHvKSgN5bHSKvXJP8xKvhKqq1",
  "show_powered_by": false
}
```

**Field Notes:**
- **All fields except `template_id` are optional** (partial update)
- **`currency_code` is NOT allowed** - backend should return 400 error if included
- **`logo_file_base64`:**
  - Omit field = keep existing logo
  - Send `null` = remove logo (delete from S3, set `logo_url: null`)
  - Send new base64 = replace logo (upload new, delete old from S3)

**Success Response (200 OK):**
```json
{
  "success": true,
  "template_id": "tpl_8x7n2m9k",
  "message": "Template updated successfully"
}
```

**Error Response (400 Bad Request) - Immutable Field:**
```json
{
  "success": false,
  "error_code": "IMMUTABLE_FIELD",
  "message": "Currency code cannot be changed after template creation"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error_code": "NOT_FOUND",
  "message": "Template not found or does not belong to this merchant"
}
```

**Frontend Implementation:**
```typescript
import { updateTemplate, UpdateTemplateCommand } from '../lib/commands';

const payload: UpdateTemplateCommand = {
  template_id: 'tpl_8x7n2m9k',
  name: 'Updated Name',
  button_color: '#2563eb',
  // currency_code is intentionally omitted (immutable)
};

const response = await updateTemplate(payload, { accessToken: mfaToken, user });
```

---

### 5. Delete Template

**Purpose:** Delete a payment template. **Critical:** Template cannot be deleted if in use by active payment links.

**Endpoint:** `POST /api/commands/templates/delete`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {mfa_access_token}
x-user-id: {user_id}
x-user-role: {user_role}
```

**Request Body:**
```json
{
  "template_id": "tpl_8x7n2m9k"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

**Error Response (400 Bad Request) - Template In Use:**
```json
{
  "success": false,
  "error_code": "TEMPLATE_IN_USE",
  "message": "Cannot delete template with 3 active payment links. Archive or reassign them first.",
  "metadata": {
    "active_payment_links": 3,
    "pending_payments": 0
  }
}
```

**Backend Validation:**
- Check if template has any active payment links (`status IN ('active', 'pending')`)
- Check if template has any pending payments
- If yes, return `TEMPLATE_IN_USE` error with counts
- If no, proceed with soft-delete or hard-delete (per your data retention policy)

**Frontend Handling:**
```typescript
import { deleteTemplate } from '../lib/commands';
import { toast } from 'sonner';

try {
  const response = await deleteTemplate(
    { template_id: 'tpl_8x7n2m9k' },
    { accessToken: mfaToken, user }
  );
  
  if (!response.success && response.error_code === 'TEMPLATE_IN_USE') {
    const count = response.metadata?.active_payment_links;
    toast.error(`Cannot delete template. It's being used by ${count} active payment links.`);
  } else if (response.success) {
    toast.success('Template deleted successfully');
  }
} catch (error) {
  toast.error('Failed to delete template');
}
```

---

### 6. Duplicate Template

**Purpose:** Create an exact copy of an existing template with a new name.

**Endpoint:** `POST /api/commands/templates/duplicate`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {mfa_access_token}
x-user-id: {user_id}
x-user-role: {user_role}
```

**Request Body:**
```json
{
  "template_id": "tpl_8x7n2m9k",
  "new_name": "Standard Checkout (Copy)"
}
```

**Field Validation:**
- `template_id`: Must exist and belong to merchant
- `new_name`: Max 100 chars, unique per merchant

**Success Response (200 OK):**
```json
{
  "success": true,
  "template_id": "tpl_9y8o3n0l",
  "message": "Template duplicated successfully"
}
```

**Backend Behavior:**
- Copy ALL settings from original template:
  - currency_code
  - button_color
  - logo (copy S3 file to new key)
  - fee_behavior
  - charge_network_fee_to_customer
  - split_enabled, split_percentage, split_flat_fee, split_destination_address
  - show_powered_by
- Generate new unique `template_id`
- Set `created_at` = current timestamp
- Set `usage_count` = 0 (new template has no payment links yet)

**Frontend Implementation:**
```typescript
import { duplicateTemplate } from '../lib/commands';

const response = await duplicateTemplate(
  { template_id: 'tpl_8x7n2m9k', new_name: 'Standard Checkout (Copy)' },
  { accessToken: mfaToken, user }
);

console.log('New template ID:', response.template_id);
```

---

## Currency Network Address Validation

When `split_enabled: true`, the `split_destination_address` must match the network format of the selected `currency_code`:

| Currency Code | Network | Address Format | Regex Validation | Example |
|---------------|---------|----------------|------------------|---------|
| `TRX_USDT_S2UZ` | Tron (TRC-20) | Starts with `T`, 34 chars | `^T[A-Za-z0-9]{33}$` | `TJA9WfVjCvHvKSgN5bHSKvXJP8xKvhKqq1` |
| `ETH_USDC_VUSD` | Ethereum (ERC-20) | Starts with `0x`, 42 chars | `^0x[a-fA-F0-9]{40}$` | `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` |
| `ETH_USDT_93F2` | Ethereum (ERC-20) | Starts with `0x`, 42 chars | `^0x[a-fA-F0-9]{40}$` | `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` |
| `MATIC_USDC_8KW1` | Polygon | Starts with `0x`, 42 chars | `^0x[a-fA-F0-9]{40}$` | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| `MATIC_USDT_VL90` | Polygon | Starts with `0x`, 42 chars | `^0x[a-fA-F0-9]{40}$` | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| `SOL_USDC_EPjF` | Solana | Base58, 32-44 chars | `^[1-9A-HJ-NP-Za-km-z]{32,44}$` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `BTC` | Bitcoin | Starts with `1`, `3`, or `bc1` | `^(1\|3\|bc1)[a-zA-Z0-9]{25,42}$` | `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` |
| `BRL` | N/A (PIX) | N/A | N/A | **Splits not supported for fiat** |
| `EUR` | N/A (SEPA) | N/A | N/A | **Splits not supported for fiat** |
| `MXN` | N/A (SPEI) | N/A | N/A | **Splits not supported for fiat** |
| `ARS` | N/A | N/A | N/A | **Splits not supported for fiat** |
| `COP` | N/A | N/A | N/A | **Splits not supported for fiat** |

**Backend Validation:**
1. If `split_enabled: true` and `currency_code` is fiat (BRL, EUR, MXN, ARS, COP), return 400 "Splits not supported for this currency"
2. If `split_enabled: true` and `split_destination_address` format doesn't match network, return 400 "Address format invalid for selected network"

---

## RBAC - Role Permissions

Only the following roles can access Templates endpoints:
- **Admin** (`user_admin_crossramp`)
- **Operations** (`user_operations_crossramp`)

All other roles (Finance, Customer Support, Viewer, etc.) should receive **403 Forbidden**.

Backend should verify:
1. Valid Auth0 JWT token in `Authorization` header
2. User role in token claims or `x-user-role` header
3. Role ∈ {Admin, Operations}

---

## MFA Flow (Critical for Commands)

All write operations require MFA. Frontend workflow:

```typescript
// 1. User clicks "Create Template" → Open CreateSheet
// 2. User fills form and clicks "Save"
// 3. Frontend validates form client-side
// 4. Frontend triggers MFA popup:
await loginWithPopup({
  authorizationParams: {
    acr_values: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor',
  },
});

// 5. User completes MFA in Auth0 Universal Login
// 6. Frontend gets fresh token with amr:['mfa'] claim:
const mfaToken = await getAccessTokenSilently();

// 7. Frontend submits command with MFA token:
const response = await createTemplate(payload, { accessToken: mfaToken, user });

// 8. Backend verifies:
//    - JWT signature valid
//    - Token not expired
//    - amr claim includes 'mfa'
//    - User role ∈ {Admin, Operations}
```

**Backend MFA Verification:**
```python
# Pseudo-code for backend
def verify_mfa_token(token: str) -> bool:
    decoded = jwt.decode(token, verify=True)
    
    # Check token expiry
    if decoded['exp'] < current_timestamp():
        raise Unauthorized("Token expired")
    
    # Check MFA claim
    if 'mfa' not in decoded.get('amr', []):
        raise Forbidden("MFA required for this operation")
    
    # Check role
    if decoded.get('role') not in ['user_admin_crossramp', 'user_operations_crossramp']:
        raise Forbidden("Insufficient permissions")
    
    return True
```

---

## Error Handling Summary

| Status Code | Error Code | Description | Frontend Action |
|-------------|------------|-------------|-----------------|
| 400 | `VALIDATION_ERROR` | Field validation failed | Show field-specific error |
| 400 | `INVALID_CURRENCY` | Currency code not supported | Show toast error |
| 400 | `INVALID_ADDRESS` | Split address format invalid | Show inline error on address field |
| 400 | `TEMPLATE_IN_USE` | Cannot delete template with active links | Show toast with count |
| 400 | `IMMUTABLE_FIELD` | Attempted to change currency_code | Show toast error |
| 401 | `UNAUTHORIZED` | Invalid/expired token | Redirect to login |
| 403 | `MFA_REQUIRED` | Missing MFA claim in token | Trigger MFA popup |
| 403 | `FORBIDDEN` | Insufficient role permissions | Show "Access denied" message |
| 404 | `NOT_FOUND` | Template doesn't exist | Show toast error |
| 500 | `INTERNAL_ERROR` | Server error | Show generic error toast |

---

## Mock Mode

Frontend operates in **Mock Mode** when `window.crossrampConfig.MOCK_QUERIES_ENABLED = true`. All queries and commands return synthetic data without hitting real API endpoints.

**Mock Data Characteristics:**
- 3 templates: Standard Checkout (BRL), Premium Split (USDT-TRX), Express Payment (USDC-ETH)
- Pagination works correctly
- Template details include 3 recent mock payments
- Commands simulate 500-800ms network delay
- Delete command returns `TEMPLATE_IN_USE` error for template ID `tpl_8x7n2m9k`
- All other operations succeed

---

## Testing Checklist for Backend Team

### Queries
- [ ] `/api/templates/list` returns templates for authenticated merchant only
- [ ] Pagination works correctly (page, limit, total_count, total_pages)
- [ ] Sorting works for all supported fields (created_at, name, usage_count)
- [ ] `/api/templates/details` returns 404 if template doesn't belong to merchant
- [ ] `usage_count` accurately reflects number of payment links using this template
- [ ] `recent_payments` returns max 5 most recent payments using this template

### Commands - Create
- [ ] MFA token validation works (amr claim includes 'mfa')
- [ ] RBAC works (only Admin and Operations can create)
- [ ] `currency_code` validation against supported currencies
- [ ] Logo base64 decoding and S3 upload works
- [ ] Logo size validation (reject > 2MB after decode)
- [ ] Split address validation matches currency network
- [ ] Reject splits on fiat currencies (BRL, EUR, MXN, ARS, COP)
- [ ] Split percentage range validation (0.01-99.99)
- [ ] Template name uniqueness per merchant

### Commands - Update
- [ ] Reject if `currency_code` field is present in payload (immutable field)
- [ ] Partial update works (only update provided fields)
- [ ] Logo removal works (`logo_file_base64: null`)
- [ ] Logo replacement works (upload new, delete old from S3)
- [ ] Updates only affect NEW payment links (existing links keep original config)

### Commands - Delete
- [ ] Correctly detects template in use (active or pending payment links)
- [ ] Returns `TEMPLATE_IN_USE` error with accurate counts
- [ ] Soft-delete or hard-delete per retention policy
- [ ] Logo cleanup from S3 if template deleted

### Commands - Duplicate
- [ ] All settings copied correctly
- [ ] Logo file copied in S3 (new key)
- [ ] New template has unique ID and `usage_count: 0`
- [ ] `new_name` uniqueness validation

---

## Notes for Bastion Adapter Service

If your backend returns different field names or structure, the Bastion adapter service should transform responses to match these exact contracts:

**Example Adapter Transformation:**
```typescript
// Backend returns snake_case and different structure
const backendResponse = {
  template_id: "t_12345",
  display_name: "Standard",
  currency: "brl",
  primary_color: "#ff4c00",
  // ...
};

// Bastion transforms to frontend contract
const frontendResponse = {
  id: backendResponse.template_id,
  name: backendResponse.display_name,
  currency_code: backendResponse.currency.toUpperCase(),
  button_color: backendResponse.primary_color,
  // ... map all fields per PaymentTemplate interface
};
```

---

## Changelog

### v1.0 - 2025-12-23
- Initial API contract for Templates feature
- Defined 2 queries (list, details) and 4 commands (create, update, delete, duplicate)
- MFA flow clarified (code in JWT only, not in payload)
- Currency network address validation table added
- RBAC requirements specified (Admin + Operations only)
- Error codes and handling documented

---

**Questions or Issues?**  
Contact frontend team for clarifications on TypeScript interfaces or expected behavior.
