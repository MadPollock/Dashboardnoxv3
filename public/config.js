/**
 * Crossramp Dashboard - Default Configuration
 * 
 * This file is used during LOCAL DEVELOPMENT (npm run dev).
 * 
 * For deployments:
 * - Copy config.development.js → config.js (for dev environment)
 * - Copy config.staging.js → config.js (for staging environment)
 * - Copy config.production.js → config.js (for production environment)
 * 
 * This file should NOT be committed with real credentials.
 */

window.__CROSSRAMP_CONFIG__ = {
  // Environment identifier
  environment: 'development',
  version: '1.0.0-local',

  // Authentication Configuration
  auth: {
    enabled: false, // FALSE = Mock authentication (no Auth0 needed)
    provider: 'mock',
  },

  // API Configuration
  api: {
    enabled: false, // FALSE = Mock queries (no backend needed)
    baseUrl: 'http://localhost:3000/api',
    timeout: 30000,
  },

  // Feature Flags
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

  // Monitoring (disabled locally)
  monitoring: {},
};

// Log configuration load
console.log('✅ Crossramp Config Loaded: LOCAL DEVELOPMENT (Mock Mode)');
