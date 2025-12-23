# Frontend-First API Development Approach

**Document Version:** 1.0  
**Last Updated:** December 23, 2024  
**Architecture:** CQRS with Bastion Service

---

## Philosophy

At Crossramp, we follow a **frontend-first API contract development directive**. This means:

1. **Frontend defines the API structure** based on UX requirements
2. **Bastion service adapts backend responses** to match frontend expectations
3. **Minimal engineering friction** through clear contracts and mock-first development

This approach enables **parallel development** where frontend and backend teams can work independently while maintaining a clear integration point.

---

## Architecture Overview

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Frontend  │────────▶│ Bastion Service │────────▶│   Backend    │
│  (React)    │  HTTP   │  (Adapter)      │  gRPC/  │  (Services)  │
│             │◀────────│                 │◀────────│              │
└─────────────┘  JSON   └─────────────────┘  Proto  └──────────────┘
```

**Key Points:**
- **Frontend → Bastion:** REST API with JSON (frontend-defined contracts)
- **Bastion → Backend:** Protocol-agnostic (gRPC, REST, GraphQL - backend's choice)
- **Bastion's Role:** Transform backend responses into frontend-expected format

---

## Development Workflow

### Phase 1: Frontend Development (Independent)

1. **Define UX Requirements**
   - Product team defines user stories
   - Designer creates mockups
   - Frontend team builds React components

2. **Create API Contracts**
   - Frontend defines exact JSON structure needed
   - Document in `/docs/API_CONTRACT_*.md` files
   - Include TypeScript interfaces from queries.ts

3. **Implement Mock Queries**
   - Build mock data generators in `/src/app/lib/queries.ts`
   - Simulate realistic network delays (200-300ms)
   - Test all UI states (loading, success, error, empty)

4. **Deliver Production-Ready Frontend**
   - UI is fully functional with mock data
   - All edge cases handled
   - Ready for backend integration

**Status Example:**
```typescript
// queries.ts - Frontend defines the contract
export interface AvailableBalance {
  amount: number;
  currency: string;
  settles_in: string;
  updated_at: string; // ISO timestamp
}

// Mock implementation
const generateMockBalance = (): AvailableBalance => ({
  amount: 12480.90,
  currency: 'BRL',
  settles_in: 'USDT',
  updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
});

export async function queryAvailableBalance(
  options?: QueryOptions
): Promise<AvailableBalance> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return generateMockBalance();
  }

  // Real API call matches exact same structure
  const response = await fetch(`${getAPIBaseURL()}/balance/available`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch available balance: ${response.statusText}`);
  }

  return response.json(); // Must match AvailableBalance interface
}
```

### Phase 2: Backend Development (Parallel)

1. **Review API Contract Documents**
   - Read `/docs/API_CONTRACT_*.md` for endpoints
   - Understand expected request/response formats
   - Clarify any questions with frontend team

2. **Implement Bastion Adapters**
   - Create endpoint handlers in Bastion service
   - Fetch data from backend microservices
   - **Transform responses to match frontend contract**

3. **Test Against Frontend Expectations**
   - Use contract test examples in documentation
   - Verify response structure matches TypeScript interfaces
   - Test all error scenarios

**Bastion Example (Node.js):**
```javascript
// bastion/routes/balance.js
app.get('/api/balance/available', async (req, res) => {
  try {
    // 1. Authenticate user from JWT token
    const user = await authenticateRequest(req);
    
    // 2. Fetch data from backend service (your choice of protocol)
    const backendData = await backendClient.getAccountBalance({
      userId: user.id,
      companyId: user.companyId,
    });
    
    // 3. Transform to frontend-expected format
    const frontendResponse = {
      amount: parseFloat(backendData.available_balance),
      currency: backendData.currency_code,
      settles_in: backendData.settlement_currency,
      updated_at: backendData.last_updated_timestamp, // Must be ISO 8601
    };
    
    // 4. Return exact structure frontend expects
    res.json(frontendResponse);
    
  } catch (error) {
    // Frontend expects this error format
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch balance',
    });
  }
});
```

### Phase 3: Integration (Seamless)

1. **Frontend Configuration**
   - Update `/public/config.js` to disable mock mode
   - Point to Bastion service URL
   - No code changes needed in React components

2. **Testing**
   - Frontend team tests with real backend data
   - Verify all UI states work with real responses
   - Test error scenarios

3. **Deployment**
   - Frontend deploys first (with mock mode active)
   - Backend deploys Bastion adapters
   - Frontend config updated to use real API

---

## Benefits of This Approach

### ✅ For Frontend Team

- **No backend blockers:** Can complete UI before backend is ready
- **Realistic testing:** Mock data simulates production behavior
- **Clear contracts:** TypeScript interfaces are source of truth
- **Parallel development:** No waiting for backend APIs

### ✅ For Backend Team

- **Clear requirements:** API contracts define exact structure needed
- **Flexible implementation:** Choose any backend tech/protocol
- **Focused scope:** Bastion layer handles transformation
- **No frontend changes:** Backend changes don't break frontend if contract maintained

### ✅ For Product Team

- **Faster iteration:** Frontend UX can be tested/refined early
- **Better demos:** Working UI with realistic data before backend done
- **Predictable delivery:** Frontend and backend progress independently
- **Reduced risk:** Integration issues caught early via contract tests

---

## Configuration Management

### Mock Mode Toggle

Frontend queries check runtime config to enable/disable mocks:

```javascript
// /src/app/lib/queries.ts
const isMockMode = () => isMockQueriesEnabled(); // From /public/config.js

export async function queryAvailableBalance(options?: QueryOptions) {
  if (isMockMode()) {
    // Return mock data
    await new Promise(resolve => setTimeout(resolve, 250));
    return generateMockBalance();
  }

  // Call real API (contract-defined endpoint)
  const response = await fetch(`${getAPIBaseURL()}/balance/available`, { ... });
  return response.json();
}
```

### Runtime Configuration

```javascript
// /public/config.js - No rebuild needed!
window.__CROSSRAMP_CONFIG__ = {
  MOCK_QUERIES_ENABLED: true,  // Set to false in production
  API_BASE_URL: 'https://api.crossramp.io',
  ENVIRONMENT: 'development', // 'staging', 'production'
};
```

**Deployment Workflow:**
1. **Development:** `MOCK_QUERIES_ENABLED: true` (local testing)
2. **Staging:** `MOCK_QUERIES_ENABLED: false` (test with real Bastion)
3. **Production:** `MOCK_QUERIES_ENABLED: false` (real backend)

---

## Contract Testing

### Frontend Validation

All query functions include TypeScript interfaces that serve as contracts:

```typescript
// ✅ Contract is the TypeScript interface
export interface AvailableBalance {
  amount: number;        // Required
  currency: string;      // Required
  settles_in: string;    // Required
  updated_at: string;    // Required - ISO 8601 format
}

// ✅ Function signature enforces contract
export async function queryAvailableBalance(
  options?: QueryOptions
): Promise<AvailableBalance> {
  // ...
}
```

### Backend Validation

Bastion service should validate responses against frontend contract:

```javascript
// Example validation in Bastion
function validateBalanceResponse(data) {
  if (typeof data.amount !== 'number') {
    throw new Error('Contract violation: amount must be number');
  }
  if (typeof data.currency !== 'string') {
    throw new Error('Contract violation: currency must be string');
  }
  // ... validate all required fields
  return data;
}
```

### Contract Test Suite (Recommended)

```javascript
// bastion/tests/contract.test.js
describe('Balance API Contract', () => {
  it('should return exact structure frontend expects', async () => {
    const response = await request(app).get('/api/balance/available');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('amount');
    expect(typeof response.body.amount).toBe('number');
    expect(response.body).toHaveProperty('currency');
    expect(response.body).toHaveProperty('settles_in');
    expect(response.body).toHaveProperty('updated_at');
    expect(response.body.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
  });
});
```

---

## API Contract Documentation Standards

Each feature should have:

1. **API Contract Document** (`/docs/API_CONTRACT_*.md`)
   - All endpoints with exact request/response formats
   - Error response formats
   - Business logic requirements
   - Testing examples

2. **Feature Overview** (`/docs/FEATURE_OVERVIEW.md`)
   - User stories
   - UX notes
   - Implementation status
   - Role access rules

3. **TypeScript Interfaces** (`/src/app/lib/queries.ts`)
   - Source of truth for data structures
   - Used by both mock and real implementations

---

## Example: Dashboard Implementation

### 1. Frontend Defined Contract

```typescript
// /src/app/lib/queries.ts
export interface TodaySnapshot {
  payments_received: { amount: number; currency: string; };
  payments_pending: { amount: number; currency: string; };
  fees: { amount: number; currency: string; };
  date: string; // YYYY-MM-DD
}

export async function queryDashboardToday(
  options?: QueryOptions
): Promise<TodaySnapshot> {
  if (isMockMode()) {
    return {
      payments_received: { amount: 3240.00, currency: 'BRL' },
      payments_pending: { amount: 580.00, currency: 'BRL' },
      fees: { amount: 42.15, currency: 'BRL' },
      date: new Date().toISOString().split('T')[0],
    };
  }

  const response = await fetch(`${getAPIBaseURL()}/dashboard/today`, { ... });
  return response.json(); // Must match TodaySnapshot
}
```

### 2. Documentation Published

```markdown
<!-- /docs/API_CONTRACT_DASHBOARD.md -->
## Get Today's Snapshot

**Endpoint:** `GET /api/dashboard/today`

### Response (200 OK)
{
  "payments_received": { "amount": 3240.00, "currency": "BRL" },
  "payments_pending": { "amount": 580.00, "currency": "BRL" },
  "fees": { "amount": 42.15, "currency": "BRL" },
  "date": "2024-12-23"
}
```

### 3. Backend Implements Adapter

```javascript
// bastion/routes/dashboard.js
app.get('/api/dashboard/today', async (req, res) => {
  const timezone = req.query.timezone || 'UTC';
  
  // Fetch from backend (your implementation)
  const data = await backendService.getTodayStats(user.id, timezone);
  
  // Transform to frontend contract
  res.json({
    payments_received: {
      amount: parseFloat(data.total_received),
      currency: data.currency,
    },
    payments_pending: {
      amount: parseFloat(data.total_pending),
      currency: data.currency,
    },
    fees: {
      amount: parseFloat(data.total_fees),
      currency: data.currency,
    },
    date: data.calculation_date, // Must be YYYY-MM-DD
  });
});
```

### 4. Zero Code Changes in Frontend

Frontend code works identically with mock or real data:

```typescript
// /src/app/views/DashboardView.tsx
const { data: todaySnapshot, loading, error } = useQuery<TodaySnapshot>(
  queryDashboardToday,
  undefined,
  { refetchInterval: 60000 }
);

// UI renders the same regardless of data source
{todaySnapshot && (
  <span>{formatCurrency(todaySnapshot.payments_received.amount)}</span>
)}
```

---

## Best Practices

### ✅ DO

- **Define clear TypeScript interfaces** for all API responses
- **Document contracts before implementation** in `/docs/API_CONTRACT_*.md`
- **Use realistic mock data** that matches production scenarios
- **Simulate network delays** in mocks (200-300ms)
- **Test all UI states** (loading, error, empty, success)
- **Version API contracts** when making breaking changes
- **Keep Bastion layer thin** - only transformation, no business logic

### ❌ DON'T

- **Don't change frontend code** when switching from mock to real API
- **Don't put business logic in Bastion** - it's only an adapter
- **Don't skip error state testing** - errors happen in production
- **Don't use fake/lorem ipsum data** - use realistic merchant scenarios
- **Don't tightly couple frontend to backend** - contracts are the interface
- **Don't break contracts without versioning** - frontend depends on structure

---

## Troubleshooting

### Issue: Backend returns different structure than contract

**Symptom:** Frontend shows errors or missing data after switching from mock to real API

**Solution:**
1. Compare backend response to TypeScript interface in queries.ts
2. Update Bastion adapter to transform response to match contract
3. If contract needs to change, version it and update frontend

**Example:**
```javascript
// Backend returns: { balance: "12480.90", curr: "BRL" }
// Contract expects: { amount: 12480.90, currency: "BRL" }

// Fix in Bastion:
const frontendResponse = {
  amount: parseFloat(backendData.balance),  // Transform
  currency: backendData.curr,               // Rename
  settles_in: backendData.settlement_curr,
  updated_at: new Date().toISOString(),
};
```

### Issue: Frontend still showing mock data in production

**Symptom:** Production shows hardcoded mock values

**Solution:**
1. Check `/public/config.js` has `MOCK_QUERIES_ENABLED: false`
2. Verify build/deploy didn't overwrite config
3. Clear browser cache and hard refresh

### Issue: Contract needs to change after frontend is complete

**Symptom:** Product team requests different data structure

**Solution:**
1. Update TypeScript interface in queries.ts
2. Update mock data generator
3. Update API contract documentation
4. Notify backend team of contract change
5. Version the API if breaking change (e.g., `/api/v2/balance/available`)

---

## Summary

**Frontend-first approach = Speed + Flexibility + Quality**

- Frontend can deliver UX before backend is ready
- Backend has clear requirements via contracts
- Bastion service handles impedance mismatch
- Both teams work in parallel without blockers
- Production integration is seamless

**Key Artifacts:**
- `/src/app/lib/queries.ts` - TypeScript contracts + mock implementations
- `/docs/API_CONTRACT_*.md` - Detailed endpoint specifications
- `/docs/FEATURE_OVERVIEW.md` - Product requirements + status
- `/public/config.js` - Runtime configuration (mock mode toggle)

**Next Steps for Backend Team:**
1. Review `/docs/API_CONTRACT_DASHBOARD.md`
2. Implement Bastion adapters for each endpoint
3. Test responses match TypeScript interfaces
4. Deploy and notify frontend team

---

**Questions?** Contact the frontend team in #crossramp-frontend on Slack.
