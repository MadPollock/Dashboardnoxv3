# Runtime Configuration & Deployment Guide

## Overview

The Crossramp Dashboard now uses **runtime configuration** instead of build-time environment variables. This enables:
- ✅ Single build for all environments (dev, staging, production)
- ✅ S3 + CloudFront static deployment
- ✅ No rebuilds when changing config
- ✅ Easy environment switching

---

## How It Works

### 1. Configuration Files

Located in `/public/`:
- `config.js` - Default (local development)
- `config.development.js` - Development/Mock mode
- `config.staging.js` - Staging environment
- `config.production.js` - Production environment

### 2. Loading Mechanism

```html
<!-- index.html -->
<script src="/config.js"></script>
<script type="module" src="/src/main.tsx"></script>
```

The `config.js` file is loaded **before** the React app, setting `window.__CROSSRAMP_CONFIG__`.

### 3. Runtime Access

```typescript
import { getConfig, isMockAuthEnabled, getApiBaseUrl } from './config/runtime';

const config = getConfig();
const mockMode = isMockAuthEnabled();
const apiUrl = getApiBaseUrl();
```

---

## Local Development

### Quick Start

```bash
# Install dependencies
npm install

# Start dev server (uses config.js by default)
npm run dev
```

### Config Modes

The `/public/config.js` file controls the mode:

**Mock Mode (Default):**
```javascript
// /public/config.js
window.__CROSSRAMP_CONFIG__ = {
  environment: 'development',
  auth: { enabled: false },
  api: { enabled: false },
  // ...
};
```

**Test with Real Auth:**
```javascript
// /public/config.js
window.__CROSSRAMP_CONFIG__ = {
  environment: 'development',
  auth: {
    enabled: true,
    provider: 'auth0',
    auth0: {
      domain: 'crossramp-dev.auth0.com',
      clientId: 'YOUR_DEV_CLIENT_ID',
      audience: 'https://api-dev.crossramp.io',
    },
  },
  api: { enabled: false }, // Still mock API
};
```

---

## S3 + CloudFront Deployment

### Architecture

```
┌────────────────────────────┐
│  CloudFront Distribution   │
│  (CDN + HTTPS)             │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  S3 Bucket (Static Site)   │
│  ├── index.html            │
│  ├── config.js  ← SWAP ME  │
│  ├── assets/               │
│  └── ...                   │
└────────────────────────────┘
```

### Step 1: Build Once

```bash
npm run build
```

This creates `/dist/` with:
```
/dist/
├── index.html
├── config.js (from /public/config.js)
├── assets/
└── ...
```

### Step 2: Deploy to S3

#### For Development Environment

```bash
# 1. Build the app
npm run build

# 2. Replace config.js with development config
cp public/config.development.js dist/config.js

# 3. Upload to S3
aws s3 sync dist/ s3://crossramp-dashboard-dev/ --delete

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id EXXXXXXXXXXXXX \
  --paths "/config.js" "/index.html" "/*"
```

#### For Staging Environment

```bash
# 1. Build the app (same build!)
npm run build

# 2. Replace config.js with staging config
cp public/config.staging.js dist/config.js

# 3. Update staging credentials in dist/config.js
# (Use sed, manual edit, or CI/CD secrets injection)
sed -i 's/YOUR_STAGING_CLIENT_ID/abc123xyz/g' dist/config.js
sed -i 's/YOUR_SENTRY_DSN/https:\/\/sentry.../g' dist/config.js

# 4. Upload to S3
aws s3 sync dist/ s3://crossramp-dashboard-staging/ --delete

# 5. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EYYYYYYYYYYYYYY \
  --paths "/config.js" "/index.html" "/*"
```

#### For Production Environment

```bash
# 1. Build the app (same build!)
npm run build

# 2. Replace config.js with production config
cp public/config.production.js dist/config.js

# 3. Inject production credentials (DO THIS SECURELY!)
# Option A: Use AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id crossramp/dashboard/prod \
  --query SecretString --output text | \
  jq -r '.auth0_client_id' | \
  xargs -I {} sed -i 's/YOUR_PRODUCTION_CLIENT_ID/{}/g' dist/config.js

# Option B: Use CI/CD environment variables
sed -i "s/YOUR_PRODUCTION_CLIENT_ID/${PROD_AUTH0_CLIENT_ID}/g" dist/config.js
sed -i "s/YOUR_SENTRY_DSN/${PROD_SENTRY_DSN}/g" dist/config.js

# 4. Upload to S3
aws s3 sync dist/ s3://crossramp-dashboard/ --delete

# 5. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EZZZZZZZZZZZZZZ \
  --paths "/config.js" "/index.html" "/*"
```

---

## CI/CD Pipeline (GitHub Actions Example)

```yaml
name: Deploy Dashboard

on:
  push:
    branches:
      - main     # Production
      - staging  # Staging
      - develop  # Development

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build app (once for all environments)
        run: npm run build
      
      - name: Configure for environment
        run: |
          if [[ "$GITHUB_REF" == "refs/heads/main" ]]; then
            echo "Deploying to PRODUCTION"
            cp public/config.production.js dist/config.js
            sed -i "s/YOUR_PRODUCTION_CLIENT_ID/${{ secrets.PROD_AUTH0_CLIENT_ID }}/g" dist/config.js
            sed -i "s/YOUR_SENTRY_DSN/${{ secrets.PROD_SENTRY_DSN }}/g" dist/config.js
            S3_BUCKET="crossramp-dashboard"
            CF_DISTRIBUTION="${{ secrets.PROD_CF_DISTRIBUTION_ID }}"
          elif [[ "$GITHUB_REF" == "refs/heads/staging" ]]; then
            echo "Deploying to STAGING"
            cp public/config.staging.js dist/config.js
            sed -i "s/YOUR_STAGING_CLIENT_ID/${{ secrets.STAGING_AUTH0_CLIENT_ID }}/g" dist/config.js
            S3_BUCKET="crossramp-dashboard-staging"
            CF_DISTRIBUTION="${{ secrets.STAGING_CF_DISTRIBUTION_ID }}"
          else
            echo "Deploying to DEVELOPMENT"
            cp public/config.development.js dist/config.js
            S3_BUCKET="crossramp-dashboard-dev"
            CF_DISTRIBUTION="${{ secrets.DEV_CF_DISTRIBUTION_ID }}"
          fi
          
          echo "S3_BUCKET=$S3_BUCKET" >> $GITHUB_ENV
          echo "CF_DISTRIBUTION=$CF_DISTRIBUTION" >> $GITHUB_ENV
      
      - name: Deploy to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
        run: |
          aws s3 sync dist/ s3://${{ env.S3_BUCKET }}/ --delete
      
      - name: Invalidate CloudFront
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ env.CF_DISTRIBUTION }} \
            --paths "/config.js" "/index.html" "/*"
```

---

## Configuration Updates (No Rebuild Needed!)

### Scenario: Update API URL for Staging

```bash
# 1. Fetch current config from S3
aws s3 cp s3://crossramp-dashboard-staging/config.js ./config.js

# 2. Edit config locally
# Change: baseUrl: 'https://api-staging.crossramp.io/v1'
# To: baseUrl: 'https://api-staging-v2.crossramp.io/v1'

# 3. Upload updated config
aws s3 cp ./config.js s3://crossramp-dashboard-staging/config.js

# 4. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EYYYYYYYYYYYYYY \
  --paths "/config.js"

# Done! No rebuild. Takes ~30 seconds.
```

### Scenario: Enable New Feature Flag

```bash
# 1. Fetch config
aws s3 cp s3://crossramp-dashboard/config.js ./config.js

# 2. Add feature flag
# features: { newFeature: true }

# 3. Upload
aws s3 cp ./config.js s3://crossramp-dashboard/config.js

# 4. Invalidate
aws cloudfront create-invalidation \
  --distribution-id EZZZZZZZZZZZZZZ \
  --paths "/config.js"
```

---

## Security Best Practices

### 1. Never Commit Credentials

Add to `.gitignore`:
```
/public/config.js
/dist/config.js
*.local.js
```

Keep templates only:
```
/public/config.development.js  ✅
/public/config.staging.js      ✅ (with placeholders)
/public/config.production.js   ✅ (with placeholders)
/public/config.js              ❌ (local only, gitignored)
```

### 2. Use AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name crossramp/dashboard/prod \
  --secret-string '{
    "auth0_domain": "crossramp.auth0.com",
    "auth0_client_id": "abc123xyz",
    "sentry_dsn": "https://...",
    "api_base_url": "https://api.crossramp.io/v1"
  }'

# Retrieve in CI/CD
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id crossramp/dashboard/prod \
  --query SecretString --output text)

AUTH0_CLIENT_ID=$(echo $SECRET | jq -r '.auth0_client_id')
```

### 3. Least Privilege IAM

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::crossramp-dashboard/*",
        "arn:aws:s3:::crossramp-dashboard"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
    }
  ]
}
```

---

## Troubleshooting

### Issue: Config not loading (white screen)

**Symptoms:** Browser console shows: `Runtime configuration not found`

**Solutions:**
1. Check `/public/config.js` exists
2. Verify `<script src="/config.js"></script>` in `index.html`
3. Check browser Network tab - is `config.js` 404?
4. CloudFront cache? Invalidate: `/config.js`

### Issue: App works locally but fails in S3

**Symptoms:** Works with `npm run dev`, fails in S3

**Solutions:**
1. Check S3 bucket has `config.js` file
2. Verify file is public (or CloudFront can access it)
3. Check CloudFront origin settings
4. Clear browser cache + CloudFront cache

### Issue: Auth0 not working after deployment

**Symptoms:** Redirect loop or "Invalid state" error

**Solutions:**
1. Verify Auth0 config in `/config.js` deployed to S3
2. Check Auth0 dashboard "Allowed Callback URLs" includes CloudFront URL
3. Verify `auth.enabled: true` and `auth0.clientId` is correct
4. Check browser console for Auth0 errors

---

## Monitoring

### Check Current Config

```bash
# View live config in production
curl https://dashboard.crossramp.io/config.js

# Or in staging
curl https://staging-dashboard.crossramp.io/config.js
```

### Logs

Enable CloudFront logging:
```bash
aws cloudfront update-distribution \
  --id EZZZZZZZZZZZZZZ \
  --logging-enabled \
  --bucket=crossramp-logs.s3.amazonaws.com \
  --prefix=cloudfront/dashboard/
```

---

## Rollback

### Scenario: Bad config deployed to production

```bash
# 1. Get previous config from S3 versioning
aws s3api list-object-versions \
  --bucket crossramp-dashboard \
  --prefix config.js

# 2. Restore previous version
aws s3api copy-object \
  --bucket crossramp-dashboard \
  --copy-source crossramp-dashboard/config.js?versionId=VERSION_ID \
  --key config.js

# 3. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EZZZZZZZZZZZZZZ \
  --paths "/config.js"

# Done! Rollback complete in ~30 seconds.
```

---

## Summary

**Old Way (Environment Variables):**
```
Edit .env → Rebuild app → Deploy → Wait 5-10 min
```

**New Way (Runtime Config):**
```
Edit config.js → Upload to S3 → Invalidate CloudFront → Wait 30 sec
```

**Benefits:**
- ✅ 10x faster deployments
- ✅ No rebuilds for config changes
- ✅ Single build for all environments
- ✅ Easy rollbacks
- ✅ Better CI/CD pipelines
- ✅ Secrets managed securely

---

**Last Updated:** December 23, 2024  
**Version:** 2.0.0 (Runtime Config)
