# API Command Endpoints - Crossramp Dashboard

**Last Updated:** December 23, 2024  
**Version:** 2.0.0  
**Status:** ✅ Standardized Convention

---

## Overview

This document specifies the **WRITE-MODEL COMMAND ENDPOINTS** following CQRS architecture. All commands use the `/api/commands/` prefix.

---

## Command API Convention

### Base URL Structure

```
Development:   https://api-dev.crossramp.io/api/commands
Staging:       https://api-staging.crossramp.io/api/commands
Production:    https://api.crossramp.io/api/commands
```

### Path Convention

**✅ CORRECT:**
```
POST /api/commands/{domain}/{action}
POST /api/commands/users/add
POST /api/commands/whitelist/pix/add
POST /api/commands/template
POST /api/commands/withdraw
```

**❌ INCORRECT (OLD):**
```
POST /users/add              ❌ Missing /api/commands/ prefix
POST /api/whitelist/add      ❌ Using /api/ instead of /api/commands/
POST /whitelist/pix/add      ❌ Missing /api/commands/ prefix
```

### Using postCommand()

**File:** `/src/app/lib/commandClient.ts`

```typescript
import { postCommand } from '../lib/commandClient';

// postCommand() automatically adds /api/commands/ prefix
await postCommand('users/add', payload, context);
// → POST https://api.crossramp.io/api/commands/users/add

await postCommand('whitelist/pix/add', payload, context);
// → POST https://api.crossramp.io/api/commands/whitelist/pix/add
```

**Convention:**
- Pass command path WITHOUT `/api/commands/` prefix
- `postCommand()` automatically prepends it
- Use lowercase with `/` separators
- Format: `{domain}/{action}`

---

## Standard Request Headers

All commands MUST include:

```http
POST /api/commands/{command}
Content-Type: application/json
Authorization: Bearer {auth0_access_token}
x-user-id: {user_id}
x-user-role: {user_role}
x-user-metadata: {json_metadata}
```

**Payload Structure:**
```typescript
{
  // Command-specific fields
  ...payload,
  
  // Automatically added by postCommand()
  mfaCode?: string,           // If MFA verification required
  userContext: {
    id: string,               // User ID
    role: string,             // User role
    metadata: object          // User metadata
  }
}
```

---

## Command Endpoints

### 1. Template Commands

#### Create Template
```http
POST /api/commands/template
```

**Request:**
```typescript
{
  name: string;              // "Bitcoin Template"
  currency: string;          // "BTC"
  amount?: string;           // "0.001"
  description?: string;      // "Daily bitcoin purchase"
  settings?: object;         // Additional settings
  mfaCode?: string;          // If MFA required
}
```

**Response:**
```typescript
{
  id: string;                // "tpl_abc123"
  name: string;              // "Bitcoin Template"
  currency: string;          // "BTC"
  status: 'active';
  createdAt: string;         // ISO date
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/template`;
await fetch(url, { method: 'POST', ... });
```

#### Update Template
```http
POST /api/commands/template/{id}
```

**Request:**
```typescript
{
  id: string;                // "tpl_abc123"
  name?: string;             // Updated name
  currency?: string;         // Updated currency
  amount?: string;           // Updated amount
  description?: string;      // Updated description
  settings?: object;         // Updated settings
  mfaCode?: string;          // If MFA required
}
```

**Response:**
```typescript
{
  id: string;
  name: string;
  currency: string;
  status: 'active';
  updatedAt: string;
}
```

#### Delete Template
```http
POST /api/commands/template/{id}/delete
```

**Request:**
```typescript
{
  mfaCode?: string;          // If MFA required
}
```

**Response:**
```typescript
{
  id: string;
  status: 'deleted';
  deletedAt: string;
}
```

---

### 2. Payment Commands

#### Create Payment Link
```http
POST /api/commands/payment/create-link
```

**Request:**
```typescript
{
  amount: string;            // "100.00"
  currency: string;          // "BRL"
  description?: string;      // "Payment for order #123"
  expiresAt?: string;        // ISO date
  metadata?: object;         // Additional metadata
  mfaCode?: string;          // If MFA required
}
```

**Response:**
```typescript
{
  id: string;                // "pmt_abc123"
  link: string;              // "https://pay.crossramp.io/pmt_abc123"
  amount: string;
  currency: string;
  status: 'pending';
  createdAt: string;
}
```

---

### 3. Withdrawal Commands

#### Request Withdrawal
```http
POST /api/commands/withdraw
```

**Request:**
```typescript
{
  amount: string;            // "1000.00"
  currency: string;          // "BRL"
  destinationType: 'bank_account' | 'pix' | 'crypto';
  destination: {
    // For PIX
    pixKey?: string;
    pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    
    // For Bank Transfer
    bankCode?: string;
    accountNumber?: string;
    accountType?: 'checking' | 'savings';
    
    // For Crypto
    address?: string;
    network?: string;
  };
  mfaCode: string;           // REQUIRED for withdrawals
}
```

**Response:**
```typescript
{
  id: string;                // "wdr_abc123"
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: string;
  currency: string;
  estimatedCompletion: string; // ISO date
  confirmationUrl?: string;  // If additional confirmation needed
  createdAt: string;
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/withdraw`;
await fetch(url, { method: 'POST', ... });
```

**Used by:**
- `/src/app/components/admin/WithdrawalRequestForm.tsx` (via postCommand: 'withdrawals/request')

---

### 4. Whitelist Commands

#### Add Crypto Address
```http
POST /api/commands/whitelist/add
```

**Request:**
```typescript
{
  address: string;           // "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  label: string;             // "Main Ethereum Wallet"
  network: string;           // "ethereum"
  mfaCode: string;           // REQUIRED
}
```

**Response:**
```typescript
{
  id: string;                // "wl_abc123"
  address: string;
  label: string;
  network: string;
  status: 'pending' | 'active';
  createdAt: string;
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/whitelist/add`;
await fetch(url, { method: 'POST', ... });
```

**Used by:**
- `/src/app/components/admin/WhitelistForm.tsx` (via postCommand: 'whitelist/address/add')

#### Add PIX Key
```http
POST /api/commands/whitelist/pix/add
```

**Request:**
```typescript
{
  pixKey: string;            // "user@example.com" or "12345678900"
  keyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  label: string;             // "Personal PIX"
  mfaCode: string;           // REQUIRED
}
```

**Response:**
```typescript
{
  id: string;                // "pix_abc123"
  pixKey: string;
  keyType: string;
  label: string;
  status: 'pending' | 'active';
  createdAt: string;
}
```

**Used by:**
- `/src/app/components/admin/PIXWhitelistForm.tsx` (via postCommand: 'whitelist/pix/add')

#### Create Whitelist Group
```http
POST /api/commands/whitelist/group/create
```

**Request:**
```typescript
{
  name: string;              // "Development Wallets"
  description?: string;      // "Wallets used for development"
  addresses: string[];       // ["wl_abc123", "wl_def456"]
  mfaCode?: string;
}
```

**Response:**
```typescript
{
  id: string;                // "wlg_abc123"
  name: string;
  description: string;
  addressCount: number;
  status: 'active';
  createdAt: string;
}
```

**Used by:**
- `/src/app/components/admin/WhitelistGroupForm.tsx` (via postCommand: 'whitelist/group/create')

#### Remove Whitelist Address
```http
POST /api/commands/whitelist/{id}/delete
```

**Request:**
```typescript
{
  mfaCode: string;           // REQUIRED
}
```

**Response:**
```typescript
{
  id: string;
  status: 'deleted';
  deletedAt: string;
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/whitelist/${addressId}`;
await fetch(url, { method: 'POST', ... });
```

---

### 5. Report Commands

#### Request Report
```http
POST /api/commands/report/request
```

**Request:**
```typescript
{
  reportType: 'transactions' | 'payments' | 'settlements' | 'reconciliation';
  format: 'csv' | 'pdf' | 'xlsx';
  dateRange: {
    from: string;            // ISO date
    to: string;              // ISO date
  };
  filters?: {
    currency?: string;
    status?: string;
    minAmount?: string;
    maxAmount?: string;
  };
  mfaCode?: string;
}
```

**Response:**
```typescript
{
  id: string;                // "rpt_abc123"
  reportType: string;
  format: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  downloadUrl?: string;      // Available when status = 'ready'
  expiresAt: string;         // ISO date
  createdAt: string;
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/report/request`;
await fetch(url, { method: 'POST', ... });
```

---

### 6. User Management Commands

#### Add User
```http
POST /api/commands/user
```

**Request:**
```typescript
{
  email: string;             // "user@example.com"
  name: string;              // "John Doe"
  role: 'admin' | 'finance' | 'operations' | 'developer';
  permissions?: string[];    // ["read:payments", "write:withdrawals"]
  mfaCode?: string;
}
```

**Response:**
```typescript
{
  id: string;                // "usr_abc123"
  email: string;
  name: string;
  role: string;
  status: 'pending_invitation' | 'active';
  invitationSent: boolean;
  createdAt: string;
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/user`;
await fetch(url, { method: 'POST', ... });
```

**Used by:**
- `/src/app/components/admin/AddUserForm.tsx` (via postCommand: 'users/add')

---

### 7. API Key Commands

#### Create API Key
```http
POST /api/commands/api-keys/create
```

**Request:**
```typescript
{
  name: string;              // "Production API Key"
  environment: 'production' | 'staging' | 'development';
  permissions: string[];     // ["read:payments", "write:payments"]
  ipWhitelist?: string[];    // ["203.0.113.0/24"]
  rateLimit?: number;        // 1000
  mfaCode: string;           // REQUIRED
}
```

**Response:**
```typescript
{
  id: string;                // "apk_abc123"
  name: string;
  key: string;               // Full API key (ONLY SHOWN ONCE)
  keyPrefix: string;         // "pk_live_"
  keyMasked: string;         // "pk_live_••••••••••••••••1234"
  environment: string;
  status: 'active';
  createdAt: string;
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/api-keys/create`;
await fetch(url, { method: 'POST', ... });
```

#### Disable API Key
```http
POST /api/commands/api-keys/disable
```

**Request:**
```typescript
{
  apiKeyId: string;          // "apk_abc123"
  reason?: string;           // "Key compromised"
  mfaCode: string;           // REQUIRED
}
```

**Response:**
```typescript
{
  id: string;
  status: 'disabled';
  disabledAt: string;
  disabledBy: string;        // User ID
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/api-keys/disable`;
await fetch(url, { method: 'POST', ... });
```

---

### 8. Security / MFA Commands

#### Activate MFA
```http
POST /api/commands/security/mfa/activate
```

**Request:**
```typescript
{
  // No payload - backend sends email with QR code
}
```

**Response:**
```typescript
{
  status: 'pending';
  message: string;           // "MFA activation email sent"
  emailSent: boolean;        // true
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/security/mfa/activate`;
await fetch(url, { method: 'POST', ... });
```

#### Confirm MFA
```http
POST /api/commands/security/mfa/confirm
```

**Request:**
```typescript
{
  mfaCode: string;           // 6-digit code from authenticator app
}
```

**Response:**
```typescript
{
  status: 'active';
  message: string;           // "MFA successfully activated"
  activatedAt: string;       // ISO date
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/security/mfa/confirm`;
await fetch(url, { method: 'POST', ... });
```

#### Deactivate MFA
```http
POST /api/commands/security/mfa/deactivate
```

**Request:**
```typescript
{
  mfaCode: string;           // Current MFA code required to deactivate
}
```

**Response:**
```typescript
{
  status: 'not_activated';
  message: string;           // "MFA successfully deactivated"
}
```

**Implementation:**
```typescript
// Direct fetch (commands.ts)
const url = `${getAPIBaseURL()}/api/commands/security/mfa/deactivate`;
await fetch(url, { method: 'POST', ... });
```

---

## Implementation Approaches

### Approach 1: Using postCommand() (Recommended for new code)

**File:** Any component

```typescript
import { postCommand } from '../lib/commandClient';
import { useAuth } from '../contexts/AuthContext';

const { user, getAccessToken } = useAuth();

const handleSubmit = async () => {
  const accessToken = await getAccessToken();
  
  await postCommand('users/add', {
    email: 'user@example.com',
    name: 'John Doe',
    role: 'admin',
  }, {
    accessToken,
    user,
    mfaCode: '123456', // If MFA required
  });
};
```

**Benefits:**
- ✅ Automatic `/api/commands/` prefix
- ✅ Automatic userContext injection
- ✅ Standard headers (Authorization, x-user-id, x-user-role)
- ✅ Centralized error handling
- ✅ Type-safe with CommandContext

**Used by:**
- `/src/app/components/admin/AddUserForm.tsx`
- `/src/app/components/admin/WhitelistForm.tsx`
- `/src/app/components/admin/WithdrawalRequestForm.tsx`
- `/src/app/components/admin/WhitelistGroupForm.tsx`
- `/src/app/components/admin/PIXWhitelistForm.tsx`

### Approach 2: Direct fetch() (Used in commands.ts)

**File:** `/src/app/lib/commands.ts`

```typescript
export async function createTemplate(
  payload: CreateTemplatePayload,
  options: CommandOptions
): Promise<CreateTemplateResponse> {
  if (isMockMode()) {
    // Mock response
    return { ... };
  }

  const url = `${getAPIBaseURL()}/api/commands/template`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': options.accessToken ? `Bearer ${options.accessToken}` : '',
    },
    body: JSON.stringify({
      ...payload,
      mfa_code: options.mfaCode,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to create template: ${response.statusText}`);
  }

  return response.json();
}
```

**Benefits:**
- ✅ Full control over request
- ✅ Type-safe payload and response
- ✅ Mock mode support
- ✅ AbortController signal support
- ✅ Custom error messages

**Used by:**
- All functions in `/src/app/lib/commands.ts`

---

## URL Construction Summary

| Approach | Input | Final URL |
|----------|-------|-----------|
| postCommand() | `'users/add'` | `${apiBase}/api/commands/users/add` |
| postCommand() | `'whitelist/pix/add'` | `${apiBase}/api/commands/whitelist/pix/add` |
| Direct fetch | Full URL | `${apiBase}/api/commands/template` |
| Direct fetch | Full URL | `${apiBase}/api/commands/withdraw` |

**Convention:**
- **postCommand()**: Pass SHORT command path (e.g., `'users/add'`)
- **Direct fetch**: Build FULL URL with `/api/commands/` prefix

---

## Migration from Old Paths

### Old (Before Fix)

```typescript
// ❌ Component using postCommand with short path
await postCommand('users/add', ...);
// → POST https://api.crossramp.io/users/add (WRONG!)

// ❌ Component using postCommand with short path
await postCommand('whitelist/pix/add', ...);
// → POST https://api.crossramp.io/whitelist/pix/add (WRONG!)
```

### New (After Fix)

```typescript
// ✅ Component using postCommand with short path
await postCommand('users/add', ...);
// → POST https://api.crossramp.io/api/commands/users/add (CORRECT!)

// ✅ Component using postCommand with short path
await postCommand('whitelist/pix/add', ...);
// → POST https://api.crossramp.io/api/commands/whitelist/pix/add (CORRECT!)
```

**Change:**
- Updated `commandClient.ts` to prepend `/api/commands/` automatically
- NO changes needed to component code
- All existing `postCommand()` calls now work correctly

---

## Command Name Mapping

| Component Call | postCommand Path | Final API URL |
|----------------|------------------|---------------|
| AddUserForm | `'users/add'` | `POST /api/commands/users/add` |
| WhitelistForm | `'whitelist/address/add'` | `POST /api/commands/whitelist/address/add` |
| PIXWhitelistForm | `'whitelist/pix/add'` | `POST /api/commands/whitelist/pix/add` |
| WhitelistGroupForm | `'whitelist/group/create'` | `POST /api/commands/whitelist/group/create` |
| WithdrawalRequestForm | `'withdrawals/request'` | `POST /api/commands/withdrawals/request` |

**Note:** Some paths differ between components and commands.ts:
- Component: `'withdrawals/request'` → `/api/commands/withdrawals/request`
- commands.ts: `createWithdrawal()` → `/api/commands/withdraw`

**Recommendation:** Standardize to one naming convention (e.g., use commands.ts as source of truth).

---

## Error Handling

### postCommand() Errors

```typescript
try {
  await postCommand('users/add', payload, context);
} catch (error) {
  // Error format: "Command users/add failed with status 400"
  // or backend error message
  console.error(error.message);
}
```

### Direct fetch() Errors

```typescript
try {
  await createTemplate(payload, options);
} catch (error) {
  // Error format: "Failed to create template: Bad Request"
  console.error(error.message);
}
```

---

## Testing

### Development/Staging (Mock Mode)

```bash
# /public/config.js
window.__CROSSRAMP_CONFIG__ = {
  environment: 'development',
  api: {
    enabled: false,  // Mock mode
  }
};
```

All commands return mock responses without hitting backend.

### Production (Real API)

```bash
# /public/config.js
window.__CROSSRAMP_CONFIG__ = {
  environment: 'production',
  api: {
    enabled: true,
    baseUrl: 'https://api.crossramp.io'
  }
};
```

All commands hit real backend at `https://api.crossramp.io/api/commands/*`.

---

## Summary

**✅ Standardized Convention:**
- All commands use `/api/commands/` prefix
- postCommand() automatically adds prefix
- Direct fetch() builds full URL
- Consistent with CQRS architecture

**✅ Benefits:**
- Clear separation: queries use `/api/`, commands use `/api/commands/`
- Type-safe interfaces
- Centralized error handling
- Mock mode support
- Auth0 integration

**✅ Next Steps:**
- Backend implements all `/api/commands/*` endpoints
- Document command responses
- Add OpenAPI/Swagger spec for commands
- Standardize command naming (resolve `withdrawals/request` vs `withdraw`)

---

**Last Updated:** December 23, 2024  
**Maintained By:** Crossramp Engineering  
**Status:** API Command Convention STANDARDIZED 🟢
