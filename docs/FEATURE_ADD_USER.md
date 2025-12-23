# Feature Documentation: Add User

**Componente de View:** `/src/app/views/AddUserView.tsx`  
**Componente de Form:** `/src/app/components/admin/AddUserForm.tsx`  
**ID de Rota/Navegação:** `add-user` (under Settings section)

## História de usuário

**Como** administrador da conta merchant,  
**Eu quero** adicionar novos usuários à minha organização e atribuir roles específicos (Admin, Operator, Analyst, Developer),  
**Para que** eu possa conceder acesso controlado ao dashboard Crossramp para membros da minha equipe, permitindo colaboração segura com permissões apropriadas baseadas em suas responsabilidades (ex: Analysts só veem dados, Operators gerenciam operações, Developers acessam APIs, Admins têm controle total).

## Notas de UX

- **Role-restricted (CRITICAL):** 
  - **APENAS Admin** (`user_admin_crossramp`) tem acesso a esta página
  - Operator, Analyst, Developer **NÃO PODEM** acessar (página não aparece no menu)
  - Security critical: Only admins can invite new users to prevent unauthorized access
- **MFA required:** Add User é uma **write action** que requer MFA verification (uses ProtectedActionForm)
- **Page structure (2 columns):**
  1. **Left:** Add User form (card with input fields)
  2. **Right:** Current Users table (shows existing team members)
- **Add User Form (left card):**
  - **Title:** "Add User"
  - **Description:** "Create a new user account. This action requires MFA verification."
  - **Fields:**
    1. **Full Name** - Text input, required, placeholder "John Doe"
    2. **Email** - Email input, required, placeholder "john@example.com"
    3. **Role** - Dropdown select, required, options:
       - Admin (Administrador in PT/ES)
       - Operator (Operador in PT/ES)
       - Analyst (Analista in PT/ES)
       - Developer (Desenvolvedor in PT, Desarrollador in ES)
  - **Submit button:** Displays lock icon (protected action)
  - **Success toast:** "User created successfully. A confirmation email has been sent to complete the account setup."
  - **Validation:** All fields required, email must be valid format
- **Current Users Table (right card):**
  - **Title:** "Current Users"
  - **Columns:**
    1. **User** - Avatar (initials) + Name + Email (gray text below)
    2. **Role** - Badge outline variant (shows role label)
    3. **Status** - Badge (Active = default variant, Pending = secondary variant)
  - **Sorting:** Not implemented (displays in creation order)
  - **Pagination:** Not shown in current implementation (assumes small team <50 users)
  - **Actions:** No inline actions (edit/delete) in current version
- **Invitation flow:**
  1. Admin fills form + submits
  2. MFA modal appears (Admin enters 6-digit code)
  3. Backend creates user account in "pending" status
  4. Confirmation email sent to new user's email
  5. New user clicks link in email → Sets password → Account becomes "active"
  6. Admin sees user in table with "Pending" badge until activation
- **Email not yet registered:** System allows adding user even if email is already in use (backend will validate and reject duplicates)
- **Responsive:** Cards stack vertically on mobile, side-by-side on desktop (lg:grid-cols-2)

## Ações de leitura (queries)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Categoria | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-----------|---------------------|
| **Listar usuários da organização** | `GET` | `/api/users/list` | `{}` | `{ "users": [{ "id": "usr_001", "name": "Alex Morgan", "email": "alex@merchant.com", "role": "admin", "status": "active", "created_at": "2024-01-15T10:00:00Z", "last_login": "2025-12-20T14:30:00Z", "invited_by": "usr_000", "activated_at": "2024-01-15T11:23:00Z" }, { "id": "usr_002", "name": "Sarah Chen", "email": "sarah@merchant.com", "role": "operator", "status": "active", "created_at": "2024-03-20T09:00:00Z", "last_login": "2025-12-22T08:15:00Z", "invited_by": "usr_001", "activated_at": "2024-03-20T10:45:00Z" }, { "id": "usr_003", "name": "Mike Johnson", "email": "mike@merchant.com", "role": "analyst", "status": "active", "created_at": "2024-06-10T14:00:00Z", "last_login": "2025-12-21T16:20:00Z", "invited_by": "usr_001", "activated_at": "2024-06-10T15:30:00Z" }, { "id": "usr_004", "name": "Emma Wilson", "email": "emma@merchant.com", "role": "developer", "status": "pending", "created_at": "2025-12-20T10:00:00Z", "last_login": null, "invited_by": "usr_001", "activated_at": null, "invitation_expires_at": "2025-12-27T10:00:00Z" }], "total_count": 4, "active_count": 3, "pending_count": 1, "admin_count": 1, "max_users_allowed": 50 }` | **B** (Categoria B - Changes when users join/leave, soft refresh 30s when page visible) | Toast "Failed to load users" + Empty state com Retry button |
| **Verificar permissões do usuário atual** | `GET` | `/api/users/me/permissions` | `{}` | `{ "user_id": "usr_001", "role": "admin", "permissions": ["users.create", "users.read", "users.update", "users.delete", "templates.create", "templates.read", "templates.update", "templates.delete", "payments.read", "balances.read", "balances.withdraw", "whitelist.create", "whitelist.read", "whitelist.update", "whitelist.delete", "api_keys.create", "api_keys.read", "api_keys.disable", "reports.read", "disputes.read", "disputes.respond", "company_profile.read", "settings.update"], "can_add_users": true, "can_manage_api_keys": true, "can_approve_withdrawals": true, "max_users_can_create": 46 }` | **C** (Categoria C - Static during session, load once on app init) | Se falhar, assume role = "analyst" (lowest permissions, safe default) |

**Notas sobre classificação de queries:**

- **List users (Categoria B):** Lista de usuários muda quando Admin adiciona/remove membros da equipe. Não muda frequentemente (talvez 1-2x por semana), mas quando Admin está na página "Add User", faz sentido soft refresh 30s para ver quando pending user ativa conta (status: pending → active).

- **User permissions (Categoria C):** Permissões do usuário logado são estáticas durante a sessão (não mudam até re-login). Load once no app init, cache in Zustand store. Usado para controlar visibilidade de menu items, buttons, pages.

**Importante:** Add User page é principalmente para admins configurarem equipe. Frequência de uso: LOW (apenas durante onboarding de novos membros ou turnover).

---

## Ações de escrita (commands)

| Ação | Método | Endpoint | Request Body | Formato de Resposta Esperado | Requer MFA? | Tratamento de Erro |
|------|--------|----------|--------------|------------------------------|-------------|---------------------|
| **Adicionar novo usuário** | `POST` | `/api/users/add` | `{ "name": "John Doe", "email": "john@merchant.com", "role": "operator" }` | `{ "success": true, "user_id": "usr_005", "status": "pending", "invitation_sent_to": "john@merchant.com", "invitation_expires_at": "2025-12-29T10:00:00Z", "message": "User created successfully. A confirmation email has been sent to john@merchant.com to complete the account setup." }` | **Sim** (MFA required, 6-digit code) | **Duplicate email:** Toast "This email is already registered" <br> **Invalid email:** Toast "Please enter a valid email address" <br> **Max users reached:** Toast "You have reached the maximum number of users (50). Please contact support to upgrade." <br> **Invalid role:** Toast "Invalid role selected" <br> **MFA failed:** Toast "Invalid MFA code. Please try again." <br> **Permission denied:** Toast "You don't have permission to add users" |

**Parâmetros detalhados:**

### POST /api/users/add

**Request body:**
```json
{
  "name": "John Doe",           // Required, min 2 chars, max 100 chars
  "email": "john@merchant.com", // Required, valid email format, must be unique in organization
  "role": "operator"            // Required, must be one of: "admin", "operator", "analyst", "developer"
}
```

**Validation rules:**
- **name:** 
  - Required
  - Min length: 2 characters
  - Max length: 100 characters
  - Cannot be only whitespace
  - Format: Any UTF-8 characters (supports international names)
  
- **email:**
  - Required
  - Valid email format (RFC 5322)
  - Must be unique within organization (backend checks)
  - Cannot be the same as inviting admin's email
  - Max length: 255 characters
  - Case-insensitive (john@example.com = JOHN@example.com)
  
- **role:**
  - Required
  - Must be exact match: "admin", "operator", "analyst", "developer"
  - Case-sensitive (lowercase only)
  - Cannot create role higher than current user (analyst cannot create admin)

**Success response:**
```json
{
  "success": true,
  "user_id": "usr_005",
  "status": "pending",
  "invitation_sent_to": "john@merchant.com",
  "invitation_expires_at": "2025-12-29T10:00:00Z",
  "invitation_link": "https://crossramp.com/accept-invite?token=abc123...",
  "message": "User created successfully. A confirmation email has been sent to john@merchant.com to complete the account setup."
}
```

**Error responses:**

1. **Duplicate email (409 Conflict):**
```json
{
  "success": false,
  "error_code": "USER_ALREADY_EXISTS",
  "message": "This email is already registered",
  "existing_user_id": "usr_002",
  "existing_user_status": "active"
}
```

2. **Invalid email (400 Bad Request):**
```json
{
  "success": false,
  "error_code": "INVALID_EMAIL",
  "message": "Please enter a valid email address",
  "provided_email": "invalid-email"
}
```

3. **Max users reached (403 Forbidden):**
```json
{
  "success": false,
  "error_code": "MAX_USERS_REACHED",
  "message": "You have reached the maximum number of users (50). Please contact support to upgrade.",
  "current_user_count": 50,
  "max_allowed": 50,
  "upgrade_url": "https://crossramp.com/upgrade"
}
```

4. **Invalid role (400 Bad Request):**
```json
{
  "success": false,
  "error_code": "INVALID_ROLE",
  "message": "Invalid role selected",
  "provided_role": "superadmin",
  "allowed_roles": ["admin", "operator", "analyst", "developer"]
}
```

5. **Permission denied (403 Forbidden):**
```json
{
  "success": false,
  "error_code": "PERMISSION_DENIED",
  "message": "You don't have permission to add users",
  "current_user_role": "operator",
  "required_role": "admin"
}
```

6. **MFA verification failed (401 Unauthorized):**
```json
{
  "success": false,
  "error_code": "MFA_VERIFICATION_FAILED",
  "message": "Invalid MFA code. Please try again.",
  "attempts_remaining": 2,
  "lockout_duration_seconds": 300
}
```

**Business logic:**
- New user created with `status: "pending"`
- Invitation email sent immediately (contains magic link)
- Invitation expires after 7 days (configurable)
- User must click link + set password to activate
- Until activation, user appears in table with "Pending" badge
- Admin can resend invitation if expired (not implemented yet)
- Admin can revoke invitation before activation (not implemented yet)

**Security:**
- MFA required (prevents unauthorized user creation)
- Only admins can add users (role-based access control)
- Rate limit: 10 user creations per hour per admin (prevent abuse)
- Invitation tokens are single-use (cannot be reused)
- Invitation links expire after 7 days (security)

**Audit trail:**
- Log: `[Admin usr_001] created user [usr_005] with role [operator] at [2025-12-22T10:00:00Z]`
- Log: `Invitation email sent to [john@merchant.com]`
- Log: `User [usr_005] activated account at [2025-12-22T11:30:00Z]`

---

## Guia interno do produto

### Quando usar
Admin acessa Add User quando:
1. **Onboarding novo membro:** Contratar funcionário, precisa dar acesso ao dashboard
2. **Mudança de responsabilidades:** Promover Analyst para Operator (adiciona com novo role)
3. **Colaboração externa:** Adicionar contador, consultor (Analyst read-only)
4. **Developer onboarding:** Novo dev integrating com Crossramp API (Developer role)
5. **Replacing user:** Funcionário saiu, contratar substituto (adiciona novo, depois remove antigo)
6. **Audit access:** Ver quem tem acesso ao dashboard (right table)
7. **Troubleshooting:** "User não recebeu email de convite" → Reenviar (futuro)

### Roles e permissões

#### **Admin (Administrador)**
**Full access** - Controle total do dashboard.

**Pode fazer:**
- ✅ Add/remove users
- ✅ Create/edit/delete templates
- ✅ View all payments, balances, transactions
- ✅ Create/approve withdrawals
- ✅ Manage whitelist (add/remove PIX keys)
- ✅ Create/disable API keys
- ✅ View/respond to disputes
- ✅ View company profile, reputation, fees
- ✅ Request reports (PDF/CSV exports)
- ✅ Change app settings (language, preferences)
- ✅ View/manage security (MFA)

**Casos de uso:**
- CFO/Finance Director
- Operations Manager
- Business Owner (merchant principal)

**Limite:** Merchant pode ter múltiplos admins (recomendado: 1-3 admins)

---

#### **Operator (Operador)**
**Operations-focused** - Gerencia operações diárias (payments, withdrawals, disputes).

**Pode fazer:**
- ✅ Create/edit/delete templates
- ✅ View all payments, balances, transactions
- ✅ Create withdrawals (mas NÃO pode aprovar se merchant tem approval workflow)
- ✅ Manage whitelist (add/remove PIX keys)
- ✅ View/respond to disputes
- ✅ View company profile (read-only)
- ✅ Change app settings (language, preferences)

**NÃO pode fazer:**
- ❌ Add/remove users
- ❌ Create/disable API keys
- ❌ Approve withdrawals (if approval required)
- ❌ Request custom reports (apenas visualiza)

**Casos de uso:**
- Finance team member (day-to-day operations)
- Customer support specialist (resolve disputes)
- Back-office operator (process payments, withdrawals)

**Limite:** Merchant pode ter vários operators (5-20 comum para médios merchants)

---

#### **Analyst (Analista)**
**Read-only analytics** - Vê dados mas não pode modificar nada.

**Pode fazer:**
- ✅ View all payments, balances, transactions (read-only)
- ✅ View templates (read-only, cannot create/edit)
- ✅ View disputes (read-only, cannot respond)
- ✅ View company profile (read-only)
- ✅ View analytics dashboards
- ✅ View reports (read-only)
- ✅ Export data (CSV downloads for analysis)

**NÃO pode fazer:**
- ❌ Add/remove users
- ❌ Create/edit/delete templates
- ❌ Create withdrawals
- ❌ Manage whitelist
- ❌ Create/disable API keys
- ❌ Respond to disputes
- ❌ Any write actions (100% read-only)

**Casos de uso:**
- Data analyst (reporting, business intelligence)
- Accountant/Auditor (review financial data)
- External consultant (limited access, view-only)
- Junior team member (learning, cannot break things)

**Limite:** Unlimited analysts (safe porque read-only)

---

#### **Developer (Desenvolvedor)**
**API-focused** - Integração técnica, documentação, API keys.

**Pode fazer:**
- ✅ View API Integration page (documentation, resources)
- ✅ Create/disable API keys (for integration)
- ✅ View API usage logs/analytics
- ✅ Test API endpoints (sandbox environment)
- ✅ View webhooks configuration
- ✅ View templates (understand payment flow)
- ✅ View payments (for debugging integrations)

**NÃO pode fazer:**
- ❌ Add/remove users
- ❌ Create withdrawals
- ❌ Manage whitelist
- ❌ View financial balances (sensitive)
- ❌ View company profile (not relevant for dev)
- ❌ Respond to disputes

**Casos de uso:**
- Software engineer (integrating merchant's website/app com Crossramp)
- DevOps engineer (monitoring API health)
- Technical integrator (third-party agency)
- QA engineer (testing payment flows)

**Limite:** 2-5 developers typical (apenas quem trabalha na integração)

---

### Role comparison matrix

| Feature | Admin | Operator | Analyst | Developer |
|---------|-------|----------|---------|-----------|
| **User Management** | ✅ Full | ❌ No | ❌ No | ❌ No |
| **Templates** | ✅ Create/Edit/Delete | ✅ Create/Edit/Delete | 👁️ View Only | 👁️ View Only |
| **Payments** | ✅ Full | ✅ Full | 👁️ View Only | 👁️ View Only |
| **Balances** | ✅ View | ✅ View | ❌ No Access | ❌ No Access |
| **Withdrawals** | ✅ Create/Approve | ✅ Create (not approve) | ❌ No | ❌ No |
| **Whitelist** | ✅ Full | ✅ Full | ❌ No | ❌ No |
| **Disputes** | ✅ View/Respond | ✅ View/Respond | 👁️ View Only | ❌ No |
| **API Keys** | ✅ Full | ❌ No | ❌ No | ✅ Create/Disable |
| **API Docs** | 👁️ View | 👁️ View | 👁️ View | ✅ Full Access |
| **Reports** | ✅ Request/Export | 👁️ View Only | 👁️ View Only | ❌ No |
| **Company Profile** | 👁️ View | 👁️ View | 👁️ View | ❌ No |
| **Settings** | ✅ Full | ✅ App Settings | ✅ App Settings | ✅ App Settings |
| **Security (MFA)** | ✅ Full | ✅ Own Account | ✅ Own Account | ✅ Own Account |

**Legend:**
- ✅ Full access (create/read/update/delete)
- 👁️ View only (read-only access)
- ❌ No access (page not visible)

---

### Invitation workflow (step-by-step)

#### **Step 1: Admin creates user**
1. Admin vai para Settings → Add User
2. Preenche form: Name "John Doe", Email "john@merchant.com", Role "Operator"
3. Clica submit button (lock icon)
4. MFA modal appears
5. Admin abre Google Authenticator → Copia 6-digit code
6. Cole code no modal → Click "Verify"
7. Backend validates MFA → Creates user → Sends email
8. Success toast: "User created successfully. A confirmation email has been sent..."
9. Right table refreshes → John aparece com "Pending" badge

**Timeline:** ~30 seconds (Admin side)

#### **Step 2: Invitation email sent**
- **Subject:** "You've been invited to join [Merchant Name] on Crossramp"
- **From:** "Crossramp Team <noreply@crossramp.com>"
- **Content:**
  - "Hi John, [Admin Name] has invited you to join [Merchant Name]'s Crossramp dashboard."
  - "Your role: Operator"
  - "Click the button below to set your password and activate your account."
  - **[Accept Invitation]** button (magic link)
  - "This invitation expires in 7 days (Dec 29, 2025)."
  - "If you didn't expect this invitation, you can safely ignore this email."

**Timeline:** Email delivered em ~1-5 minutos (via SendGrid/SES)

#### **Step 3: User accepts invitation**
1. John recebe email → Clica "Accept Invitation" button
2. Opens browser → Crossramp signup page
3. Pre-filled: Email "john@merchant.com", Name "John Doe" (read-only)
4. Shows: "You're joining [Merchant Name] as Operator"
5. Form: 
   - Password (min 8 chars, must have: uppercase, lowercase, number, symbol)
   - Confirm Password
   - Checkbox: "I agree to Crossramp Terms of Service"
6. Clica "Activate Account" button
7. Backend:
   - Validates password strength
   - Hashes password (bcrypt)
   - Updates user: `status: "pending" → "active"`
   - Generates session token
   - Sends "Welcome to Crossramp" email
8. User redirected to dashboard (logged in)
9. Shows onboarding tooltip: "Welcome! Here's how to get started..."

**Timeline:** ~2-5 minutos (User side)

#### **Step 4: Admin sees activation**
1. Admin still on Add User page (or refreshed)
2. Right table auto-refreshes (30s polling)
3. John's badge changes: "Pending" → "Active"
4. Shows last_login: "Just now"
5. Admin can see John is online

**Timeline:** Up to 30s delay (polling interval)

---

### User statuses explained

#### **Active**
- User completed invitation flow (set password)
- Can log in to dashboard
- All permissions active
- Badge: Blue/default variant
- **Admin action:** None needed (user is fully functional)

#### **Pending**
- User invited but hasn't set password yet
- Cannot log in (account not activated)
- Invitation email sent (waiting for user action)
- Badge: Gray/secondary variant
- **Admin action:** 
  - Wait for user to accept invitation (up to 7 days)
  - If >24h, check if user received email (spam folder?)
  - Resend invitation (futuro feature)

#### **Expired (futuro)**
- User didn't activate within 7 days
- Invitation link no longer valid
- Cannot log in
- Badge: Red/destructive variant
- **Admin action:**
  - Delete expired user
  - Re-invite with new invitation (fresh 7-day window)

#### **Suspended (futuro)**
- Admin temporarily disabled user access
- User cannot log in (receives "Account suspended" message)
- Used for: Investigation, policy violation, offboarding in progress
- Badge: Yellow/warning variant
- **Admin action:**
  - Reactivate (if investigation cleared)
  - Delete (if permanently removing)

#### **Deleted (não aparece)**
- User removed from organization
- Does not appear in table
- Cannot log in (account no longer exists)
- Audit log preserves history (who deleted, when)

---

### Campos principais explicados

| Campo | Significado | Exemplo | Validação |
|-------|-------------|---------|-----------|
| **name** | Nome completo do usuário | "John Doe" | Min 2 chars, max 100 chars, UTF-8 |
| **email** | Email corporativo ou pessoal | "john@merchant.com" | Valid email format, unique |
| **role** | Nível de acesso no dashboard | "admin", "operator", "analyst", "developer" | Must be exact match (lowercase) |
| **status** | Estado da conta | "active", "pending", "expired", "suspended" | Auto-managed by system |
| **created_at** | Quando usuário foi convidado | "2025-12-22T10:00:00Z" | ISO 8601 timestamp |
| **last_login** | Último acesso ao dashboard | "2025-12-22T14:30:00Z" | Null if never logged in (pending) |
| **invited_by** | Qual admin criou o usuário | "usr_001" (Admin's user_id) | Used for audit trail |
| **activated_at** | Quando usuário completou signup | "2025-12-22T11:30:00Z" | Null if still pending |
| **invitation_expires_at** | Deadline para aceitar convite | "2025-12-29T10:00:00Z" | 7 days from creation |

---

### Casos extremos

#### 1. **Email já registrado (duplicate)**
**Cenário:** Admin tenta adicionar "sarah@merchant.com" mas Sarah já existe.  
**Erro:** `USER_ALREADY_EXISTS` (409 Conflict)  
**Toast:** "This email is already registered"  
**Solução:**
- Verificar tabela à direita → Sarah já está lá?
- Se Sarah foi deleted, backend deve permitir re-adding (reactivate account)
- Se Admin queria mudar role de Sarah: Futuro feature "Edit User" (não existe ainda)

**Workaround atual:** Delete Sarah → Re-add com novo role

---

#### 2. **Max users reached (50 limit)**
**Cenário:** Merchant tem 50 users, Admin tenta adicionar #51.  
**Erro:** `MAX_USERS_REACHED` (403 Forbidden)  
**Toast:** "You have reached the maximum number of users (50). Please contact support to upgrade."  
**Solução:**
- Review current users → Deletar inativos (ex: ex-funcionários)
- Contactar Crossramp sales → Upgrade plan (Enterprise = unlimited users)
- Temporarily: Share login credentials (NOT recommended, security risk)

**Limite 50 users:** Suficiente para 95% dos merchants (SMBs typically have <10 users)

---

#### 3. **User não recebe email de convite**
**Cenário:** Admin adicionou user, mas email não chegou após 10 minutos.  
**Causas comuns:**
1. **Spam folder:** Email filtrado como spam (common com SendGrid)
2. **Typo no email:** Admin digitou "jhon@..." ao invés de "john@..."
3. **Corporate email filter:** Empresa bloqueia emails externos (strict IT policy)
4. **Email provider issue:** Gmail/Outlook temporariamente down (rare)
5. **SendGrid rate limit:** Too many emails sent (if merchant invited 20 users at once)

**Troubleshooting:**
1. Verificar email correto na tabela (coluna Email)
2. Pedir user check spam folder
3. Check Crossramp status page → Email delivery issues?
4. **Futuro:** "Resend Invitation" button (admin can trigger re-send)

**Workaround atual:** Delete user → Re-add (generates new invitation email)

---

#### 4. **Invitation link expirou (>7 days)**
**Cenário:** User recebeu email há 10 dias, agora tenta clicar link.  
**Erro page:** "This invitation has expired. Please contact your admin to send a new invitation."  
**Status na tabela:** "Pending" (não mudou)  
**Solução:**
- Admin delete expired user
- Admin re-invite (fresh 7-day window)
- **Futuro:** Auto-expire + "Resend" button (one-click re-invite)

**Por que 7 dias?** Security best practice (links não devem viver forever)

---

#### 5. **Admin saiu da empresa (único admin)**
**Cenário:** Merchant tinha 1 admin (João), João saiu, agora ninguém pode add users.  
**Problema crítico:** Cannot add new admin (locked out).  
**Solução:**
1. **Merchant contacta Crossramp Support:** Prove ownership (CNPJ docs, contract)
2. **Support manually promotes** existing user to admin (ex: Operator → Admin)
3. **New admin** can now manage team

**Prevenção:** Merchant deve ter **SEMPRE 2+ admins** (redundancy)  
**Best practice:** CEO = Admin #1, CFO = Admin #2 (never have single point of failure)

---

#### 6. **Typo no nome (Admin digitou errado)**
**Cenário:** Admin adicionou "Jhon Doe" ao invés de "John Doe".  
**Problema:** User ativa conta, mas dashboard mostra nome errado.  
**Solução atual:** Não há "Edit User" (not implemented).  
**Workaround:**
- User can update own name via Settings → Profile (self-service)
- Admin cannot edit name (apenas user pode)

**Futuro:** "Edit User" button (admin can fix typos before user activates)

---

#### 7. **Wrong role assigned (Admin mistake)**
**Cenário:** Admin adicionou user como "Analyst" mas deveria ser "Operator".  
**Problema:** User não consegue create templates (permission denied).  
**Solução atual:** Não há "Change Role" (not implemented).  
**Workaround:**
1. Admin delete user (with wrong role)
2. Admin re-add user (with correct role)
3. User precisa accept invitation novamente (annoying!)

**Futuro:** "Edit Role" dropdown (admin can change role sem re-invite)

---

#### 8. **MFA code failed 3 times (lockout)**
**Cenário:** Admin tenta adicionar user, mas MFA code wrong 3x.  
**Erro:** `MFA_VERIFICATION_FAILED` + lockout (5 min)  
**Toast:** "Too many failed attempts. Please try again in 5 minutes."  
**Solução:**
- Wait 5 minutes (lockout expires)
- Retry with correct MFA code
- If Admin lost MFA device → Recovery flow (contact Support)

**Prevenção:** Admin deve sync MFA device time (Google Authenticator = time-based)

---

#### 9. **Bulk adding users (onboarding 10+ people)**
**Cenário:** New merchant onboarding entire team (15 users).  
**Problema atual:** Must add one-by-one (slow, tedious).  
**Workaround:**
- Admin adds users sequentially (15 form submissions)
- Each requires MFA (can reuse same code se dentro de 30s window)

**Futuro:** "Bulk Add Users" (CSV upload com name, email, role columns)

**Timeline:** 15 users × 1 min each = ~15 minutos (acceptable for rare use case)

---

#### 10. **Developer role added by mistake**
**Cenário:** Admin adicionou "Developer" role, mas user não é desenvolvedor.  
**Problema:** User can create API keys (security risk se não técnico).  
**Solução:**
- Delete user → Re-add com role correto (Operator ou Analyst)
- Monitor API keys created (se user criou keys sem autorização, disable imediatamente)

**Prevenção:** Admin deve entender roles antes de atribuir (internal training)

---

### Notas para Ops/CS

#### Troubleshooting comum

**"Não consigo adicionar usuário"**
- **Verificar:**
  1. Usuário logado é Admin? (apenas Admin pode)
  2. Já tem 50 users? (max limit)
  3. MFA está funcionando? (code correto?)
  4. Email é válido? (format check)
- **Solução:** Identificar qual erro específico (ver toast message)

**"Email de convite não chegou"**
- **Investigar:**
  1. Spam folder? (pedir user check)
  2. Email correto? (verificar typo)
  3. Crossramp email service up? (check status page)
  4. Corporate email filter? (whitelist noreply@crossramp.com)
- **Solução:** Re-send invitation (delete + re-add workaround)

**"Convite expirou"**
- **Explicar:** Invitations expiram após 7 dias (security).
- **Solução:** Admin deve delete expired user + re-invite (fresh 7 days).
- **Prevenção:** User deve aceitar invitation quickly (<7 days).

**"Atribuí role errado"**
- **Explicar:** Não há "Edit Role" atualmente (roadmap).
- **Solução:** Delete user + re-add com role correto.
- **Impacto:** User deve aceitar invitation novamente (minor inconvenience).

**"Único admin saiu da empresa"**
- **Critical:** Merchant locked out (cannot add new admin).
- **Escalate:** Tier 2 Support (requires manual intervention).
- **Solução:** Support verifica ownership → Manually promotes user to admin.
- **Prevenção:** Sempre ter 2+ admins (redundancy policy).

**"Muitos pending users (não ativaram)"**
- **Investigar:** Por que users não estão ativando?
  1. Email não chegou? (delivery issue)
  2. Users não checaram email? (remind them)
  3. Users esqueceram? (resend invitation)
- **Solução:** Admin pode delete pending users após 30 days (cleanup).

---

### Melhorias futuras

1. **Edit User:** Modificar name, email, role sem delete/re-add
2. **Resend Invitation:** One-click re-send email (sem delete/re-add)
3. **Revoke Invitation:** Cancel pending invitation (antes de user aceitar)
4. **Bulk Add Users:** CSV upload (mass onboarding)
5. **User Groups:** Organize users em teams (Sales, Finance, Ops)
6. **Custom Roles:** Create custom permissions (ex: "Support Agent" = limited operator)
7. **Invitation Templates:** Custom email templates por merchant
8. **Activity Log:** Ver quando user foi added, por quem, quando ativou
9. **Auto-expire Pending:** Automatically delete users pending >30 days
10. **Role Change History:** Audit trail quando admin muda role de user
11. **User Search/Filter:** Buscar users por name, email, role, status
12. **Pagination:** Table com pagination (se >20 users)
13. **Sorting:** Sort table por name, role, status, created_at
14. **User Profile Page:** Click user → Ver detalhes (activity, permissions, audit log)
15. **Invitation Analytics:** Metrics (avg time to activation, bounce rate)

---

### Best practices para compartilhar com Admins

1. **Always have 2+ admins:** Redundancy (single point of failure = risky)
2. **Use corporate emails:** Avoid personal emails (user leaves → email invalid)
3. **Assign least privilege:** Start com Analyst → Promote se necessário (security)
4. **Review users quarterly:** Delete inactive users (ex-funcionários)
5. **Set naming convention:** "First Last" format (consistency)
6. **Document role assignments:** Internamente track why each user has X role
7. **Onboard users properly:** Training sobre role permissions (avoid confusion)
8. **Monitor pending invitations:** Follow up se user não ativou em 48h
9. **Use Developer role sparingly:** Apenas para tech team (API access = sensitive)
10. **Don't share logins:** Each person = own account (audit trail, security)

---

### Security considerations

**MFA requirement:**
- Adding users = high-risk action (can grant access to financial data)
- MFA prevents: Stolen session token → Cannot add rogue users
- MFA ensures: Only legitimate admin (with physical device) can add users

**Role-based access (Admin only):**
- Operators cannot add users (prevents privilege escalation)
- Analysts cannot add users (read-only)
- Developers cannot add users (API-focused, não HR)

**Invitation expiration (7 days):**
- Links não vivem forever (security best practice)
- Forces timely activation (reduces attack window)
- Expired links are single-use (cannot be reused)

**Email verification:**
- User must have access to email (proves identity)
- Email = password reset mechanism (ownership)

**Audit trail:**
- Log who added user, when, what role
- Compliance: Auditors can review user creation history
- Incident response: "Quem deu acesso a esse user suspeito?"

**Rate limiting:**
- Max 10 user creations per hour (prevents spam/abuse)
- Prevents: Compromised admin → Mass user creation

**Password strength:**
- Min 8 chars, must have uppercase, lowercase, number, symbol
- Prevents: Weak passwords ("123456", "password")

---

### Role assignment guide (decision tree)

**Pergunta 1: This person needs to manage team members?**
- **Yes** → Admin
- **No** → Go to Question 2

**Pergunta 2: This person needs to create/approve financial transactions?**
- **Yes** → Operator
- **No** → Go to Question 3

**Pergunta 3: This person is a software developer integrating APIs?**
- **Yes** → Developer
- **No** → Go to Question 4

**Pergunta 4: This person only needs to view data (analytics, reports)?**
- **Yes** → Analyst
- **No** → Re-evaluate needs (maybe não precisa de acesso?)

**Examples:**

| Person | Needs | Recommended Role |
|--------|-------|------------------|
| CEO / Business Owner | Manage everything, add users | **Admin** |
| CFO / Finance Director | Approve withdrawals, manage team | **Admin** |
| Finance Team Member | Process payments, withdrawals daily | **Operator** |
| Customer Support Agent | Respond to disputes, check payment status | **Operator** |
| Accountant | Review financial data for reports | **Analyst** |
| Data Analyst | Export payment data for BI tools | **Analyst** |
| External Auditor | View transactions (read-only) | **Analyst** |
| Software Engineer | Integrate Crossramp API into website | **Developer** |
| DevOps Engineer | Monitor API health, create webhooks | **Developer** |
| QA Engineer | Test payment flows in sandbox | **Developer** |

---

### Compliance notes

**LGPD/GDPR:**
- User data (name, email) é PII (Personally Identifiable Information)
- Merchant é data controller (responsible for user data)
- Crossramp é data processor (stores data on behalf of merchant)
- User must consent (checkbox: "I agree to Terms of Service")
- User can request deletion (via LGPD/GDPR request to Support)

**Audit requirements:**
- Financial institutions require audit trail (who did what, when)
- Add User action = logged com: admin_id, timestamp, new_user_id, role
- Logs preserved for 7 years (compliance retention policy)

**Access control:**
- Only Admin can add users (principle of least privilege)
- Cannot grant higher role than own role (Analyst cannot create Admin)

**Invitation security:**
- Email must be verified (proves user owns email address)
- Links expire (reduces attack window)
- Single-use tokens (cannot be reused)

**Data retention:**
- Active users: Retained indefinitely (while employed)
- Deleted users: Personal data purged after 90 days (LGPD/GDPR)
- Audit logs: Anonymized (user_id → "deleted_user_001") but preserved
