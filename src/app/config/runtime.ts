/**
 * Runtime Configuration System for Crossramp Dashboard
 * 
 * This system loads configuration at runtime from /config.js,
 * enabling S3+CloudFront deployments without rebuilding for each environment.
 * 
 * The config.js file is loaded via <script> tag in index.html and
 * sets window.__CROSSRAMP_CONFIG__.
 */

export interface AppConfig {
  // Environment
  environment: 'development' | 'staging' | 'production';
  version: string;
  
  // Auth Configuration
  auth: {
    enabled: boolean; // false = mock auth, true = real Auth0
    provider: 'auth0' | 'mock';
    auth0?: {
      domain: string;
      clientId: string;
      audience: string;
      redirectUri?: string;
    };
  };
  
  // API Configuration
  api: {
    enabled: boolean; // false = mock queries, true = real API
    baseUrl: string;
    timeout?: number; // Request timeout in ms
  };
  
  // Feature Flags
  features: {
    mfa: boolean;
    analytics: boolean;
    disputes: boolean;
    apiKeys: boolean;
    [key: string]: boolean;
  };
  
  // Monitoring/Analytics (optional)
  monitoring?: {
    sentry?: {
      dsn: string;
      environment: string;
    };
    analytics?: {
      googleAnalyticsId?: string;
      mixpanelToken?: string;
    };
  };
}

// Global config object (set by /config.js loaded in index.html)
declare global {
  interface Window {
    __CROSSRAMP_CONFIG__?: AppConfig;
  }
}

let cachedConfig: AppConfig | null = null;
let configLoadAttempted = false; // Prevent multiple load attempts

/**
 * Get runtime configuration
 * This is loaded from window.__CROSSRAMP_CONFIG__ which is set by /config.js
 * 
 * IMPORTANT: If config not found, returns fallback and does NOT retry.
 * This prevents infinite loops in environments where config.js doesn't exist.
 */
export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = window.__CROSSRAMP_CONFIG__;

  if (!config) {
    // Only log once to avoid console spam
    if (!configLoadAttempted) {
      console.warn(
        '⚠️ Runtime configuration not found. Using fallback (mock mode).',
        'Make sure /config.js is loaded in index.html for production deployments.'
      );
      configLoadAttempted = true;
    }
    
    // Cache fallback to prevent retries
    cachedConfig = getFallbackConfig();
    return cachedConfig;
  }

  // Validate required fields
  if (!config.environment) {
    console.warn('Config missing environment, defaulting to development');
    config.environment = 'development';
  }

  cachedConfig = config;
  configLoadAttempted = true;
  return config;
}

/**
 * Fallback configuration (used if config.js fails to load)
 * This should never be used in production
 */
function getFallbackConfig(): AppConfig {
  console.warn('Using fallback configuration - this should not happen in production!');
  
  return {
    environment: 'development',
    version: '1.0.0-fallback',
    auth: {
      enabled: false,
      provider: 'mock',
    },
    api: {
      enabled: false,
      baseUrl: 'http://localhost:3000/api',
    },
    features: {
      mfa: true,
      analytics: true,
      disputes: true,
      apiKeys: true,
    },
  };
}

/**
 * Check if mock auth is enabled
 */
export function isMockAuthEnabled(): boolean {
  const config = getConfig();
  return !config.auth.enabled || config.auth.provider === 'mock';
}

/**
 * Check if mock queries are enabled
 */
export function isMockQueriesEnabled(): boolean {
  const config = getConfig();
  return !config.api.enabled;
}

/**
 * Get Auth0 configuration
 */
export function getAuth0Config() {
  const config = getConfig();
  
  if (!config.auth.auth0) {
    throw new Error('Auth0 configuration not found. Set auth.auth0 in config.js');
  }
  
  return config.auth.auth0;
}

/**
 * Get API base URL
 */
export function getApiBaseUrl(): string {
  const config = getConfig();
  return config.api.baseUrl;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  const config = getConfig();
  return config.features[feature] ?? false;
}

/**
 * Get current environment
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  const config = getConfig();
  return config.environment;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Get app version
 */
export function getAppVersion(): string {
  const config = getConfig();
  return config.version;
}

/**
 * Reload configuration (useful for testing or hot-reload scenarios)
 */
export function reloadConfig(): AppConfig {
  cachedConfig = null;
  return getConfig();
}

/**
 * Log configuration (for debugging)
 */
export function logConfig(): void {
  const config = getConfig();
  console.group('🔧 Crossramp Configuration');
  console.log('Environment:', config.environment);
  console.log('Version:', config.version);
  console.log('Auth Mode:', config.auth.enabled ? 'Real Auth0' : 'Mock Auth');
  console.log('API Mode:', config.api.enabled ? `Real API (${config.api.baseUrl})` : 'Mock Queries');
  console.log('Features:', config.features);
  console.groupEnd();
}