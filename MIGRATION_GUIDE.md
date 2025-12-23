# Data Fetching Migration Guide: useChartData → SWR/React Query

**Date:** December 18, 2025  
**Status:** Ready for Migration  
**Current Implementation:** Manual state management with `useState` + `useEffect`  
**Target:** SWR or React Query for production-grade caching

---

## 1. Current State Analysis

### File: `/src/app/hooks/useChartData.ts`

**Lines 22-60:** Main hook implementation  
**Lines 64-105:** Mock data generator function

**Current Structure:**
```tsx
export function useChartData<T extends ChartDataPoint>(
  chartId: string,
  options: UseChartDataOptions = {}
) {
  const { dataSource = 'mock', refreshInterval } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (dataSource === 'mock') {
          await new Promise(resolve => setTimeout(resolve, 500));
          const mockData = generateMockData(chartId);
          setData(mockData as T[]);
        }
        // API integration point: Line 36
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Auto-refresh interval (lines 54-57)
    if (refreshInterval) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [chartId, dataSource, refreshInterval]);

  return { data, isLoading, error, refetch: () => setIsLoading(true) };
}
```

**Mock Data Switch Location:** Line 36  
**Mock Data Generator:** Lines 64-105 (`generateMockData` function)

---

## 2. Why Migrate to SWR/React Query?

### Current Limitations
❌ **No request deduplication** - Multiple components fetching same data trigger multiple requests  
❌ **No cache management** - Every component mount refetches data  
❌ **Manual retry logic** - Network errors require manual handling  
❌ **Race conditions** - Fast navigation can cause stale data overwrites  
❌ **No background revalidation** - Data gets stale, no automatic refresh  
❌ **Connection pool strain** - Go backend connection pool can be exhausted by redundant requests

### Benefits of SWR/React Query
✅ **Automatic deduplication** - Single request for all components using same key  
✅ **Smart caching** - Stale-while-revalidate pattern, instant UI updates  
✅ **Auto-retry** - Configurable retry with exponential backoff  
✅ **Focus revalidation** - Refetch when user returns to tab  
✅ **Mutation handling** - Optimistic updates and cache invalidation  
✅ **DevTools** - Debug cache state, network requests, timing  
✅ **TypeScript** - Full type inference for data/error states  
✅ **Suspense support** - React 18 Suspense boundary integration (future)

---

## 3. Migration Options

### Option A: SWR (Recommended for this project)

**Pros:**
- Lightweight (~5KB minified)
- Perfect for read-heavy CQRS pattern
- Built-in support for focus revalidation
- Simple API, minimal boilerplate
- Created by Vercel (Next.js team)

**Cons:**
- Less features than React Query
- No query invalidation helpers (must use mutate)
- No built-in pagination/infinite scroll

**Install:**
```bash
npm install swr
# or
pnpm add swr
```

---

### Option B: React Query (@tanstack/react-query)

**Pros:**
- Most feature-complete (pagination, infinite scroll, mutations)
- Best DevTools
- Strong TypeScript support
- Active community, excellent docs
- Better for complex data dependencies

**Cons:**
- Larger bundle (~12KB minified)
- More configuration needed
- Steeper learning curve

**Install:**
```bash
npm install @tanstack/react-query
# or
pnpm add @tanstack/react-query
```

---

## 4. Migration Implementation

### Option A: SWR Implementation

#### Step 1: Install SWR
```bash
pnpm add swr
```

#### Step 2: Create SWR Configuration (`/src/app/lib/swrConfig.ts`)
```tsx
import { SWRConfiguration } from 'swr';
import { useAuth } from '@/contexts/AuthContext';

// Global fetcher with Auth0 token
export const fetcher = async (url: string) => {
  const { getAccessToken } = useAuth();
  const token = await getAccessToken();
  
  const response = await fetch(url, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error('API Error');
    error.info = await response.json();
    error.status = response.status;
    throw error;
  }

  return response.json();
};

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false, // Disable auto-refetch on window focus
  revalidateOnReconnect: true, // Refetch on network reconnect
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  dedupingInterval: 2000, // Dedupe requests within 2s
};
```

#### Step 3: Wrap App with SWRConfig (`/src/app/App.tsx`)
```tsx
import { SWRConfig } from 'swr';
import { swrConfig } from './lib/swrConfig';

export default function App() {
  // ... existing code ...

  return (
    <Auth0Provider {...auth0Config}>
      <SWRConfig value={swrConfig}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <DashboardLayout activeNav={activeNav} onNavChange={setActiveNav}>
              {renderView()}
            </DashboardLayout>
          </AuthProvider>
        </ThemeProvider>
      </SWRConfig>
    </Auth0Provider>
  );
}
```

#### Step 4: Migrate useChartData Hook
```tsx
import useSWR from 'swr';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface UseChartDataOptions {
  dataSource?: 'api' | 'mock';
  refreshInterval?: number;
}

export function useChartData<T extends ChartDataPoint>(
  chartId: string,
  options: UseChartDataOptions = {}
) {
  const { dataSource = 'mock', refreshInterval } = options;
  
  // SWR key - null disables the request
  const swrKey = dataSource === 'api' 
    ? `${import.meta.env.VITE_API_BASE_URL}/api/analytics/${chartId}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<T[]>(
    swrKey,
    {
      // Use mock data as fallback when dataSource is 'mock'
      fallbackData: dataSource === 'mock' ? generateMockData(chartId) as T[] : undefined,
      refreshInterval: refreshInterval,
      revalidateOnMount: dataSource === 'api', // Only fetch on mount for API mode
    }
  );

  return {
    data: data || [],
    isLoading: dataSource === 'api' ? isLoading : false,
    error,
    refetch: mutate, // SWR's mutate function for manual revalidation
  };
}

// Keep existing generateMockData function (lines 64-105)
function generateMockData(chartId: string): ChartDataPoint[] {
  // ... existing mock data logic ...
}
```

**Key Changes:**
1. **Line ~36:** Replaced `if (dataSource === 'mock')` with conditional SWR key
2. **`swrKey`:** `null` disables SWR request, falls back to mock data
3. **`fallbackData`:** Provides immediate mock data for `dataSource: 'mock'`
4. **`mutate`:** Replaces manual `refetch` trigger
5. **Mock data preserved:** `generateMockData()` still exists for development

---

### Option B: React Query Implementation

#### Step 1: Install React Query
```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

#### Step 2: Create Query Client (`/src/app/lib/queryClient.ts`)
```tsx
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
```

#### Step 3: Wrap App with QueryClientProvider
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

export default function App() {
  // ... existing code ...

  return (
    <Auth0Provider {...auth0Config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <DashboardLayout activeNav={activeNav} onNavChange={setActiveNav}>
              {renderView()}
            </DashboardLayout>
          </AuthProvider>
        </ThemeProvider>
        {/* DevTools only in development */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </Auth0Provider>
  );
}
```

#### Step 4: Migrate useChartData Hook
```tsx
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface UseChartDataOptions {
  dataSource?: 'api' | 'mock';
  refreshInterval?: number;
}

export function useChartData<T extends ChartDataPoint>(
  chartId: string,
  options: UseChartDataOptions = {}
) {
  const { dataSource = 'mock', refreshInterval } = options;
  const { getAccessToken } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['chartData', chartId],
    queryFn: async () => {
      // Mock data path
      if (dataSource === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
        return generateMockData(chartId) as T[];
      }

      // Real API path
      const token = await getAccessToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/analytics/${chartId}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json() as Promise<T[]>;
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: refreshInterval,
    enabled: true, // Always enabled, mock or API
  });

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
  };
}

// Keep existing generateMockData function
function generateMockData(chartId: string): ChartDataPoint[] {
  // ... existing mock data logic ...
}
```

**Key Changes:**
1. **`queryKey`:** Unique identifier `['chartData', chartId]`
2. **`queryFn`:** Handles both mock and API logic
3. **Mock preserved:** `if (dataSource === 'mock')` block stays
4. **Token integration:** Uses `getAccessToken()` from Auth0
5. **Automatic caching:** 30s stale time reduces Go connection pool hits

---

## 5. Migration Checklist

### Phase 1: Setup (Day 1)
- [ ] Choose SWR or React Query based on project needs
- [ ] Install chosen library
- [ ] Create configuration file (`swrConfig.ts` or `queryClient.ts`)
- [ ] Wrap `<App>` with provider (`SWRConfig` or `QueryClientProvider`)
- [ ] Test app still renders with mock data

### Phase 2: Hook Migration (Day 1-2)
- [ ] Backup current `useChartData.ts`
- [ ] Rewrite hook with chosen library
- [ ] Keep `generateMockData()` function intact
- [ ] Test all charts render correctly
- [ ] Verify `dataSource: 'mock'` still works
- [ ] Verify loading states display properly

### Phase 3: API Integration (Day 2-3)
- [ ] Set `VITE_API_BASE_URL` in `.env`
- [ ] Test one chart with `dataSource: 'api'`
- [ ] Verify Auth0 token sent in headers
- [ ] Test error handling (401, 500, network errors)
- [ ] Test refetch behavior
- [ ] Monitor network tab for deduplication

### Phase 4: Views Migration (Day 3-4)
- [ ] Update `DashboardView.tsx` to use API
- [ ] Update `AnalyticsView.tsx` charts
- [ ] Update `TransactionsView.tsx` list
- [ ] Update `AccountsView.tsx` balances
- [ ] Test all views load without errors

### Phase 5: Optimization (Day 4-5)
- [ ] Add cache invalidation on mutations
- [ ] Configure stale times per endpoint
- [ ] Add optimistic updates for write operations
- [ ] Test background revalidation
- [ ] Monitor Go backend connection pool usage

---

## 6. Testing Strategy

### Unit Tests (with Mock)
```tsx
// Example: RevenueChart.test.tsx
import { renderHook } from '@testing-library/react';
import { useChartData } from '@/hooks/useChartData';

test('returns mock data when dataSource is mock', () => {
  const { result } = renderHook(() => 
    useChartData('revenue', { dataSource: 'mock' })
  );

  expect(result.current.data).toHaveLength(7); // Jan-Jul
  expect(result.current.isLoading).toBe(false);
  expect(result.current.error).toBeNull();
});
```

### Integration Tests (with API)
```tsx
test('fetches data from API when dataSource is api', async () => {
  server.use(
    rest.get('/api/analytics/revenue', (req, res, ctx) => {
      return res(ctx.json([
        { name: 'Jan', revenue: 4000, expenses: 2400 }
      ]));
    })
  );

  const { result, waitFor } = renderHook(() =>
    useChartData('revenue', { dataSource: 'api' })
  );

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data).toHaveLength(1);
});
```

---

## 7. Common Patterns

### Pattern 1: Conditional Fetching
```tsx
// Only fetch if user is admin
const { data } = useChartData('admin-stats', {
  dataSource: user?.role === 'admin' ? 'api' : 'mock'
});
```

### Pattern 2: Dependent Queries (React Query)
```tsx
// Fetch account details after accounts list loads
const { data: accounts } = useQuery(['accounts']);
const accountId = accounts?.[0]?.id;

const { data: details } = useQuery(
  ['account-details', accountId],
  () => fetch(`/api/accounts/${accountId}`),
  { enabled: !!accountId } // Only run if accountId exists
);
```

### Pattern 3: Mutation with Cache Invalidation (React Query)
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const withdrawMutation = useMutation({
  mutationFn: (data) => fetch('/api/commands/withdraw', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  onSuccess: () => {
    // Invalidate accounts cache to trigger refetch
    queryClient.invalidateQueries(['chartData', 'accounts']);
    toast.success('Withdrawal submitted');
  },
});
```

### Pattern 4: Optimistic Updates (React Query)
```tsx
const addWhitelistMutation = useMutation({
  mutationFn: (address) => fetch('/api/commands/whitelist/add', {
    method: 'POST',
    body: JSON.stringify({ address }),
  }),
  onMutate: async (newAddress) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['whitelist']);

    // Snapshot current data
    const previousWhitelist = queryClient.getQueryData(['whitelist']);

    // Optimistically update UI
    queryClient.setQueryData(['whitelist'], (old) => [...old, newAddress]);

    return { previousWhitelist };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['whitelist'], context.previousWhitelist);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries(['whitelist']);
  },
});
```

---

## 8. Performance Monitoring

### SWR DevTools
```tsx
// Add to App.tsx in development
import { SWRDevTools } from '@swr-devtools/react';

{import.meta.env.DEV && <SWRDevTools />}
```

### React Query DevTools
Already included in Step 3 of React Query implementation.

### Key Metrics to Monitor
1. **Cache Hit Rate** - % of requests served from cache
2. **Request Deduplication** - Reduction in duplicate API calls
3. **Time to First Byte** - Go backend response time
4. **Connection Pool Usage** - Active connections to Go backend
5. **Error Rate** - Failed requests / total requests

---

## 9. Rollback Plan

If migration causes issues:

1. **Restore backup of `useChartData.ts`**
2. **Remove provider wrapper from `App.tsx`**
3. **Uninstall library** (`pnpm remove swr` or `pnpm remove @tanstack/react-query`)
4. **Clear browser cache** (Ctrl+Shift+R)
5. **Restart dev server**

Original hook will resume working immediately.

---

## 10. Next Steps After Migration

### Write Operations (Commands)
Migrate write operations in:
- `/src/app/components/admin/WithdrawalRequestForm.tsx`
- `/src/app/components/admin/WhitelistForm.tsx`
- `/src/app/components/admin/AddUserForm.tsx`

Use `useMutation` (React Query) or manual `mutate` (SWR) for:
- POST /api/commands/withdraw
- POST /api/commands/whitelist/add
- DELETE /api/commands/whitelist/:id

### Real-time Updates
Consider adding:
- WebSocket integration for live transaction updates
- Server-Sent Events (SSE) for balance changes
- Polling with `refreshInterval` for sync status

---

## 11. Decision Matrix

| Criteria | SWR | React Query | Current Hook |
|----------|-----|-------------|--------------|
| Bundle Size | ✅ 5KB | ⚠️ 12KB | ✅ 0KB |
| Cache Management | ✅ Yes | ✅ Yes | ❌ No |
| Request Deduplication | ✅ Yes | ✅ Yes | ❌ No |
| DevTools | ⚠️ Limited | ✅ Excellent | ❌ No |
| TypeScript Support | ✅ Good | ✅ Excellent | ✅ Custom |
| Mutation Handling | ⚠️ Manual | ✅ Built-in | ❌ No |
| Pagination Support | ❌ Manual | ✅ Built-in | ❌ No |
| Learning Curve | ✅ Low | ⚠️ Medium | ✅ None |
| **Recommendation** | **✅ Best for this project** | ⚠️ Overkill | ❌ Not production-ready |

---

## 12. Resources

### SWR
- Docs: https://swr.vercel.app
- GitHub: https://github.com/vercel/swr
- Examples: https://swr.vercel.app/examples

### React Query
- Docs: https://tanstack.com/query/latest
- GitHub: https://github.com/TanStack/query
- Examples: https://tanstack.com/query/latest/docs/react/examples/react/simple

### Auth0 Integration
- Token Management: https://auth0.com/docs/secure/tokens
- SWR + Auth0: https://swr.vercel.app/docs/authentication
- React Query + Auth0: https://tanstack.com/query/latest/docs/react/guides/queries

---

**Last Updated:** December 18, 2025  
**Status:** Ready for Implementation  
**Estimated Migration Time:** 3-5 days  
**Risk Level:** Low (Rollback plan in place)
