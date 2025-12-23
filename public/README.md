# Configuration Files

This directory contains runtime configuration files for the Crossramp Dashboard.

## Files

### `config.js` (Active Configuration)
- **Used by:** Local development (`npm run dev`)
- **Git:** Ignored (`.gitignore`)
- **Purpose:** Your local configuration
- **Default:** Points to development/mock mode

### `config.development.js` (Template)
- **Used by:** Development builds
- **Git:** Committed
- **Features:** Mock auth + mock API
- **Deploy:** Copy to `config.js` for dev environment

### `config.staging.js` (Template)
- **Used by:** Staging builds
- **Git:** Committed (with placeholders)
- **Features:** Real Auth0 + real API (staging)
- **Deploy:** Copy to `config.js`, replace credentials, upload to S3

### `config.production.js` (Template)
- **Used by:** Production builds
- **Git:** Committed (with placeholders)
- **Features:** Real Auth0 + real API (production)
- **Deploy:** Copy to `config.js`, replace credentials, upload to S3

## How It Works

1. **Build Time:** Vite copies `/public/*` to `/dist/`
2. **Load Time:** Browser loads `/config.js` BEFORE React app
3. **Runtime:** App reads `window.__CROSSRAMP_CONFIG__`

## Local Development

```bash
# Option 1: Use default config.js (mock mode)
npm run dev

# Option 2: Test with staging config
cp config.staging.js config.js
# Edit config.js with your staging credentials
npm run dev

# Option 3: Test with production config
cp config.production.js config.js
# Edit config.js with your production credentials
npm run dev
```

## Deployment

### S3 + CloudFront

```bash
# 1. Build once
npm run build

# 2. Choose environment config
cp public/config.development.js dist/config.js
# OR
cp public/config.staging.js dist/config.js
# OR
cp public/config.production.js dist/config.js

# 3. Inject secrets (for staging/production)
sed -i "s/YOUR_CLIENT_ID/${AUTH0_CLIENT_ID}/g" dist/config.js

# 4. Deploy
aws s3 sync dist/ s3://your-bucket/ --delete
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

## Security

**Never commit real credentials!**

- ✅ Templates with `YOUR_*_HERE` placeholders
- ✅ CI/CD injects real values from secrets
- ❌ Never hardcode credentials in git

**Use:**
- AWS Secrets Manager
- GitHub Actions Secrets
- Environment variables in CI/CD

## Config Structure

```javascript
window.__CROSSRAMP_CONFIG__ = {
  // Required
  environment: 'development' | 'staging' | 'production',
  version: '1.0.0',
  
  // Auth configuration
  auth: {
    enabled: boolean,  // false = mock auth
    provider: 'auth0' | 'mock',
    auth0: {
      domain: 'crossramp.auth0.com',
      clientId: 'abc123',
      audience: 'https://api.crossramp.io',
    },
  },
  
  // API configuration
  api: {
    enabled: boolean,  // false = mock queries
    baseUrl: 'https://api.crossramp.io/v1',
    timeout: 30000,
  },
  
  // Feature flags
  features: {
    mfa: true,
    analytics: true,
    // ...
  },
  
  // Optional monitoring
  monitoring: {
    sentry: { dsn: '...', environment: '...' },
    analytics: { googleAnalyticsId: '...' },
  },
};
```

## Examples

### Development (Mock Everything)
```javascript
auth: { enabled: false },  // Mock auth
api: { enabled: false },   // Mock API
```

### Staging (Real Auth, Real API)
```javascript
auth: {
  enabled: true,
  auth0: {
    domain: 'crossramp-staging.auth0.com',
    clientId: 'staging_client_id',
    audience: 'https://api-staging.crossramp.io',
  },
},
api: {
  enabled: true,
  baseUrl: 'https://api-staging.crossramp.io/v1',
},
```

### Production (Real Auth, Real API)
```javascript
auth: {
  enabled: true,
  auth0: {
    domain: 'crossramp.auth0.com',
    clientId: 'production_client_id',
    audience: 'https://api.crossramp.io',
  },
},
api: {
  enabled: true,
  baseUrl: 'https://api.crossramp.io/v1',
},
```

## Troubleshooting

### Config not loading
- Check browser console for errors
- Verify `<script src="/config.js"></script>` in `index.html`
- Check Network tab for 404 errors

### Wrong config deployed
- Check S3: `aws s3 cp s3://your-bucket/config.js -`
- Invalidate CloudFront cache
- Clear browser cache

### Auth0 errors
- Verify Auth0 credentials in deployed `config.js`
- Check Auth0 dashboard callback URLs
- Confirm `auth.enabled: true`

## More Info

See `/docs/DEPLOYMENT_RUNTIME_CONFIG.md` for complete deployment guide.
