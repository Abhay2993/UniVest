import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, lightPalette, Palette } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'univest.themePreference.v1';

interface ThemeValue {
  palette: Palette;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  /** Cycles system → light → dark → system; persisted across launches. */
  cyclePreference: () => void;
}

const ThemeContext = createContext<ThemeValue>({
  palette: lightPalette,
  scheme: 'light',
  preference: 'system',
  cyclePreference: () => {},
});

const CYCLE: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw === 'light' || raw === 'dark' || raw === 'system') setPreference(raw);
      })
      .catch(() => {});
  }, []);

  const cyclePreference = useCallback(() => {
    setPreference((cur) => {
      const next = CYCLE[cur];
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      palette: scheme === 'dark' ? darkPalette : lightPalette,
      scheme,
      preference,
      cyclePreference,
    }),
    [scheme, preference, cyclePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/**
 * Memoizes a palette-driven StyleSheet factory. Define the factory at module
 * scope so its identity is stable:
 *   const makeStyles = (c: Palette) => StyleSheet.create({ ... });
 *   const s = useThemedStyles(makeStyles);
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (palette: Palette) => T,
): T {
  const { palette } = useTheme();
  return useMemo(() => factory(palette), [factory, palette]);
}
