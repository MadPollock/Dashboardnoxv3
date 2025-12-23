# Quick Reference: Runtime Configuration

## 🚀 Quick Start

```bash
npm install
npm run dev
# Opens at http://localhost:5173 in MOCK mode
```

## 📁 Config Files

| File | Purpose | Git |
|------|---------|-----|
| `public/config.js` | Active (local dev) | ❌ Ignored |
| `public/config.development.js` | Mock mode template | ✅ Committed |
| `public/config.staging.js` | Staging template | ✅ Committed |
| `public/config.production.js` | Production template | ✅ Committed |

## 🔧 Switching Modes Locally

```bash
# Mock mode (default)
npm run dev

# Staging mode (need credentials)
cp public/config.staging.js public/config.js
# Edit config.js with your credentials
npm run dev

# Production mode (need credentials)
cp public/config.production.js public/config.js
# Edit config.js with your credentials
npm run dev
```

## 🏗️ Build & Deploy

```bash
# 1. Build once
npm run build

# 2. Choose environment
cp public/config.[environment].js dist/config.js

# 3. Inject secrets (staging/prod only)
sed -i "s/YOUR_CLIENT_ID/${CLIENT_ID}/g" dist/config.js

# 4. Deploy to S3
aws s3 sync dist/ s3://your-bucket/ --delete

# 5. Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

## 💻 Code Usage

```typescript
// Import runtime config helpers
import { 
  getConfig, 
  isMockAuthEnabled, 
  isMockQueriesEnabled,
  getApiBaseUrl,
  getAuth0Config,
  isFeatureEnabled 
} from './config/runtime';

// Get full config
const config = getConfig();

// Check mode
const mockAuth = isMockAuthEnabled();      // false = real Auth0
const mockQueries = isMockQueriesEnabled(); // false = real API

// Get values
const apiUrl = getApiBaseUrl();
const auth0 = getAuth0Config();

// Feature flags
if (isFeatureEnabled('mfa')) {
  // Show MFA feature
}
```

## 🎯 Config Structure

```javascript
window.__CROSSRAMP_CONFIG__ = {
  environment: 'development' | 'staging' | 'production',
  version: '1.0.0',
  auth: {
    enabled: boolean,  // true = Auth0, false = mock
    provider: 'auth0' | 'mock',
    auth0: {
      domain: 'crossramp.auth0.com',
      clientId: 'abc123',
      audience: 'https://api.crossramp.io',
    },
  },
  api: {
    enabled: boolean,  // true = real API, false = mock
    baseUrl: 'https://api.crossramp.io/v1',
    timeout: 30000,
  },
  features: {
    mfa: true,
    analytics: true,
    // ...
  },
};
```

## 🔐 Security Checklist

- [ ] Never commit `public/config.js` (gitignored)
- [ ] Never hardcode credentials in templates
- [ ] Use `YOUR_*_HERE` placeholders in templates
- [ ] Inject secrets via CI/CD or AWS Secrets Manager
- [ ] Use least-privilege IAM roles
- [ ] Enable S3 bucket versioning (rollback capability)

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| White screen | Check browser console for "Runtime configuration not found" |
| Config not loading | Verify `<script src="/config.js"></script>` in index.html |
| Auth0 errors | Check auth.enabled and credentials in config.js |
| API errors | Check api.enabled and baseUrl in config.js |
| CloudFront 404 | Invalidate cache: `/*` and `/config.js` |

## 📚 Documentation

- **Full Deployment Guide:** `/docs/DEPLOYMENT_RUNTIME_CONFIG.md`
- **Migration Summary:** `/RUNTIME_CONFIG_MIGRATION.md`
- **Config README:** `/public/README.md`

## 🚨 Emergency Rollback

```bash
# List S3 versions
aws s3api list-object-versions \
  --bucket your-bucket \
  --prefix config.js

# Restore previous version
aws s3api copy-object \
  --bucket your-bucket \
  --copy-source your-bucket/config.js?versionId=VERSION_ID \
  --key config.js

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id XXX \
  --paths "/config.js"
```

## ✅ Deployment Checklist

**Before Deploy:**
- [ ] Run `npm run build`
- [ ] Copy correct config template to `dist/config.js`
- [ ] Inject production secrets (staging/prod)
- [ ] Test locally: `npm run preview`
- [ ] Verify credentials are correct

**Deploy:**
- [ ] Upload to S3: `aws s3 sync dist/ s3://bucket/`
- [ ] Invalidate CloudFront: `/config.js` `/index.html` `/*`
- [ ] Test deployed URL
- [ ] Verify console logs show correct environment

**After Deploy:**
- [ ] Check Auth0 login works
- [ ] Check API calls work
- [ ] Monitor error logs
- [ ] Verify feature flags

## 🎉 Done!

You're ready to deploy Crossramp Dashboard with runtime configuration!

**Need help?** Check `/docs/DEPLOYMENT_RUNTIME_CONFIG.md`
