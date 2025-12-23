# User Preferences Store (Zustand)

## Overview

This directory contains the Zustand-based state manager for **non-critical UX preferences**. It is completely isolated from the transactional/analytical data layer, following strict CQRS principles.

## Architecture Principles

### 1. Clear Separation of Concerns

```
┌─────────────────────────────────────────┐
│         TRANSACTIONAL LAYER             │
│  (Charts, Tables, Analytics Data)       │
│                                         │
│  ❌ NOT stored in this preference store │
│  ✅ Fetched via useChartData hook       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           UX STATE LAYER                │
│    (User Preferences - THIS STORE)      │
│                                         │
│  ✅ Sidebar collapsed state             │
│  ✅ Theme preferences                   │
│  ✅ Notification settings               │
│  ✅ Visual preferences                  │
└─────────────────────────────────────────┘
```

### 2. What Belongs Here

**✅ DO Store:**
- UI layout preferences (sidebar state, compact mode)
- Visual themes for charts (colors only, not data)
- User notification preferences
- Accessibility settings
- Display format preferences
- Last visited routes for UX continuity

**❌ DO NOT Store:**
- Chart data or analytics results
- Transaction records
- User authentication state (use AuthContext)
- Database query results
- Any business domain data

### 3. Instant UI Reactivity

The store uses Zustand's subscription model to ensure instant UI updates:

```tsx
// Component re-renders instantly when theme changes
const chartTheme = useChartThemeConfig();

// Component re-renders instantly when sidebar state changes
const isCollapsed = useIsSidebarCollapsed();
```

## Usage Examples

### Basic Usage

```tsx
import { useUserPreferences } from '@/store/userPreferences';

function MyComponent() {
  // Select specific state (optimized - only re-renders when this changes)
  const chartTheme = useUserPreferences(state => state.chartTheme);
  
  // Select action
  const setChartTheme = useUserPreferences(state => state.setChartTheme);
  
  return (
    <button onClick={() => setChartTheme('vibrant')}>
      Switch to Vibrant Theme
    </button>
  );
}
```

### Using Selector Helpers

```tsx
import { useChartThemeConfig, useIsSidebarCollapsed } from '@/store/userPreferences';

function Sidebar() {
  const isCollapsed = useIsSidebarCollapsed();
  // ... render based on collapse state
}

function Chart() {
  const theme = useChartThemeConfig();
  const colors = getChartColors(theme);
  // ... use colors for chart rendering ONLY
}
```

### Chart Component Integration

```tsx
import { useChartThemeConfig, getChartColors } from '@/store/userPreferences';
import { useChartData } from '@/hooks/useChartData';

function RevenueChart() {
  // Transactional data (from CQRS read layer)
  const { data, isLoading } = useChartData('revenue-monthly');
  
  // Visual theme (from UX preferences)
  const theme = useChartThemeConfig();
  const colors = getChartColors(theme);
  
  return (
    <LineChart data={data}>
      <Line dataKey="revenue" stroke={colors.primary} />
    </LineChart>
  );
}
```

## State Structure

```typescript
{
  // UI Layout
  sidebarCollapsed: boolean,
  compactMode: boolean,
  
  // Visual Theme
  chartTheme: 'default' | 'vibrant' | 'muted' | 'monochrome',
  animationsEnabled: boolean,
  
  // Dashboard Customization
  favoriteViews: string[],
  defaultView: string,
  
  // Notifications
  notificationsEnabled: boolean,
  soundEnabled: boolean,
  
  // Accessibility
  highContrast: boolean,
  reducedMotion: boolean,
  
  // Display Formats
  dateFormat: 'relative' | 'absolute',
  numberFormat: 'compact' | 'full',
  
  // Navigation State
  lastVisitedView: string,
  lastRefreshTime: number | null,
}
```

## Persistence

The store automatically persists to `localStorage` under the key `cqrs-dashboard-preferences`. 

**What gets persisted:**
- All user preferences (theme, layout, etc.)

**What doesn't get persisted:**
- `lastRefreshTime` (session-specific)
- Any transactional data (stored elsewhere)

### Clearing Preferences

```tsx
const resetPreferences = useUserPreferences(state => state.resetPreferences);

// Reset to defaults
resetPreferences();
```

## Performance Optimization

### Selective Subscriptions

```tsx
// ❌ BAD - Re-renders on ANY preference change
const allPrefs = useUserPreferences();

// ✅ GOOD - Only re-renders when chartTheme changes
const chartTheme = useUserPreferences(state => state.chartTheme);

// ✅ EVEN BETTER - Use selector helper
const chartTheme = useChartThemeConfig();
```

### Derived State

```tsx
// Use selector functions for computed values
const isAccessibilityMode = useUserPreferences(
  state => state.highContrast || state.reducedMotion
);
```

## Data Isolation Guidelines

### ✅ Correct: Using Preferences for Visual Themes

```tsx
function Chart() {
  const { data } = useChartData('revenue-monthly'); // Data layer
  const theme = useChartThemeConfig();       // Preference layer
  const colors = getChartColors(theme);      // Derive colors from theme
  
  return <LineChart data={data} colors={colors} />;
}
```

### ❌ Incorrect: Mixing Data with Preferences

```tsx
// NEVER DO THIS
function Chart() {
  // This violates separation - chart data doesn't belong here!
  const chartData = useUserPreferences(state => state.chartData);
}
```

### ✅ Correct: Sidebar State Management

```tsx
function Layout() {
  const isCollapsed = useIsSidebarCollapsed();  // UI state ✅
  const toggleSidebar = useUserPreferences(state => state.toggleSidebar);
  
  return (
    <aside className={isCollapsed ? 'w-20' : 'w-64'}>
      {/* ... */}
    </aside>
  );
}
```

### ❌ Incorrect: Auth State in Preferences

```tsx
// NEVER DO THIS - Auth belongs in AuthContext!
function Header() {
  const user = useUserPreferences(state => state.user); // ❌
}
```

## Testing

```tsx
import { useUserPreferences } from '@/store/userPreferences';

// Reset state before each test
beforeEach(() => {
  useUserPreferences.getState().resetPreferences();
});

test('theme changes affect UI', () => {
  const { setChartTheme } = useUserPreferences.getState();
  
  setChartTheme('vibrant');
  
  expect(useUserPreferences.getState().chartTheme).toBe('vibrant');
});
```

## Migration Guide

If you need to add new preferences:

1. **Update the interface** in `userPreferences.ts`:
```typescript
export interface UserPreferences {
  // ... existing
  myNewPreference: boolean;
}
```

2. **Add to default state**:
```typescript
const defaultPreferences: UserPreferences = {
  // ... existing
  myNewPreference: false,
};
```

3. **Create action**:
```typescript
export interface UserPreferencesActions {
  // ... existing
  setMyNewPreference: (value: boolean) => void;
}
```

4. **Implement in store**:
```typescript
setMyNewPreference: (value) => set({ myNewPreference: value }),
```

5. **(Optional) Create selector helper**:
```typescript
export const useMyNewPreference = () => 
  useUserPreferences((state) => state.myNewPreference);
```

## FAQ

**Q: Can I store form data here?**
A: No. Forms should use local component state or react-hook-form. Only store *preferences* here.

**Q: Should I store authentication tokens?**
A: No. Use the AuthContext for authentication state.

**Q: Can I store API response data?**
A: No. Use the useChartData hook or similar data-fetching patterns.

**Q: What about dashboard widget layouts?**
A: Yes! Widget arrangement/visibility is a UX preference and belongs here.

**Q: Is this the right place for notification history?**
A: No. Notification history is data. Only *preferences* about notifications belong here.

## Summary

This store is **exclusively for UX/UI preferences** that enhance user experience but don't contain business logic or transactional data. Keep it lightweight, keep it focused, and maintain strict separation from your CQRS data layer.