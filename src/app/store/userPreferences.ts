/**
 * User Preferences Store (Non-Critical UX State)
 * 
 * This Zustand store manages client-side user preferences and UI state.
 * It is completely isolated from transactional/analytical data.
 * 
 * Key principles:
 * - UI reacts instantly to changes in this store
 * - Data is persisted to localStorage for persistence across sessions
 * - Does NOT contain any business/transactional data
 * - Only stores actively implemented preferences (Dark Mode, Sidebar Collapse, Text Size)
 * - Includes onboarding state for SetupProgressBar (not shown in Settings UI)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

/**
 * Theme configuration for UI components
 */
export type ThemePreference = 'light' | 'dark';
export type LocalePreference = 'en' | 'pt' | 'es';
export type TextSize = 87.5 | 100 | 112.5 | 125; // percentage values

export type OnboardingStepId =
  | 'kyc'
  | 'mfa'
  | 'template'
  | 'checkout';

export type OnboardingStepStatus = 'pending' | 'in_progress' | 'completed';

/**
 * User preference state interface
 */
export interface UserPreferences {
  // UI Layout Preferences
  sidebarCollapsed: boolean;
  theme: ThemePreference;
  locale: LocalePreference;
  
  // Accessibility
  textSize: TextSize;
  
  // Dashboard Customization
  favoriteViews: string[];
  defaultView: string;
  
  // Last visited state (for UX continuity)
  lastVisitedView: string;
  lastRefreshTime: number | null;
  
  // Setup Progress Tracking
  onboardingStep: number; // 0-4
  onboardingSteps: Record<OnboardingStepId, OnboardingStepStatus>;
  dismissedBanners: string[];
}

/**
 * Actions for mutating user preferences
 */
export interface UserPreferencesActions {
  // Layout actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setLocale: (locale: LocalePreference) => void;
  
  // Accessibility actions
  setTextSize: (size: TextSize) => void;
  
  // Dashboard customization
  addFavoriteView: (viewId: string) => void;
  removeFavoriteView: (viewId: string) => void;
  setDefaultView: (viewId: string) => void;
  
  // State tracking
  updateLastVisitedView: (viewId: string) => void;
  updateLastRefreshTime: () => void;
  
  // Setup tracking actions
  setOnboardingStep: (step: number) => void;
  completeOnboardingStep: (stepId: OnboardingStepId) => void;
  setOnboardingStepStatus: (stepId: OnboardingStepId, status: OnboardingStepStatus) => void;
  dismissBanner: (bannerId: string) => void;
  
  // Utility actions
  resetPreferences: () => void;
}

/**
 * Combined store type
 */
export type UserPreferencesStore = UserPreferences & UserPreferencesActions;

/**
 * Default preferences (initial state)
 */
const defaultPreferences: UserPreferences = {
  sidebarCollapsed: false,
  theme: 'light',
  locale: 'en',
  textSize: 100,
  favoriteViews: [],
  defaultView: 'dashboard',
  lastVisitedView: 'dashboard',
  lastRefreshTime: null,
  onboardingStep: 0,
  onboardingSteps: {
    kyc: 'pending',
    mfa: 'pending',
    template: 'pending',
    checkout: 'pending',
  },
  dismissedBanners: [],
};

/**
 * Zustand store with localStorage persistence
 * 
 * Usage example:
 * ```tsx
 * import { useUserPreferences } from '@/store/userPreferences';
 * 
 * function MyComponent() {
 *   const textSize = useUserPreferences(state => state.textSize);
 *   const setTextSize = useUserPreferences(state => state.setTextSize);
 *   
 *   return (
 *     <button onClick={() => setTextSize(112.5)}>
 *       Current size: {textSize}%
 *     </button>
 *   );
 * }
 * ```
 */
export const useUserPreferences = create<UserPreferencesStore>()(
  persist(
    (set, get) => ({
      // State
      ...defaultPreferences,
      
      // Actions
      toggleSidebar: () => 
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      setSidebarCollapsed: (collapsed) => 
        set({ sidebarCollapsed: collapsed }),

      setTheme: (theme) =>
        set({ theme }),
      
      setLocale: (locale) =>
        set({ locale }),
      
      setTextSize: (size) =>
        set({ textSize: size }),
      
      addFavoriteView: (viewId) => 
        set((state) => ({
          favoriteViews: state.favoriteViews.includes(viewId)
            ? state.favoriteViews
            : [...state.favoriteViews, viewId],
        })),
      
      removeFavoriteView: (viewId) => 
        set((state) => ({
          favoriteViews: state.favoriteViews.filter((id) => id !== viewId),
        })),
      
      setDefaultView: (viewId) => 
        set({ defaultView: viewId }),
      
      updateLastVisitedView: (viewId) => 
        set({ lastVisitedView: viewId }),
      
      updateLastRefreshTime: () => 
        set({ lastRefreshTime: Date.now() }),
      
      setOnboardingStep: (step) =>
        set({ onboardingStep: Math.min(Math.max(step, 0), 4) }),

      setOnboardingStepStatus: (stepId, status) =>
        set((state) => ({
          onboardingSteps: {
            ...state.onboardingSteps,
            [stepId]: status,
          },
        })),

      completeOnboardingStep: (stepId) =>
        set((state) => {
          const updatedSteps = {
            ...state.onboardingSteps,
            [stepId]: 'completed' as OnboardingStepStatus,
          };

          const completedCount = Object.values(updatedSteps).filter((v) => v === 'completed').length;

          return {
            onboardingSteps: updatedSteps,
            onboardingStep: completedCount,
          };
        }),

      dismissBanner: (bannerId) =>
        set((state) => ({
          dismissedBanners: state.dismissedBanners.includes(bannerId)
            ? state.dismissedBanners
            : [...state.dismissedBanners, bannerId],
        })),
      
      resetPreferences: () => 
        set(defaultPreferences),
    }),
    {
      name: 'cqrs-dashboard-preferences', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields (exclude lastRefreshTime)
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        locale: state.locale,
        textSize: state.textSize,
        favoriteViews: state.favoriteViews,
        defaultView: state.defaultView,
        lastVisitedView: state.lastVisitedView,
        onboardingStep: state.onboardingStep,
        onboardingSteps: state.onboardingSteps,
        dismissedBanners: state.dismissedBanners,
      }),
    }
  )
);

/**
 * Selector helpers for common use cases
 * These provide optimized access to frequently used state slices
 */

export const useIsSidebarCollapsed = () => 
  useUserPreferences((state) => state.sidebarCollapsed);

export const useTextSize = () =>
  useUserPreferences((state) => state.textSize);

export const useFavoriteViews = () => 
  useUserPreferences((state) => state.favoriteViews);

export const useOnboardingProgress = () =>
  useUserPreferences(
    (state) => ({
      step: state.onboardingStep,
      steps: state.onboardingSteps,
    }),
    shallow
  );