import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useAppData } from './ExpenseContext';
import { THEMES, DEFAULT_THEME_ID, ThemeId, ThemeColors, ThemeDefinition, THEME_LIST } from '../theme/colors';

interface ThemeContextType {
  themeId: ThemeId;
  colors: ThemeColors;
  isLight: boolean;
  themeList: ThemeDefinition[];
  setThemeId: (themeId: ThemeId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useAppData();

  const themeId = settings.themeId ?? DEFAULT_THEME_ID;
  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID];

  const setThemeId = useCallback(async (nextThemeId: ThemeId) => {
    await updateSettings({ themeId: nextThemeId });
  }, [updateSettings]);

  const value = useMemo<ThemeContextType>(() => ({
    themeId: theme.id,
    colors: theme.colors,
    isLight: theme.isLight,
    themeList: THEME_LIST,
    setThemeId,
  }), [theme, setThemeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
