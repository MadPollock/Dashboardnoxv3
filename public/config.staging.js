/**
 * Crossramp Dashboard - Staging Configuration
 * 
 * This configuration uses REAL Auth0 and REAL API (staging environment).
 * 
 * To deploy:
 * 1. Update auth0 credentials with your staging tenant
 * 2. Update api.baseUrl with your staging API URL
 * 3. Upload as /config.js to S3 staging bucket
 * 4. Invalidate CloudFront cache
 * 
 * No rebuild needed! Same build works for all environments.
 */

window.__CROSSRAMP_CONFIG__ = {
  // Environment identifier
  environment: 'staging',
  version: '1.0.0',

  // Authentication Configuration
  auth: {
    enabled: true, // TRUE = Real Auth0
    provider: 'auth0',
    auth0: {
      domain: 'crossramp-staging.auth0.com', // TODO: Replace with your Auth0 staging tenant
      clientId: 'YOUR_STAGING_CLIENT_ID', // TODO: Replace with your staging client ID
      audience: 'https://api-staging.crossramp.io', // TODO: Replace with your staging API audience
      redirectUri: window.location.origin, // Auto-detects current URL
    },
  },

  // API Configuration
  api: {
    enabled: true, // TRUE = Real API calls
    baseUrl: 'https://api-staging.crossramp.io/v1', // TODO: Replace with your staging API URL
    timeout: 30000,
  },

  // Feature Flags (can disable features per environment)
  features: {
    mfa: true,
    analytics: true,
    disputes: true,
    apiKeys: true,
    templates: true,
    whitelist: true,
    withdrawals: true,
    reports: true,
    reputation: true,
    companyProfile: true,
    security: true,
    support: true,
    dashboardSettings: true,
  },

  // Monitoring
  monitoring: {
    sentry: {
      dsn: 'https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID', // TODO: Add Sentry DSN
      environment: 'staging',
    },
    analytics: {
      googleAnalyticsId: 'G-XXXXXXXXXX', // TODO: Add GA4 ID (optional)
    },
  },
};

// Log configuration load
console.log('✅ Crossramp Config Loaded: STAGING (Real Auth + Real API)');
