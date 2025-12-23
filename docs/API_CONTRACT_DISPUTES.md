# API Contract: Disputes Feature

**Version:** 1.0  
**Last Updated:** 2025-12-23  
**Feature:** Dispute Management (View, Search, Submit Defense, Process Refund, Contest Infraction)  
**Frontend Implementation:** `/src/app/views/DisputesView.tsx`  
**TypeScript Interfaces:** `/src/app/lib/queries.ts` + `/src/app/lib/commands.ts`

---

## Overview

This document defines the API contract between the Crossramp frontend and Bastion backend service for the **Disputes** feature. Disputes are formal customer contestations regarding transactions (chargebacks, goods not received, fraud claims, etc.) that require merchant response within defined deadlines to avoid infractions.

**Architecture Pattern:** Strict CQRS
- **Queries:** Use `/api/disputes/*` endpoints with GET requests
- **Commands:** Use `/api/commands/disputes/*` endpoints with POST requests
- **MFA:** All write operations require MFA; code transits ONLY in JWT token (never in payload)

---

## TypeScript Interfaces

All TypeScript interfaces are defined in:
- **Queries:** `/src/app/lib/queries.ts`
- **Commands:** `/src/app/lib/commands.ts`

### Core Types

```typescript
export interface Dispute {
  id: string; // "dsp_001"
  payment_id: string; // "tx_001"
  client_name: string;
  client_email: string; // Masked for privacy: "j***o@example.com"
  client_phone: string | null; // Masked: "+5511****9999"
  client_reason: string; // Customer's dispute description
  dispute_type: DisputeType;
  merchant_defense: string | null; // Merchant's response, null if not submitted
  defense_submitted_at: string | null; // ISO 8601, null if not submitted
  date: string; // ISO 8601 - when dispute was opened
  status: DisputeStatus;
  is_refunded: boolean;
  refund_id: string | null; // "rfd_5a3f2e1c7b9d"
  refund_amount: string | null; // "450.00"
  refund_date: string | null; // ISO 8601
  is_infraction: boolean;
  infraction_reason: string | null;
  infraction_severity: 'low' | 'medium' | 'high' | null;
  deadline: string; // ISO 8601 - merchant must respond by this time
  amount: string; // "450.00"
  currency: string; // "BRL", "USDT", etc.
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export type DisputeType =
  | 'fraudulent_transaction'
  | 'goods_not_received'
  | 'service_not_rendered'
  | 'not_as_described'
  | 'defective_or_damaged'
  | 'refund_not_processed'
  | 'duplicate_or_incorrect'
  | 'other';

export type DisputeStatus =
  | 'open'          // Awaiting merchant response
  | 'under_review'  // Merchant submitted defense, Crossramp reviewing
  | 'resolved'      // Closed via refund or accepted defense
  | 'closed';       // Closed by deadline expiry or customer withdrawal

export interface DisputeDetails extends Dispute {
  transaction_details: {
    amount: string;
    currency: string;
    payment_method: 'PIX' | 'TED' | 'CRYPTO' | 'CARD';
    created_at: string; // ISO 8601
    network: string | null; // "TRX", "ETH", null for fiat
  };
  client_info: {
    name: string;
    email: string; // Masked
    phone: string | null; // Masked
  };
  timeline: DisputeTimelineEvent[];
}

export interface DisputeTimelineEvent {
  event: string; // "dispute_opened", "merchant_notified", "defense_submitted", "refund_processed"
  timestamp: string; // ISO 8601
  description: string;
  actor?: string; // "customer", "merchant", "system", "compliance"
}
```

---

## Queries (Read Operations)

### 1. List Disputes

**Purpose:** Retrieve paginated list of disputes with filtering by date range and status.

**Endpoint:** `GET /api/disputes/list`

**Query Parameters:**
```
?date_from=2025-11-22T00:00:00Z
&date_to=2025-12-22T23:59:59Z
&status=all
&page=1
&limit=10
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `date_from` | string (ISO 8601) | No | 30 days ago | Start of date range filter |
| `date_to` | string (ISO 8601) | No | Now | End of date range filter |
| `status` | string | No | "all" | Filter: "all", "open", "under_review", "resolved", "closed" |
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 10 | Items per page (max 100) |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "disputes": [
    {
      "id": "dsp_001",
      "payment_id": "tx_001",
      "client_name": "João Silva",
      "client_email": "j***o@example.com",
      "client_phone": "+5511****9999",
      "client_reason": "I never received the product. Tracking shows 'in transit' for 15 days.",
      "dispute_type": "goods_not_received",
      "merchant_defense": null,
      "defense_submitted_at": null,
      "date": "2025-12-18T14:30:00Z",
      "status": "open",
      "is_refunded": false,
      "refund_id": null,
      "refund_amount": null,
      "refund_date": null,
      "is_infraction": false,
      "infraction_reason": null,
      "infraction_severity": null,
      "deadline": "2025-12-25T14:30:00Z",
      "amount": "450.00",
      "currency": "BRL",
      "created_at": "2025-12-18T14:30:00Z",
      "updated_at": "2025-12-18T14:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 27,
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
  "message": "User does not have permission to view disputes"
}
```

**Frontend Implementation:**
```typescript
import { queryDisputesList, ListDisputesRequest } from '../lib/queries';

const response = await queryDisputesList(
  {
    date_from: '2025-11-22T00:00:00Z',
    date_to: '2025-12-22T23:59:59Z',
    status: 'open',
    page: 1,
    limit: 10
  },
  { headers: { Authorization: `Bearer ${accessToken}` } }
);
```

**Category:** B (Load once on mount + soft refresh every 60s + refetch after write actions)

**Refresh Strategy:**
- Initial load on component mount
- Auto-refresh every 60 seconds while page visible and user not interacting
- Immediate refetch when user returns to tab (visibility change)
- Immediate refetch after successful write command (submit defense, process refund)

---

### 2. Search Dispute

**Purpose:** Quick search by Dispute ID, Payment ID, or Client Name.

**Endpoint:** `GET /api/disputes/search`

**Query Parameters:**
```
?query=dsp_001
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term (Dispute ID, Payment ID, or Client Name) |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Success Response (200 OK) - Found:**
```json
{
  "found": true,
  "dispute": {
    "id": "dsp_001",
    "payment_id": "tx_001",
    "client_name": "João Silva",
    "client_reason": "I never received the product...",
    "dispute_type": "goods_not_received",
    "status": "open",
    "amount": "450.00",
    "currency": "BRL",
    "deadline": "2025-12-25T14:30:00Z"
  }
}
```

**Success Response (200 OK) - Not Found:**
```json
{
  "found": false
}
```

**Frontend Implementation:**
```typescript
import { queryDisputeSearch } from '../lib/queries';

const result = await queryDisputeSearch(
  { query: 'dsp_001' },
  { headers: { Authorization: `Bearer ${accessToken}` } }
);

if (result.found) {
  // Open DisputeDetailsModal with result.dispute
} else {
  toast.error('Dispute not found');
}
```

**Category:** B (On-demand search, no polling)

---

### 3. Get Dispute Details

**Purpose:** Retrieve full dispute details including transaction info, client info, and timeline.

**Endpoint:** `GET /api/disputes/details`

**Query Parameters:**
```
?dispute_id=dsp_001
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dispute_id` | string | Yes | Unique dispute identifier |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "id": "dsp_001",
  "payment_id": "tx_001",
  "client_name": "João Silva",
  "client_email": "j***o@example.com",
  "client_phone": "+5511****9999",
  "client_reason": "I never received the product. Tracking shows 'in transit' for 15 days.",
  "dispute_type": "goods_not_received",
  "merchant_defense": null,
  "defense_submitted_at": null,
  "date": "2025-12-18T14:30:00Z",
  "status": "open",
  "is_refunded": false,
  "refund_id": null,
  "refund_amount": null,
  "refund_date": null,
  "is_infraction": false,
  "infraction_reason": null,
  "infraction_severity": null,
  "deadline": "2025-12-25T14:30:00Z",
  "amount": "450.00",
  "currency": "BRL",
  "created_at": "2025-12-18T14:30:00Z",
  "updated_at": "2025-12-18T14:30:00Z",
  "transaction_details": {
    "amount": "450.00",
    "currency": "BRL",
    "payment_method": "PIX",
    "created_at": "2025-12-10T10:00:00Z",
    "network": null
  },
  "client_info": {
    "name": "João Silva",
    "email": "j***o@example.com",
    "phone": "+5511****9999"
  },
  "timeline": [
    {
      "event": "dispute_opened",
      "timestamp": "2025-12-18T14:30:00Z",
      "description": "Customer opened dispute",
      "actor": "customer"
    },
    {
      "event": "merchant_notified",
      "timestamp": "2025-12-18T14:31:00Z",
      "description": "Merchant notified via email",
      "actor": "system"
    }
  ]
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "NotFound",
  "message": "Dispute not found or does not belong to this merchant"
}
```

**Frontend Implementation:**
```typescript
import { queryDisputeDetails } from '../lib/queries';

const details = await queryDisputeDetails(
  { dispute_id: 'dsp_001' },
  { headers: { Authorization: `Bearer ${accessToken}` } }
);
```

**Category:** B (Load on-demand when modal opens, no polling)

---

### 4. Download Refund Receipt

**Purpose:** Download PDF receipt for a processed refund.

**Endpoint:** `GET /api/disputes/refund-receipt`

**Query Parameters:**
```
?refund_id=rfd_5a3f2e1c7b9d
&dispute_id=dsp_003
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refund_id` | string | Yes | Unique refund identifier |
| `dispute_id` | string | Yes | Associated dispute ID (for validation) |

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="refund_receipt_dsp_003.pdf"`
- **Body:** PDF binary data

**PDF Contents:**
- Crossramp logo
- Refund ID + Dispute ID + Payment ID
- Amount refunded + currency
- Refund date + processing time
- Customer info (name, masked email)
- Refund reason
- Transaction timeline

**Frontend Implementation:**
```typescript
const downloadRefundReceipt = async (refundId: string, disputeId: string) => {
  const token = await getAccessToken();
  const url = `/api/disputes/refund-receipt?refund_id=${refundId}&dispute_id=${disputeId}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `refund_receipt_${disputeId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
```

**Category:** C (On-demand download, no caching)

**Note:** This is a read-only operation and does NOT require MFA.

---

## Commands (Write Operations)

**IMPORTANT:** All commands require MFA step-up authentication. The MFA code transits **ONLY in the JWT token** via the `Authorization` header after successful `loginWithPopup()`. **DO NOT include `mfa_code` in the request payload.**

---

### 5. Submit Defense

**Purpose:** Merchant submits defense response to a dispute with evidence/explanation.

**Endpoint:** `POST /api/commands/disputes/submitDefense`

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
  "dispute_id": "dsp_001",
  "defense_text": "Product was shipped on 2025-12-11 via FedEx. Tracking number: BR123456789. Delivery confirmed on 2025-12-15 with recipient signature. Customer should check with building concierge.",
  "attachments": [
    "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA..."
  ]
}
```

**Field Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `dispute_id` | string | Yes | Must exist and belong to merchant |
| `defense_text` | string | Yes | Min 50 chars, max 2000 chars |
| `attachments` | array | No | Max 5 files, each ≤ 10MB, formats: PDF, JPG, PNG |

**Backend Validation:**
- Dispute must exist and belong to authenticated merchant
- Dispute status must be `open` or `under_review` (cannot submit on `resolved` or `closed`)
- `merchant_defense` must be null (cannot resubmit defense)
- User role must be Admin or Operations
- Deadline must not be expired

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Defense submitted successfully. Dispute status updated to 'Under Review'"
}
```

**Error Response (400 Bad Request) - Deadline Expired:**
```json
{
  "success": false,
  "error_code": "DEADLINE_EXPIRED",
  "message": "Deadline expired. Cannot submit defense after deadline."
}
```

**Error Response (400 Bad Request) - Defense Already Submitted:**
```json
{
  "success": false,
  "error_code": "DEFENSE_ALREADY_SUBMITTED",
  "message": "Defense has already been submitted for this dispute."
}
```

**Error Response (400 Bad Request) - Validation:**
```json
{
  "success": false,
  "error_code": "VALIDATION_ERROR",
  "message": "Defense text must be at least 50 characters",
  "metadata": {
    "field": "defense_text",
    "min_length": 50
  }
}
```

**Frontend Implementation:**
```typescript
import { submitDisputeDefense, SubmitDisputeDefenseCommand } from '../lib/commands';
import { useAuth } from '../contexts/AuthContext';

// Step 1: Trigger MFA
const { loginWithMFA, user } = useAuth();
const mfaToken = await loginWithMFA();

// Step 2: Convert attachments to base64
const attachmentsBase64 = await Promise.all(
  files.map(file => fileToBase64(file))
);

// Step 3: Submit command
const payload: SubmitDisputeDefenseCommand = {
  dispute_id: 'dsp_001',
  defense_text: defenseText,
  attachments: attachmentsBase64,
};

const response = await submitDisputeDefense(payload, { accessToken: mfaToken, user });

if (response.success) {
  toast.success('Defense submitted successfully');
  refetch(); // Refetch disputes list
}
```

**Post-Success Behavior:**
- Backend updates `merchant_defense` with text
- Backend uploads attachments to S3 and stores URLs
- Dispute status changes to `under_review` (if was `open`)
- `defense_submitted_at` set to current timestamp
- Merchant receives confirmation email
- Frontend refetches `/api/disputes/list`
- Modal closes

---

### 6. Process Refund and Resolve Dispute

**Purpose:** Process a refund to customer and mark dispute as resolved.

**Endpoint:** `POST /api/commands/disputes/refundAndResolve`

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
  "dispute_id": "dsp_001",
  "payment_id": "tx_001",
  "refund_amount": "450.00",
  "refund_reason": "Customer complaint resolved via full refund",
  "mark_as_resolved": true
}
```

**Field Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `dispute_id` | string | Yes | Must exist and belong to merchant |
| `payment_id` | string | Yes | Must match dispute.payment_id |
| `refund_amount` | string | Yes | Decimal ≤ original transaction amount |
| `refund_reason` | string | Yes | Max 500 chars |
| `mark_as_resolved` | boolean | Yes | Typically `true` |

**Backend Validation:**
- Dispute must exist and belong to merchant
- `payment_id` must match dispute's payment ID
- `refund_amount` must be ≤ original transaction amount
- Dispute must NOT already be refunded (`is_refunded: false`)
- Merchant must have sufficient balance to process refund
- User role must be Admin or Operations

**Success Response (200 OK):**
```json
{
  "success": true,
  "refund_id": "rfd_5a3f2e1c7b9d",
  "message": "Refund processed successfully. Dispute marked as resolved."
}
```

**Error Response (400 Bad Request) - Insufficient Balance:**
```json
{
  "success": false,
  "error_code": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance. You have R$200.00 available but R$450.00 is required for this refund.",
  "metadata": {
    "available_balance": "200.00",
    "required_amount": "450.00",
    "currency": "BRL"
  }
}
```

**Error Response (400 Bad Request) - Already Refunded:**
```json
{
  "success": false,
  "error_code": "ALREADY_REFUNDED",
  "message": "This dispute has already been refunded."
}
```

**Error Response (400 Bad Request) - Partial Refund Warning:**
```json
{
  "success": false,
  "error_code": "PARTIAL_REFUND_WARNING",
  "message": "Partial refund detected. This may result in a low-severity infraction.",
  "metadata": {
    "transaction_amount": "500.00",
    "refund_amount": "300.00",
    "difference": "200.00"
  }
}
```

**Frontend Implementation:**
```typescript
import { refundAndResolveDispute, RefundAndResolveDisputeCommand } from '../lib/commands';

// Step 1: Show RefundConfirmationModal (user confirms amount and reason)
// Step 2: Trigger MFA
const mfaToken = await loginWithMFA();

// Step 3: Submit command
const payload: RefundAndResolveDisputeCommand = {
  dispute_id: 'dsp_001',
  payment_id: 'tx_001',
  refund_amount: '450.00',
  refund_reason: 'Customer complaint resolved via full refund',
  mark_as_resolved: true,
};

const response = await refundAndResolveDispute(payload, { accessToken: mfaToken, user });

if (response.success) {
  toast.success('Refund processed successfully');
  console.log('Refund ID:', response.refund_id);
  refetch();
}
```

**Post-Success Behavior:**
- Backend debits refund amount from merchant balance
- Backend credits amount to customer (via PIX, crypto transfer, etc.)
- Backend generates unique `refund_id`
- Dispute updated: `is_refunded: true`, `refund_id`, `status: "resolved"`
- If dispute had infraction, may be cancelled or maintained (per policy)
- Merchant receives email confirmation
- Customer receives refund + notification
- Frontend refetches disputes list
- Modal closes

**Partial Refund Handling:**
- If `refund_amount < transaction_amount`, frontend should show warning:
  > ⚠️ Partial refund may result in a low-severity infraction. Consider full refund to avoid penalties.
- Backend may apply `infraction_severity: "low"` even if no prior infraction existed
- Dispute status = `resolved` but customer can potentially reopen for remaining amount

---

### 7. Contest Infraction

**Purpose:** Merchant contests an infraction applied to their account due to a dispute.

**Endpoint:** `POST /api/commands/disputes/contestInfraction`

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
  "dispute_id": "dsp_007",
  "contest_reason": "We provided adequate evidence that the product matched the description. Customer expectations were unrealistic based on clear product specifications posted on our website. Attached are screenshots of product page, shipping confirmation, and customer communication.",
  "supporting_evidence": [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
    "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9..."
  ]
}
```

**Field Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `dispute_id` | string | Yes | Must exist, belong to merchant, and have `is_infraction: true` |
| `contest_reason` | string | Yes | Min 100 chars, max 2000 chars |
| `supporting_evidence` | array | No | Max 10 files, each ≤ 10MB, formats: PDF, JPG, PNG |

**Backend Validation:**
- Dispute must exist and belong to merchant
- `is_infraction` must be `true`
- Merchant can contest only 1x per infraction (cannot resubmit)
- User role must be Admin or Operations

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Infraction contest submitted. Crossramp compliance will review within 3 business days."
}
```

**Error Response (400 Bad Request) - No Infraction:**
```json
{
  "success": false,
  "error_code": "NO_INFRACTION",
  "message": "This dispute does not have an associated infraction."
}
```

**Error Response (400 Bad Request) - Already Contested:**
```json
{
  "success": false,
  "error_code": "ALREADY_CONTESTED",
  "message": "Infraction has already been contested. Awaiting compliance review."
}
```

**Frontend Implementation:**
```typescript
import { contestDisputeInfraction, ContestDisputeInfractionCommand } from '../lib/commands';

// Step 1: Trigger MFA
const mfaToken = await loginWithMFA();

// Step 2: Convert evidence files to base64
const evidenceBase64 = await Promise.all(
  evidenceFiles.map(file => fileToBase64(file))
);

// Step 3: Submit command
const payload: ContestDisputeInfractionCommand = {
  dispute_id: 'dsp_007',
  contest_reason: contestText,
  supporting_evidence: evidenceBase64,
};

const response = await contestDisputeInfraction(payload, { accessToken: mfaToken, user });

if (response.success) {
  toast.success('Infraction contest submitted. Review in 3 business days.');
  refetch();
}
```

**Post-Success Behavior:**
- Backend creates review ticket for Crossramp compliance team
- Infraction enters status `under_review`
- Merchant receives email: "Your infraction contest has been submitted..."
- Compliance team has 3 business days to review
- Possible outcomes:
  - **Contest accepted:** Infraction removed + reputation score restored
  - **Contest rejected:** Infraction maintained + merchant notified with explanation
- Frontend refetches disputes list

---

## RBAC - Role Permissions

### Read Access (Queries)
- **Admin** (`user_admin_crossramp`): Full access
- **Operations** (`user_operations_crossramp`): Full access
- **Analyst** (`user_analyst_crossramp`): Read-only access (can view disputes but cannot submit defense/refund)
- **Developer** (`user_developer_crossramp`): No access (403 Forbidden)

### Write Access (Commands)
- **Admin** (`user_admin_crossramp`): Can submit defense, process refund, contest infraction
- **Operations** (`user_operations_crossramp`): Can submit defense, process refund, contest infraction
- **Analyst** (`user_analyst_crossramp`): No write access (403 Forbidden)

Backend should verify:
1. Valid Auth0 JWT token in `Authorization` header
2. User role in token claims or `x-user-role` header
3. For writes: Role ∈ {Admin, Operations} AND MFA claim present

---

## MFA Flow (Critical for Commands)

All write operations require MFA. Frontend workflow:

```typescript
// 1. User clicks "Submit Defense" or "Refund & Resolve"
// 2. Frontend triggers MFA popup:
const { loginWithMFA } = useAuth();
const mfaToken = await loginWithMFA();

// 3. User completes MFA in Auth0 Universal Login
// 4. Frontend gets fresh token with amr:['mfa'] claim
// 5. Frontend submits command with MFA token:
const response = await submitDisputeDefense(payload, { accessToken: mfaToken, user });

// 6. Backend verifies:
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
|-------------|------------|-------------|--------------------|
| 400 | `VALIDATION_ERROR` | Field validation failed | Show field-specific error |
| 400 | `DEADLINE_EXPIRED` | Deadline passed, cannot respond | Show toast: "Deadline expired" |
| 400 | `DEFENSE_ALREADY_SUBMITTED` | Defense already submitted | Show toast error |
| 400 | `INSUFFICIENT_BALANCE` | Not enough balance for refund | Show toast with available balance |
| 400 | `ALREADY_REFUNDED` | Dispute already refunded | Show toast error |
| 400 | `PARTIAL_REFUND_WARNING` | Partial refund detected | Show warning modal |
| 400 | `NO_INFRACTION` | No infraction to contest | Show toast error |
| 400 | `ALREADY_CONTESTED` | Infraction already contested | Show toast: "Already submitted" |
| 401 | `UNAUTHORIZED` | Invalid/expired token | Redirect to login |
| 403 | `MFA_REQUIRED` | Missing MFA claim in token | Trigger MFA popup |
| 403 | `FORBIDDEN` | Insufficient role permissions | Show "Access denied" message |
| 404 | `NOT_FOUND` | Dispute doesn't exist | Show toast error |
| 500 | `INTERNAL_ERROR` | Server error | Show generic error toast |

---

## Mock Mode

Frontend operates in **Mock Mode** when `window.crossrampConfig.MOCK_QUERIES_ENABLED = true`. All queries and commands return synthetic data without hitting real API endpoints.

**Mock Data Characteristics:**
- 5 disputes with various statuses (open, under_review, resolved)
- 1 dispute with `is_infraction: true` and `infraction_severity: "high"`
- 1 dispute with `is_refunded: true`
- Deadline warnings for disputes < 3 days from now
- Search returns result if query matches mock dispute ID
- Submit defense succeeds with 600ms delay
- Refund command returns `INSUFFICIENT_BALANCE` error for dispute ID `dsp_004`
- All other operations succeed

---

## Testing Checklist for Backend Team

### Queries
- [ ] `/api/disputes/list` returns disputes for authenticated merchant only
- [ ] Date range filtering works correctly
- [ ] Status filtering works (all, open, under_review, resolved, closed)
- [ ] Pagination works correctly
- [ ] `/api/disputes/search` finds by dispute ID, payment ID, client name
- [ ] `/api/disputes/details` returns full dispute with timeline
- [ ] `/api/disputes/refund-receipt` generates PDF correctly

### Commands - Submit Defense
- [ ] MFA token validation works (amr claim includes 'mfa')
- [ ] RBAC works (only Admin and Operations can submit)
- [ ] Rejects if `merchant_defense` already exists
- [ ] Rejects if deadline expired
- [ ] Rejects if dispute status is `resolved` or `closed`
- [ ] Defense text validation (min 50, max 2000 chars)
- [ ] Attachment validation (max 5 files, 10MB each, PDF/JPG/PNG only)
- [ ] Status changes to `under_review` after submission
- [ ] Email notification sent to merchant

### Commands - Refund and Resolve
- [ ] Balance check works (reject if insufficient)
- [ ] Rejects if already refunded
- [ ] Partial refund warning logic works
- [ ] Refund processed correctly (merchant debited, customer credited)
- [ ] `refund_id` generated and stored
- [ ] Dispute status changes to `resolved`
- [ ] Infraction handling (cancel or maintain per policy)
- [ ] Email notifications sent to merchant and customer

### Commands - Contest Infraction
- [ ] Rejects if `is_infraction: false`
- [ ] Rejects if already contested
- [ ] Contest reason validation (min 100, max 2000 chars)
- [ ] Evidence upload works (max 10 files, 10MB each)
- [ ] Creates compliance review ticket
- [ ] Infraction status changes to `under_review`
- [ ] Email notification sent to merchant

---

## Notes for Bastion Adapter Service

If your backend returns different field names or structure, the Bastion adapter service should transform responses to match these exact contracts:

**Example Adapter Transformation:**
```typescript
// Backend returns different structure
const backendResponse = {
  dispute_uid: "d_12345",
  customer_name: "João Silva",
  dispute_reason: "goods_not_received",
  dispute_status: "OPEN",
  // ...
};

// Bastion transforms to frontend contract
const frontendResponse = {
  id: backendResponse.dispute_uid,
  client_name: backendResponse.customer_name,
  dispute_type: backendResponse.dispute_reason.toLowerCase(),
  status: backendResponse.dispute_status.toLowerCase(),
  // ... map all fields per Dispute interface
};
```

---

## Changelog

### v1.0 - 2025-12-23
- Initial API contract for Disputes feature
- Defined 4 queries (list, search, details, refund-receipt) and 3 commands (submit defense, refund and resolve, contest infraction)
- MFA flow clarified (code in JWT only, not in payload)
- RBAC requirements specified (Admin + Operations for writes, Analyst read-only)
- Error codes and handling documented
- Dispute types and statuses defined
- Infraction severity levels explained

---

**Questions or Issues?**  
Contact frontend team for clarifications on TypeScript interfaces or expected behavior.
