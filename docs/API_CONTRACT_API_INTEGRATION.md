# API Contract: API Integration Feature

**View Component:** `/src/app/views/APIIntegrationView.tsx`  
**Route ID:** `api-integration`  
**Section:** Developers

---

## Overview

The API Integration feature allows developers and administrators to manage API keys for integrating Crossramp with external systems. It provides a comprehensive interface for creating, viewing, and disabling API keys, along with access to developer documentation resources.

**Key Security Note:** The full API key is NEVER displayed in the UI after creation. It is only sent via email to the creator once approved by Crossramp operations team. The frontend only displays the key name (identifier) and masked version for security purposes.

---

## Query Endpoints (Read Operations)

### 1. List API Keys

**Purpose:** Retrieve all API keys for the authenticated merchant

**Endpoint:** `GET /api/api-keys/list`

**Query Function:** `queryAPIKeys()` in `/src/app/lib/queries.ts`

**Request Parameters:** None (authentication handled via JWT)

**Response Format:**
```typescript
{
  "api_keys": [
    {
      "id": "apk_001",
      "name": "Production API",
      "key_prefix": "pk_live_",
      "key_masked": "pk_live_••••••••••••••••1234",
      "key_last_4": "1234",
      "status": "active" | "waiting_approval" | "disabled",
      "created_at": "2024-01-15T10:00:00Z",
      "created_by": "admin@company.com",
      "created_by_user_id": "usr_123",
      "last_used_at": "2025-12-22T10:30:00Z" | null,
      "environment": "production" | "staging" | "development",
      "permissions": ["read:payments", "write:payments", "read:balances"],
      "ip_whitelist": ["203.0.113.0/24"],
      "rate_limit": 1000
    }
  ],
  "total_count": 3,
  "active_count": 1,
  "waiting_approval_count": 1,
  "disabled_count": 1
}
```

**Query Category:** C (Load once on mount, refetch after mutations)

**Stale Time:** 60 seconds

**Refetch Strategy:** 
- On mount
- After successful create/disable operations
- Manual refetch via button (if needed)

**Error Handling:**
- Toast notification: "Failed to load API keys"
- Empty state with retry option

**Status Values:**
- `active`: Key is approved and functional
- `waiting_approval`: Key is created but awaiting Crossramp Ops approval
- `disabled`: Key has been permanently disabled

**Environment Types:**
- `production`: Live environment, `pk_live_` prefix
- `staging`: Testing environment, `pk_test_` prefix  
- `development`: Development environment, `pk_dev_` prefix

---

## Command Endpoints (Write Operations)

### 1. Create API Key

**Purpose:** Create a new API key for the merchant

**Endpoint:** `POST /api/commands/api-keys/create`

**Command Function:** `createAPIKey()` in `/src/app/lib/commands.ts`

**Requires MFA:** ✅ Yes (via Auth0 popup with `loginWithPopup()`)

**Request Payload:**
```typescript
{
  "name": "Production API",
  "environment": "production" | "staging" | "development",
  "permissions": ["read:payments", "write:payments", "read:balances"],
  "ip_whitelist": ["203.0.113.0/24", "198.51.100.45"],
  "rate_limit": 1000,
  "webhook_url": "https://merchant.com/webhooks/crossramp",
  "notes": "Main API key for e-commerce integration"
}
```

**Response Format:**
```typescript
{
  "id": "apk_003",
  "name": "Production API",
  "key_full": "pk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "key_masked": "pk_live_••••••••••••••••o5p6",
  "key_last_4": "o5p6",
  "status": "waiting_approval",
  "created_at": "2025-12-22T14:45:00Z",
  "created_by": "admin@company.com",
  "webhook_secret": "whsec_q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "warning": "Save this key now. You won't be able to see it again."
}
```

**Success Actions:**
1. Toast: "API key created successfully. It will be sent to your email once approved."
2. Refetch API keys list
3. Close MFA modal
4. **Important:** Full key is shown ONLY in email, not in UI

**Error Handling:**
- Toast: "Failed to create API key: [error message]"
- Modal remains open for retry

**Backend Validations:**
- `name`: Required, max 100 chars, unique per merchant
- `environment`: Must be one of: production, staging, development
- `permissions`: Non-empty array, each permission must be valid
- `ip_whitelist`: Optional, array of valid IPs or CIDRs
- `rate_limit`: Optional, default 1000 req/hour, max 10000
- `webhook_url`: Optional, must be HTTPS
- User role: Must be Admin or Developer
- Merchant limit: ≤ 10 active API keys

**Post-Creation Flow:**
1. Key created with status `waiting_approval`
2. Full key sent ONLY via email (off-system)
3. Crossramp Ops manually approves key
4. Status changes to `active`
5. Email notification sent to merchant

**UI Behavior:**
- Button shows Lock + Plus icons (visual write action indicator)
- Opens MFAModal for verification
- Uses default values for demo (in production, would show form)

---

### 2. Disable API Key

**Purpose:** Permanently disable an API key

**Endpoint:** `POST /api/commands/api-keys/disable`

**Command Function:** `disableAPIKey()` in `/src/app/lib/commands.ts`

**Requires MFA:** ✅ Yes (via Auth0 popup with `loginWithPopup()`)

**Request Payload:**
```typescript
{
  "api_key_id": "apk_001",
  "reason": "Rotating credentials for security"
}
```

**Response:** None (void)

**Success Actions:**
1. Toast: "API key disabled successfully"
2. Refetch API keys list (key will show `disabled` status)
3. Close MFA modal
4. Email notification sent to merchant (security alert)

**Error Handling:**
- Toast: "Failed to disable API key: [error message]"
- Modal remains open for retry

**Backend Validations:**
- `api_key_id`: Must exist and belong to merchant
- Current status: Must be `active` or `waiting_approval` (cannot disable already disabled key)
- `reason`: Required, max 500 chars (audit trail)
- User role: Must be Admin or Developer

**Important Notes:**
- Disabling is **permanent** - cannot be reversed
- All API calls using disabled key will fail with 401 Unauthorized
- If merchant needs to reactivate, they must create a new key

**UI Behavior:**
- "Disable" button only shown for `active` keys
- Button has red text color (`text-destructive`)
- Opens MFAModal for verification

---

## Permission Scopes

**Format:** `<action>:<resource>`

| Permission | Description | Risk Level |
|-----------|-------------|------------|
| `read:payments` | View payments and transactions | Low |
| `write:payments` | Create checkouts and payments | Medium |
| `read:balances` | View account balances | Low |
| `write:withdrawals` | Request withdrawals | **HIGH** |
| `read:templates` | List templates | Low |
| `write:templates` | Create/edit templates | Medium |
| `read:webhooks` | View webhook logs | Low |
| `write:webhooks` | Configure webhooks | Medium |
| `read:disputes` | View disputes | Low |
| `write:disputes` | Resolve disputes | **HIGH** |
| `admin:*` | Full access to everything | **CRITICAL** |

**Best Practice:** Principle of Least Privilege - keys should only have necessary permissions.

---

## API Key Lifecycle

### Stage 1: Created → Waiting Approval
- Developer creates key via UI
- MFA verified
- Key generated with status `waiting_approval`
- Full key sent via email (NOT shown in UI)
- Crossramp Ops notified for approval

**Duration:** 1-24 hours (depends on Ops availability)

**Merchant Can:**
- View key in list (masked)
- Access full key from email
- Wait for approval

**Merchant Cannot:**
- Use key for API calls (returns 401: "API key pending approval")

---

### Stage 2: Approved → Active
- Crossramp Ops approves key manually
- Status changes to `active`
- Email notification sent to merchant
- Key is now functional

**Duration:** Indefinite (until disabled or account deleted)

**Merchant Can:**
- Make API calls with key
- View usage statistics
- Disable key
- Update permissions/IP whitelist/webhook URL (via separate commands)

---

### Stage 3: Disabled
- Merchant or Ops disables key
- Status changes to `disabled`
- All API calls fail with 401 Unauthorized
- Security alert email sent

**Duration:** Permanent

**Merchant Can:**
- View key in list (historical record)
- See when/why it was disabled

**Merchant Cannot:**
- Use key (disabled permanently)
- Reactivate key (must create new one)

---

## Security Considerations

### Key Display Policy
**CRITICAL:** The full API key is NEVER displayed in the UI after initial creation response. The key is only transmitted via:
1. Email to the creator after Ops approval
2. Initial API response (which the UI does not display)

**UI Only Shows:**
- Key name/identifier
- Masked format: `pk_live_••••••••••••••••1234`
- Last 4 characters for identification
- Status, creation date, creator

### MFA Flow
Both create and disable operations follow the per-action MFA pattern:
1. User clicks action button
2. MFAModal opens
3. User enters MFA code
4. `loginWithPopup()` triggers Auth0 Universal Login
5. Fresh JWT token with MFA claim obtained
6. Command executed with MFA-verified token
7. Backend validates MFA claim in JWT

### Email Delivery
- Full key sent to creator's email after Ops approval
- Email is the ONLY way to retrieve full key post-creation
- Merchant must save key immediately (cannot recover if lost)

### IP Whitelist
- Optional security layer
- If configured, only requests from listed IPs are accepted
- Supports individual IPs and CIDR blocks
- Max 50 IPs per key

### Rate Limiting
- Each key has hourly request limit
- Production default: 1000 req/hour
- Staging default: 500 req/hour
- Development default: 100 req/hour
- Prevents abuse and DDoS

---

## RBAC (Role-Based Access Control)

| Role | Read Access | Write Access (Create/Disable) |
|------|-------------|------------------------------|
| Admin | ✅ Full | ✅ Full |
| Developer | ✅ Full | ✅ Full |
| Operations | ✅ Full | ❌ Read-only |
| Analyst | ❌ No access | ❌ No access |

**Implementation:** Enforced via Auth0 RBAC claims in JWT token

---

## Component Implementation Details

### State Management
```typescript
const [showCreateMFA, setShowCreateMFA] = useState(false);
const [showDisableMFA, setShowDisableMFA] = useState(false);
const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
const [newKeyData, setNewKeyData] = useState<CreateAPIKeyPayload | null>(null);
```

### Query Hook
```typescript
const { data, isLoading, error, refetch } = useQuery<APIKeysResponse>(
  ['apiKeys'],
  () => queryAPIKeys(),
  {
    refetchOnMount: true,
    staleTime: 60000, // 1 minute
  }
);
```

### Mutations
```typescript
const createMutation = useMutation(createAPIKey, {
  onSuccess: (response) => {
    toast.success('API key created successfully. It will be sent to your email once approved.');
    refetch();
  },
  onError: (error) => {
    toast.error(`Failed to create API key: ${error.message}`);
  },
});

const disableMutation = useMutation(disableAPIKey, {
  onSuccess: () => {
    toast.success('API key disabled successfully');
    refetch();
  },
  onError: (error) => {
    toast.error(`Failed to disable API key: ${error.message}`);
  },
});
```

---

## UI Components

### Resources Grid
Displays 4 external documentation links:
1. **Code Reference** - API endpoints, schemas
2. **Implementation Guide** - Step-by-step setup
3. **Webhooks Guide** - Event notifications, security
4. **Flows Guide** - Payment flow diagrams

**Behavior:**
- Hover: scale up, border color change, shadow
- Click: opens in new tab

### API Keys Table
**Columns:**
1. Name - Key identifier
2. API Key - Masked format (`pk_live_••••••••••••••••1234`)
3. Status - Badge (color-coded)
4. Created - Date
5. Created By - Email
6. Actions - Disable button (active keys only)

**Empty State:**
- Key icon
- Message: "No API keys created yet"

### Status Badges
- **Active**: Orange background (#ff4c00), white text, CheckCircle icon
- **Waiting Approval**: Yellow background (#ffb400), white text, Clock icon
- **Disabled**: Gray background, muted text, XCircle icon

### Warning Banner
- Variant: Info (blue)
- Title: "API Key Approval Process"
- Description: Explains approval flow and that full key is sent via email

---

## Translations

All strings fully translated in 3 languages (English, Portuguese, Spanish):

- `api.title` - "API Integration"
- `api.subtitle` - Description
- `api.resources.title` - "Resources"
- `api.resources.codeReference.title/description`
- `api.resources.implementationGuide.title/description`
- `api.resources.webhooksGuide.title/description`
- `api.resources.flowsGuide.title/description`
- `api.keys.title` - "API Keys"
- `api.keys.create` - "Create API Key"
- `api.keys.disable` - "Disable"
- `api.keys.empty` - "No API keys created yet"
- `api.keys.warning.title/description`
- `api.keys.table.*` - All table headers
- `api.status.*` - All status labels
- `api.mfa.create.description` - MFA prompt for create
- `api.mfa.disable.description` - MFA prompt for disable

---

## Future Enhancements

### Planned Commands (Not Yet Implemented)
1. **Regenerate API Key** - Rotate credentials
2. **Update Permissions** - Modify permission scopes
3. **Update IP Whitelist** - Change allowed IPs
4. **Update Webhook URL** - Change webhook endpoint

### Planned Queries (Not Yet Implemented)
1. **Get API Key Details** - View full details of specific key
2. **Get Usage Statistics** - View request counts, error rates, etc.

### Planned UI Features
1. Form modal for key creation (collect name, environment, permissions)
2. Expandable table rows for key details
3. Usage statistics dashboard
4. Key creation form with permission checkboxes
5. IP whitelist configuration UI

---

## Testing Scenarios

### Happy Path - Create Key
1. Admin clicks "Create API Key"
2. MFA modal opens
3. Admin enters code, clicks Verify
4. Auth0 popup authenticates
5. Key created with `waiting_approval` status
6. Toast: "API key created successfully. It will be sent to your email once approved."
7. Table refreshes, new key appears with yellow "Waiting Approval" badge
8. Admin receives email with full key after Ops approval
9. Key status updates to "Active" (green badge)

### Happy Path - Disable Key
1. Admin clicks "Disable" on active key
2. MFA modal opens
3. Admin enters code, clicks Verify
4. Auth0 popup authenticates
5. Key disabled successfully
6. Toast: "API key disabled successfully"
7. Table refreshes, key shows gray "Disabled" badge
8. Disable button no longer appears for that key

### Error - MFA Failure
1. User clicks action button
2. MFA modal opens
3. User enters incorrect code or cancels Auth0 popup
4. Error toast shown
5. Modal remains open for retry

### Error - API Failure
1. User completes MFA successfully
2. Backend returns error (e.g., rate limit, validation failure)
3. Error toast: "Failed to [action]: [error message]"
4. Modal remains open

### Edge Case - Empty State
1. New merchant with no keys
2. Table shows empty state with Key icon
3. Message: "No API keys created yet"
4. "Create API Key" button available

### Edge Case - Operations Role (Read-Only)
1. Operations user views page
2. Can see all keys in table
3. "Create API Key" button disabled or hidden
4. "Disable" buttons disabled or hidden
5. Resources grid still accessible

---

## Mock Data

The component uses mock API keys during development:
- 3 sample keys with different statuses
- Various environments (production, staging)
- Realistic timestamps and metadata

**In Production:** Mock data is replaced with real API calls via `queryAPIKeys()` function.

---

## Notes

1. **Email-Only Key Delivery**: The most important security feature is that full API keys are NEVER displayed in the UI. Users must rely on email delivery.

2. **Ops Approval**: All new keys require manual Crossramp Ops approval before becoming active.

3. **Permanent Disabling**: Disabled keys cannot be reactivated - this is by design for security.

4. **Per-Action MFA**: Every write operation (create, disable) requires fresh MFA verification via Auth0 popup.

5. **Resource Links**: The 4 documentation cards currently link to `#` - need actual URLs in production.

6. **Default Values**: Create flow currently uses default values - production should show form to collect user input.

7. **CQRS Compliance**: 
   - Queries use `/api/` prefix
   - Commands use `/api/commands/` prefix
   - MFA codes transit in JWT, not payloads

---

## Related Documentation

- `/docs/FEATURE_API_INTEGRATION.md` - Comprehensive feature spec
- `/docs/API_COMMAND_ENDPOINTS.md` - All command endpoints
- `/src/app/lib/queries.ts` - Query implementations
- `/src/app/lib/commands.ts` - Command implementations
- `/src/app/content/strings.ts` - Translation strings
