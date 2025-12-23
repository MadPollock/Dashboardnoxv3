# API Contract: Analytics

**Feature:** Analytics Dashboard  
**Status:** ✅ Fully Implemented (Frontend Ready, Backend Mock)  
**Last Updated:** December 2024

---

## Overview

The Analytics feature provides read-only visualization of aggregated business metrics and time-series data through **5 independent GET endpoints**. All queries are **Category A** (manual refresh only) with no automatic polling.

**Architecture Pattern:**
- **Bucket 1:** Single endpoint for aggregated KPIs (4 metrics)
- **Bucket 2:** Four separate endpoints for time-series chart data
- **Benefits:** Granular caching, independent loading, smaller payloads

**RBAC:** Restricted to `admin`, `operations`, and `analyst` roles only.

---

## Table of Contents

1. [Endpoints Summary](#endpoints-summary)
2. [Bucket 1: Aggregated Metrics](#bucket-1-aggregated-metrics)
3. [Bucket 2: Time Series Data](#bucket-2-time-series-data)
4. [Common Patterns](#common-patterns)
5. [Error Handling](#error-handling)
6. [Performance Guidelines](#performance-guidelines)
7. [Frontend Implementation](#frontend-implementation)

---

## Endpoints Summary

| Endpoint | Method | Purpose | Payload Size | Cache TTL |
|----------|--------|---------|--------------|-----------|
| `/api/analytics/metrics` | GET | Aggregated KPIs (4 metrics) | ~200 bytes | 5 min |
| `/api/analytics/volume-overview` | GET | Volume time series | ~2-5 KB | 10 min |
| `/api/analytics/payments-overview` | GET | Payments count time series | ~2-5 KB | 10 min |
| `/api/analytics/conversion-rates` | GET | Conversion rate time series | ~1-3 KB | 10 min |
| `/api/analytics/fees` | GET | Fees breakdown time series | ~2-5 KB | 10 min |

**Note:** Current implementation uses `/analytics/*` (no `/api` prefix). Backend should implement with `/api/analytics/*` prefix.

---

## Bucket 1: Aggregated Metrics

### Endpoint: `GET /api/analytics/metrics`

**Purpose:** Fetch aggregated KPIs for the selected date range.

**Query Parameters:**
```typescript
{
  date_from: string;  // ISO 8601 timestamp (inclusive) - REQUIRED
  date_to: string;    // ISO 8601 timestamp (inclusive) - REQUIRED
  timezone?: string;  // IANA timezone (e.g., "America/Sao_Paulo") - OPTIONAL (default: UTC)
}
```

**Example Request:**
```http
GET /api/analytics/metrics?date_from=2025-11-22T00:00:00Z&date_to=2025-12-22T23:59:59Z&timezone=America/Sao_Paulo
Authorization: Bearer <JWT_TOKEN>
```

**Response Schema:**
```typescript
interface AnalyticsMetricsResponse {
  total_volume: {
    amount: number;           // Total volume in BRL
    currency: string;         // "BRL"
    change_percent: number | null;  // % change vs previous period (null if first period)
  };
  total_payments: {
    count: number;            // Count of completed payments
    change_percent: number | null;
  };
  avg_conversion_rate: {
    rate: number;             // Percentage (0-100)
    change_percent: number | null;
  };
  net_fees: {
    fees_received: number;    // Fees collected from customers (BRL)
    fees_paid: number;        // Fees paid to Crossramp + networks (BRL)
    net: number;              // fees_received - fees_paid
    currency: string;         // "BRL"
    change_percent: number | null;
  };
  period: {
    from: string;             // ISO 8601 timestamp (echoed from request)
    to: string;               // ISO 8601 timestamp (echoed from request)
  };
}
```

**Example Response:**
```json
{
  "total_volume": {
    "amount": 1250000.50,
    "currency": "BRL",
    "change_percent": 12.5
  },
  "total_payments": {
    "count": 847,
    "change_percent": 8.3
  },
  "avg_conversion_rate": {
    "rate": 68.4,
    "change_percent": -2.1
  },
  "net_fees": {
    "fees_received": 35000.00,
    "fees_paid": 12000.00,
    "net": 23000.00,
    "currency": "BRL",
    "change_percent": 15.7
  },
  "period": {
    "from": "2025-11-22T00:00:00Z",
    "to": "2025-12-22T23:59:59Z"
  }
}
```

**Business Logic:**

1. **`total_volume`:**
   - Formula: `SUM(amount WHERE status='completed' AND date BETWEEN from AND to)`
   - Include both `payments_in` and `payments_out`
   - Convert all amounts to BRL using exchange rate at transaction date
   - `change_percent`: Compare with previous period of same duration

2. **`total_payments`:**
   - Formula: `COUNT(* WHERE status='completed' AND date BETWEEN from AND to)`
   - Include both `payments_in` and `payments_out`
   - Exclude pending, expired, cancelled

3. **`avg_conversion_rate`:**
   - Formula: `(completed_count / (completed + expired + cancelled)) * 100`
   - Exclude `pending` from denominator (still may convert)
   - `change_percent`: Compare with previous period

4. **`net_fees`:**
   - `fees_received`: Fees charged to customers (customer pays fee structure)
   - `fees_paid`: Fees paid to Crossramp + network fees
   - `net`: Profit/loss from fee structure
   - `change_percent`: Compare with previous period

**Performance:**
- Indexed columns: `date`, `status`, `currency`
- Consider materialized view for daily aggregates
- Cache for 5 minutes per unique date range

**Error Cases:**
- `400`: Invalid date format or `date_to < date_from`
- `401`: Unauthorized (missing/invalid JWT)
- `403`: Forbidden (user lacks required role)
- `500`: Database query error

---

## Bucket 2: Time Series Data

### Common Request Parameters

All time series endpoints accept these parameters:

```typescript
{
  from: string;       // ISO 8601 date string - REQUIRED
  to: string;         // ISO 8601 date string - REQUIRED
  granularity?: string;  // "daily" | "weekly" | "monthly" - OPTIONAL (auto-determined)
  timezone?: string;     // IANA timezone - OPTIONAL (default: UTC)
}
```

### Endpoint: `GET /api/analytics/volume-overview`

**Purpose:** Get volume time series (payments in + payments out).

**Example Request:**
```http
GET /api/analytics/volume-overview?from=2025-11-22T00:00:00Z&to=2025-12-22T23:59:59Z&timezone=America/Sao_Paulo
Authorization: Bearer <JWT_TOKEN>
```

**Response Schema:**
```typescript
interface VolumeSeriesResponse {
  series: Array<{
    period: string;         // ISO date (YYYY-MM-DD)
    period_label: string;   // Human-readable (e.g., "Nov 22")
    payments_in: number;    // BRL amount
    payments_out: number;   // BRL amount
    combined: number;       // payments_in + payments_out
    currency: string;       // "BRL"
  }>;
  granularity: "daily" | "weekly" | "monthly";
  total_data_points: number;
}
```

**Example Response:**
```json
{
  "series": [
    {
      "period": "2025-11-22",
      "period_label": "Nov 22",
      "payments_in": 125000.50,
      "payments_out": 98000.30,
      "combined": 223000.80,
      "currency": "BRL"
    },
    {
      "period": "2025-11-23",
      "period_label": "Nov 23",
      "payments_in": 142000.75,
      "payments_out": 105000.50,
      "combined": 247001.25,
      "currency": "BRL"
    }
  ],
  "granularity": "daily",
  "total_data_points": 31
}
```

---

### Endpoint: `GET /api/analytics/payments-overview`

**Purpose:** Get payment counts by status over time.

**Response Schema:**
```typescript
interface PaymentsSeriesResponse {
  series: Array<{
    period: string;
    period_label: string;
    in_completed: number;
    in_pending: number;
    in_expired: number;
    in_cancelled: number;
    out_completed: number;
    out_pending: number;
    out_expired: number;
    out_cancelled: number;
  }>;
  granularity: "daily" | "weekly" | "monthly";
  total_data_points: number;
}
```

**Example Response:**
```json
{
  "series": [
    {
      "period": "2025-11-22",
      "period_label": "Nov 22",
      "in_completed": 45,
      "in_pending": 12,
      "in_expired": 5,
      "in_cancelled": 3,
      "out_completed": 38,
      "out_pending": 8,
      "out_expired": 2,
      "out_cancelled": 1
    }
  ],
  "granularity": "daily",
  "total_data_points": 31
}
```

---

### Endpoint: `GET /api/analytics/conversion-rates`

**Purpose:** Get conversion rate percentage over time.

**Response Schema:**
```typescript
interface ConversionSeriesResponse {
  series: Array<{
    period: string;
    period_label: string;
    payments_in_rate: number;   // Percentage (0-100)
    payments_out_rate: number;  // Percentage (0-100)
    combined_rate: number;      // Weighted average
  }>;
  granularity: "daily" | "weekly" | "monthly";
  total_data_points: number;
  calculation_note: string;  // "Rate = (Completed / Created) * 100"
}
```

**Example Response:**
```json
{
  "series": [
    {
      "period": "2025-11-22",
      "period_label": "Nov 22",
      "payments_in_rate": 68.5,
      "payments_out_rate": 72.3,
      "combined_rate": 70.4
    }
  ],
  "granularity": "daily",
  "total_data_points": 31,
  "calculation_note": "Rate = (Completed / Created) * 100"
}
```

---

### Endpoint: `GET /api/analytics/fees`

**Purpose:** Get fees paid vs fees received over time.

**Response Schema:**
```typescript
interface FeesSeriesResponse {
  series: Array<{
    period: string;
    period_label: string;
    fees_paid: number;       // BRL
    fees_received: number;   // BRL
    net_fees: number;        // fees_received - fees_paid
    currency: string;        // "BRL"
  }>;
  granularity: "daily" | "weekly" | "monthly";
  total_data_points: number;
  breakdown: {
    total_fees_paid: number;
    total_fees_received: number;
    total_net_fees: number;
  };
}
```

**Example Response:**
```json
{
  "series": [
    {
      "period": "2025-11-22",
      "period_label": "Nov 22",
      "fees_paid": 450.30,
      "fees_received": 1200.50,
      "net_fees": 750.20,
      "currency": "BRL"
    }
  ],
  "granularity": "daily",
  "total_data_points": 31,
  "breakdown": {
    "total_fees_paid": 12000.00,
    "total_fees_received": 35000.00,
    "total_net_fees": 23000.00
  }
}
```

---

## Common Patterns

### Granularity Auto-Determination

Backend should automatically select granularity based on date range:

```typescript
const days = (to - from) / (1000 * 60 * 60 * 24);

if (days <= 7) {
  granularity = "daily";      // Max 7 points
} else if (days <= 30) {
  granularity = "daily";      // Max 30 points
} else if (days <= 90) {
  granularity = "weekly";     // Max 13 points
} else {
  granularity = "monthly";    // Max 12 points
}
```

### Period Label Formatting

- **Daily:** `"Nov 22"`, `"Dec 1"`
- **Weekly:** `"Week of Nov 20"`, `"Week of Nov 27"`
- **Monthly:** `"Nov 2025"`, `"Dec 2025"`

### Data Completeness

**Always return zero-filled data points for periods with no data:**

```json
{
  "period": "2025-11-25",
  "period_label": "Nov 25",
  "payments_in": 0,
  "payments_out": 0,
  "combined": 0,
  "currency": "BRL"
}
```

This ensures chart x-axis is continuous without gaps.

### Timezone Handling

- Frontend sends `timezone` parameter (e.g., `"America/Sao_Paulo"`)
- Backend groups data by date using merchant's timezone
- If not provided, use merchant profile timezone or default to UTC

---

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Error Codes

| HTTP Status | Code | Message | Frontend Action |
|-------------|------|---------|-----------------|
| 400 | `INVALID_DATE_RANGE` | "date_to must be after date_from" | Show validation error |
| 400 | `DATE_RANGE_TOO_LARGE` | "Maximum date range is 365 days" | Suggest shorter range |
| 401 | `UNAUTHORIZED` | "Missing or invalid authentication token" | Redirect to login |
| 403 | `FORBIDDEN` | "Insufficient permissions to access analytics" | Show access denied page |
| 404 | `NO_DATA` | "No data available for selected period" | Show empty state (not error) |
| 500 | `QUERY_ERROR` | "Failed to fetch analytics data" | Show retry button |
| 503 | `SERVICE_UNAVAILABLE` | "Analytics service temporarily unavailable" | Show retry button |

**Frontend Handling:**

```typescript
try {
  const metrics = await queryAnalyticsMetrics({ date_from, date_to });
} catch (error) {
  if (error.status === 404) {
    // Show empty state, not error
    setEmptyState(true);
  } else {
    // Show error banner with retry button
    setError(error.message);
  }
}
```

---

## Performance Guidelines

### Backend Optimization

1. **Indexes Required:**
   ```sql
   CREATE INDEX idx_payments_date_status ON payments(date, status);
   CREATE INDEX idx_payments_created_at ON payments(created_at);
   CREATE INDEX idx_fees_date ON fees(date);
   ```

2. **Materialized Views:**
   ```sql
   -- Refresh nightly at 2 AM
   CREATE MATERIALIZED VIEW analytics_daily_aggregates AS
   SELECT 
     DATE(created_at) as date,
     SUM(amount) as total_volume,
     COUNT(*) FILTER (WHERE status='completed') as completed_count,
     -- ... other metrics
   FROM payments
   GROUP BY DATE(created_at);
   ```

3. **Query Timeout:**
   - Set timeout to 10 seconds max
   - If query exceeds timeout, return `503 SERVICE_UNAVAILABLE`

4. **Rate Limiting:**
   - Max 60 requests per minute per user
   - Use Redis for distributed rate limiting

### Caching Strategy

**Metrics Endpoint:**
- Cache key: `analytics:metrics:{date_from}:{date_to}:{timezone}`
- TTL: 5 minutes
- Invalidate on: New payment completed

**Time Series Endpoints:**
- Cache key: `analytics:{endpoint}:{from}:{to}:{granularity}:{timezone}`
- TTL: 10 minutes
- Invalidate on: New payment completed (only if in date range)

**Example (Redis):**
```javascript
const cacheKey = `analytics:metrics:${from}:${to}:${timezone}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await runQuery();
await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 min TTL
return data;
```

---

## Frontend Implementation

### Query Functions (TypeScript)

**Location:** `/src/app/lib/queries.ts`

```typescript
export async function queryAnalyticsMetrics(
  params: AnalyticsMetricsRequest,
  options?: QueryOptions
): Promise<AnalyticsMetricsResponse> {
  if (isMockMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockAnalyticsMetrics(params);
  }

  const url = new URL(`${getAPIBaseURL()}/api/analytics/metrics`);
  url.searchParams.set('date_from', params.date_from);
  url.searchParams.set('date_to', params.date_to);
  if (params.timezone) {
    url.searchParams.set('timezone', params.timezone);
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
    throw new Error(`Failed to fetch analytics metrics: ${response.statusText}`);
  }

  return response.json();
}
```

### Component Integration

**Location:** `/src/app/views/AnalyticsView.tsx`

```typescript
export function AnalyticsView() {
  const { t } = useStrings();
  const { hasRole } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({ ... });

  // RBAC enforcement
  if (!hasRole('admin')) {
    return <AccessDenied />;
  }

  // Query integration
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery(
    () => queryAnalyticsMetrics({
      date_from: dateRange.from,
      date_to: dateRange.to,
    }),
    [dateRange]
  );

  // Loading state
  if (metricsLoading) {
    return <MetricsSkeletonLoader />;
  }

  // Error state
  if (metricsError) {
    return <ErrorBanner error={metricsError} onRetry={refetchMetrics} />;
  }

  // Render metrics
  return <MetricsCards data={metrics} />;
}
```

---

## Testing

### Backend Tests

**Unit Tests:**
```javascript
describe('GET /api/analytics/metrics', () => {
  it('returns aggregated metrics for valid date range', async () => {
    const response = await request(app)
      .get('/api/analytics/metrics')
      .query({ 
        date_from: '2025-11-01T00:00:00Z',
        date_to: '2025-11-30T23:59:59Z'
      })
      .expect(200);

    expect(response.body).toHaveProperty('total_volume');
    expect(response.body.total_volume.amount).toBeGreaterThanOrEqual(0);
  });

  it('returns 400 for invalid date range', async () => {
    await request(app)
      .get('/api/analytics/metrics')
      .query({ 
        date_from: '2025-12-01T00:00:00Z',
        date_to: '2025-11-01T23:59:59Z'  // date_to < date_from
      })
      .expect(400);
  });
});
```

### Frontend Tests

**Integration Tests:**
```typescript
describe('AnalyticsView', () => {
  it('fetches metrics on mount', async () => {
    const mockMetrics = { ... };
    queryAnalyticsMetrics.mockResolvedValue(mockMetrics);

    render(<AnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText('Volume Overview')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    queryAnalyticsMetrics.mockRejectedValue(new Error('Network error'));

    render(<AnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    });
  });
});
```

---

## Migration Path

### Phase 1: Mock Mode (Current)
- Frontend uses mock data generators
- Query functions return hard-coded responses
- Enable with `VITE_MOCK_QUERIES=true` in config

### Phase 2: Real API Integration
1. Backend implements 5 endpoints
2. Update `VITE_API_BASE_URL` in config
3. Set `VITE_MOCK_QUERIES=false`
4. Test with Postman/curl
5. Deploy frontend

### Phase 3: Optimization
1. Add Redis caching
2. Create materialized views
3. Implement query timeout
4. Add monitoring (Datadog, New Relic)

---

## Security Considerations

1. **RBAC Enforcement:**
   - Backend MUST verify JWT token has required role
   - Frontend RBAC is UI-only (not security)

2. **SQL Injection:**
   - Use parameterized queries
   - Validate all date inputs

3. **Rate Limiting:**
   - Prevent abuse with 60 req/min limit
   - Use exponential backoff on frontend

4. **Data Privacy:**
   - Analytics aggregates only (no PII)
   - Merchant can only see their own data

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-23 | 1.0.0 | Initial API contract documented |

---

**End of API Contract**

For feature-level documentation, see `/docs/FEATURE_ANALYTICS.md`.  
For implementation assessment, see `/docs/ANALYTICS_COMPLETION_ASSESSMENT.md`.
