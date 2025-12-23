# Feature Documentation: Security

**Componente de View:** `/src/app/views/SecurityView.tsx`  
**Componente Modal:** `/src/app/components/modals/MFAVerificationModal.tsx`  
**Auth Provider:** Auth0 (@auth0/auth0-react v2.11.0)  
**ID de Rota/Navegação:** `security` (under Settings section)

## História de usuário

**Como** usuário do dashboard Crossramp (qualquer role: Admin, Operator, Analyst, Developer),  
**Eu quero** ativar e gerenciar a autenticação de múltiplos fatores (MFA) na minha conta,  
**Para que** eu possa proteger meu acesso ao dashboard com uma camada adicional de segurança além da senha, habilitando write actions (withdrawals, payments, whitelist changes) que são bloqueados até que MFA esteja ativo, e garantindo que mesmo se minha senha for comprometida, ninguém possa acessar minha conta sem o código do meu autenticador.

## Notas de UX

- **Universal access:** **Todos os roles** (Admin, Operator, Analyst, Developer) devem ativar MFA
- **MFA required for write actions:** Sem MFA ativo, usuário **NÃO PODE** executar write actions:
  - ❌ Create/edit templates
  - ❌ Create withdrawals
  - ❌ Add/remove whitelist PIX keys
  - ❌ Add users (Admin only)
  - ❌ Create/disable API keys (Developer only)
  - ✅ Read-only actions funcionam SEM MFA (view payments, balances, reports)
- **KYC prerequisite (CRITICAL):** 
  - **merchant_id must be non-null** to allow MFA enrollment
  - merchant_id is set when **KYC verification completes** (Company Profile page)
  - Se merchant_id = null (KYC incomplete) → MFA enrollment FAILS
  - Error: "Complete KYC verification before enabling MFA"
- **Auth0 integration:** MFA é managed by Auth0 (not custom backend)
  - Auth0 sends MFA enrollment email (QR code + setup instructions)
  - Auth0 validates MFA codes (6-digit TOTP)
  - Auth0 stores MFA status in user claim (JWT token)
- **3 MFA states:**
  1. **Not Activated** - User never enrolled MFA (initial state)
  2. **Pending Confirmation** - Enrollment email sent, waiting for user to confirm setup
  3. **Active** - MFA fully configured, user can perform write actions
- **Page structure:** Single column, max-width 4xl, centered
- **Components (stacked vertically):**
  1. **Page header** (title + subtitle)
  2. **MFA status banner** (changes based on state: Not Activated / Pending / Active)
  3. **MFA setup guide** (only visible when Not Activated)
  4. **Additional security information** (educational content, always visible)

---

### **MFA State 1: Not Activated** 🔓 (Initial State)

**Banner:**
- **Background:** Warning yellow/orange (bg-warning/10)
- **Icon:** AlertTriangle (secondary color)
- **Title:** "Multi-Factor Authentication Required"
- **Badge:** "NOT ACTIVATED" (red/secondary)
- **Message:** "Protect your account and unlock write actions by enabling multi-factor authentication."
- **CTA Button:** "Activate MFA" (write variant, Shield icon, lock icon visible)

**User cannot:**
- Perform any write actions (buttons show lock icon, disabled or trigger MFA enrollment modal)
- Templates page: "Create Template" button disabled/prompts MFA setup
- Withdraw page: "Create Withdrawal" button disabled
- Whitelist page: "Add PIX Key" button disabled

**Workflow (Activate MFA):**

1. User clicks "Activate MFA" button
2. **Frontend checks merchant_id** (from Auth0 JWT claim `app_metadata.merchant_id`)
   - If `merchant_id === null` → Error toast: "Complete KYC verification before enabling MFA. Visit Company Profile to submit documents."
   - If `merchant_id !== null` → Proceed to step 3
3. Frontend calls Auth0 Management API → `POST /api/v2/users/{userId}/authenticator-enrollments`
4. Auth0 triggers MFA enrollment:
   - Generates TOTP secret
   - Creates QR code image
   - Sends email to user's registered email with:
     - Subject: "Set Up Multi-Factor Authentication for Crossramp"
     - QR code image
     - Manual entry key (backup if QR doesn't work)
     - Setup instructions (scan QR → Open authenticator app → Add account)
5. Frontend shows alert: "Setup email sent! Check your inbox for instructions and QR code."
6. Frontend updates MFA state to **Pending Confirmation**
7. Page re-renders with Pending banner

**Setup Guide Card (below banner, only when Not Activated):**

**Title:** "How to Set Up MFA"  
**Subtitle:** "Follow these steps to secure your account"

**Step 1: Download an authenticator app**
- Description: "Install Google Authenticator or use Apple Passwords on your mobile device."
- Links:
  - 🔗 Google Authenticator (opens https://support.google.com/accounts/answer/1066447)
  - 🍎 Apple Passwords (opens https://support.apple.com/en-us/HT204085)

**Step 2: Click "Activate MFA" button**
- Description: "We'll send you an email with a QR code and setup instructions to your registered email address."

**Step 3: Scan the QR code** 🔲
- Description: "Open your authenticator app and scan the QR code from the email. This will add Crossramp to your authenticator."

**Step 4: Confirm your setup**
- Description: "Enter the 6-digit code from your authenticator app to verify everything is working correctly."

**Note (highlighted box):**
- Icon: Mail (envelope)
- Text: "**Note:** The setup email will arrive within 1-2 minutes. Make sure to check your spam folder if you don't see it."

---

### **MFA State 2: Pending Confirmation** 🔐 (Waiting for User)

**Banner:**
- **Background:** Warning yellow/orange (bg-warning/10)
- **Icon:** Lock (warning color)
- **Title:** "Complete MFA Setup"
- **Badge:** "PENDING CONFIRMATION" (blue)
- **Message:** "You have received an email with setup instructions. Please scan the QR code and confirm your authenticator app is working."
- **CTA Button:** "Confirm MFA Code" (write variant, Lock icon)

**User cannot:**
- Still blocked from write actions (MFA not confirmed yet)
- Must complete setup to unlock write actions

**Setup Guide:** Hidden (no longer shown, user already clicked Activate)

**Workflow (Confirm MFA):**

1. User checks email inbox
2. User opens email "Set Up Multi-Factor Authentication for Crossramp"
3. User sees:
   - QR code image (TOTP secret encoded)
   - Manual entry key: `ABCD EFGH IJKL MNOP` (16-char base32)
   - Instructions: "Scan this QR code with Google Authenticator or Apple Passwords"
4. User opens Google Authenticator app on phone
5. User taps "+" → "Scan QR code"
6. User scans QR code with phone camera
7. Authenticator app adds "Crossramp (user@example.com)" account
8. Authenticator app shows 6-digit code (rotates every 30 seconds)
9. **User returns to dashboard Security page**
10. User clicks "Confirm MFA Code" button
11. Frontend shows MFAVerificationModal (6-digit input)
12. User enters code from authenticator app (e.g., "123456")
13. User clicks "Verify" button
14. Frontend calls Auth0 → `POST /api/v2/users/{userId}/authenticator-enrollments/{enrollmentId}/verify`
    - Request body: `{ "code": "123456" }`
15. Auth0 validates TOTP code:
    - ✅ **Valid:** Code matches TOTP secret → Returns success
    - ❌ **Invalid:** Code wrong or expired → Returns error
16. **If valid:**
    - Auth0 marks MFA enrollment as confirmed
    - Auth0 updates user JWT claim: `amr: ["mfa"]` (authentication method reference)
    - Frontend shows success toast: "MFA activated successfully!"
    - Frontend updates MFA state to **Active**
    - Page re-renders with Active banner
    - User can now perform write actions
17. **If invalid:**
    - Frontend shows error toast: "Invalid code. Please try again."
    - Modal stays open (user can retry)
    - After 3 failed attempts → Lockout for 5 minutes

---

### **MFA State 3: Active** ✅ (Fully Configured)

**Banner:**
- **Background:** Warning yellow/orange (bg-warning/10, same warm wabi-sabi style)
- **Icon:** ShieldCheck (muted foreground, not overly colorful)
- **Title:** "Multi-Factor Authentication Active"
- **Badge:** "ACTIVE" (green/success)
- **Message:** "Your account is protected with multi-factor authentication"
- **Metadata shown:**
  - **Activated:** November 15, 2024 (formatted date)
  - **Last used:** December 19, 2024 (formatted date)

**User can:**
- ✅ Perform ALL write actions (MFA prompts on each write action)
- ✅ Create templates (MFA modal appears → Enter code → Template created)
- ✅ Create withdrawals (MFA modal → Confirm → Withdrawal submitted)
- ✅ Add whitelist PIX keys (MFA modal → Verify → Key added)
- ✅ View all read-only pages (no MFA needed)

**Setup Guide:** Hidden (MFA already active, no need for setup instructions)

**No "Disable MFA" button:** 
- Currently not implemented (MFA cannot be disabled once activated)
- Rationale: Security best practice (prevents account takeover → disable MFA → steal funds)
- Future: "Disable MFA" button with Admin approval + Support ticket (emergency only)

**Future enhancements (not implemented):**
- Backup codes (10 one-time codes for when phone is lost)
- Recovery email (send recovery code to secondary email)
- Trusted devices (skip MFA for 30 days on recognized device)
- MFA method selection (SMS, Email, Authenticator app) - currently only Authenticator

---

### **Additional Security Information Card** 🛡️ (Always Visible)

**Title:** "About Multi-Factor Authentication"  
**Subtitle:** "Understanding account security"

**Section 1: What is MFA?**
- **Title:** "What is MFA?"
- **Description:** "Multi-factor authentication (MFA) adds an extra layer of security by requiring a second form of verification beyond your password. This helps protect your account even if your password is compromised."

**Section 2: Why is MFA required for write actions?**
- **Title:** "Why is MFA required for write actions?"
- **Reasons (bulleted list):**
  1. "Withdrawals and payments involve moving real funds"
  2. "Whitelist changes control where funds can be sent"
  3. "Additional verification prevents unauthorized access"

**Design:** 
- Card with border, soft shadow (wabi-sabi style)
- Shield icon (muted foreground)
- Always visible (regardless of MFA state)
- Educational content (helps users understand WHY MFA is required)

---

### **MFA Verification Modal** 🔢 (Used Throughout App)

**Component:** `MFAVerificationModal.tsx`  
**Trigger:** Any write action button (if MFA active)

**Modal structure:**
- **Title:** "Verify MFA Code"
- **Description:** "Enter the 6-digit code from your authenticator app"
- **Input field:** 6-digit code input (numeric only, auto-focus, auto-submit when 6 digits entered)
- **Buttons:**
  - "Verify" (primary, submit code)
  - "Cancel" (outline, close modal)

**Workflow:**
1. User clicks write action button (e.g., "Create Template")
2. Frontend checks: User has MFA active? (from Auth0 JWT claim)
3. If yes → Show MFAVerificationModal
4. User opens Google Authenticator on phone
5. User reads current 6-digit code (e.g., "789012")
6. User types code in modal input
7. User clicks "Verify" (or auto-submits after 6 digits)
8. Frontend calls Auth0 → `POST /oauth/token` with MFA code (step-up authentication)
9. Auth0 validates code:
   - ✅ **Valid:** Returns elevated access token (short-lived, 5 min expiry)
   - ❌ **Invalid:** Returns error "Invalid code"
10. **If valid:**
    - Modal closes
    - Original write action proceeds (template created, withdrawal submitted, etc.)
    - Success toast shown (action-specific message)
11. **If invalid:**
    - Error toast: "Invalid MFA code. Please try again."
    - Input field cleared, focus restored
    - User can retry (max 3 attempts before lockout)

**Auto-timeout:**
- Modal timeout after 2 minutes (security)
- If user doesn't enter code within 2 min → Modal auto-closes
- Reason: TOTP codes rotate every 30 seconds (old code becomes invalid)

**Rate limiting:**
- Max 3 failed attempts per 5 minutes
- After 3 failures → Lockout modal: "Too many failed attempts. Please try again in 5 minutes."
- Prevents brute-force attacks (6-digit code = 1 million combinations)

---

### **Auth0 Integration Details** 🔐

**MFA Method:** TOTP (Time-based One-Time Password)  
**Algorithm:** RFC 6238 (standard TOTP)  
**Code length:** 6 digits  
**Time step:** 30 seconds (code rotates every 30s)  
**Authenticator apps supported:**
- Google Authenticator (Android, iOS)
- Apple Passwords (iOS, macOS built-in)
- Microsoft Authenticator
- Authy
- 1Password (TOTP support)

**Auth0 Claims (JWT Token):**

```json
{
  "sub": "auth0|user123",
  "email": "user@example.com",
  "name": "John Doe",
  "app_metadata": {
    "merchant_id": "merchant_001",  // Set when KYC completes (non-null = can enroll MFA)
    "role": "admin",
    "onboarding_complete": true
  },
  "user_metadata": {
    "preferred_language": "en"
  },
  "amr": ["mfa"],  // Authentication Method Reference (present if MFA active)
  "mfa_verified": true,  // True if current session was MFA-verified
  "iat": 1703001234,
  "exp": 1703087634
}
```

**Key claims for MFA:**
- `app_metadata.merchant_id` - Must be non-null to enroll MFA (set after KYC)
- `amr` - Contains "mfa" if user has MFA enrolled
- `mfa_verified` - True if current session passed MFA challenge

**MFA Enrollment Flow (Auth0 API):**

1. **Initiate enrollment:**
   - `POST /api/v2/users/{userId}/authenticator-enrollments`
   - Auth0 generates TOTP secret
   - Auth0 sends enrollment email with QR code
   - Returns enrollment ID

2. **Verify enrollment:**
   - `POST /api/v2/users/{userId}/authenticator-enrollments/{enrollmentId}/verify`
   - Body: `{ "code": "123456" }`
   - Auth0 validates TOTP code
   - If valid → Marks enrollment as confirmed

3. **Step-up authentication (for write actions):**
   - `POST /oauth/token`
   - Body: `{ "mfa_token": "...", "otp": "789012" }`
   - Auth0 validates TOTP code
   - Returns elevated access token (short-lived, 5 min)

**merchant_id Requirement:**

- **Why:** Auth0 app_metadata.merchant_id links user to merchant account
- **When set:** After KYC verification completes (Company Profile page)
- **Before KYC:** merchant_id = null → MFA enrollment BLOCKED
- **After KYC:** merchant_id = "merchant_001" → MFA enrollment ALLOWED
- **Security reason:** Prevents rogue users from creating accounts without KYC → Enrolling MFA → Attempting write actions
- **Error handling:** If merchant_id null, show: "Complete KYC verification before enabling MFA. Visit Company Profile to submit documents."

---

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Verificar status MFA do usuário** | `GET` | `Auth0: /api/v2/users/{userId}/authenticator-enrollments` | `{}` | `{ "enrollments": [{ "id": "enrollment_001", "type": "totp", "status": "confirmed", "name": "Crossramp MFA", "created_at": "2024-11-15T10:00:00Z", "last_used": "2024-12-19T14:30:00Z" }], "total": 1 }` | **C** (Categoria C - Static durante session, check on login via JWT claim) | Se falhar → Assume MFA not active (safe default, blocks write actions) |
| **Obter merchant_id do usuário (prerequisite para MFA)** | `CLIENT` | `JWT claim: app_metadata.merchant_id` (from Auth0 token) | N/A (client-side JWT decode) | `{ "app_metadata": { "merchant_id": "merchant_001" } }` ou `{ "app_metadata": { "merchant_id": null } }` (KYC incomplete) | **C** (Categoria C - Static during session, from JWT token) | Se merchant_id = null → Block MFA enrollment, show KYC required error |

**Notas sobre classificação de queries:**

- **Check MFA status (Categoria C):** MFA status é determinado pelo JWT claim `amr: ["mfa"]` que é issued during login. Durante a sessão, MFA status não muda (user must logout/login to refresh token). Frontend pode check JWT claim client-side (no backend query needed durante session). Only query Auth0 API durante MFA enrollment flow.

- **Get merchant_id (Categoria C):** merchant_id está no JWT token (`app_metadata.merchant_id`), issued during login. Client-side decode JWT → Read merchant_id. No backend query needed. Se null → KYC incomplete, block MFA enrollment.

**Important:** Security page principalmente usa JWT claims (client-side) para determine MFA status. Auth0 API queries são apenas durante enrollment/verification flow (user-initiated actions, not automatic polling).

---

## Ações de escrita (commands)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Requer MFA? | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-------------|---------------------|
| **Iniciar enrollment MFA (Auth0)** | `POST` | `Auth0: /api/v2/users/{userId}/authenticator-enrollments` | `{ "type": "totp", "name": "Crossramp MFA" }` | `{ "enrollment_id": "enrollment_001", "type": "totp", "status": "pending", "secret": "ABCDEFGHIJKLMNOP", "barcode_uri": "otpauth://totp/Crossramp:user@example.com?secret=ABCD...", "qr_code_url": "https://auth0.com/qr/enrollment_001.png", "created_at": "2024-12-22T10:00:00Z" }` | **Não** (MFA not active yet, this is enrollment) | **merchant_id null:** Toast "Complete KYC verification before enabling MFA" <br> **User already enrolled:** Toast "MFA is already activated" <br> **Auth0 API error:** Toast "Failed to initiate MFA setup. Please try again." |
| **Verificar enrollment MFA (confirmar setup)** | `POST` | `Auth0: /api/v2/users/{userId}/authenticator-enrollments/{enrollmentId}/verify` | `{ "code": "123456" }` | `{ "success": true, "status": "confirmed", "verified_at": "2024-12-22T10:05:00Z" }` | **Não** (This action completes MFA setup) | **Invalid code:** Toast "Invalid code. Please try again." <br> **Code expired:** Toast "Code expired. Generate a new code from your authenticator app." <br> **Rate limit (3 failures):** Toast "Too many failed attempts. Please try again in 5 minutes." <br> **Enrollment not found:** Toast "MFA setup not found. Please restart activation." |
| **MFA step-up authentication (write action verification)** | `POST` | `Auth0: /oauth/token` (with MFA token) | `{ "grant_type": "http://auth0.com/oauth/grant-type/mfa-otp", "client_id": "...", "mfa_token": "...", "otp": "789012" }` | `{ "access_token": "eyJhbGci...", "token_type": "Bearer", "expires_in": 300, "scope": "openid profile email" }` | **Sim** (This IS the MFA verification) | **Invalid code:** Toast "Invalid MFA code. Please try again." <br> **Code expired:** Toast "Code expired. Generate a new code." <br> **Rate limit:** Toast "Too many failed attempts. Locked for 5 minutes." <br> **MFA not active:** Toast "MFA not activated. Visit Security page to enable." |

**Parâmetros detalhados:**

### POST Auth0: /api/v2/users/{userId}/authenticator-enrollments

**Action:** Initiate MFA enrollment (send setup email with QR code)

**Prerequisites:**
- User is authenticated (has valid JWT token)
- **merchant_id is non-null** (KYC verification complete)
- User does NOT already have MFA enrolled

**Request:**
```json
POST https://{auth0-domain}/api/v2/users/auth0|user123/authenticator-enrollments
Authorization: Bearer {management-api-token}
Content-Type: application/json

{
  "type": "totp",  // Time-based One-Time Password
  "name": "Crossramp MFA"  // Display name in authenticator app
}
```

**Success Response (201 Created):**
```json
{
  "enrollment_id": "enrollment_001",
  "type": "totp",
  "status": "pending",
  "secret": "ABCDEFGHIJKLMNOP",  // Base32 TOTP secret (16 chars)
  "barcode_uri": "otpauth://totp/Crossramp:user@example.com?secret=ABCDEFGHIJKLMNOP&issuer=Crossramp",
  "qr_code_url": "https://auth0.com/api/v2/enrollments/enrollment_001/qr",
  "created_at": "2024-12-22T10:00:00Z",
  "expires_at": "2024-12-22T10:30:00Z"  // Enrollment expires in 30 min if not confirmed
}
```

**Auth0 Email Sent:**
- **Subject:** "Set Up Multi-Factor Authentication for Crossramp"
- **From:** noreply@crossramp.com (via Auth0)
- **Content:**
  - QR code image (encoded barcode_uri)
  - Manual entry key: "ABCD EFGH IJKL MNOP" (formatted secret)
  - Instructions: "Scan this QR code with Google Authenticator or Apple Passwords to add Crossramp to your authenticator app."
  - "After scanning, return to the Crossramp dashboard and click 'Confirm MFA Code' to verify your setup."
- **Delivered:** 1-2 minutes (via SendGrid/AWS SES)

**Frontend behavior:**
1. Call Auth0 API → Initiate enrollment
2. Show alert: "Setup email sent! Check your inbox for instructions and QR code."
3. Update local state: `mfaStatus = 'pending'`
4. Page re-renders → Shows "Pending Confirmation" banner
5. User waits for email → Scans QR → Returns to dashboard

**Error Responses:**

1. **merchant_id is null (KYC incomplete):**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Cannot enroll MFA. Complete KYC verification first.",
  "errorCode": "KYC_REQUIRED"
}
```
→ Toast: "Complete KYC verification before enabling MFA. Visit Company Profile to submit documents."

2. **User already has MFA enrolled:**
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "User already has an active MFA enrollment",
  "errorCode": "MFA_ALREADY_ENROLLED"
}
```
→ Toast: "MFA is already activated on your account"

3. **Auth0 API error (network, auth failure):**
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Failed to create MFA enrollment"
}
```
→ Toast: "Failed to initiate MFA setup. Please try again later."

---

### POST Auth0: /api/v2/users/{userId}/authenticator-enrollments/{enrollmentId}/verify

**Action:** Verify MFA enrollment (confirm user scanned QR and has working authenticator)

**Request:**
```json
POST https://{auth0-domain}/api/v2/users/auth0|user123/authenticator-enrollments/enrollment_001/verify
Authorization: Bearer {management-api-token}
Content-Type: application/json

{
  "code": "123456"  // 6-digit TOTP code from authenticator app
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "status": "confirmed",
  "verified_at": "2024-12-22T10:05:00Z"
}
```

**Auth0 behavior:**
- Validates TOTP code against enrollment secret
- If valid → Marks enrollment as "confirmed"
- Updates user JWT claim → Adds `amr: ["mfa"]`
- User can now perform write actions (MFA active)

**Frontend behavior:**
1. User clicks "Confirm MFA Code" button
2. MFAVerificationModal opens
3. User enters 6-digit code from authenticator app
4. User clicks "Verify"
5. Frontend calls Auth0 API → Verify enrollment
6. **If success:**
   - Modal closes
   - Success toast: "MFA activated successfully! You can now perform write actions."
   - Update local state: `mfaStatus = 'active'`
   - Page re-renders → Shows "Active" banner
7. **If error:**
   - Toast error message
   - Modal stays open (user can retry)

**Error Responses:**

1. **Invalid code (wrong digits):**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid TOTP code",
  "errorCode": "INVALID_MFA_CODE"
}
```
→ Toast: "Invalid code. Please check your authenticator app and try again."

2. **Code expired (TOTP rotated):**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "TOTP code expired",
  "errorCode": "EXPIRED_CODE"
}
```
→ Toast: "Code expired. Generate a new code from your authenticator app."

3. **Rate limit (3 failed attempts in 5 min):**
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Too many failed verification attempts",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "retry_after": 300  // seconds
}
```
→ Toast: "Too many failed attempts. Please try again in 5 minutes."  
→ Modal closes (prevents brute force)

4. **Enrollment not found (expired or invalid ID):**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "MFA enrollment not found or expired",
  "errorCode": "ENROLLMENT_NOT_FOUND"
}
```
→ Toast: "MFA setup expired. Please restart activation from the beginning."  
→ Reset state to "Not Activated"

**Security measures:**
- **Time-based codes:** TOTP codes rotate every 30 seconds (short validity window)
- **Rate limiting:** Max 3 attempts per 5 minutes (prevents brute force)
- **Enrollment expiration:** Pending enrollments expire after 30 minutes (security)
- **Single-use codes:** Once code is used, it cannot be reused (replay attack prevention)

---

### POST Auth0: /oauth/token (MFA Step-Up Authentication)

**Action:** Verify MFA code for write action (step-up authentication)

**Context:** 
- User has MFA active
- User clicks write action button (e.g., "Create Template")
- MFAVerificationModal appears
- User enters 6-digit code
- Frontend performs step-up authentication to get elevated access token

**Request:**
```json
POST https://{auth0-domain}/oauth/token
Content-Type: application/json

{
  "grant_type": "http://auth0.com/oauth/grant-type/mfa-otp",
  "client_id": "{client-id}",
  "mfa_token": "{mfa-token-from-challenge}",  // Obtained from initial auth
  "otp": "789012"  // 6-digit code from authenticator app
}
```

**Success Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 300,  // 5 minutes (short-lived elevated token)
  "scope": "openid profile email"
}
```

**Elevated token claims:**
```json
{
  "sub": "auth0|user123",
  "mfa_verified": true,  // This session passed MFA challenge
  "amr": ["mfa", "pwd"],  // Authentication methods: password + MFA
  "elevated_at": 1703001234,  // Timestamp when MFA was verified
  "exp": 1703001534  // Token expires in 5 minutes
}
```

**Frontend behavior:**
1. User clicks write action button
2. Check: User has MFA active? (JWT claim `amr` includes "mfa")
3. If yes → Show MFAVerificationModal
4. User enters 6-digit code
5. Frontend calls `/oauth/token` with MFA code
6. **If success:**
   - Receive elevated access token (5 min expiry)
   - Store token temporarily (in-memory, not localStorage)
   - Close modal
   - Execute original write action with elevated token
   - Backend validates elevated token → Allows write action
   - Success toast: "Template created successfully" (example)
7. **If error:**
   - Show error toast
   - Keep modal open (user can retry)

**Error Responses:**

1. **Invalid code:**
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid TOTP code"
}
```
→ Toast: "Invalid MFA code. Please try again."

2. **Code expired:**
```json
{
  "error": "invalid_grant",
  "error_description": "TOTP code expired"
}
```
→ Toast: "Code expired. Generate a new code from your authenticator app."

3. **Rate limit:**
```json
{
  "error": "too_many_requests",
  "error_description": "Too many failed MFA attempts"
}
```
→ Toast: "Too many failed attempts. Locked for 5 minutes."  
→ Close modal

4. **MFA not enrolled:**
```json
{
  "error": "unauthorized",
  "error_description": "MFA not configured for user"
}
```
→ Toast: "MFA not activated. Visit Security page to enable MFA."  
→ Redirect to Security page

**Security measures:**
- **Short-lived tokens:** Elevated token expires in 5 minutes (limits damage window)
- **Rate limiting:** Max 3 failed attempts per 5 minutes
- **In-memory storage:** Elevated token NOT persisted to localStorage (session only)
- **Single-use elevation:** Each write action requires new MFA verification (no token reuse)

**Backend validation:**
```javascript
// Backend validates elevated token for write actions
const token = req.headers.authorization?.replace('Bearer ', '');
const decoded = jwt.verify(token, PUBLIC_KEY);

if (!decoded.mfa_verified) {
  return res.status(403).json({ error: 'MFA verification required' });
}

if (Date.now() / 1000 > decoded.exp) {
  return res.status(401).json({ error: 'Elevated token expired' });
}

// Token valid → Allow write action
```

---

## Guia interno do produto

### Quando usar

Users acessam Security page quando:

1. **Onboarding (Required):** New user must activate MFA before performing any write actions
2. **KYC complete:** After KYC verification, user immediately prompted to enable MFA
3. **Write action blocked:** User tries to create template → Blocked → "Enable MFA to unlock write actions"
4. **Security audit:** User wants to verify MFA is active and see last usage
5. **Lost phone:** User lost phone with authenticator app → Contact support to reset MFA (future)
6. **New device:** User got new phone → Re-setup authenticator app (scan QR again)
7. **Troubleshooting:** "Write actions not working" → Check MFA status

**Frequency:** 
- **Initial setup:** Once (during onboarding)
- **Ongoing:** Rarely (only to check status or troubleshoot)

---

### MFA States Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW USER (No MFA)                           │
│                                                                 │
│  State: NOT ACTIVATED                                           │
│  Can do: Read-only actions                                      │
│  Cannot do: Write actions (templates, withdrawals, whitelist)   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ User clicks "Activate MFA"
                             │ (prerequisite: merchant_id non-null)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              MFA ENROLLMENT INITIATED (Auth0)                   │
│                                                                 │
│  - Auth0 generates TOTP secret                                  │
│  - Auth0 sends email with QR code                               │
│  - Email delivery: 1-2 minutes                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Email sent, user scans QR
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 USER SCANS QR CODE                              │
│                                                                 │
│  State: PENDING CONFIRMATION                                    │
│  - User opens email on desktop                                  │
│  - User scans QR code with phone (Google Authenticator)         │
│  - Authenticator app adds "Crossramp" account                   │
│  - Authenticator shows 6-digit code (rotates every 30s)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ User returns to dashboard
                             │ Clicks "Confirm MFA Code"
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            USER ENTERS CODE (MFAVerificationModal)              │
│                                                                 │
│  - User types 6-digit code from phone                           │
│  - Frontend calls Auth0 verify endpoint                         │
│  - Auth0 validates TOTP code                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                   ┌─────────┴─────────┐
                   │                   │
             Code VALID          Code INVALID
                   │                   │
                   ▼                   ▼
     ┌──────────────────────┐  ┌──────────────────────┐
     │   MFA ACTIVATED!     │  │   ERROR (Retry)      │
     │                      │  │                      │
     │  State: ACTIVE       │  │  - Toast error msg   │
     │  JWT claim updated   │  │  - Modal stays open  │
     │  Write actions OK    │  │  - Max 3 attempts    │
     └──────────────────────┘  └──────────────────────┘
                   │
                   │ User clicks write action (e.g., Create Template)
                   ▼
     ┌──────────────────────────────────────────────────┐
     │        MFA STEP-UP (Every Write Action)          │
     │                                                  │
     │  - MFAVerificationModal appears                  │
     │  - User enters code from authenticator           │
     │  - Auth0 validates code                          │
     │  - Returns elevated token (5 min expiry)         │
     │  - Write action executes                         │
     └──────────────────────────────────────────────────┘
```

---

### KYC → MFA Dependency (Critical)

**Why merchant_id required:**

1. **KYC incomplete:**
   - User creates account → merchant_id = null
   - User tries to activate MFA → **BLOCKED**
   - Error: "Complete KYC verification before enabling MFA"
   - Rationale: Prevents rogue users from enrolling MFA without identity verification

2. **KYC in progress:**
   - User submits KYC documents (Company Profile page)
   - Backend validates documents (manual review, 24-48 hours)
   - merchant_id = null (still waiting for approval)
   - User cannot activate MFA yet

3. **KYC approved:**
   - Admin approves KYC documents
   - Backend sets merchant_id = "merchant_001" (links user to merchant)
   - merchant_id now non-null → **MFA enrollment ALLOWED**
   - User can activate MFA

4. **KYC rejected:**
   - Documents invalid/fraudulent
   - merchant_id remains null
   - User cannot activate MFA (account locked, cannot perform write actions)

**Flow:**
```
New User → KYC Incomplete (merchant_id = null) → Cannot activate MFA
       ↓
Submit KYC docs → Waiting approval (merchant_id = null) → Cannot activate MFA
       ↓
KYC Approved → merchant_id = "merchant_001" → CAN activate MFA
       ↓
MFA Active → Write actions unlocked
```

**Frontend logic:**
```javascript
function handleActivateMFA() {
  const merchantId = user?.metadata?.app?.merchant_id;
  
  if (!merchantId) {
    toast.error('Complete KYC verification before enabling MFA. Visit Company Profile to submit documents.');
    navigate('/company-profile');  // Redirect to KYC page
    return;
  }
  
  // merchant_id exists → Proceed with MFA enrollment
  auth0.enrollMFA();
}
```

---

### MFA Required for Write Actions (Enforcement)

**Read-only actions (NO MFA needed):**
- ✅ View Payments page
- ✅ View Balances
- ✅ View Transactions
- ✅ View Templates (read-only)
- ✅ View Whitelist PIX keys
- ✅ View Disputes
- ✅ View Reports (Statement, Reputation)
- ✅ View Company Profile
- ✅ View API Integration docs

**Write actions (MFA REQUIRED):**
- 🔒 Create Template
- 🔒 Edit Template
- 🔒 Delete Template
- 🔒 Create Withdrawal
- 🔒 Add Whitelist PIX key
- 🔒 Remove Whitelist PIX key
- 🔒 Add User (Admin only)
- 🔒 Create API key (Developer only)
- 🔒 Disable API key (Developer only)
- 🔒 Respond to Dispute (Operator/Admin only)

**Button enforcement:**

1. **MFA not active:**
   - Button shows lock icon 🔒
   - Button onClick → Show modal: "MFA Required. Visit Security page to activate MFA."
   - Modal has "Activate MFA" button → Redirects to Security page

2. **MFA active:**
   - Button shows lock icon 🔒 (indicates protected action)
   - Button onClick → Show MFAVerificationModal
   - User enters code → Action proceeds

**Example (Create Template button):**
```tsx
<Button
  variant="write"
  onClick={handleCreateTemplate}
  disabled={!mfaActive}
>
  <Lock className="size-4 mr-2" />
  Create Template
</Button>

function handleCreateTemplate() {
  if (!mfaActive) {
    showModal('MFA Required. Visit Security page to activate MFA.');
    return;
  }
  
  // MFA active → Show verification modal
  showMFAModal(() => {
    // After MFA verified → Create template
    createTemplate(templateData);
  });
}
```

---

### Authenticator App Recommendations

**Primary (Recommended):**

1. **Google Authenticator** 🔐
   - **Platform:** Android, iOS
   - **Pros:** Simple, widely used, free, no account needed
   - **Cons:** No cloud backup (lose phone = lose codes)
   - **Link:** https://support.google.com/accounts/answer/1066447
   - **Best for:** Most users (familiar, easy setup)

2. **Apple Passwords** 🍎
   - **Platform:** iOS 17+, macOS Sonoma+
   - **Pros:** Built-in (no app download), iCloud sync (multi-device)
   - **Cons:** Apple ecosystem only
   - **Link:** https://support.apple.com/en-us/HT204085
   - **Best for:** Apple users (iPhone + Mac)

**Alternative (Advanced):**

3. **Microsoft Authenticator**
   - **Platform:** Android, iOS, Windows
   - **Pros:** Cloud backup, multi-device sync, fingerprint unlock
   - **Cons:** Requires Microsoft account

4. **Authy**
   - **Platform:** Android, iOS, Desktop (Chrome, Windows, macOS)
   - **Pros:** Cloud backup, multi-device sync, desktop support
   - **Cons:** Requires phone number, account creation

5. **1Password** (Paid)
   - **Platform:** Android, iOS, Windows, macOS, Linux, Browser extension
   - **Pros:** Integrates with password manager, TOTP support, cloud sync
   - **Cons:** Paid subscription ($3-5/month)
   - **Best for:** Power users already using 1Password

**Recommendation for Crossramp users:**
- **Beginners:** Google Authenticator (simplest)
- **Apple users:** Apple Passwords (built-in, seamless)
- **Multi-device:** Authy or 1Password (sync across devices)

---

### Casos extremos

#### 1. **User lost phone with authenticator app**

**Cenário:** User's phone was stolen/lost, authenticator app inaccessible.

**Problem:** User cannot generate MFA codes → Cannot perform write actions.

**Current solution:** NOT IMPLEMENTED (no recovery mechanism yet).

**Future solution:**
1. **Backup codes:** During MFA setup, generate 10 one-time backup codes
   - User prints/saves codes securely
   - If phone lost → Use backup code instead of authenticator
   - Each code single-use (once used, cannot reuse)
2. **Recovery email:** Send temporary code to secondary email
   - User requests recovery via Security page
   - Auth0 sends 8-digit code to recovery email
   - User enters code → Gets 24-hour MFA bypass
   - User re-enrolls MFA with new phone
3. **Support escalation:** Contact Crossramp Support
   - Verify identity (CNPJ, registered email, security questions)
   - Support admin resets MFA enrollment
   - User re-enrolls MFA from scratch

**Workaround (current):**
- User contacts Crossramp Support (email: support@crossramp.com)
- Support verifies identity (asks for account details, CNPJ, last transaction)
- Support manually disables MFA via Auth0 Management Dashboard
- User logs in without MFA → Re-enrolls MFA with new phone

**Likelihood:** Uncommon (but critical when happens, user fully blocked).

---

#### 2. **Email with QR code goes to spam**

**Cenário:** User clicks "Activate MFA", but email doesn't arrive in inbox (went to spam folder).

**Symptoms:**
- State shows "Pending Confirmation"
- User waits 10 minutes, no email
- User confused: "Email not received"

**Solution:**
1. User checks spam/junk folder
2. If found → Mark as "Not Spam" (whitelist noreply@crossramp.com)
3. Open email → Scan QR code → Proceed

**Prevention:**
- Setup Guide shows note: "Check your spam folder if you don't see the email within 1-2 minutes."
- (Future) "Resend Email" button (if user waits >5 min, can re-trigger email)

**Ops/CS handling:**
- Ask user to check spam folder first
- If not in spam → Check Auth0 email logs (delivery success/failure)
- If delivery failed → Re-send email via Auth0 dashboard
- If email provider blocking → Whitelist Crossramp domain

---

#### 3. **User scans QR code but enters wrong code**

**Cenário:** User successfully scanned QR, but enters wrong 6-digit code (typo or read old code).

**Symptoms:**
- Modal shows "Invalid code. Please try again."
- User confused: "I'm typing the code correctly!"

**Common causes:**
1. **Old code:** TOTP codes rotate every 30 seconds. User read code at 00:29, typed at 00:31 → Code changed.
2. **Typo:** User typed "123455" instead of "123456"
3. **Wrong account:** User has multiple TOTP accounts in authenticator, read code from wrong one
4. **Time sync issue:** Phone clock out of sync with server (rare)

**Solution:**
1. **Wait for new code:** Tell user to wait for code to refresh (30s cycle), then type fresh code
2. **Double-check:** Verify user is reading "Crossramp" account in authenticator (not Google, Facebook, etc.)
3. **Retry:** User can attempt 3 times before lockout (5 min cooldown)
4. **Time sync:** If persistent issue, check phone Settings → Date & Time → Set Automatically

**Ops/CS script:**
- "TOTP codes rotate every 30 seconds. Please wait for a fresh code to appear, then type it immediately."
- "Make sure you're reading the code from the 'Crossramp' account in your authenticator app, not another service."
- "If you've already tried 3 times, please wait 5 minutes before retrying."

---

#### 4. **QR code scan fails (camera issues)**

**Cenário:** User tries to scan QR code, but camera won't focus or doesn't recognize QR.

**Symptoms:**
- Authenticator app camera opens, but doesn't scan
- QR code blurry or too small
- Phone camera broken/permissions denied

**Solution:**
1. **Manual entry:** Email also includes manual entry key: "ABCD EFGH IJKL MNOP"
   - User opens authenticator app → "Enter a setup key" (instead of scan QR)
   - User types key manually
   - Authenticator adds account
2. **Camera permissions:** User denied camera access to authenticator app
   - Phone Settings → Apps → Google Authenticator → Permissions → Enable Camera
3. **Better lighting:** QR code scan requires good lighting (not dark room)
4. **Zoom in:** If QR code on desktop email, zoom browser (Ctrl/Cmd +)

**Ops/CS guidance:**
- "If scanning doesn't work, use the manual entry key shown below the QR code in the email."
- "Make sure your authenticator app has camera permissions enabled."
- "Try scanning in a well-lit room, and make sure the QR code is fully visible on screen."

---

#### 5. **User activates MFA but KYC not complete (merchant_id null)**

**Cenário:** Edge case where merchant_id was null during MFA enrollment (should be blocked).

**How it happens:**
- **Bug scenario:** Frontend check failed, user bypassed merchant_id validation
- **Race condition:** merchant_id was non-null during enrollment, but revoked during verification (KYC rejected mid-flow)

**Symptoms:**
- User clicks "Activate MFA"
- Email sent (should have been blocked)
- User scans QR, confirms code
- MFA shows "Active" but write actions still blocked
- Error toast: "KYC verification required"

**Solution:**
1. **Backend enforcement:** Backend ALWAYS checks merchant_id before allowing write actions (even if MFA active)
2. **Frontend re-check:** On page load, re-validate merchant_id (if null → Redirect to KYC page)
3. **User action:** Complete KYC verification → merchant_id set → Write actions unlock

**Prevention:**
- Frontend checks merchant_id BEFORE calling Auth0 enroll API
- Backend validates merchant_id during enrollment (double-check)
- Auth0 rule validates merchant_id claim (triple-check)

---

#### 6. **User tries to activate MFA multiple times (duplicate enrollments)**

**Cenário:** User clicks "Activate MFA" button multiple times (impatient, thinks it didn't work).

**Symptoms:**
- Multiple emails sent (5+ enrollment emails in inbox)
- Multiple pending enrollments in Auth0
- User confused: "Which QR code do I scan?"

**Solution:**
1. **Frontend debouncing:** Disable "Activate MFA" button after first click (prevent duplicate requests)
2. **Auth0 deduplication:** Auth0 only allows one active enrollment per user (subsequent requests return existing enrollment)
3. **User guidance:** Scan QR from MOST RECENT email (latest timestamp)

**Prevention:**
- Button disabled after click (shows loading state)
- Toast: "Setup email sent!" (confirms action completed)
- If user clicks again → "MFA setup already in progress. Check your email."

---

#### 7. **MFA active but user wants to disable it (not allowed)**

**Cenário:** User enabled MFA, now wants to disable (doesn't like entering codes every time).

**Current behavior:** NO "Disable MFA" button (cannot disable once active).

**Rationale:**
- **Security:** MFA protects financial accounts (withdrawals, payments)
- **Compliance:** Regulatory requirements (AML/KYC) may mandate MFA
- **Risk:** If user can disable MFA → Compromised account → Disable MFA → Steal funds

**Future solution:**
- "Disable MFA" button with Admin approval (Admin must approve via Support ticket)
- Emergency only (e.g., lost phone, cannot access account)
- Requires identity verification (CNPJ docs, video call)

**Ops/CS response:**
- "MFA cannot be disabled for security reasons. It protects your account from unauthorized access."
- "If you've lost access to your authenticator app, we can help you re-enroll MFA. Please contact support."
- "MFA is required to perform write actions (withdrawals, payments). Read-only access does not require MFA."

---

#### 8. **Time sync issue (phone clock wrong)**

**Cenário:** User's phone clock is out of sync (manual time set, no auto-sync).

**Symptoms:**
- User scans QR code successfully
- Authenticator generates 6-digit codes
- ALL codes are rejected as invalid ("Invalid code")
- User extremely frustrated (codes look correct)

**Cause:**
- TOTP algorithm uses current time (Unix timestamp)
- If phone clock is 2 minutes fast/slow → Codes don't match server
- Authenticator generates code for "wrong" time window

**Solution:**
1. **Enable automatic time sync:**
   - Android: Settings → Date & Time → Set time automatically (ON)
   - iOS: Settings → General → Date & Time → Set Automatically (ON)
2. **Restart authenticator app:** After fixing time, close/reopen app
3. **Try new code:** Generate fresh code after time sync

**Detection:**
- If user has 3+ failed attempts AND codes look valid → Ask about time sync
- "Is your phone set to automatic time? Manual time can cause TOTP codes to fail."

**Ops/CS script:**
- "TOTP codes are time-sensitive. Please enable automatic date/time on your phone:"
  - "Android: Settings → Date & Time → Set time automatically"
  - "iOS: Settings → General → Date & Time → Set Automatically"
- "After enabling, restart your authenticator app and try a fresh code."

---

#### 9. **User has multiple Crossramp accounts (reads wrong code)**

**Cenário:** User has 2 accounts (personal + business), both enrolled MFA.

**Symptoms:**
- User tries to log in to Account A
- Reads code from Account B in authenticator
- Code rejected (wrong account)

**Solution:**
- Authenticator app labels each account with email:
  - "Crossramp (user@personal.com)"
  - "Crossramp (user@business.com)"
- User must read code from correct account label

**Prevention:**
- During setup, Auth0 includes email in QR code → Authenticator shows email label
- User can differentiate accounts by email

**Ops/CS guidance:**
- "Make sure you're reading the code from the account that matches your login email."
- "If you have multiple Crossramp accounts, check the email label in your authenticator app."

---

#### 10. **User enrolls MFA but never confirms (pending forever)**

**Cenário:** User clicks "Activate MFA", receives email, but never scans QR or confirms code.

**Symptoms:**
- State stuck in "Pending Confirmation" indefinitely
- User can still view read-only pages
- Write actions blocked (MFA not active)
- Enrollment expires after 30 minutes, but UI still shows "Pending"

**Solution:**
1. **Enrollment expiration:** Auth0 expires pending enrollments after 30 minutes
2. **Frontend re-check:** On page load, check enrollment status via Auth0 API
   - If enrollment expired → Reset state to "Not Activated"
   - Show banner: "MFA setup expired. Please restart activation."
3. **Restart flow:** User clicks "Activate MFA" again → New enrollment created

**Prevention:**
- Show countdown in Pending banner: "Setup expires in 25 minutes" (urgency)
- (Future) Auto-refresh enrollment status every 5 minutes (detect expiration)

---

### Melhorias futuras

1. **Backup Codes:** Generate 10 one-time recovery codes during MFA setup (for lost phone)
2. **Recovery Email:** Send temporary code to secondary email (bypass MFA temporarily)
3. **Resend Email:** "Resend Setup Email" button (if user didn't receive first email)
4. **Disable MFA:** "Disable MFA" button with Admin approval (emergency only)
5. **Trusted Devices:** "Remember this device for 30 days" checkbox (skip MFA on trusted device)
6. **MFA Methods:** Support multiple methods (SMS, Email, Authenticator app) - user chooses preferred
7. **SMS Fallback:** Send code via SMS if authenticator unavailable (costs $0.01/SMS)
8. **Push Notifications:** Authy-style push approval ("Approve login" button on phone)
9. **Security Log:** View MFA verification history (when, where, which device)
10. **Active Sessions:** View all active sessions, revoke suspicious sessions
11. **Last Login:** Show last login timestamp, IP address, device
12. **Password Change:** Change password (currently managed by Auth0, no dashboard UI)
13. **Session Timeout:** Auto-logout after 30 min inactivity (security)
14. **Device Fingerprinting:** Detect new devices, require extra verification
15. **Anomaly Detection:** Unusual login location/time → Email alert + extra verification

---

### Best practices para compartilhar com Users

1. **Enable MFA immediately:** After KYC approval, activate MFA before performing any write actions
2. **Use trusted authenticator:** Google Authenticator or Apple Passwords (avoid sketchy apps)
3. **Backup codes:** (Future) Print backup codes, store securely (safe, password manager)
4. **Don't share codes:** MFA codes are secret (never share via email, chat, phone)
5. **Time sync:** Keep phone clock set to automatic (TOTP requires accurate time)
6. **Multiple devices:** If using multi-device authenticator (Authy), enable sync
7. **Lost phone plan:** Keep backup phone number registered (for SMS fallback, future)
8. **Check spam:** If setup email delayed, check spam folder first
9. **Fresh codes:** Always type fresh code (don't use code about to expire)
10. **Secure email:** Keep email account secure (MFA setup emails are sensitive)

---

### Security Considerations

**MFA protects against:**
- ✅ Password theft (even if password leaked, cannot access account without MFA)
- ✅ Phishing (attacker cannot replicate TOTP code)
- ✅ Session hijacking (write actions require MFA re-verification)
- ✅ Credential stuffing (stolen credentials from other sites won't work)
- ✅ Insider threats (employees cannot impersonate users without MFA)

**MFA does NOT protect against:**
- ❌ Social engineering (attacker tricks user into sharing code)
- ❌ Malware on user's device (keylogger, screen capture)
- ❌ SIM swapping (if using SMS MFA, not TOTP)
- ❌ Man-in-the-middle (if user enters code on fake site)

**Best practices (implemented):**
- ✅ TOTP (not SMS) - More secure (no SIM swap risk)
- ✅ Short-lived elevated tokens (5 min expiry, limits damage window)
- ✅ Rate limiting (max 3 attempts, prevents brute force)
- ✅ Enrollment expiration (30 min, reduces attack window)
- ✅ merchant_id prerequisite (requires KYC, prevents rogue accounts)

**Future enhancements:**
- 🔄 WebAuthn/FIDO2 (hardware security keys: YubiKey, Titan Key)
- 🔄 Biometric MFA (fingerprint, Face ID on mobile)
- 🔄 Risk-based MFA (only prompt MFA for high-risk actions/locations)
- 🔄 Device trust (skip MFA on trusted devices for 30 days)

---

### Compliance Notes

**PCI DSS (Payment Card Industry):**
- MFA required for payment processing systems
- Crossramp processes payments → MFA mandatory
- TOTP meets PCI DSS MFA requirements

**LGPD/GDPR (Data Privacy):**
- MFA protects PII (personally identifiable information)
- User financial data (balances, transactions) = sensitive
- MFA reduces risk of data breach (access control)

**AML/KYC (Anti-Money Laundering):**
- Financial institutions must verify user identity
- MFA prevents account takeover → Money laundering
- merchant_id prerequisite ensures KYC complete before MFA

**SOC 2 (Security Compliance):**
- MFA required for access to financial systems
- Audit trail (MFA verification logs)
- Crossramp may need SOC 2 certification → MFA is critical control

**Audit requirements:**
- Log all MFA enrollments (who, when, IP address)
- Log all MFA verifications (successful + failed attempts)
- Log MFA resets (support admin disables MFA)
- Retain logs for 7 years (compliance retention policy)

---

### Notas para Ops/CS

#### Troubleshooting comum

**"Não consigo ativar MFA"**
- **Verificar:** KYC complete? (merchant_id non-null?)
- **Solução:** Se KYC incomplete → User deve submit docs em Company Profile page
- **Timeline:** KYC approval takes 24-48 hours → After approval, user can activate MFA

**"Email de setup não chegou"**
- **Investigar:**
  1. Spam folder? (ask user to check)
  2. Email address correct? (verify in Auth0 dashboard)
  3. Auth0 email logs? (check delivery status)
- **Solução:** Resend email via Auth0 dashboard (Manual action by Ops)

**"Código sempre inválido"**
- **Investigar:**
  1. Time sync? (phone clock automatic?)
  2. Wrong account? (multiple TOTP accounts?)
  3. Old code? (wait for fresh code, 30s cycle)
- **Solução:** Walk user through time sync check, verify account label

**"Perdi meu celular com autenticador"**
- **Problema crítico:** User fully blocked (cannot perform write actions)
- **Solução atual:** Support admin resets MFA via Auth0 dashboard
- **Verification required:** 
  - Verify identity (CNPJ, email, last transaction)
  - Video call (optional, for high-value accounts)
  - Reset MFA → User re-enrolls with new phone
- **Future:** Backup codes (user can self-recover)

**"MFA está ativo mas write actions ainda bloqueados"**
- **Investigar:**
  1. KYC complete? (merchant_id non-null?)
  2. JWT token refreshed? (user logged out/in after MFA activation?)
  3. Backend issue? (check API logs)
- **Solução:** Ask user to logout/login (refresh JWT token with new MFA claim)

**"Quero desativar MFA"**
- **Resposta:** MFA cannot be disabled (security policy)
- **Exception:** Lost phone → Support can reset MFA (user re-enrolls)
- **Escalate:** If user insists, escalate to Product team (policy question)

**"Setup Guide confuso"**
- **Simplify:** Walk user through step-by-step:
  1. Download Google Authenticator (if not installed)
  2. Click "Activate MFA" button
  3. Check email for QR code (including spam)
  4. Open authenticator → Scan QR code
  5. Return to dashboard → Click "Confirm MFA Code"
  6. Type 6-digit code from authenticator
  7. Done!

---

This documentation provides a comprehensive guide for the Security page with detailed MFA workflows, Auth0 integration specifics, KYC prerequisites, error handling, and troubleshooting scenarios. The feature is critical for enabling write actions while maintaining security compliance.
