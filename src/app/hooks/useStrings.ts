import { useMemo, useCallback } from 'react';
import { DEFAULT_LOCALE, SupportedLocale, translate, formatString } from '../content/strings';
import { useUserPreferences } from '../store/userPreferences';

function normalizeLocale(input?: string | null): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  const normalized = input.slice(0, 2).toLowerCase();
  if (normalized === 'pt') return 'pt';
  if (normalized === 'es') return 'es';
  return 'en';
}

export function useStrings(preferredLocale?: string | null) {
  // Read from Zustand store if no locale is explicitly provided
  const storedLocale = useUserPreferences((state) => state.locale);
  
  const locale = useMemo(
    () => normalizeLocale(preferredLocale || storedLocale || import.meta.env?.VITE_APP_LOCALE),
    [preferredLocale, storedLocale]
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = translate(key, locale);
      return vars ? formatString(raw, vars) : raw;
    },
    [locale]
  );

  return { t, locale };
}