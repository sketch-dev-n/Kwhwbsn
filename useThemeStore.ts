import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../types';

const themes: Record<string, Theme> = {
  light: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    subtext: '#64748b',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    card: '#ffffff',
    border: '#e2e8f0',
  },
  dark: {
    primary: '#818cf8',
    secondary: '#a78bfa',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    subtext: '#94a3b8',
    accent: '#22d3ee',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    card: '#334155',
    border: '#475569',
  },
  blue: {
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    background: '#f0f9ff',
    surface: '#ffffff',
    text: '#1e3a8a',
    subtext: '#3730a3',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    card: '#dbeafe',
    border: '#93c5fd',
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    background: '#faf5ff',
    surface: '#ffffff',
    text: '#581c87',
    subtext: '#7c2d12',
    accent: '#ec4899',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    card: '#ede9fe',
    border: '#c4b5fd',
  },
  green: {
    primary: '#10b981',
    secondary: '#059669',
    background: '#f0fdf4',
    surface: '#ffffff',
    text: '#064e3b',
    subtext: '#047857',
    accent: '#f97316',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    card: '#dcfce7',
    border: '#86efac',
  },
};

interface ThemeState {
  currentTheme: keyof typeof themes;
  theme: Theme;
  isHydrated: boolean;
  setTheme: (themeName: keyof typeof themes) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: 'light',
      theme: themes.light,
      isHydrated: false,
      setTheme: (themeName) => {
        const selectedTheme = themes[themeName] || themes.light;
        set({ currentTheme: themeName, theme: selectedTheme });
      },
    }),
    {
      name: 'theme-storage',
      storage: {
        getItem: async (name) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('Theme storage getItem error:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Theme storage setItem error:', error);
          }
        },
        removeItem: (name) => AsyncStorage.removeItem(name),
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          // Ensure theme is valid
          if (!state.theme || !themes[state.currentTheme]) {
            state.currentTheme = 'light';
            state.theme = themes.light;
          }
        }
      },
    }
  )
);