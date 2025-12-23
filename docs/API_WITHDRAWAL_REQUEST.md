# API Contract: Withdrawal Request

## Endpoint

```
POST /api/withdrawals/request
```

## Authentication

- **Required:** Yes
- **Authorization:** Bearer token (Auth0 JWT)
- **Headers:**
  - `Authorization: Bearer {access_token}`
  - `x-user-id: {user_id}`
  - `x-user-role: {user_role}`
  - `Content-Type: application/json`

## Request Payload

```typescript
interface WithdrawalRequest {
  account_id: string;           // e.g., "usdt-trx", "usdc-eth", "brl-pix"
  amount: string;                // e.g., "5000.00"
  withdrawal_type: "same" | "brl"; // "same" = direct crypto withdrawal, "brl" = convert to BRL + PIX
  destination_id: string;        // Whitelisted wallet ID or PIX address ID
  note?: string;                 // Optional note (max 500 chars)
  mfaCode: string;               // 6-digit MFA code from authenticator app
  userContext: {
    id: string;
    role: string;
    metadata: Record<string, any>;
  };
}
```

### Example Request Body

```json
{
  "account_id": "usdt-trx",
  "amount": "5000.00",
  "withdrawal_type": "brl",
  "destination_id": "pix-1",
  "note": "Monthly settlement",
  "mfaCode": "123456",
  "userContext": {
    "id": "user_abc123",
    "role": "user_admin_crossramp",
    "metadata": {}
  }
}
```

## Response

### Success Response (200 OK)

**IMPORTANT:** The response MUST include a `url` field pointing to your confirmation/checkout page.

```json
{
  "status": "success",
  "url": "https://checkout.noxpay.io/e2e/NOX8296A0F2EB0B4F5880682641D228B6E2",
  "withdrawal_id": "wdr_abc123def456",
  "message": "Withdrawal request initiated. Complete confirmation on checkout page."
}
```

**Required Fields:**
- `url` (string): Full HTTPS URL to your confirmation page. This page will be embedded in an iframe modal in the dashboard.

**Optional Fields:**
- `withdrawal_id` (string): Unique identifier for this withdrawal request
- `status` (string): Status indicator (e.g., "success", "pending")
- `message` (string): Human-readable message

### Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Insufficient balance",
  "details": {
    "available": "3000.00",
    "requested": "5000.00"
  }
}
```

**Common validation errors:**
- `INSUFFICIENT_BALANCE`: amount > available balance
- `INVALID_AMOUNT`: amount <= 0 or too many decimal places
- `INVALID_DESTINATION`: destination_id doesn't exist or not whitelisted
- `NETWORK_MISMATCH`: withdrawal_type="same" but destination network ≠ account network
- `DAILY_LIMIT_EXCEEDED`: User exceeded daily withdrawal limit
- `DESTINATION_INACTIVE`: Whitelisted address was deactivated

#### 401 Unauthorized - MFA Failed

```json
{
  "error": "MFA_VERIFICATION_FAILED",
  "message": "Invalid MFA code"
}
```

#### 403 Forbidden - Role Restriction

```json
{
  "error": "INSUFFICIENT_PERMISSIONS",
  "message": "Only Admin and Operations roles can request withdrawals"
}
```

#### 500 Internal Server Error

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred. Please try again."
}
```

## Backend Processing Flow

1. **Validate MFA code** against user's MFA secret
2. **Validate role** (must be `user_admin_crossramp` or `user_operations_crossramp`)
3. **Validate withdrawal parameters:**
   - Amount <= available balance in account
   - Destination exists and is active/whitelisted
   - Network match (if withdrawal_type = "same")
4. **Create withdrawal record** in database with status `"pending_confirmation"`
5. **Generate unique confirmation URL:**
   - Include withdrawal ID, user ID, signature/token for security
   - Example: `https://checkout.noxpay.io/e2e/NOX{withdrawal_id_encoded}`
6. **Return 200 OK** with `url` field
7. **User completes confirmation** on your checkout page (conversion preview, fees, etc.)
8. **Your checkout page processes** the final withdrawal and closes modal via postMessage
9. **Update withdrawal status** in database (`"processing"` → `"completed"` or `"failed"`)

## Integration with Confirmation Page

See `/docs/WITHDRAWAL_CONFIRMATION_INTEGRATION.md` for details on:
- How the URL is opened in an iframe modal
- How to close the modal from your confirmation page (`postMessage`)
- Security considerations

## Testing

### Mock Response for Development

For local development, you can mock the API to return:

```json
{
  "status": "success",
  "url": "http://localhost:3000/withdrawal-confirm.html?withdrawal_id=test123",
  "withdrawal_id": "wdr_test123"
}
```

### Production Checklist

- [ ] URL uses HTTPS (required for iframe embedding)
- [ ] CORS headers allow dashboard origin
- [ ] X-Frame-Options header allows embedding (or use CSP)
- [ ] Confirmation page sends postMessage on completion
- [ ] MFA validation is secure and rate-limited
- [ ] Withdrawal limits are enforced
- [ ] All database transactions are atomic
- [ ] Audit log records all withdrawal attempts

## Security Considerations

1. **MFA is mandatory** - Reject requests without valid mfaCode
2. **Rate limiting** - Limit withdrawal requests per user/hour
3. **Whitelist enforcement** - Only allow destinations from whitelist table
4. **Balance locking** - Lock account balance during withdrawal processing
5. **Idempotency** - Use withdrawal_id to prevent duplicate processing
6. **Audit trail** - Log all withdrawal attempts (success and failure)
7. **Confirmation timeout** - Auto-cancel if confirmation not completed in 15 minutes
8. **Network validation** - Verify destination address format matches network

## FAQ

### What happens if the user closes the modal without confirming?

The withdrawal record remains in `"pending_confirmation"` status. Your backend should:
- Auto-cancel after timeout (e.g., 15 minutes)
- Release the locked balance
- Send notification to user

### Can users retry if MFA fails?

Yes, the dashboard shows the form filled so they can click submit again and re-enter MFA.

### Do we need to validate the conversion rate on the confirmation page?

Yes, your checkout page should fetch the current rate and display:
- Original amount (e.g., 5000 USDT)
- Exchange rate (e.g., 1 USDT = R$ 5.00)
- Fees (e.g., 2% = R$ 500)
- Final amount (e.g., R$ 24,500)

The user confirms based on this preview.

### What if the balance changes between request and confirmation?

Your confirmation page should re-validate the balance before final processing. If insufficient, show error and close modal.

### Can the withdrawal be cancelled after confirmation?

Depends on your backend processing. If status is still "processing", you could allow cancellation. Once status is "completed" (funds sent), it cannot be reversed.

---

**Last Updated:** 2024-12-22
