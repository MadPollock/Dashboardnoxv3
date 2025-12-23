import React, { useEffect } from 'react';
import { User, Moon, Sun, ChevronDown, HelpCircle } from 'lucide-react';
import { SyncStatusIndicator, SyncStatus } from './SyncStatusIndicator';
import { SetupProgressBar } from './SetupProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { useStrings } from '../../hooks/useStrings';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useUserPreferences, LocalePreference } from '../../store/userPreferences';
import symbolLogo from 'figma:asset/bab8c4cff754030103d6382906a69768e5a801a9.png';

interface TopbarProps {
  syncStatus: SyncStatus;
  lastSync?: Date;
  onNavChange: (navId: string) => void;
  onOpenReceivePayment: () => void;
}

export function Topbar({ syncStatus, lastSync, onNavChange, onOpenReceivePayment }: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const setThemePreference = useUserPreferences((state) => state.setTheme);
  const storedTheme = useUserPreferences((state) => state.theme);
  const storedLocale = useUserPreferences((state) => state.locale);
  const setLocalePreference = useUserPreferences((state) => state.setLocale);
  const { t } = useStrings();

  // Sync persisted theme with next-themes
  useEffect(() => {
    if (storedTheme && storedTheme !== theme) {
      setTheme(storedTheme);
    }
  }, [storedTheme, theme, setTheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setThemePreference(newTheme as 'light' | 'dark');
  };

  const handleLocaleChange = (locale: LocalePreference) => {
    setLocalePreference(locale);
  };

  const localeLabels: Record<LocalePreference, string> = {
    en: 'English',
    pt: 'Português',
    es: 'Español',
  };

  const localeFlags: Record<LocalePreference, string> = {
    en: '🇬🇧',
    pt: '🇧🇷',
    es: '🇪🇸',
  };

  const localeCodes: Record<LocalePreference, string> = {
    en: 'EN',
    pt: 'PT',
    es: 'ES',
  };

  return (
    <>
      <header className="h-16 border-b bg-card dark:bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
        {/* Left Section - Logo on mobile only */}
        <div className="flex items-center gap-2">
          <img src={symbolLogo} alt="Crossramp" className="size-8 md:hidden" />
        </div>

        {/* Right Section - Live, Support, Mode, Language, User */}
        <div className="flex items-center gap-2 md:gap-4 ml-auto">
          {/* Sync Status - Live indicator */}
          <div className="hidden sm:block">
            <SyncStatusIndicator status={syncStatus} lastSync={lastSync} />
          </div>

          {/* Support Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onNavChange('support')}
            title={t('nav.support')}
            className="hover:bg-accent/50 transition-colors"
          >
            <HelpCircle className="size-5" />
          </Button>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-1.5 px-2 md:px-3 h-9 hover:bg-accent/50 transition-colors" 
                title="Change language"
              >
                <span className="text-lg leading-none">{localeFlags[storedLocale]}</span>
                <span className="hidden sm:inline text-sm font-medium">{localeCodes[storedLocale]}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('settings.language')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['en', 'pt', 'es'] as LocalePreference[]).map((locale) => (
                <DropdownMenuItem 
                  key={locale} 
                  onClick={() => handleLocaleChange(locale)}
                  className={storedLocale === locale ? 'bg-accent' : ''}
                >
                  <span className="mr-2">{localeFlags[locale]}</span>
                  {localeLabels[locale]}
                  {storedLocale === locale && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="size-8 bg-muted rounded-full flex items-center justify-center">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <span className="hidden md:inline">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('user.menu.myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavChange('app-settings')}>{t('user.menu.settings')}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>{t('user.menu.logout')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      {/* Setup Progress Bar - Now below the topbar */}
      <SetupProgressBar 
        onNavChange={onNavChange}
        onOpenReceivePayment={onOpenReceivePayment}
      />
    </>
  );
}