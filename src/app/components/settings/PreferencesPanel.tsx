/**
 * PreferencesPanel - User preferences configuration UI
 * 
 * This component demonstrates how to use the user preferences store.
 * It provides a UI for users to customize their experience.
 */

import React from 'react';
import { Moon, Sun, Settings, Eye, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { useUserPreferences, TextSize } from '../../store/userPreferences';
import { useStrings } from '../../hooks/useStrings';
import { useTheme } from 'next-themes';

export function PreferencesPanel() {
  const { t } = useStrings();
  const { theme, setTheme } = useTheme();
  
  // State selectors
  const sidebarCollapsed = useUserPreferences((state) => state.sidebarCollapsed);
  const textSize = useUserPreferences((state) => state.textSize);
  
  // Action selectors
  const setSidebarCollapsed = useUserPreferences((state) => state.setSidebarCollapsed);
  const setTextSize = useUserPreferences((state) => state.setTextSize);
  const resetPreferences = useUserPreferences((state) => state.resetPreferences);
  const setThemePreference = useUserPreferences((state) => state.setTheme);

  // Map slider values to text sizes
  const textSizeOptions: TextSize[] = [87.5, 100, 112.5, 125];
  const sliderValue = textSizeOptions.indexOf(textSize);
  
  const handleTextSizeChange = (value: number[]) => {
    const newSize = textSizeOptions[value[0]];
    setTextSize(newSize);
    // Apply text size to root element
    document.documentElement.style.fontSize = `${newSize}%`;
  };

  // Apply text size on mount
  React.useEffect(() => {
    document.documentElement.style.fontSize = `${textSize}%`;
  }, [textSize]);

  const getTextSizeLabel = (size: TextSize) => {
    switch (size) {
      case 87.5:
        return t('settings.accessibility.textSize.small');
      case 100:
        return t('settings.accessibility.textSize.default');
      case 112.5:
        return t('settings.accessibility.textSize.large');
      case 125:
        return t('settings.accessibility.textSize.extraLarge');
      default:
        return t('settings.accessibility.textSize.default');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="pt-6 md:pt-0">
        <h1 style={{ fontFamily: 'Manrope' }}>
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            {t('settings.appearance.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.appearance.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">{t('settings.appearance.darkMode')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.appearance.darkMode.description')}
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => {
                const newTheme = checked ? 'dark' : 'light';
                setTheme(newTheme);
                setThemePreference(newTheme);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-4" />
            {t('settings.layout.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.layout.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sidebar-collapsed">{t('settings.layout.collapseSidebar')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.layout.collapseSidebar.description')}
              </p>
            </div>
            <Switch
              id="sidebar-collapsed"
              checked={sidebarCollapsed}
              onCheckedChange={setSidebarCollapsed}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-4" />
            {t('settings.accessibility.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.accessibility.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="text-size">{t('settings.accessibility.textSize')}</Label>
              <span className="text-sm text-muted-foreground font-medium">
                {getTextSizeLabel(textSize)}
              </span>
            </div>
            <Slider
              id="text-size"
              min={0}
              max={3}
              step={1}
              value={[sliderValue]}
              onValueChange={handleTextSizeChange}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              {t('settings.accessibility.textSize.description')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={resetPreferences}
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          {t('settings.dangerZone.resetPreferences.button')}
        </Button>
      </div>
    </div>
  );
}
