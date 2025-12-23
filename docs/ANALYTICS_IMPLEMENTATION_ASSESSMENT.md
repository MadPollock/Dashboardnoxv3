# Analytics Feature - Implementation Assessment

**Date:** 2025-12-23  
**Feature:** Analytics Dashboard  
**Status:** 🔵 **READY TO START**

---

## 📋 **Overview**

The Analytics feature is a **read-only dashboard** providing aggregated metrics and time-series visualizations for business performance analysis. It includes 4 KPI metric cards and 4 interactive charts with customizable date ranges.

---

## 🎯 **Feature Scope**

### **User Story:**
> As an administrator or operator of Crossramp, I want to view aggregated metrics and historical charts of volume, payments, conversion, and fees within custom date ranges, so that I can analyze business performance, identify trends, make informed decisions about pricing and operations, and present financial data to stakeholders or auditors.

### **Components Required:**

**View:**
- `/src/app/views/AnalyticsView.tsx` - Main dashboard view

**Chart Components:**
- `/src/app/components/analytics/VolumeOverviewChart.tsx` - Line chart (3 series)
- `/src/app/components/analytics/PaymentsOverviewChart.tsx` - Stacked bar chart (8 categories)
- `/src/app/components/analytics/ConversionRateChart.tsx` - Line chart (3 series)
- `/src/app/components/analytics/FeesChart.tsx` - Bar chart (2 series)
- `/src/app/components/analytics/DateRangeSelector.tsx` - Date filter component

---

## 🔐 **RBAC (Role-Based Access Control)**

| Role | Access Level | Notes |
|------|--------------|-------|
| Admin (`user_admin_crossramp`) | ✅ Full Read | Complete access |
| Operations (`user_operations_crossramp`) | ✅ Full Read | Same as Admin |
| Analyst (`user_analyst_crossramp`) | ✅ Full Read | Read-only (no write actions anyway) |
| Developer (`user_developer_crossramp`) | ❌ No Access | Page hidden from navigation |

**Key Points:**
- NO write actions (100% read-only)
- NO MFA required (no commands)
- Access Denied screen for Developer role

---

## 📊 **UI/UX Structure**

### **Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Analytics                                               │
│ View aggregated metrics and performance trends         │
│                                                         │
│ [Date Range Selector] [Last 30 days ▼] [Refresh 🔄]   │
├─────────────────────────────────────────────────────────┤
│ ⚠️ Need detailed analytics? Request a custom report    │
├─────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐│
│ │  Volume   │ │ Payments  │ │Conversion │ │Net Fees  ││
│ │ R$125.0k  │ │    847    │ │   68.4%   │ │ R$23.0k  ││
│ │  ↑ 12.5%  │ │  ↑ 8.3%   │ │  ↓ 2.1%   │ │ ↑ 15.7%  ││
│ └───────────┘ └───────────┘ └───────────┘ └──────────┘│
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐        │
│ │ Volume Overview     │ │ Payments Overview   │        │
│ │ [Line Chart]        │ │ [Stacked Bar Chart] │        │
│ └─────────────────────┘ └─────────────────────┘        │
│ ┌─────────────────────┐ ┌─────────────────────┐        │
│ │ Conversion Rate     │ │ Fees                │        │
│ │ [Line Chart]        │ │ [Bar Chart]         │        │
│ └─────────────────────┘ └─────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### **Responsive Breakpoints:**
- **Mobile (< 768px):** Metrics 1 col, Charts stacked vertically
- **Tablet (768-1024px):** Metrics 2 cols, Charts 1 col
- **Desktop (> 1024px):** Metrics 4 cols, Charts 2x2 grid

---

## 🔄 **Data Architecture**

### **Query Strategy: Bucket Approach**

The spec recommends **5 separate endpoints** for granular caching:

**Bucket 1: Aggregated Metrics (KPIs)**
- Single endpoint: `GET /api/analytics/metrics`
- Cache TTL: 5 minutes
- Payload: ~200 bytes
- Used by: 4 metric cards

**Bucket 2: Time Series Data (Charts)**
- 4 separate endpoints (one per chart)
- Cache TTL: 10 minutes
- Payload: 2-10KB each
- Allows lazy loading of charts

**Alternative:** Single "uber-endpoint" `/api/analytics/dashboard` (simpler but less flexible)

**Recommendation:** Use **Bucket Strategy** for optimal caching and performance.

---

## 📡 **API Contract - Read Queries**

### **1. Get Aggregated Metrics**

**Endpoint:** `GET /api/analytics/metrics`

**Request:**
```json
{
  "date_from": "2025-11-22T00:00:00Z",
  "date_to": "2025-12-22T23:59:59Z",
  "timezone": "America/Sao_Paulo"
}
```

**Response:**
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

**Calculations:**
- `total_volume`: Sum of ALL completed payments (in + out) in BRL equivalent
- `total_payments`: Count of completed payments
- `avg_conversion_rate`: (Completed / Created) * 100 (excludes pending from denominator)
- `net_fees`: Fees received from customers - Fees paid to Crossramp/networks
- `change_percent`: Comparison with previous period of same duration

---

### **2. Get Volume Time Series**

**Endpoint:** `GET /api/analytics/volume-series`

**Request:**
```json
{
  "date_from": "2025-11-22T00:00:00Z",
  "date_to": "2025-12-22T23:59:59Z",
  "granularity": "daily",
  "timezone": "America/Sao_Paulo"
}
```

**Response:**
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

**Granularity Auto-Detection (Backend):**
- ≤7 days → `daily`
- 8-30 days → `daily` (max 30 points)
- 31-90 days → `weekly` (max 13 points)
- >90 days → `monthly` (max 12 points)

---

### **3. Get Payments Time Series**

**Endpoint:** `GET /api/analytics/payments-series`

**Response Structure:**
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

**Chart Type:** Stacked bar chart with 8 categories
**Colors:** Green (completed), Yellow (pending), Gray (expired), Red (cancelled)

---

### **4. Get Conversion Rate Time Series**

**Endpoint:** `GET /api/analytics/conversion-series`

**Response Structure:**
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

**Chart Type:** Line chart with 3 series (In, Out, Combined)

---

### **5. Get Fees Time Series**

**Endpoint:** `GET /api/analytics/fees-series`

**Response Structure:**
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

**Chart Type:** Bar chart with 2 bars per period (Paid vs Received)
**Colors:** Red (fees paid), Green (fees received)

---

## 🎨 **Component Details**

### **DateRangeSelector Component**

**Features:**
- Presets: Last 7 days, Last 30 days, Last 90 days, This month, Last month, Custom
- Custom mode: From/To date pickers
- Default: Last 30 days
- On change → Refetch ALL queries

**Props:**
```typescript
interface DateRangeSelectorProps {
  value: { from: string; to: string };
  onChange: (range: { from: string; to: string }) => void;
  presets?: DateRangePreset[];
}
```

---

### **Metric Cards**

**Structure:**
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number; // Percent change vs previous period
  currency?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}
```

**Visual Design:**
- Rounded card with soft shadow
- Large value (2xl font)
- Change indicator: ↑ green (positive), ↓ red (negative), → gray (neutral)
- Skeleton loader when loading
- Icon in top-right corner

---

### **Chart Components**

**Common Props:**
```typescript
interface BaseChartProps {
  data: TimeSeriesDataPoint[];
  loading?: boolean;
  error?: string;
  granularity: 'daily' | 'weekly' | 'monthly';
  currency?: string;
  onRetry?: () => void;
}
```

**Library:** `recharts`

**Common Features:**
- Responsive container
- Tooltip on hover
- Legend (can be toggled)
- Loading state: Skeleton placeholder
- Error state: "Failed to load data" + Retry button
- Empty state: "No data available for selected period"

---

## 🧮 **Metric Calculations Explained**

### **1. Total Volume**
```
total_volume = SUM(payments.amount WHERE status='completed' AND date BETWEEN from AND to)
// Multi-currency: Convert to BRL at transaction date rate
```

**Example:**
- 100 payments in × R$1,000 = R$100,000
- 50 payments out × R$800 = R$40,000
- **Total = R$140,000**

---

### **2. Total Payments**
```
total_payments = COUNT(payments WHERE status='completed' AND date BETWEEN from AND to)
```

**Note:** Count only, not value. Excludes pending/expired/cancelled.

---

### **3. Conversion Rate**
```
conversion_rate = (completed / (completed + expired + cancelled)) * 100
// Excludes pending from denominator (still can convert)
```

**Interpretation:**
- 70-80% = Excellent
- 50-70% = Reasonable
- <50% = Problem (UX issues, bugs, high fees)

---

### **4. Net Fees**
```
fees_received = SUM(payments_in.fee_amount WHERE fee_payer='customer')
fees_paid = SUM(payments_out.network_fee + crossramp_fee)
net_fees = fees_received - fees_paid
```

**Interpretation:**
- Positive = Merchant is "winning" with fee structure
- Negative = Merchant absorbing fees (growth strategy)
- Zero = Fee-neutral

---

## ⚠️ **Edge Cases & Handling**

### **1. Date Range Too Long (>365 days)**
- Backend returns `granularity=monthly` (12 points)
- Show warning: "⚠️ Long date ranges are aggregated monthly"
- Consider max limit of 180 days for performance

### **2. Date Range in Future**
- Frontend validation: `date_to` ≤ now
- Backend clips to now automatically
- Return warning: "date_to adjusted to current time"

### **3. Zero Data in Period**
- Metrics show zeros (R$0.00, 0 payments, 0%)
- Charts show empty state (not error)
- Message: "No data available. Complete your first transaction to see analytics."

### **4. Conversion Rate >100% (Bug)**
- Backend: `conversion_rate = min(100, calculated_rate)`
- Frontend: `Math.min(100, rate).toFixed(2)`
- Log warning for debugging

### **5. Multi-Currency**
- Convert ALL to BRL using rate at transaction date
- Include `currency_breakdown` in response
- Footnote: "Multi-currency payments converted to BRL at transaction date rate"

### **6. Timezone Mismatch**
- Frontend sends `timezone: "America/Sao_Paulo"` in all queries
- Backend groups by date using merchant timezone
- Response includes `timezone_applied`

### **7. Change Percent Undefined (First Period)**
- Backend returns `change_percent: null`
- Frontend shows "New" badge or omits trend arrow

---

## 🛠️ **Implementation Steps**

### **Phase 1: Foundation (Queries & Types)** ⏱️ 3 hours
1. Add TypeScript interfaces to `/src/app/lib/queries.ts`:
   - `AnalyticsMetrics`
   - `VolumeSeriesDataPoint`
   - `PaymentsSeriesDataPoint`
   - `ConversionSeriesDataPoint`
   - `FeesSeriesDataPoint`
   - Request/Response types
2. Implement 5 query functions:
   - `queryAnalyticsMetrics()`
   - `queryVolumeTimeSeries()`
   - `queryPaymentsTimeSeries()`
   - `queryConversionTimeSeries()`
   - `queryFeesTimeSeries()`
3. Create mock data for all 5 endpoints (realistic time series)
4. Test queries in isolation

### **Phase 2: Date Range Selector** ⏱️ 2 hours
1. Create `/src/app/components/analytics/DateRangeSelector.tsx`
2. Implement presets (Last 7/30/90 days, This/Last month, Custom)
3. Add custom date pickers (From/To)
4. Add validation (to ≥ from, to ≤ now)
5. Add translations to `strings.ts`

### **Phase 3: Metric Cards** ⏱️ 2 hours
1. Create reusable `MetricCard` component
2. Implement 4 specific cards:
   - Volume Overview Card
   - Payments Overview Card
   - Conversion Rate Card
   - Net Fees Card
3. Add loading skeletons
4. Add change percent indicators (arrows + colors)
5. Add icons (TrendingUp, Users, Target, DollarSign)

### **Phase 4: Chart Components** ⏱️ 6 hours
1. Install `recharts` if not present
2. Create `/src/app/components/analytics/VolumeOverviewChart.tsx`:
   - Line chart with 3 series
   - Responsive container
   - Tooltip + Legend
3. Create `/src/app/components/analytics/PaymentsOverviewChart.tsx`:
   - Stacked bar chart with 8 categories
   - Custom colors per status
4. Create `/src/app/components/analytics/ConversionRateChart.tsx`:
   - Line chart with 3 series
   - Y-axis in % (0-100)
5. Create `/src/app/components/analytics/FeesChart.tsx`:
   - Bar chart with 2 series
   - Red (paid) vs Green (received)
6. Add loading/error/empty states to all charts

### **Phase 5: Main View Integration** ⏱️ 3 hours
1. Create `/src/app/views/AnalyticsView.tsx`
2. Add RBAC check (Admin/Ops/Analyst only)
3. Integrate DateRangeSelector with state management
4. Add useQuery hooks for all 5 endpoints
5. Pass date range to all queries
6. Implement manual refresh button
7. Add responsive grid layout (4 cols → 2 cols → 1 col)
8. Add export suggestion banner (collapsed by default)

### **Phase 6: Translations** ⏱️ 1 hour
1. Add ~50 translation keys to `strings.ts`:
   - Analytics page titles
   - Metric labels
   - Chart labels
   - Date range presets
   - Empty/error states
   - Tooltips
2. Add Portuguese translations
3. Add Spanish translations

### **Phase 7: Polish & Testing** ⏱️ 2 hours
1. Test all date range presets
2. Test custom date range validation
3. Test loading states (throttle network)
4. Test error states (disconnect network)
5. Test empty states (new merchant)
6. Test RBAC (different roles)
7. Test responsive breakpoints
8. Fix any bugs found

---

## ⏱️ **Total Estimated Time**

| Phase | Time | Critical Path |
|-------|------|---------------|
| 1. Foundation | 3h | ✅ Yes |
| 2. Date Range Selector | 2h | ✅ Yes |
| 3. Metric Cards | 2h | ⚠️ Parallel with Charts |
| 4. Chart Components | 6h | ✅ Yes (longest) |
| 5. Main View | 3h | ✅ Yes |
| 6. Translations | 1h | ⚠️ Can be done anytime |
| 7. Polish & Testing | 2h | ⚠️ Final step |
| **TOTAL** | **19 hours** | |

**Estimated Completion:** ~2.5 days (with breaks and debugging time)

---

## 📦 **Dependencies**

### **External Libraries:**
- ✅ `recharts` - Already used in project (check package.json)
- ✅ `date-fns` - For date manipulation (likely already installed)
- ✅ `lucide-react` - For icons

### **Internal Dependencies:**
- ✅ `useQuery` hook - Already implemented
- ✅ `useStrings` hook - Already implemented
- ✅ `useAuth` hook - For RBAC
- ⚠️ DateRangeSelector - Need to create (or check if exists from other features)

---

## 🎯 **Success Criteria**

### **Functional Requirements:**
- ✅ All 5 queries work with mock data
- ✅ Date range selector filters all data
- ✅ All 4 metric cards display correctly
- ✅ All 4 charts render with proper data
- ✅ Loading states work smoothly
- ✅ Error states show retry button
- ✅ Empty states are informative
- ✅ RBAC enforced (Developer denied)
- ✅ Responsive on mobile/tablet/desktop
- ✅ Manual refresh button works

### **Quality Requirements:**
- ✅ TypeScript interfaces match API contract
- ✅ No console errors
- ✅ Translations complete (EN/PT/ES)
- ✅ Charts are accessible (ARIA labels)
- ✅ Performance: <2s load time with mock data
- ✅ Code follows existing patterns (useQuery, t(), etc.)

---

## 🚀 **Next Steps**

### **Option A: Full Implementation (19 hours)**
Implement the entire Analytics feature end-to-end following the 7 phases above.

### **Option B: MVP Implementation (10 hours)**
Implement core functionality only:
1. Foundation queries (3h)
2. Date range selector (2h)
3. Metric cards only (2h)
4. Main view with cards (2h)
5. Basic translations (1h)

**Skip for MVP:**
- Chart components (can add later)
- Export suggestion banner
- Full PT/ES translations

### **Option C: Assessment Only**
Document the requirements and wait for backend API implementation before starting frontend.

---

## 💡 **Recommendations**

1. **Start with Phase 1 (Foundation)** - Get queries and types working first
2. **Check if DateRangeSelector exists** - May already be implemented for Payments/Disputes
3. **Reuse MetricCard pattern** - Similar to Templates feature metric cards
4. **Use Recharts** - It's already in the project and works well
5. **Mock data quality** - Create realistic time series data (30+ points) for testing
6. **Responsive testing** - Test on actual mobile device, not just browser DevTools
7. **Cache strategy** - Implement proper cache invalidation when date range changes
8. **Granularity UI** - Show current granularity to user ("Showing daily data" badge)

---

## ⚠️ **Risks & Mitigation**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Recharts performance with large datasets | Medium | Limit data points (max 90), use virtualization if needed |
| Date range validation edge cases | Low | Comprehensive validation in DateRangeSelector |
| Timezone handling complexity | Medium | Always send timezone in requests, test with multiple timezones |
| Chart rendering on mobile | Low | Use ResponsiveContainer, test on real devices |
| Empty state confusion | Low | Clear messaging: "No data yet" vs "Error loading" |
| Backend API not ready | High | Use mock mode extensively, design to match spec |

---

## 📝 **Notes**

- **No write actions:** This is 100% read-only, so no MFA, no commands, simpler than Templates/Disputes
- **Category A queries:** Manual refresh only (no auto-polling like Disputes)
- **Granularity is backend-controlled:** Frontend just displays what backend returns
- **Multi-currency:** Backend handles conversion, frontend just displays BRL
- **Change percent:** Nice-to-have feature, can be null for new merchants
- **Export feature:** Future enhancement, just show suggestion banner for now

---

**End of Assessment** 📊
