# 🚀 Crossramp Dashboard - Homologation Ready

## Quick Start for Homologation Testing

### Current Status: ✅ Query System Ready

The application is now ready for homologation (staging/testing phase). All data fetching has been normalized and centralized.

---

## 🎯 What's Been Done

### 1. Centralized Query System
- **Location:** `/src/app/lib/queries.ts`
- **Coverage:** 15 query functions covering all data needs
- **Mock Data:** Complete mock datasets for all queries
- **Type Safety:** Full TypeScript types for all data structures

### 2. React Hooks
- **Location:** `/src/app/hooks/useQuery.ts`
- **Features:**
  - Loading states
  - Error handling
  - Auto-refetch support
  - Pagination support
  - Auth token injection

### 3. Reference Implementation
- **TemplatesView:** Fully migrated to use centralized queries
- **Pattern:** Can be replicated for all other views
- **Working:** Loads mock data, handles errors, supports refetch

---

## 📂 Key Files

```
/
├── .env.example                     # Environment configuration template
├── HOMOLOGATION_README.md           # This file
├── /docs/
│   ├── QUERY_NORMALIZATION.md      # Technical documentation
│   ├── MIGRATION_CHECKLIST.md       # View migration tracking
│   ├── FEATURE_SECURITY.md          # Security page docs
│   └── FEATURE_SUPPORT.md           # Support page docs
├── /src/app/
│   ├── /lib/
│   │   └── queries.ts               # ✅ ALL QUERIES HERE
│   ├── /hooks/
│   │   └── useQuery.ts              # React query hooks
│   └── /views/
│       └── TemplatesView.tsx        # ✅ Reference implementation
```

---

## 🔧 Environment Configuration

### Step 1: Copy Environment File

```bash
cp .env.example .env.local
```

### Step 2: Choose Your Mode

#### Option A: Mock Mode (Default - No Backend Needed)
```bash
# .env.local
VITE_ENABLE_MOCK_AUTH=true
VITE_ENABLE_MOCK_QUERIES=true
```

**Use for:**
- UI development
- Frontend testing
- Demo purposes

#### Option B: Real Auth + Mock Queries
```bash
# .env.local
VITE_ENABLE_MOCK_AUTH=false
VITE_ENABLE_MOCK_QUERIES=true
VITE_AUTH0_DOMAIN=crossramp-staging.auth0.com
VITE_AUTH0_CLIENT_ID=your_staging_client_id
VITE_AUTH0_AUDIENCE=https://api-staging.crossramp.io
```

**Use for:**
- Auth integration testing
- Testing JWT flows
- MFA testing

#### Option C: Full Homologation (Real Everything)
```bash
# .env.local
VITE_ENABLE_MOCK_AUTH=false
VITE_ENABLE_MOCK_QUERIES=false
VITE_AUTH0_DOMAIN=crossramp-staging.auth0.com
VITE_AUTH0_CLIENT_ID=your_staging_client_id
VITE_AUTH0_AUDIENCE=https://api-staging.crossramp.io
VITE_API_BASE_URL=https://api-staging.crossramp.io/v1
```

**Use for:**
- Backend integration testing
- Full system testing
- Pre-production validation

---

## 🏃 Running the Application

### Development Mode
```bash
npm install
npm run dev
```

Opens at: http://localhost:5173

### Production Build (Testing)
```bash
npm run build
npm run preview
```

Opens at: http://localhost:4173

---

## 📊 Available Queries (15 Total)

### Core Business Logic
1. **Accounts/Balances** - `queryAccounts()`
2. **Templates** - `queryTemplates()`, `queryTemplateById(id)`
3. **Transactions** - `queryTransactions(params)`
4. **Whitelist** - `queryWhitelist(params)`
5. **Disputes** - `queryDisputes(params)`

### Developer/Admin
6. **API Keys** - `queryAPIKeys(params)`
7. **Security/MFA** - `queryMFAStatus()`
8. **Company Profile** - `queryCompanyProfile()`

### Analytics
9. **Payments Overview** - `queryPaymentsOverview(dateRange)`
10. **Volume Overview** - `queryVolumeOverview(dateRange)`
11. **Conversion Rates** - `queryConversionRates(dateRange)`
12. **Fees** - `queryFees(dateRange)`

### Reports
13. **Reputation Statement** - `queryReputationStatement(params)`
14. **Withdrawal Accounts** - `queryWithdrawalAccounts()`

---

## 🔌 Backend Integration Checklist

When integrating with real backend:

### 1. API Endpoints Required

All endpoints should be at `${VITE_API_BASE_URL}/...`

```
GET  /accounts
GET  /templates
GET  /templates/:id
GET  /transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&status=X&type=Y
GET  /whitelist?type=pix|wallet
GET  /disputes?status=open|investigating|resolved|closed
GET  /api-keys?environment=live|test
GET  /security/mfa
GET  /company/profile
GET  /analytics/payments-overview?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /analytics/volume-overview?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /analytics/conversion-rates?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /analytics/fees?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /reputation/statement?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /withdrawal/accounts
```

### 2. Authentication

All requests include:
```
Authorization: Bearer {jwt_token}
```

Token obtained from Auth0, contains:
- `sub`: User ID
- `email`: User email
- `app_metadata`: { merchant_id, role, ... }

### 3. Response Format

All responses should be JSON matching TypeScript interfaces in `/src/app/lib/queries.ts`

Example:
```typescript
// GET /templates
[
  {
    "id": "template_001",
    "name": "Standard Checkout",
    "currency_code": "BRL",
    "color": "#ff4c00",
    "feeBehavior": "Customer pays",
    "extraPercentageFees": "None",
    "extraFlatFees": "None",
    "createdAt": "2025-01-10T00:00:00.000Z"
  }
]
```

### 4. Error Handling

Standard HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Template name is required",
  "fields": {
    "name": "Cannot be empty"
  }
}
```

### 5. Pagination

Support query parameters:
```
?limit=20&offset=0
```

Return format (optional, can also just return array):
```json
{
  "data": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

---

## 🧪 Testing Procedures

### Manual Testing (Mock Mode)

1. Start dev server: `npm run dev`
2. Navigate through all pages
3. Verify data loads
4. Check loading states
5. Test error scenarios (disable network in DevTools)

**Expected:** All pages show mock data, no errors in console

### Integration Testing (Real API)

1. Set `.env.local` to real API mode
2. Start dev server: `npm run dev`
3. Login with Auth0
4. Navigate through all pages
5. Verify data matches backend

**Expected:** All pages show real data from API

### Error Testing

1. Disconnect from network
2. Navigate to any page
3. Verify error state shows

**Expected:** User-friendly error message, no crash

### Loading Testing

1. Throttle network to "Slow 3G" in DevTools
2. Navigate to any page
3. Verify loading state shows

**Expected:** Loading skeleton/spinner appears

---

## 🐛 Troubleshooting

### Issue: All queries return mock data even with VITE_ENABLE_MOCK_QUERIES=false

**Solution:**
1. Check `.env.local` file is in root directory
2. Restart dev server after changing env vars
3. Verify env vars with `console.log(import.meta.env)`

### Issue: 401 Unauthorized errors

**Solution:**
1. Verify Auth0 credentials in `.env.local`
2. Check JWT token in Network tab
3. Verify backend expects `Authorization: Bearer {token}`
4. Confirm Auth0 audience matches backend API URL

### Issue: TypeScript errors about missing properties

**Solution:**
1. Backend response doesn't match TypeScript interface
2. Check response in Network tab
3. Update interface in `queries.ts` OR ask backend to match interface
4. Prefer backend matching interface (API contract)

### Issue: Page shows "Loading..." forever

**Solution:**
1. Check Network tab for failed requests
2. Check Console for errors
3. Verify API endpoint exists
4. Check CORS configuration on backend

---

## 📝 Next Steps

### Immediate (Week 1)
- [ ] Migrate remaining views to use centralized queries
- [ ] Test all pages in mock mode
- [ ] Document any query changes needed

### Short-term (Week 2-3)
- [ ] Backend implements API endpoints
- [ ] Validate API responses match TypeScript types
- [ ] Integration testing with staging API

### Medium-term (Week 4-5)
- [ ] Full homologation testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Production deployment

---

## 📞 Support

### For Frontend Issues
- Check `/docs/QUERY_NORMALIZATION.md` for query details
- Check `/docs/MIGRATION_CHECKLIST.md` for migration status
- Review reference implementation in `TemplatesView.tsx`

### For Backend Integration
- Refer to API endpoint mapping in `QUERY_NORMALIZATION.md`
- Check TypeScript interfaces in `queries.ts`
- Validate response formats match exactly

### For Auth Issues
- Check Auth0 documentation
- Verify credentials in `.env.local`
- Test with Auth0 dashboard logs

---

## ✅ Success Criteria

**Ready for Production when:**
- [ ] All views use centralized queries
- [ ] Mock mode works perfectly
- [ ] Real API mode works perfectly
- [ ] Loading states work everywhere
- [ ] Error handling works everywhere
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Auth integration works
- [ ] MFA flow works
- [ ] All API responses validated
- [ ] Performance is acceptable (<3s page load)
- [ ] Security audit passed

---

## 🎉 Current Achievement

✅ **Query normalization complete**  
✅ **Mock data ready for all queries**  
✅ **Reference implementation working**  
✅ **Environment configuration ready**  
✅ **Documentation complete**  
🔄 **View migration in progress**  
⏳ **Backend integration pending**  

**Bottom Line:** Frontend is ready for backend integration. Just flip the environment variables when backend is ready! 🚀

---

**Last Updated:** December 22, 2024  
**Version:** 1.0.0  
**Status:** Ready for Homologation 🟢
