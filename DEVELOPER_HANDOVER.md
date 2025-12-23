# Developer Handover: Crossramp Dashboard Frontend

**Date:** December 17, 2025  
**Frontend Stack:** React + TypeScript + Tailwind CSS v4.0  
**Backend Target:** Go (to be connected)  
**Architecture:** Strict CQRS (Command Query Responsibility Segregation)

---

## Recent Frontend Changes (recap)
- **Translations:** Dashboard/onboarding copy now lives in `src/app/content/strings.ts` and is consumed via `useStrings`. Add new UI copy there first, then read it with `t('your.key')`.
- **Query Registry:** Analytics widgets reference named queries in `src/app/lib/queries.ts` (e.g., `revenue-monthly`, `transactions-24h`). Update endpoints/params in the registry; components pass the query ID into `useChartData`.
- **Command Client:** Write flows should call `postCommand` from `src/app/lib/commandClient.ts` to forward Auth0 token, role, metadata, and MFA code. Provide the command name and payload only.
- **UX Store:** `src/app/store/userPreferences.ts` tracks theme (light/dark), onboarding step statuses, and dismissed banners. Theme sync is handled in Topbar/PreferencesPanel via `setTheme`.
- **Onboarding UI:** `OnboardingWidget` (dashboard) and `SetupProgressBar` (topbar) are driven by the onboarding state in the UX store; they currently simulate completion locally (no backend callbacks yet).
- **Docs:** This handover reflects the above additions.

---

## 1. File Structure

### Root Directory (`/src`)

```
/src
├── /app                          # Main application code
│   ├── App.tsx                   # Root component, navigation router
│   ├── /components               # Reusable components
│   │   ├── /admin                # Protected write-action components
│   │   ├── /analytics            # Chart components (read-only)
│   │   ├── /layout               # Sidebar, Topbar, DashboardLayout, Onboarding
│   │   ├── /settings             # User preferences UI
│   │   ├── /ui                   # Base UI primitives (shadcn/ui style)
│   │   └── /figma                # Figma-specific utilities
│   ├── /contexts                 # React Context providers
│   │   └── AuthContext.tsx       # Authentication state (mock)
│   ├── /hooks                    # Custom React hooks
│   │   ├── useChartData.ts       # CQRS read-model data fetching (query registry aware)
│   │   └── useStrings.ts         # Locale-aware translation helper (EN/PT/ES)
│   ├── /content                  # Translations and copy
│   │   └── strings.ts            # Centralized user-facing copy (EN/PT/ES)
│   ├── /store                    # Zustand state management
│   │   ├── userPreferences.ts    # UX/UI preferences only
│   │   └── README.md             # Store architecture guide
│   ├── /lib                      # Frontend service helpers
│   │   ├── commandClient.ts      # Authenticated command (write) client
│   │   └── queries.ts            # Query registry (named endpoints + params)
│   └── /views                    # Page-level components
│       ├── DashboardView.tsx     # Main dashboard
│       ├── AnalyticsView.tsx     # Analytics page
│       ├── TransactionsView.tsx  # Payments list
│       ├── AccountsView.tsx      # Account balances
│       ├── WithdrawView.tsx      # Withdrawal form
│       ├── WhitelistView.tsx     # Whitelisted wallets
│       ├── TemplatesView.tsx     # Payment templates
│       ├── AddUserView.tsx       # User management
│       └── SettingsView.tsx      # User preferences
└── /styles
    ├── fonts.css                 # Font imports (Manrope, Geist)
    └── theme.css                 # Tailwind v4 theme tokens

```

### Key Directory Purposes

| Directory | Purpose | Backend Integration Point |
|-----------|---------|---------------------------|
| `/views` | Page-level containers | Replace mock data with API calls |
| `/hooks` | Data fetching logic | **Primary API integration layer** |
| `/components/admin` | Write operations (MFA-protected) | Command endpoints (POST/PUT/DELETE) |
| `/components/analytics` | Read-only visualizations | Query endpoints (GET) |
| `/store` | Client-side UX state | No backend sync needed |
| `/contexts` | Cross-cutting concerns | Auth: JWT token management |

---

## 2. State Strategy

### Three-Layer State Architecture

#### Layer 1: **Zustand Store** (UI/UX Preferences Only)
**Location:** `/src/app/store/userPreferences.ts`

**What's stored:**
- Sidebar collapsed state
- Chart and UI theme preferences (includes light/dark + chart palettes)
- Notification settings
- Display format preferences
- Last visited view
- Onboarding progress (four steps) + dismissed banners

**Persistence:** localStorage (`cqrs-dashboard-preferences` key)

**Usage example:**
```tsx
import { useUserPreferences } from '@/store/userPreferences';

function MyComponent() {
  const chartTheme = useUserPreferences(state => state.chartTheme);
  const setChartTheme = useUserPreferences(state => state.setChartTheme);
}
```

**Go Backend:** ❌ No backend sync needed (client-side only)

---

#### Layer 2: **React Context** (Authentication & Session)
**Location:** `/src/app/contexts/AuthContext.tsx`

**What's stored:**
- Current user object (`User { id, name, email, role }`)
- Authentication state
- Login/logout methods
- Access token retrieval

**Current state:** **Auth0 integration with RS256 JWT tokens**

**Auth0 Configuration:**
The application uses Auth0 for authentication, configured via environment variables. The app includes **safe defaults** and will run without a `.env` file for development/testing purposes.

**Mock Authentication Mode (NEW):**
For preview environments or local development without Auth0 credentials:

Set `VITE_ENABLE_MOCK_AUTH=true` in `.env` to bypass Auth0 completely:
```bash
# .env
VITE_ENABLE_MOCK_AUTH=true
```

This provides a mock user:
- **Name:** Preview User
- **Email:** preview.user@example.com
- **Role:** admin
- **Access Token:** `mock-access-token`

**Production Setup (Auth0):**

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure Auth0 credentials in `.env`:**
   ```bash
   VITE_ENABLE_MOCK_AUTH=false
   VITE_AUTH0_DOMAIN=your-tenant.auth0.com
   VITE_AUTH0_CLIENT_ID=your_client_id
   VITE_AUTH0_AUDIENCE=https://your-api-identifier
   VITE_API_BASE_URL=http://localhost:8080
   ```

3. **Restart dev server** after updating `.env` for changes to take effect.

**Default Behavior (Without `.env`):**
- App runs with demo credentials (`demo.auth0.com`, `demo-client-id`)
- Auth0 login will not work until real credentials are configured
- All other features work normally for frontend development

**Production Setup:**
The `/src/app/App.tsx` file contains the Auth0Provider configuration with optional chaining:
```tsx
const auth0Config = {
  domain: import.meta.env?.VITE_AUTH0_DOMAIN || 'demo.auth0.com',
  clientId: import.meta.env?.VITE_AUTH0_CLIENT_ID || 'demo-client-id',
  audience: import.meta.env?.VITE_AUTH0_AUDIENCE,
};
```

**Token Flow:**
1. User clicks login → redirects to Auth0 Universal Login
2. Auth0 authenticates → redirects back with authorization code
3. `@auth0/auth0-react` exchanges code for RS256 JWT access token
4. Access token stored in memory by Auth0 SDK
5. Use `getAccessToken()` to retrieve token for API calls

**Go Backend Integration:**
Your Go backend should:
1. Verify RS256 JWT signatures using Auth0's public key (JWKS endpoint: `https://{your-domain}/.well-known/jwks.json`)
2. Validate `aud` claim matches your API identifier
3. Extract user claims (`sub`, `email`, custom claims like `https://crossramp.app/role`)

**Access Token for API Calls:**
```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { getAccessToken } = useAuth();
  
  const fetchData = async () => {
    const token = await getAccessToken();
    const response = await fetch('/api/endpoint', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  };
}
```

**User Object Mapping:**
Auth0 user is automatically mapped to the application's User interface:
- `id` ← `sub` claim (Auth0 user ID)
- `name` ← `name` or `email` claim
- `email` ← `email` claim
- `role` ← Custom claim `https://crossramp.app/role` (admin/user)

**Note:** Custom claims must be added via Auth0 Actions/Rules to include `role` in the token.

---

#### Layer 3: **Server State** (CQRS Read Models)
**Location:** `/src/app/hooks/useChartData.ts`

**What's fetched:**
- Chart data (revenue, transactions, user activity)
- Account balances
- Transaction lists
- Templates
- Whitelist entries

**Current state:** All hardcoded in hook

**Go Backend Connection Point:**
```tsx
// CURRENT MOCK:
if (dataSource === 'mock') {
  await new Promise(resolve => setTimeout(resolve, 500));
  const mockData = generateMockData(chartId);
  setData(mockData);
}

// REPLACE WITH:
const response = await fetch(`/api/analytics/${chartId}`, {
  headers: { 
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
});
const data = await response.json();
setData(data);
```

---

## 3. Data Fetching Architecture

### Current Implementation: 100% Frontend Mock

**No API calls exist yet.** All data is generated client-side.

### Designed Integration Points

#### Primary Hook: `useChartData`
**Location:** `/src/app/hooks/useChartData.ts`

**Purpose:** Centralized data fetching for all read operations

**Usage in components:**
```tsx
// In RevenueChart.tsx
const { data, isLoading, error } = useChartData('revenue-monthly');

// In TransactionChart.tsx  
const { data } = useChartData('transactions-24h');
```

**To connect to Go backend:**

1. **Set environment variable:**
   ```bash
   VITE_API_BASE_URL=http://localhost:8080
   ```

2. **Replace mock logic in `useChartData.ts`:**
```tsx
const fetchData = async () => {
  setIsLoading(true);
  try {
    const def = getQueryDefinition(queryId); // from /lib/queries
    const response = await fetch(
      `${import.meta.env.VITE_READ_API_URL}/${def.endpoint}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
       
       if (!response.ok) throw new Error('API Error');
       
       const data = await response.json();
       setData(data);
     } catch (err) {
       setError(err as Error);
     } finally {
       setIsLoading(false);
     }
   };
   ```

---

### Write Operations (Commands)

**Location:** Components in `/src/app/components/admin/`

**Current state:** All mock operations with `toast` notifications

**Components with write operations:**
1. `WithdrawalRequestForm.tsx` - Submit withdrawal
2. `WhitelistForm.tsx` - Add wallet to whitelist
3. `AddUserForm.tsx` - Create new user
4. `ProtectedActionForm.tsx` - Generic MFA-protected form wrapper
5. `lib/commandClient.ts` - Shared helper for authenticated, context-rich command posts (forwards Auth0 token, role, metadata, MFA code)

**Example: Withdrawal Form**
```tsx
// CURRENT MOCK (WithdrawalRequestForm.tsx):
const handleSubmit = () => {
  toast.success('Withdrawal request submitted');
};

// REPLACE WITH:
const handleSubmit = async (formData) => {
  const response = await fetch('/api/commands/withdraw', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accountId: formData.account,
      amount: formData.amount,
      walletAddress: formData.wallet,
      mfaCode: formData.mfaCode  // From MFA modal
    })
  });
  
  if (response.ok) {
    toast.success('Withdrawal request submitted');
  } else {
    toast.error('Withdrawal failed');
  }
};
```

---

### Recommended Go API Structure (CQRS Pattern)

```
# READ ENDPOINTS (Queries)
GET  /api/analytics/revenue          → Chart data for revenue
GET  /api/analytics/users            → User activity chart
GET  /api/analytics/transactions     → Transaction volume chart
GET  /api/accounts                   → List all accounts
GET  /api/accounts/:id               → Single account details
GET  /api/payments                   → Transaction list (paginated)
GET  /api/payments/:id               → Single payment details
GET  /api/templates                  → Payment templates list
GET  /api/whitelist                  → Whitelisted wallets

# WRITE ENDPOINTS (Commands)
POST   /api/commands/withdraw        → Submit withdrawal
POST   /api/commands/whitelist/add   → Add whitelisted wallet
DELETE /api/commands/whitelist/:id   → Remove wallet
POST   /api/commands/template        → Create template
PUT    /api/commands/template/:id    → Update template
DELETE /api/commands/template/:id    → Delete template
POST   /api/commands/user            → Create user
```

---

## 4. Hardcoded vs. Dynamic Data

### Mock Data Locations

| Feature | Location | Data Type | Lines |
|---------|----------|-----------|-------|
| **Charts (Revenue, Users, Transactions)** | `/src/app/hooks/useChartData.ts` | Function: `generateMockData()` | 64-105 |
| **Dashboard Recent Transactions** | `/src/app/views/DashboardView.tsx` | Const: `recentTransactions` | 8-30 |
| **Transactions Page (Full List)** | `/src/app/views/TransactionsView.tsx` | Const: `mockTransactions` | 8-240 |
| **Accounts (Balances & Networks)** | `/src/app/views/AccountsView.tsx` | Const: `accountsData` | 42-176 |
| **Templates List** | `/src/app/views/TemplatesView.tsx` | State: `useState<Template[]>([...])` | 41-60 |
| **Whitelisted Wallets** | `/src/app/views/WhitelistView.tsx` | Const: `mockWhitelistedAddresses` | 6-35 |
| **User Management** | `/src/app/views/AddUserView.tsx` | Const: `mockUsers` | 7-11 |
| **Setup Progress** | `/src/app/components/layout/SetupProgressBar.tsx` | Const: `setupSteps` | Component file |

---

### Data Replacement Strategy

#### Step 1: Replace Chart Data Hook
**File:** `/src/app/hooks/useChartData.ts`

**Action:** Remove `generateMockData()` function, replace with actual API calls

**Expected Go response format:**
```json
// GET /api/analytics/revenue
[
  { "name": "Jan", "revenue": 4000, "expenses": 2400 },
  { "name": "Feb", "revenue": 3000, "expenses": 1398 }
]

// GET /api/analytics/users
[
  { "name": "Mon", "active": 120, "inactive": 40 },
  { "name": "Tue", "active": 150, "inactive": 30 }
]

// GET /api/analytics/transactions
[
  { "name": "00:00", "value": 45 },
  { "name": "04:00", "value": 23 }
]
```

---

#### Step 2: Replace Transaction Lists
**File:** `/src/app/views/TransactionsView.tsx`

**Current:** `const mockTransactions = [...]` (line 8)

**Replace with:**
```tsx
const [transactions, setTransactions] = useState([]);

useEffect(() => {
  fetch('/api/payments')
    .then(res => res.json())
    .then(setTransactions);
}, []);
```

**Expected Go response format:**
```json
{
  "transactions": [
    {
      "id": "pay_abc123",
      "date": "2025-12-17T14:32:00Z",
      "amount": "R$ 1.450,00",
      "status": "completed",
      "type": "pix_in",
      "description": "Payment from merchant #3421"
    }
  ],
  "pagination": {
    "total": 342,
    "page": 1,
    "perPage": 50
  }
}
```

---

#### Step 3: Replace Accounts Data
**File:** `/src/app/views/AccountsView.tsx`

**Current:** `const accountsData: CurrencyGroup[] = [...]` (line 42)

**Replace with:**
```tsx
const [accountsData, setAccountsData] = useState<CurrencyGroup[]>([]);

useEffect(() => {
  fetch('/api/accounts')
    .then(res => res.json())
    .then(setAccountsData);
}, []);
```

**Expected Go response format:**
```json
[
  {
    "currency": "USDT",
    "accounts": [
      {
        "id": "usdt-trx",
        "network": "TRX",
        "internalCode": "ACC-USDT-TRX-001",
        "balances": {
          "available": "12480.90",
          "locked": "1200.00",
          "toReceive": "450.50",
          "blocked": "0.00"
        },
        "transactions": [
          {
            "id": "tx1",
            "date": "2025-12-17T14:32:00Z",
            "description": "Payment received",
            "credit": "1450.00",
            "resultingBalance": "12480.90"
          }
        ]
      }
    ]
  }
]
```

---

#### Step 4: Replace Templates
**File:** `/src/app/views/TemplatesView.tsx`

**Current:** `useState<Template[]>([...])` with hardcoded data (line 41)

**Replace with:**
```tsx
const [templates, setTemplates] = useState<Template[]>([]);

useEffect(() => {
  fetch('/api/templates')
    .then(res => res.json())
    .then(setTemplates);
}, []);
```

---

#### Step 5: Replace Whitelist
**File:** `/src/app/views/WhitelistView.tsx`

**Current:** `const mockWhitelistedAddresses = [...]` (line 6)

**Replace with:** Same pattern as above

---

### Components That Are Pure UI (No Backend Needed)

✅ **These stay as-is:**
- `/src/app/store/userPreferences.ts` - Client-side only
- `/src/app/components/layout/Sidebar.tsx` - Pure UI (now uses translation keys)
- `/src/app/components/layout/Topbar.tsx` - Pure UI (persists theme preference)
- `/src/app/components/ui/*` - Primitive components
- `/src/app/components/settings/PreferencesPanel.tsx` - Zustand-backed
- `/src/app/components/layout/OnboardingWidget.tsx` - Local onboarding UX only (simulated completion)

---

## 5. Authentication Flow (To Implement)

### Current State
- Mock user always logged in
- No token management
- No protected routes

### Recommended Go Integration

```tsx
// 1. Add JWT interceptor
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
  
  if (response.status === 401) {
    // Token expired
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
  
  return response;
};

// 2. Update AuthContext
const login = async (email: string, password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const { user, token } = await res.json();
  localStorage.setItem('authToken', token);
  setUser(user);
};

// 3. Auto-login on page load
useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (token) {
    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setUser)
      .catch(() => localStorage.removeItem('authToken'));
  }
}, []);
```

---

## 6. MFA Implementation (Protected Actions)

### Current State
- `MFAModal` component exists
- Shows 6-digit code input
- Currently just validates format, doesn't verify code

### Go Backend Integration

**Component:** `/src/app/components/admin/MFAModal.tsx`

**To implement:**
```tsx
const handleVerify = async () => {
  const response = await fetch('/api/auth/verify-mfa', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      code: mfaCode,
      action: 'withdraw' // or 'whitelist_add', etc.
    })
  });
  
  if (response.ok) {
    onVerified(mfaCode);
  } else {
    toast.error('Invalid MFA code');
  }
};
```

**Expected Go endpoints:**
```
POST /api/auth/mfa/generate  → Send code via SMS/Email
POST /api/auth/mfa/verify    → Validate code
```

---

## 7. Critical Design Patterns

### CQRS Separation
```
┌────────────────────────────────────┐
│         READ SIDE (Queries)         │
│  useChartData → GET /api/analytics  │
│  Fast, cached, eventually consistent│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│        WRITE SIDE (Commands)        │
│  Forms → POST /api/commands/*       │
│  MFA-protected, immediate validation│
└─────────────────────────────────────┘
```

**Key principle:** Charts/tables don't write. Forms don't display aggregated data.

---

### Progressive Disclosure
- Simple users see basic UI
- Advanced features hidden behind toggles
- "Lock" icons on all write buttons (`<Lock />` from lucide-react)

---

### Mobile-First
- All views responsive
- Mobile: Bottom nav button opens sidebar sheet
- Desktop: Persistent sidebar
- Padding: `px-4 md:px-6` applied at layout level

---

## 8. Setup for Go Backend Developer

### Immediate Tasks
1. **Set up CORS:** Allow `http://localhost:5173` (Vite dev server)
2. **Implement authentication:**
   - `POST /api/auth/login` → JWT
   - `GET /api/auth/me` → User object
3. **Create first read endpoint:**
   - `GET /api/analytics/revenue` → Chart data
4. **Test integration:**
   - Modify `useChartData.ts` line 36 to call your endpoint
   - Verify chart renders

### Environment Variables (.env)
```bash
VITE_API_BASE_URL=http://localhost:8080
```

### Expected Response Times
- GET requests: <200ms (cached read models)
- POST commands: <500ms (write + async event)

---

## 9. Known Gaps (To Be Implemented)

| Feature | Status | Backend Requirement |
|---------|--------|---------------------|
| Real-time sync status | ⚠️ Mock interval | WebSocket or polling endpoint |
| Pagination | ❌ Not implemented | Query params: `?page=1&limit=50` |
| Search/filtering | ⚠️ Client-side only | Backend filtering recommended |
| File uploads | ❌ Not needed yet | Future: logo/document upload |
| Notifications | ⚠️ UI exists, no backend | Push notifications or polling |
| Audit logs | ❌ Not implemented | `GET /api/audit` |

---

## 10. Testing Checklist for Go Integration

- [ ] Login flow with real JWT
- [ ] Token refresh/expiration handling
- [ ] Revenue chart displays real data
- [ ] Transaction list pagination works
- [ ] Account balances update on fetch
- [ ] Withdrawal form submits to backend
- [ ] MFA verification calls API
- [ ] Command client forwards Auth0 token + metadata to write endpoints
- [ ] Onboarding widget updated based on backend callbacks (if/when wired)
- [ ] Error handling (401, 500, network errors)
- [ ] CORS headers configured
- [ ] Mobile responsiveness maintained

---

## Contact & Questions

**Key Files to Read First:**
1. `/src/app/hooks/useChartData.ts` - Data fetching pattern
2. `/src/app/store/README.md` - State architecture guide
3. `/src/app/contexts/AuthContext.tsx` - Auth implementation
4. `/src/app/App.tsx` - Application structure

**Design Philosophy:**
- Wabi-sabi aesthetic (warm colors, soft shadows)
- CQRS strict separation
- Progressive disclosure
- Mobile-first, desktop-enhanced

---

**Last Updated:** December 17, 2025  
**Version:** 1.1  
**Frontend Ready For Integration:** ✅ Yes (queries/commands now centralized; onboarding widget still local mock)