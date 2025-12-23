# Runtime Configuration Migration - Complete! ✅

## What Changed

The Crossramp Dashboard has been migrated from **build-time environment variables** to **runtime configuration files**. This enables S3 + CloudFront deployment without rebuilding for each environment.

---

## Key Changes

### 1. Configuration System
- **Before:** `import.meta.env.VITE_*` variables (build-time)
- **After:** `window.__CROSSRAMP_CONFIG__` object (runtime)

### 2. New Files Created

```
/
├── /src/app/config/
│   └── runtime.ts              ✅ NEW - Runtime config loader
├── /public/
│   ├── config.js               ✅ NEW - Active config (gitignored)
│   ├── config.development.js   ✅ NEW - Mock mode template
│   ├── config.staging.js       ✅ NEW - Staging template
│   ├── config.production.js    ✅ NEW - Production template
│   └── README.md               ✅ NEW - Config documentation
├── /docs/
│   └── DEPLOYMENT_RUNTIME_CONFIG.md  ✅ NEW - Deployment guide
├── .gitignore                  ✅ NEW - Ignore local config.js
└── index.html                  ✅ UPDATED - Loads config.js
```

### 3. Updated Files

| File | Changes |
|------|---------|
| `/index.html` | Added `<script src="/config.js"></script>` |
| `/src/app/lib/queries.ts` | Uses `isMockQueriesEnabled()`, `getApiBaseUrl()` |
| `/src/app/contexts/AuthContext.tsx` | Uses `isMockAuthEnabled()` |
| `/src/app/App.tsx` | Uses `getAuth0Config()` |

---

## How to Use

### Local Development (Mock Mode)

```bash
# Default config.js is already set to mock mode
npm install
npm run dev
```

### Test with Staging Config

```bash
# Copy staging template
cp public/config.staging.js public/config.js

# Edit config.js with your staging credentials
# (replace YOUR_STAGING_CLIENT_ID, etc.)
nano public/config.js

# Start dev server
npm run dev
```

### Build for Deployment

```bash
# Build once (works for all environments)
npm run build

# Output: /dist/ folder with static files
```

### Deploy to S3 (Development)

```bash
npm run build
cp public/config.development.js dist/config.js
aws s3 sync dist/ s3://crossramp-dashboard-dev/ --delete
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

### Deploy to S3 (Staging)

```bash
npm run build
cp public/config.staging.js dist/config.js

# Inject secrets
sed -i "s/YOUR_STAGING_CLIENT_ID/${STAGING_CLIENT_ID}/g" dist/config.js
sed -i "s/YOUR_SENTRY_DSN/${STAGING_SENTRY_DSN}/g" dist/config.js

aws s3 sync dist/ s3://crossramp-dashboard-staging/ --delete
aws cloudfront create-invalidation --distribution-id YYY --paths "/*"
```

### Deploy to S3 (Production)

```bash
npm run build
cp public/config.production.js dist/config.js

# Inject secrets (use AWS Secrets Manager or CI/CD secrets)
aws secretsmanager get-secret-value --secret-id crossramp/dashboard/prod | \
  jq -r '.SecretString' | \
  jq -r '.auth0_client_id' | \
  xargs -I {} sed -i 's/YOUR_PRODUCTION_CLIENT_ID/{}/g' dist/config.js

aws s3 sync dist/ s3://crossramp-dashboard/ --delete
aws cloudfront create-invalidation --distribution-id ZZZ --paths "/*"
```

---

## Configuration Structure

```javascript
window.__CROSSRAMP_CONFIG__ = {
  // Environment
  environment: 'development' | 'staging' | 'production',
  version: '1.0.0',

  // Authentication
  auth: {
    enabled: false,  // false = mock, true = real Auth0
    provider: 'auth0' | 'mock',
    auth0: {  // Only needed if enabled: true
      domain: 'crossramp.auth0.com',
      clientId: 'abc123',
      audience: 'https://api.crossramp.io',
      redirectUri: window.location.origin,
    },
  },

  // API
  api: {
    enabled: false,  // false = mock queries, true = real API
    baseUrl: 'https://api.crossramp.io/v1',
    timeout: 30000,
  },

  // Feature Flags
  features: {
    mfa: true,
    analytics: true,
    disputes: true,
    apiKeys: true,
    // ...
  },

  // Monitoring (optional)
  monitoring: {
    sentry: { dsn: '...', environment: '...' },
    analytics: { googleAnalyticsId: '...' },
  },
};
```

---

## Environment Modes

### Development (Mock Everything)

```javascript
auth: { enabled: false },  // No Auth0 needed
api: { enabled: false },   // No backend needed
```

**Perfect for:**
- Local development
- UI/UX work
- Frontend testing
- Demos

### Staging (Real Services)

```javascript
auth: {
  enabled: true,
  auth0: { domain: 'crossramp-staging.auth0.com', ... },
},
api: {
  enabled: true,
  baseUrl: 'https://api-staging.crossramp.io/v1',
},
```

**Perfect for:**
- Integration testing
- QA testing
- Pre-production validation

### Production (Real Services)

```javascript
auth: {
  enabled: true,
  auth0: { domain: 'crossramp.auth0.com', ... },
},
api: {
  enabled: true,
  baseUrl: 'https://api.crossramp.io/v1',
},
```

**Perfect for:**
- Live users
- Real transactions
- Production monitoring

---

## Benefits

### ✅ Single Build
- Build once, deploy everywhere
- No need to rebuild for config changes
- Faster CI/CD pipelines

### ✅ Easy Updates
- Change config without code changes
- Upload new config.js to S3
- Invalidate CloudFront cache
- Done in 30 seconds!

### ✅ Better Security
- Credentials never in source code
- Inject secrets via CI/CD
- Use AWS Secrets Manager
- Rollback easily

### ✅ Flexible Deployment
- Switch environments instantly
- Test production build locally
- A/B test configurations
- Feature flag support

---

## Migration Status

### Completed ✅

- [x] Created runtime config system (`/src/app/config/runtime.ts`)
- [x] Created config templates (development, staging, production)
- [x] Updated `index.html` to load config.js
- [x] Updated `queries.ts` to use runtime config
- [x] Updated `AuthContext.tsx` to use runtime config
- [x] Updated `App.tsx` to use runtime config
- [x] Created deployment documentation
- [x] Added `.gitignore` rules
- [x] Created README for config files

### Removed ❌

- [x] All `import.meta.env.VITE_*` references
- [x] Build-time environment variable dependencies
- [x] `.env.example` (replaced with runtime config templates)

---

## Testing

### Test Mock Mode

```bash
npm run dev
# Should see: "✅ Crossramp Config Loaded: LOCAL DEVELOPMENT (Mock Mode)"
# Dashboard loads with mock data, no backend needed
```

### Test Staging Mode (if you have credentials)

```bash
cp public/config.staging.js public/config.js
# Edit config.js with real staging credentials
npm run dev
# Should see: "✅ Crossramp Config Loaded: STAGING"
# Dashboard connects to Auth0 staging + staging API
```

### Test Production Build

```bash
npm run build
npm run preview
# Test the built app locally
```

---

## Troubleshooting

### Issue: "Runtime configuration not found"

**Solution:**
1. Check `/public/config.js` exists
2. Verify `<script src="/config.js"></script>` in `index.html`
3. Check browser Network tab for 404 errors

### Issue: Auth0 not working

**Solution:**
1. Check `auth.enabled: true` in config.js
2. Verify Auth0 credentials are correct
3. Check Auth0 dashboard "Allowed Callback URLs"
4. Look for console errors

### Issue: API calls failing

**Solution:**
1. Check `api.enabled: true` in config.js
2. Verify `api.baseUrl` is correct
3. Check CORS headers on backend
4. Look for network errors in DevTools

---

## Next Steps

### Immediate
1. Test locally: `npm run dev`
2. Verify mock mode works
3. Test with your staging credentials (if available)

### Short-term
1. Set up S3 buckets (dev, staging, prod)
2. Set up CloudFront distributions
3. Configure CI/CD pipeline
4. Store secrets in AWS Secrets Manager

### Medium-term
1. Deploy to development S3
2. Deploy to staging S3
3. Test full integration with backend
4. Deploy to production S3

---

## Documentation

- **Deployment Guide:** `/docs/DEPLOYMENT_RUNTIME_CONFIG.md`
- **Config README:** `/public/README.md`
- **Architecture Docs:** `/docs/ARCHITECTURE_QUERIES.md`
- **Migration Checklist:** `/docs/MIGRATION_CHECKLIST.md`

---

## Support

### Questions?

- **Runtime config not loading?** Check `index.html` and browser console
- **Auth0 issues?** Verify credentials in deployed config.js
- **API issues?** Check `api.baseUrl` and backend CORS
- **Deployment issues?** See `/docs/DEPLOYMENT_RUNTIME_CONFIG.md`

---

## Summary

✅ **Migration Complete!**  
✅ **Single build for all environments**  
✅ **S3 + CloudFront ready**  
✅ **No rebuild for config changes**  
✅ **Fully documented**  

**Ready for deployment!** 🚀

---

**Last Updated:** December 23, 2024  
**Version:** 2.0.0 (Runtime Config)  
**Status:** Production Ready 🟢
