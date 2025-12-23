/**
 * Crossramp Dashboard - Production Configuration
 * 
 * This configuration uses REAL Auth0 and REAL API (production environment).
 * 
 * ⚠️ CRITICAL: Never commit production credentials to git!
 * 
 * To deploy:
 * 1. Update auth0 credentials with your production tenant
 * 2. Update api.baseUrl with your production API URL
 * 3. Upload as /config.js to S3 production bucket
 * 4. Invalidate CloudFront cache
 * 5. Test thoroughly before going live!
 * 
 * Security: Store credentials in AWS Secrets Manager or similar.
 */

window.__CROSSRAMP_CONFIG__ = {
  // Environment identifier
  environment: 'production',
  version: '1.0.0',

  // Authentication Configuration
  auth: {
    enabled: true, // TRUE = Real Auth0
    provider: 'auth0',
    auth0: {
      domain: 'crossramp.auth0.com', // TODO: Replace with your Auth0 production tenant
      clientId: 'YOUR_PRODUCTION_CLIENT_ID', // TODO: Replace with your production client ID
      audience: 'https://api.crossramp.io', // TODO: Replace with your production API audience
      redirectUri: window.location.origin, // Auto-detects current URL
    },
  },

  // API Configuration
  api: {
    enabled: true, // TRUE = Real API calls
    baseUrl: 'https://api.crossramp.io/v1', // TODO: Replace with your production API URL
    timeout: 30000,
  },

  // Feature Flags (can disable features for gradual rollout)
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
      environment: 'production',
    },
    analytics: {
      googleAnalyticsId: 'G-XXXXXXXXXX', // TODO: Add GA4 ID
      mixpanelToken: 'YOUR_MIXPANEL_TOKEN', // TODO: Add Mixpanel token (optional)
    },
  },
};

// Log configuration load (only version, hide sensitive info)
console.log('✅ Crossramp Config Loaded: PRODUCTION v' + window.__CROSSRAMP_CONFIG__.version);
