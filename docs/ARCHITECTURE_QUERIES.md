# Query Architecture - Data Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CROSSRAMP DASHBOARD                          │
│                     React + TypeScript                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │
                    ┌───────────▼───────────┐
                    │   Environment Mode    │
                    │  VITE_ENABLE_MOCK_    │
                    │    QUERIES=?          │
                    └───────────┬───────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
         ┌──────▼──────┐               ┌───────▼────────┐
         │  MOCK MODE  │               │   REAL MODE    │
         │  (true)     │               │   (false)      │
         └──────┬──────┘               └───────┬────────┘
                │                               │
    ┌───────────▼────────────┐      ┌──────────▼──────────┐
    │  Mock Data Generators  │      │  HTTP Fetch to API  │
    │  (queries.ts)          │      │  (queries.ts)       │
    └───────────┬────────────┘      └──────────┬──────────┘
                │                               │
                │                               │
                └───────────────┬───────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   useQuery Hook       │
                    │  (React Component)    │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   UI Renders          │
                    │   - Loading State     │
                    │   - Error State       │
                    │   - Data Display      │
                    └───────────────────────┘
```

---

## Data Flow Diagram

### Mock Mode (Development)

```
┌──────────────┐
│ TemplatesView│
│  Component   │
└──────┬───────┘
       │
       │ const { data, loading } = useQuery(queryTemplates)
       │
       ▼
┌──────────────────────────────────────────────┐
│ useQuery Hook (/src/app/hooks/useQuery.ts)  │
│                                              │
│  1. Checks VITE_ENABLE_MOCK_QUERIES = true  │
│  2. Calls queryTemplates()                   │
│  3. Sets loading = true                      │
│  4. Waits for response                       │
│  5. Sets data = result                       │
│  6. Sets loading = false                     │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ queryTemplates (/src/app/lib/queries.ts)    │
│                                              │
│  if (MOCK_MODE) {                            │
│    await delay(200ms)  // Simulate network   │
│    return generateMockTemplates()            │
│  }                                           │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ generateMockTemplates()                      │
│                                              │
│  return [                                    │
│    {                                         │
│      id: '1',                                │
│      name: 'Standard Checkout',              │
│      currency_code: 'BRL',                   │
│      ...                                     │
│    }                                         │
│  ]                                           │
└──────┬───────────────────────────────────────┘
       │
       │ Returns mock data array
       │
       ▼
┌──────────────────────────────────────────────┐
│ useQuery Hook                                │
│                                              │
│  data = mock templates                       │
│  loading = false                             │
│  error = null                                │
└──────┬───────────────────────────────────────┘
       │
       │ Returns { data, loading, error }
       │
       ▼
┌──────────────────────────────────────────────┐
│ TemplatesView Component                      │
│                                              │
│  templates.map(template => (                 │
│    <TemplateCard {...template} />            │
│  ))                                          │
└──────────────────────────────────────────────┘
```

---

### Real Mode (Production)

```
┌──────────────┐
│ TemplatesView│
│  Component   │
└──────┬───────┘
       │
       │ const { data, loading } = useQuery(queryTemplates)
       │
       ▼
┌──────────────────────────────────────────────┐
│ useQuery Hook (/src/app/hooks/useQuery.ts)  │
│                                              │
│  1. Gets Auth0 JWT token                     │
│  2. Calls queryTemplates({ headers })        │
│  3. Sets loading = true                      │
│  4. Waits for API response                   │
│  5. Sets data = result                       │
│  6. Sets loading = false                     │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ queryTemplates (/src/app/lib/queries.ts)    │
│                                              │
│  if (!MOCK_MODE) {                           │
│    const response = await fetch(             │
│      'https://api.crossramp.io/v1/templates',│
│      {                                       │
│        headers: {                            │
│          'Authorization': 'Bearer {token}'   │
│        }                                     │
│      }                                       │
│    )                                         │
│    return response.json()                    │
│  }                                           │
└──────┬───────────────────────────────────────┘
       │
       │ HTTP Request
       │
       ▼
┌──────────────────────────────────────────────┐
│ Crossramp Backend API                        │
│ https://api.crossramp.io/v1/templates        │
│                                              │
│  1. Validates JWT token                      │
│  2. Checks user permissions                  │
│  3. Queries database (read-model)            │
│  4. Returns JSON response                    │
└──────┬───────────────────────────────────────┘
       │
       │ JSON Response
       │
       ▼
┌──────────────────────────────────────────────┐
│ queryTemplates()                             │
│                                              │
│  Receives API response                       │
│  Validates TypeScript types                  │
│  Returns Template[]                          │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ useQuery Hook                                │
│                                              │
│  data = API templates                        │
│  loading = false                             │
│  error = null                                │
└──────┬───────────────────────────────────────┘
       │
       │ Returns { data, loading, error }
       │
       ▼
┌──────────────────────────────────────────────┐
│ TemplatesView Component                      │
│                                              │
│  templates.map(template => (                 │
│    <TemplateCard {...template} />            │
│  ))                                          │
└──────────────────────────────────────────────┘
```

---

## Component Integration Pattern

### Example: TemplatesView

```typescript
// 1. Import query function and hook
import { useQuery } from '../hooks/useQuery';
import { queryTemplates } from '../lib/queries';

export function TemplatesView() {
  // 2. Use the query hook
  const { data, loading, error, refetch } = useQuery(queryTemplates);

  // 3. Handle loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // 4. Handle error state
  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  // 5. Handle empty state
  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  // 6. Render data
  return (
    <div>
      {data.map(template => (
        <TemplateCard key={template.id} {...template} />
      ))}
    </div>
  );
}
```

---

## CQRS Architecture Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│  ┌────────────────────┐              ┌────────────────────┐     │
│  │   READ (Queries)   │              │  WRITE (Commands)  │     │
│  │                    │              │                    │     │
│  │  queryTemplates()  │              │  createTemplate()  │     │
│  │  queryAccounts()   │              │  deleteTemplate()  │     │
│  │  queryTransactions│              │  createWithdrawal()│     │
│  │       ...          │              │       ...          │     │
│  │                    │              │                    │     │
│  │  /lib/queries.ts   │              │ /lib/commands.ts   │     │
│  └────────┬───────────┘              └────────┬───────────┘     │
│           │                                   │                 │
└───────────┼───────────────────────────────────┼─────────────────┘
            │                                   │
            │ GET                               │ POST/PUT/DELETE
            │                                   │
            ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (API)                               │
│                                                                  │
│  ┌────────────────────┐              ┌────────────────────┐     │
│  │   Read Model       │              │  Write Model       │     │
│  │   (Optimized DB)   │              │  (Event Store)     │     │
│  │                    │              │                    │     │
│  │  GET /templates    │◄─────Event───│ POST /templates    │     │
│  │  GET /accounts     │   Sync       │ DELETE /templates  │     │
│  │  GET /transactions │              │ POST /withdrawals  │     │
│  │                    │              │                    │     │
│  │  Fast reads        │              │  Consistent writes │     │
│  └────────────────────┘              └────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- **Queries (GET)** → Read from optimized read-model database
- **Commands (POST/PUT/DELETE)** → Write to event store
- **Event Sync** → Updates read-model asynchronously
- **Frontend** → Calls refetch() after commands to get latest data

---

## Authentication Flow

```
┌──────────────┐
│    User      │
│  Opens App   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  AuthContext     │
│  (Auth0)         │
│                  │
│  getAccessToken()│
└──────┬───────────┘
       │
       │ Returns JWT token
       │
       ▼
┌──────────────────────────────────────┐
│  useQuery Hook                       │
│                                      │
│  const token = await getAccessToken()│
│  headers['Authorization'] = token    │
└──────┬───────────────────────────────┘
       │
       │ HTTP Request with Auth header
       │
       ▼
┌──────────────────────────────────────┐
│  Backend API                         │
│                                      │
│  1. Validates JWT signature          │
│  2. Extracts user claims             │
│  3. Checks permissions                │
│  4. Returns data if authorized       │
└──────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌──────────────┐
│  Component   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  useQuery Hook   │
│  try {           │
│    await query() │
│  } catch (err) { │
│    setError(err) │
│  }               │
└──────┬───────────┘
       │
       │ error = Error object
       │
       ▼
┌──────────────────────────────────────┐
│  Component                           │
│                                      │
│  if (error) {                        │
│    return <ErrorUI />                │
│  }                                   │
│                                      │
│  Shows:                              │
│  - Error message                     │
│  - "Retry" button                    │
│  - Optional error details            │
└──────────────────────────────────────┘
```

---

## Refetch Mechanism

```
User Action (Create/Update/Delete)
         │
         ▼
┌──────────────────────────┐
│  Component               │
│                          │
│  handleCreate() {        │
│    // Call command API   │
│    await createTemplate()│
│                          │
│    // Reload data        │
│    refetch()             │
│  }                       │
└──────┬───────────────────┘
       │
       │ Triggers refetch
       │
       ▼
┌──────────────────────────┐
│  useQuery Hook           │
│                          │
│  refetch() {             │
│    setLoading(true)      │
│    const data = await    │
│      queryTemplates()    │
│    setData(data)         │
│    setLoading(false)     │
│  }                       │
└──────┬───────────────────┘
       │
       │ Fresh data loaded
       │
       ▼
┌──────────────────────────┐
│  Component re-renders    │
│  with updated data       │
└──────────────────────────┘
```

---

## File Organization

```
/src/app/
│
├── lib/
│   ├── queries.ts              # All read queries (GET)
│   │   ├── queryAccounts()
│   │   ├── queryTemplates()
│   │   ├── queryTransactions()
│   │   └── ... (15 total)
│   │
│   └── commandClient.ts        # All write commands (POST/PUT/DELETE)
│       ├── createTemplate()
│       ├── deleteTemplate()
│       └── ...
│
├── hooks/
│   └── useQuery.ts             # React hooks for data fetching
│       ├── useQuery()
│       ├── useQueryWithDeps()
│       └── usePaginatedQuery()
│
├── contexts/
│   └── AuthContext.tsx         # Auth0 integration
│       └── getAccessToken()
│
└── views/
    ├── TemplatesView.tsx       # ✅ Uses centralized queries
    ├── AccountsView.tsx        # 🔄 To be migrated
    └── ...                     # 📋 Pending migration
```

---

## Type Safety

```typescript
// queries.ts defines interfaces
export interface Template {
  id: string;
  name: string;
  currency_code: string;
  createdAt: string; // ISO date
}

// Query function returns typed data
export async function queryTemplates(): Promise<Template[]> {
  // ...
}

// Component receives typed data
function TemplatesView() {
  const { data } = useQuery(queryTemplates);
  //      ^? Template[] | null
  
  // TypeScript knows the shape
  data?.map(template => {
    template.name        // ✅ string
    template.createdAt   // ✅ string
    template.invalid     // ❌ TypeScript error
  });
}
```

---

## Benefits of This Architecture

✅ **Separation of Concerns**
- Queries separate from components
- Mock data separate from real API calls
- Easy to switch between modes

✅ **Type Safety**
- Full TypeScript coverage
- Compile-time error detection
- IDE autocomplete

✅ **Testability**
- Easy to mock queries in tests
- No API dependency for unit tests
- Consistent test patterns

✅ **Maintainability**
- Single source of truth for data fetching
- Easy to find and update queries
- Consistent patterns across codebase

✅ **Developer Experience**
- Simple hook API
- Automatic loading/error states
- Auto-refetch support
- Works with or without backend

✅ **Production Ready**
- Just flip environment variable
- No code changes needed
- Smooth transition from dev to prod

---

**Last Updated:** December 22, 2024  
**Version:** 1.0.0
