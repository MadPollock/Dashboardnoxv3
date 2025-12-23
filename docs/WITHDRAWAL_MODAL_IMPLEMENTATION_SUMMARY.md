# Withdrawal Modal Implementation - Summary

## What Was Implemented

The withdrawal flow has been updated to support an embedded confirmation/checkout page via iframe modal. When your API returns a `url` field, the dashboard will open it in a modal for conversion preview, fee display, and final confirmation.

## Files Created/Modified

### New Files

1. **`/src/app/components/modals/WithdrawalConfirmationModal.tsx`**
   - Modal component that embeds your checkout page in an iframe
   - Listens for `postMessage` events to close the modal
   - Security: Validates message origin against allowed domains
   - Responsive design with loader while iframe loads

2. **`/docs/WITHDRAWAL_CONFIRMATION_INTEGRATION.md`**
   - Complete integration guide for your checkout page
   - JavaScript code to close the modal via `postMessage`
   - Example HTML page with conversion preview
   - Security best practices and troubleshooting

3. **`/docs/API_WITHDRAWAL_REQUEST.md`**
   - API contract for `POST /api/withdrawals/request`
   - Request/response payload specifications
   - Error codes and validation rules
   - Backend processing flow

4. **`/docs/WITHDRAWAL_MODAL_IMPLEMENTATION_SUMMARY.md`** (this file)
   - Quick reference for the implementation

### Modified Files

1. **`/src/app/components/admin/WithdrawalRequestForm.tsx`**
   - Added state for confirmation URL and modal visibility
   - Updated `handleWithdrawal` to check for `response.url`
   - Opens `WithdrawalConfirmationModal` when URL is returned
   - Resets form after modal is closed
   - Added `handleCloseConfirmation` to clean up state

2. **`/src/app/components/admin/ProtectedActionForm.tsx`**
   - Changed `onSubmit` return type from `Promise<void>` to `Promise<any>`
   - Allows form handlers to return API response data

3. **`/src/app/content/strings.ts`**
   - Added translations for `withdrawal.confirmation.title`:
     - English: "Confirm Withdrawal"
     - Portuguese: "Confirmar Saque"
     - Spanish: "Confirmar Retiro"

## How It Works

### Flow Diagram

```
User fills withdrawal form
         ↓
Clicks "Submit (Requires MFA)"
         ↓
MFA modal appears
         ↓
User enters MFA code
         ↓
POST /api/withdrawals/request
         ↓
API returns 200 OK with { url: "https://checkout.noxpay.io/..." }
         ↓
Dashboard opens WithdrawalConfirmationModal
         ↓
Modal embeds checkout URL in iframe
         ↓
User sees conversion preview, fees, final amount
         ↓
User clicks "Confirm" on your checkout page
         ↓
Your page sends: window.parent.postMessage('WITHDRAWAL_COMPLETE', '*')
         ↓
Modal closes automatically
         ↓
Form resets to initial state
```

## What You Need to Do on Your Side

### 1. Update API Response

Make sure `POST /api/withdrawals/request` returns:

```json
{
  "status": "success",
  "url": "https://checkout.noxpay.io/e2e/NOX8296A0F2EB0B4F5880682641D228B6E2",
  "withdrawal_id": "wdr_abc123"
}
```

### 2. Add Close Script to Your Checkout Page

Add this JavaScript to your confirmation page:

```javascript
// Close modal when withdrawal is complete
function closeWithdrawalModal() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage('WITHDRAWAL_COMPLETE', '*');
  }
}

// Call this after user confirms or cancels
document.getElementById('confirm-button').addEventListener('click', () => {
  // Your processing logic here
  processWithdrawal().then(() => {
    closeWithdrawalModal(); // Close modal after success
  });
});

document.getElementById('cancel-button').addEventListener('click', () => {
  closeWithdrawalModal(); // Close modal on cancel
});
```

### 3. Configure Allowed Origins (Optional)

If your checkout domain is NOT `checkout.noxpay.io` or `checkout.crossramp.io`, update the allowed origins in:

**File:** `/src/app/components/modals/WithdrawalConfirmationModal.tsx`

```typescript
const allowedOrigins = [
  'https://checkout.noxpay.io',
  'https://checkout.crossramp.io',
  'https://your-custom-domain.com', // Add your domain here
];
```

## Testing Checklist

### Local Development

- [ ] Mock API returns `{ "url": "http://localhost:3000/test-withdrawal.html" }`
- [ ] Modal opens with iframe embedding the test page
- [ ] Test page has a button that calls `window.parent.postMessage('WITHDRAWAL_COMPLETE', '*')`
- [ ] Modal closes when message is sent
- [ ] Form resets after modal closes

### Production Testing

- [ ] API returns HTTPS URL (e.g., `https://checkout.noxpay.io/...`)
- [ ] Checkout page displays conversion preview correctly
- [ ] Fees and final amount are accurate
- [ ] "Confirm" button processes withdrawal and closes modal
- [ ] "Cancel" button closes modal without processing
- [ ] X-Frame-Options header allows embedding
- [ ] CORS headers are configured correctly

## Security Features Implemented

✅ **Origin Validation**: Modal only accepts messages from trusted domains  
✅ **Iframe Sandbox**: Limited permissions (`allow-same-origin allow-scripts allow-forms`)  
✅ **HTTPS Enforcement**: Only HTTPS URLs in production (HTTP allowed for localhost)  
✅ **Message Type Check**: Validates message is `WITHDRAWAL_COMPLETE` before closing  
✅ **MFA Required**: All withdrawals require MFA verification before modal opens  

## Troubleshooting

### Modal doesn't close

**Problem:** Clicking confirm/cancel on checkout page doesn't close modal  
**Solution:** 
1. Open browser console
2. Check if `postMessage` is being called: `console.log('Sending message')` before `window.parent.postMessage(...)`
3. Verify your domain is in `allowedOrigins` array
4. Test with simple: `window.parent.postMessage('WITHDRAWAL_COMPLETE', '*')`

### Iframe shows blank/loading forever

**Problem:** Checkout page doesn't load in iframe  
**Solution:**
1. Check browser console for CORS errors
2. Verify URL is HTTPS (HTTP only works on localhost)
3. Check `X-Frame-Options` header on your checkout page (should be `SAMEORIGIN` or removed)
4. Verify CSP headers allow iframe embedding

### Modal opens but shows wrong URL

**Problem:** API returns wrong URL or URL is not HTTPS  
**Solution:**
1. Check API response in Network tab: `response.url` field
2. Verify backend is returning correct checkout URL
3. Ensure URL includes withdrawal ID or session token for tracking

## Next Steps

1. **Implement API endpoint** that returns the `url` field
2. **Create checkout page** with conversion preview UI
3. **Add postMessage script** to close modal after confirmation
4. **Test locally** with mock data
5. **Deploy to production** and test with real withdrawals
6. **Monitor** for iframe embedding errors or message failures

## Questions?

Refer to these documentation files:
- **Integration guide:** `/docs/WITHDRAWAL_CONFIRMATION_INTEGRATION.md`
- **API contract:** `/docs/API_WITHDRAWAL_REQUEST.md`
- **Feature docs:** `/docs/FEATURE_WITHDRAW.md`

Or contact the Crossramp development team.

---

**Implementation Date:** 2024-12-22  
**Status:** ✅ Complete and ready for backend integration
