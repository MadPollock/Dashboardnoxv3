# Quick Start: Adding New Queries

**Quick reference guide for adding new query functions following the frontend-first pattern**

---

## TL;DR - The Pattern

1. **Define TypeScript interface** in `/src/app/lib/queries.ts`
2. **Create mock data generator** function
3. **Implement query function** with mock/real logic
4. **Use in component** with `useQuery()` hook
5. **Document API contract** for backend team

---

## Step-by-Step Guide

### 1. Define TypeScript Interface

Add to `/src/app/lib/queries.ts`:

```typescript
export interface YourDataType {
  id: string;
  name: string;
  value: number;
  created_at: string; // ISO timestamp
}
```

**Tips:**
- Use clear, descriptive names
- Document expected formats in comments
- Use string for decimals (e.g., `balance: string` not `number`)
- Use ISO 8601 for dates (e.g., `"2024-12-23T14:30:00Z"`)

---

### 2. Create Mock Data Generator

Add below your interface:

```typescript
const generateMockYourData = (): YourDataType[] => [
  {
    id: 'item-1',
    name: 'Example Item',
    value: 1234.56,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
  },
  {
    id: 'item-2',
    name: 'Another Item',
    value: 789.12,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1d ago
  },
];
```

**Tips:**
- Use realistic values (not 999999)
- Dynamic timestamps (relative to current time)
- Multiple scenarios (empty, partial, full)
- Simulate network delay (200-300ms)

---

### 3. Implement Query Function

```typescript
export async function queryYourData(
  params?: { filter?: string }, // Optional parameters
  options?: QueryOptions
): Promise<YourDataType[]> {
  if (isMockMode()) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Return mock data
    return generateMockYourData();
  }

  // Real API call
  const url = new URL(`${getAPIBaseURL()}/your-endpoint`);
  if (params?.filter) {
    url.searchParams.set('filter', params.filter);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch your data: ${response.statusText}`);
  }

  return response.json();
}
```

---

### 4. Use in Component

```tsx
import { useQuery } from '../hooks/useQuery';
import { queryYourData, type YourDataType } from '../lib/queries';

export function YourComponent() {
  const { data, loading, error, refetch } = useQuery<YourDataType[]>(
    queryYourData,
    undefined, // params
    { refetchInterval: 60000 } // options (60s auto-polling)
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div>
        Error loading data
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div>No data available</div>;
  }

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}: {item.value}</div>
      ))}
    </div>
  );
}
```

---

### 5. Document API Contract

Create `/docs/API_CONTRACT_YOUR_FEATURE.md`:

```markdown
# API Contract: Your Feature Endpoints

## Get Your Data

**Endpoint:** `GET /api/your-endpoint`  
**Query Category:** B (60s polling)

### Request

GET /api/your-endpoint?filter=value
Authorization: Bearer <JWT_TOKEN>

### Response (200 OK)

{
  "data": [
    {
      "id": "item-1",
      "name": "Example Item",
      "value": 1234.56,
      "created_at": "2024-12-23T14:30:00Z"
    }
  ]
}

### Field Definitions

- `data` (array, required): Array of items
- `data[].id` (string, required): Unique identifier
- `data[].name` (string, required): Item name
- `data[].value` (number, required): Numeric value
- `data[].created_at` (string, required): ISO 8601 timestamp

### Business Logic

- Return all items for authenticated user
- Filter by query parameter if provided
- Order by created_at DESC (newest first)
```

---

## Query Categories

### Category A: Manual Refresh Only

**Use when:** Data is critical and affects financial decisions

```tsx
const { data, loading, error, refetch } = useQuery(queryBalances);

// No auto-polling, manual refresh button
<button onClick={() => refetch()}>
  <RefreshCw /> Refresh
</button>
```

**Examples:**
- Account balances before withdrawal
- Available funds before payment

---

### Category B: Auto-Polling or Load Once

**Use when:** Data changes infrequently OR needs periodic updates

```tsx
// Load once (no refetchInterval)
const { data } = useQuery(queryWhitelistedWallets);

// Auto-polling (60s interval)
const { data } = useQuery(
  queryDashboardToday,
  undefined,
  { refetchInterval: 60000 }
);
```

**Examples (Load Once):**
- Whitelisted addresses (rarely change)
- User preferences
- Configuration data

**Examples (Auto-Polling):**
- Dashboard statistics (change throughout day)
- Recent transactions
- Payment status counts

---

## Common Patterns

### Pagination

```typescript
export async function queryPaginatedData(
  params?: { page?: number; limit?: number },
  options?: QueryOptions
): Promise<YourDataType[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const limit = params?.limit || 10;
    const offset = ((params?.page || 1) - 1) * limit;
    return generateMockData().slice(offset, offset + limit);
  }

  const url = new URL(`${getAPIBaseURL()}/your-endpoint`);
  if (params?.page) url.searchParams.set('page', params.page.toString());
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());

  const response = await fetch(url.toString(), { /* ... */ });
  return response.json();
}
```

---

### Date Range Filtering

```typescript
export async function queryDataByDateRange(
  params: DateRangeParams, // { from: string; to: string; }
  options?: QueryOptions
): Promise<YourDataType[]> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockData().filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= new Date(params.from) && itemDate <= new Date(params.to);
    });
  }

  const url = new URL(`${getAPIBaseURL()}/your-endpoint`);
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);

  const response = await fetch(url.toString(), { /* ... */ });
  return response.json();
}
```

---

### Single Item by ID

```typescript
export async function queryItemById(
  itemId: string,
  options?: QueryOptions
): Promise<YourDataType> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const item = generateMockData().find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');
    return item;
  }

  const response = await fetch(`${getAPIBaseURL()}/your-endpoint/${itemId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch item: ${response.statusText}`);
  }

  return response.json();
}
```

---

## Testing Checklist

Before submitting:

- [ ] TypeScript interface defined
- [ ] Mock data generator implemented
- [ ] Query function handles mock mode
- [ ] Query function handles real API
- [ ] Component uses `useQuery()` hook correctly
- [ ] Loading state tested (shows skeleton)
- [ ] Error state tested (shows error + retry)
- [ ] Empty state tested (shows "no data" message)
- [ ] Success state tested (displays data)
- [ ] API contract documented

---

## Common Mistakes to Avoid

### ❌ Don't: Hardcode API URLs

```typescript
// Bad
const response = await fetch('https://api.crossramp.io/endpoint');
```

### ✅ Do: Use Runtime Config

```typescript
// Good
const response = await fetch(`${getAPIBaseURL()}/endpoint`);
```

---

### ❌ Don't: Return Raw Numbers for Decimals

```typescript
// Bad - precision loss
interface BadBalance {
  amount: number; // 12480.90 → 12480.9000000001
}
```

### ✅ Do: Use Strings for Decimals

```typescript
// Good - exact precision
interface GoodBalance {
  amount: string; // "12480.90"
}
```

---

### ❌ Don't: Use Non-ISO Date Formats

```typescript
// Bad
created_at: "12/23/2024" // Ambiguous
created_at: "2024-12-23" // Missing time
```

### ✅ Do: Use ISO 8601

```typescript
// Good
created_at: "2024-12-23T14:30:00Z" // ISO 8601 with timezone
```

---

### ❌ Don't: Skip Mock Mode Check

```typescript
// Bad - always calls real API
export async function queryData() {
  const response = await fetch(/* ... */);
  return response.json();
}
```

### ✅ Do: Implement Mock Mode

```typescript
// Good - works in development and production
export async function queryData() {
  if (isMockMode()) {
    return generateMockData();
  }
  const response = await fetch(/* ... */);
  return response.json();
}
```

---

## File Organization

### Where Things Go

```
/src/app/lib/
  └── queries.ts                    # ALL query functions here

/src/app/hooks/
  └── useQuery.ts                   # Query hook (already exists)

/src/app/views/
  └── YourFeatureView.tsx           # Your component using queries

/docs/
  ├── FEATURE_YOUR_FEATURE.md       # Feature documentation
  └── API_CONTRACT_YOUR_FEATURE.md  # API specification
```

### Don't Create Separate Query Files

Keep all queries in `/src/app/lib/queries.ts` for:
- Easier maintenance
- Consistent patterns
- Shared types
- Single source of truth

---

## Example: Adding "Notifications" Query

### 1. Interface

```typescript
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  created_at: string;
}
```

### 2. Mock Generator

```typescript
const generateMockNotifications = (): Notification[] => [
  {
    id: 'notif-1',
    title: 'New Payment Received',
    message: 'You received R$ 1,450 from customer #3421',
    type: 'success',
    read: false,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Withdrawal Completed',
    message: 'Your withdrawal of 500 USDT was processed',
    type: 'info',
    read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];
```

### 3. Query Function

```typescript
export async function queryNotifications(
  params?: { unreadOnly?: boolean },
  options?: QueryOptions
): Promise<{ notifications: Notification[] }> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 200));
    let notifications = generateMockNotifications();
    
    if (params?.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    return { notifications };
  }

  const url = new URL(`${getAPIBaseURL()}/notifications`);
  if (params?.unreadOnly) {
    url.searchParams.set('unread_only', 'true');
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.statusText}`);
  }

  return response.json();
}
```

### 4. Use in Component

```tsx
export function NotificationsPanel() {
  const { data, loading, error } = useQuery<{ notifications: Notification[] }>(
    () => queryNotifications({ unreadOnly: true }),
    { unreadOnly: true },
    { refetchInterval: 30000 } // Poll every 30s
  );

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage />;

  const notifications = data?.notifications || [];

  return (
    <div>
      {notifications.length === 0 ? (
        <p>No new notifications</p>
      ) : (
        notifications.map(notif => (
          <NotificationCard key={notif.id} notification={notif} />
        ))
      )}
    </div>
  );
}
```

---

## Resources

- **Full Guide:** `/docs/FRONTEND_FIRST_APPROACH.md`
- **Examples:** `/docs/API_CONTRACT_DASHBOARD.md`, `/docs/API_CONTRACT_WITHDRAW.md`
- **Summary:** `/docs/QUERIES_IMPLEMENTATION_SUMMARY.md`
- **Existing Queries:** `/src/app/lib/queries.ts`

---

## Quick Commands

```bash
# Check if mock mode is enabled
grep "MOCK_QUERIES_ENABLED" public/config.js

# Find all query functions
grep "export async function query" src/app/lib/queries.ts

# Find all useQuery usages
grep -r "useQuery" src/app/views/
```

---

**Need Help?** Ask in #crossramp-frontend on Slack
