/**
 * Crossramp Dashboard - Development Configuration
 * 
 * This configuration enables MOCK mode for all services.
 * Perfect for:
 * - Local development
 * - UI testing without backend
 * - Demos and previews
 * - Figma/Frontend-only development
 * 
 * Deploy this file as /config.js to S3 for development builds.
 */

window.__CROSSRAMP_CONFIG__ = {
  // Environment identifier
  environment: 'development',
  version: '1.0.0-dev',

  // Authentication Configuration
  auth: {
    enabled: false, // FALSE = Mock authentication
    provider: 'mock',
    // auth0 config not needed in mock mode
  },

  // API Configuration
  api: {
    enabled: false, // FALSE = Mock queries (no real API calls)
    baseUrl: 'http://localhost:3000/api', // Not used in mock mode
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

  // Monitoring (disabled in development)
  monitoring: {
    sentry: undefined,
    analytics: undefined,
  },
};

// Log configuration load
console.log('✅ Crossramp Config Loaded: DEVELOPMENT (Mock Mode)');
