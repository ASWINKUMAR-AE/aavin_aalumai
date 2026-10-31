import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme, Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors } from '../constants/Colors';
import { Config } from '../constants/Config';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: Colors.light,
  setMode: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [activeSystemScheme, setActiveSystemScheme] = useState<'light' | 'dark'>(
    systemScheme === 'dark' ? 'dark' : 'light'
  );
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Synchronize with OS appearance events
  useEffect(() => {
    const initial = Appearance.getColorScheme();
    if (initial === 'dark' || initial === 'light') {
      setActiveSystemScheme(initial);
    }

    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === 'dark' || colorScheme === 'light') {
        setActiveSystemScheme(colorScheme);
      }
    });

    // Also support web prefers-color-scheme matchMedia listener
    let cleanupWebListener: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handleWebMql = (e: MediaQueryListEvent) => {
        setActiveSystemScheme(e.matches ? 'dark' : 'light');
      };
      if (mql.matches) {
        setActiveSystemScheme('dark');
      }
      if (mql.addEventListener) {
        mql.addEventListener('change', handleWebMql);
        cleanupWebListener = () => mql.removeEventListener('change', handleWebMql);
      }
    }

    return () => {
      sub.remove();
      if (cleanupWebListener) cleanupWebListener();
    };
  }, []);

  useEffect(() => {
    if (systemScheme === 'dark' || systemScheme === 'light') {
      setActiveSystemScheme(systemScheme);
    }
  }, [systemScheme]);

  // Sync with user's saved preference in AsyncStorage (defaults to 'system')
  useEffect(() => {
    AsyncStorage.getItem(Config.STORAGE_KEYS.THEME_MODE).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setModeState(val as ThemeMode);
      }
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem(Config.STORAGE_KEYS.THEME_MODE, newMode);
  };

  // When mode is 'system', dynamically reflect activeSystemScheme
  const isDark = mode === 'system' ? activeSystemScheme === 'dark' : mode === 'dark';

  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
