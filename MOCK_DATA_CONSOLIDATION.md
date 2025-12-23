# Mock Data Consolidation Summary

## Issue #3: Centralized Mock Mode

### Problem
Mock datasets and simulated API calls were scattered across multiple views and components, defeating the centralized query system purpose and causing inconsistent mock mode behavior.

### Solution Applied ✅

**Centralized Query Functions Added to `/src/app/lib/queries.ts`:**

1. **Team Users** - `queryTeamUsers()`
   - Used by: `AddUserView.tsx`
   - Mock: 4 users with roles (admin, operator, analyst)

2. **PIX Keys** - `queryPIXKeys()`
   - Used by: `WhitelistView.tsx`
   - Mock: 3 PIX keys (email, phone, CPF types)

3. **Whitelist Groups** - `queryWhitelistGroups()`
   - Used by: `WhitelistView.tsx`
   - Mock: 3 groups with crypto wallet entries

4. **Statement Transactions** - `queryStatementTransactions()`
   - Used by: `StatementView.tsx`
   - Mock: 5 transactions with credits/debits

5. **Reputation Records** - `queryReputationRecords()`
   - Used by: `ReputationStatementView.tsx`
   - Mock: 4 reputation events with scores

**Existing Queries Already in Place:**
- `queryAPIKeys()` - For APIIntegrationView
- `queryDisputes()` - For DisputesView  
- `queryMFAStatus()` - For SecurityView
- `queryCompanyProfile()` - For CompanyProfileView
- `queryTransactions()` - For TransactionsView
- `queryTemplates()` - For TemplatesView (already migrated)

### Views To Update

**Priority 1 - Simple Replacements:**
- [x] `AddUserView.tsx` - Use `queryTeamUsers()` ✅
- [ ] `SecurityView.tsx` - Use `queryMFAStatus()`
- [ ] `CompanyProfileView.tsx` - Use `queryCompanyProfile()`
- [ ] `API IntegrationView.tsx` - Use `queryAPIKeys()`

**Priority 2 - Moderate Complexity:**
- [ ] `DisputesView.tsx` - Use `queryDisputes()`
- [ ] `StatementView.tsx` - Use `queryStatementTransactions()`
- [ ] `ReputationStatementView.tsx` - Use `queryReputationRecords()`

**Priority 3 - Complex (Multiple Data Sources):**
- [ ] `WhitelistView.tsx` - Use `queryPIXKeys()` + `queryWhitelistGroups()`
- [ ] `TransactionsView.tsx` - Use `queryTransactions()`

**Modal Updates:**
- [ ] `ReceivePaymentModal.tsx` - Use `queryTemplates()`

### Benefits

1. **Single Source of Truth** - All mock data in one place
2. **Consistent Mock Mode** - Runtime config controls all mocks
3. **Easy Testing** - Toggle mock mode via config.js
4. **Production Ready** - Same queries work for mock and real API
5. **Maintainable** - Update mock data in one location

### Testing Strategy

```bash
# Test with mock mode (default)
npm run dev
# All views should load mock data from queries.ts

# Test with real API (when available)
# Edit /public/config.js
api: { enabled: true, baseUrl: 'https://api-dev.crossramp.io' }
npm run dev
# All views should fetch from real API
```

### Status

**Queries Added:** ✅ Complete (5 new query functions)  
**Views Updated:** 🔄 In Progress (1/9)  
**Next:** Update remaining 8 views to use centralized queries  

---

**Last Updated:** December 23, 2024
