# Withdrawal Confirmation Page Integration

## Overview

When a withdrawal request returns `200 OK` with a `url` field, the Crossramp dashboard will open this URL in an embedded modal (iframe). This allows you to handle conversion preview, final confirmation, and processing status on your own checkout page.

## Implementation Flow

1. **User submits withdrawal** → MFA verification → POST `/api/withdrawals/request`
2. **API returns 200** with payload:
   ```json
   {
     "status": "success",
     "url": "https://checkout.noxpay.io/e2e/NOX8296A0F2EB0B4F5880682641D228B6E2"
   }
   ```
3. **Dashboard opens modal** with iframe embedding the returned URL
4. **Your confirmation page** displays conversion preview, fees, final amount, etc.
5. **User confirms** on your page → Backend processes withdrawal
6. **Your page closes modal** by sending message to parent window

## Closing the Modal from Your Page

When the withdrawal process is complete (successful or cancelled), your confirmation page should send a `postMessage` to close the modal.

### JavaScript Code to Add

Add this script to your confirmation/checkout page:

```javascript
// Function to close the withdrawal modal
function closeWithdrawalModal() {
  // Send message to parent window (Crossramp dashboard)
  if (window.parent && window.parent !== window) {
    window.parent.postMessage('WITHDRAWAL_COMPLETE', '*');
  }
}

// Example: Call this when user completes the flow
// (e.g., after clicking "Confirm Withdrawal" or "Cancel")
document.getElementById('confirm-button')?.addEventListener('click', () => {
  // Your withdrawal confirmation logic here
  processWithdrawal().then(() => {
    // Close modal after successful processing
    closeWithdrawalModal();
  });
});

document.getElementById('cancel-button')?.addEventListener('click', () => {
  // Close modal on cancel
  closeWithdrawalModal();
});
```

### Alternative: Auto-close after Success

If you want to auto-close after a delay (e.g., showing success message for 2 seconds):

```javascript
function showSuccessAndClose() {
  // Show success UI
  document.getElementById('success-message').style.display = 'block';
  
  // Close modal after 2 seconds
  setTimeout(() => {
    closeWithdrawalModal();
  }, 2000);
}
```

### Security Notes

The Crossramp dashboard validates the origin of postMessage events. Allowed origins:
- `https://checkout.noxpay.io`
- `https://checkout.crossramp.io`
- `http://localhost:*` (development only)

If you use a different domain for your checkout, you'll need to add it to the `allowedOrigins` array in `/src/app/components/modals/WithdrawalConfirmationModal.tsx`.

## Message Format Options

Your page can send either:

### Option 1: Simple string
```javascript
window.parent.postMessage('WITHDRAWAL_COMPLETE', '*');
```

### Option 2: Object with type (recommended)
```javascript
window.parent.postMessage({
  type: 'WITHDRAWAL_COMPLETE',
  withdrawalId: 'wdr_123456',  // Optional: include metadata
  status: 'success'             // Optional: 'success' | 'cancelled'
}, '*');
```

Both formats are supported by the dashboard.

## Example Complete Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Withdrawal</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .preview {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    .button {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      margin: 0.5rem;
    }
    .primary { background: #10b981; color: white; }
    .secondary { background: #e5e7eb; color: #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Confirm Withdrawal</h1>
    
    <div class="preview">
      <h3>Conversion Preview</h3>
      <p><strong>From:</strong> 5,000 USDT</p>
      <p><strong>Exchange Rate:</strong> 1 USDT = R$ 5.00</p>
      <p><strong>Subtotal:</strong> R$ 25,000.00</p>
      <p><strong>Fee (2%):</strong> R$ 500.00</p>
      <hr>
      <p><strong>Final Amount:</strong> R$ 24,500.00</p>
      <p><small>Destination: Company Account (company@bank.com)</small></p>
    </div>

    <div id="actions">
      <button class="button primary" id="confirm-btn">Confirm Withdrawal</button>
      <button class="button secondary" id="cancel-btn">Cancel</button>
    </div>

    <div id="success-message" style="display: none;">
      <h2>✓ Withdrawal Confirmed</h2>
      <p>Funds will arrive in 1-2 business days.</p>
    </div>
  </div>

  <script>
    // Close modal function
    function closeWithdrawalModal() {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'WITHDRAWAL_COMPLETE',
          status: 'success'
        }, '*');
      }
    }

    // Confirm button
    document.getElementById('confirm-btn').addEventListener('click', async () => {
      // Call your backend to process withdrawal
      const response = await fetch('/api/withdrawal/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: 'wdr_123' })
      });

      if (response.ok) {
        // Show success message
        document.getElementById('actions').style.display = 'none';
        document.getElementById('success-message').style.display = 'block';

        // Close modal after 2 seconds
        setTimeout(closeWithdrawalModal, 2000);
      }
    });

    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', () => {
      closeWithdrawalModal();
    });
  </script>
</body>
</html>
```

## Testing

### Local Testing
1. Run your checkout page on `http://localhost:3000` (or any port)
2. Update the withdrawal API mock to return:
   ```json
   {
     "url": "http://localhost:3000/withdrawal-confirm.html"
   }
   ```
3. Submit a withdrawal in the dashboard
4. Modal should open with your page embedded
5. Click confirm/cancel → Modal should close

### Production Testing
1. Deploy your confirmation page to `https://checkout.noxpay.io`
2. API should return the production URL
3. Test full flow with real conversion rates and fees

## Troubleshooting

### Modal doesn't close
- **Check browser console** for postMessage errors
- **Verify origin** is in the `allowedOrigins` list
- **Ensure script runs** after DOM is loaded
- **Test with simple alert**: `window.parent.postMessage('test', '*')` → Should appear in dashboard console

### Iframe not loading
- **Check CORS headers** on your checkout page
- **Verify URL is HTTPS** (HTTP only allowed in development)
- **Check X-Frame-Options** header (should allow embedding)
- **CSP headers** should allow iframe embedding

### postMessage not received
- **Check parent exists**: `console.log(window.parent !== window)` (should be `true`)
- **Try wildcard origin**: Use `'*'` for testing (restrict in production)
- **Check message format**: Try both string and object formats

## Security Best Practices

1. **Validate origin on your side** when receiving messages from parent
2. **Use HTTPS** for production checkout URLs
3. **Implement CSRF tokens** for withdrawal confirmation
4. **Rate limit** confirmation requests
5. **Add timeout** for abandoned confirmations (auto-cancel after 15 min)
6. **Log all attempts** for audit trail

## Future Enhancements

- **Bi-directional messaging**: Parent sends withdrawal details → iframe receives → No need to fetch again
- **Progress updates**: Send multiple messages (`'PROCESSING'`, `'CONVERTING'`, `'COMPLETE'`)
- **Error handling**: Send error messages to display in dashboard toast
- **Deep linking**: Support `?withdrawal_id=xxx` parameter for page reload scenarios

---

**Questions?** Contact the Crossramp integration team.
