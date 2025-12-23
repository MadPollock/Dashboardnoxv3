import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { isMockAuthEnabled } from '../config/runtime';

export type RBACRole = 'admin' | 'operations' | 'analyst' | 'developer' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RBACRole;
  metadata: {
    app?: Record<string, unknown>;
    user?: Record<string, unknown>;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPopup: (options?: Parameters<ReturnType<typeof useAuth0>['loginWithPopup']>[0]) => Promise<void>;
  loginWithMFA: () => Promise<string>;
  logout: () => void;
  getAccessToken: () => Promise<string | undefined>;
  hasRole: (roles: RBACRole | RBACRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUser: User = {
  id: 'auth0|mock-user',
  name: 'Preview User',
  email: 'preview.user@example.com',
  role: 'admin',
  metadata: {
    app: {
      featureFlags: ['preview-mode'],
    },
    user: {
      preferredTheme: 'light',
    },
  },
};

export { isMockAuthEnabled };

export function AuthProvider({ children }: { children: ReactNode }) {
  // Check runtime config for mock mode
  const mockAuthEnabled = isMockAuthEnabled();

  if (mockAuthEnabled) {
    const login = useCallback(async (_email: string, _password: string) => {
      console.info('[MockAuth] login invoked - mock user already authenticated');
    }, []);

    const loginWithPopup = useCallback(async () => {
      console.info('[MockAuth] loginWithPopup invoked - mock user already authenticated');
    }, []);

    const loginWithMFA = useCallback(async () => 'mock-mfa-access-token', []);

    const logout = useCallback(() => {
      console.info('[MockAuth] logout invoked - mock session persisted for preview');
    }, []);

    const getAccessToken = useCallback(async () => 'mock-access-token', []);

    const hasRole = useCallback(
      (roles: RBACRole | RBACRole[]) => {
        const roleList = Array.isArray(roles) ? roles : [roles];
        return roleList.includes(mockUser.role);
      },
      []
    );

    const value = useMemo(
      () => ({
        user: mockUser,
        isAuthenticated: true,
        login,
        loginWithPopup,
        loginWithMFA,
        logout,
        getAccessToken,
        hasRole,
      }),
      [login, loginWithPopup, loginWithMFA, logout, getAccessToken, hasRole]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  const {
    isAuthenticated,
    user: auth0User,
    loginWithRedirect,
    loginWithPopup,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  // Map Auth0 user to our User interface
  const user: User | null = useMemo(
    () =>
      auth0User
        ? {
            id: auth0User.sub || '',
            name: auth0User.name || auth0User.email || 'User',
            email: auth0User.email || '',
            role: (auth0User['https://crossramp.app/role'] as RBACRole) || 'user',
            metadata: {
              app: (auth0User as any).app_metadata ?? {},
              user: (auth0User as any).user_metadata ?? {},
            },
          }
        : null,
    [auth0User]
  );

  // Login wrapper - redirects to Auth0 Universal Login
  const login = useCallback(async (email: string, password: string) => {
    // Auth0 uses redirect-based login, not direct credentials
    // For hosted login page, we don't pass credentials
    await loginWithRedirect({
      appState: {
        returnTo: window.location.pathname,
      },
    });
  }, [loginWithRedirect]);

  const loginWithMFA = useCallback(async (): Promise<string> => {
    await loginWithPopup({
      authorizationParams: {
        prompt: 'login',
        max_age: '0',
      },
    });

    const token = await getAccessTokenSilently();
    return token;
  }, [loginWithPopup, getAccessTokenSilently]);

  // Logout wrapper
  const logout = useCallback(() => {
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

  // Get access token for API calls
  const getAccessToken = useCallback(async (): Promise<string | undefined> => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Error getting access token:', error);
      return undefined;
    }
  }, [getAccessTokenSilently]);

  const hasRole = useCallback(
    (roles: RBACRole | RBACRole[]) => {
      const roleList = Array.isArray(roles) ? roles : [roles];
      return user ? roleList.includes(user.role) : false;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      loginWithPopup,
      loginWithMFA,
      logout,
      getAccessToken,
      hasRole,
    }),
    [user, isAuthenticated, login, loginWithPopup, loginWithMFA, logout, getAccessToken, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext, useAuth };