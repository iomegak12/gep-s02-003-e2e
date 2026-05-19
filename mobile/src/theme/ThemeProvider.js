import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { MD3LightTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors } from './tokens';
import { paperFonts } from './typography';

const THEME_KEY = 'nexus.theme';

const ThemeContext = createContext({
  mode: 'system',
  effective: 'light',
  setMode: () => {},
  toggle: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const setMode = useCallback(async (next) => {
    setModeState(next);
    try {
      await SecureStore.setItemAsync(THEME_KEY, next);
    } catch {}
  }, []);

  const effective = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const toggle = useCallback(() => {
    setMode(effective === 'dark' ? 'light' : 'dark');
  }, [effective, setMode]);

  const paperTheme = useMemo(() => {
    const base = effective === 'dark' ? MD3DarkTheme : MD3LightTheme;
    const palette = effective === 'dark' ? darkColors : lightColors;
    return {
      ...base,
      colors: { ...base.colors, ...palette },
      fonts: paperFonts,
    };
  }, [effective]);

  const value = useMemo(
    () => ({ mode, effective, setMode, toggle, paperTheme, hydrated }),
    [mode, effective, setMode, toggle, paperTheme, hydrated],
  );

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}
