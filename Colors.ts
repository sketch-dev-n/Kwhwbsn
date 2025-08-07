/**
 * Color System Constants
 * Based on React Native and Expo theming best practices
 */

export const Colors = {
  light: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    background: '#ffffff',
    surface: '#f8fafc',
    card: '#ffffff',
    text: '#1f2937',
    subtext: '#6b7280',
    border: '#e5e7eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    disabled: '#9ca3af',
    placeholder: '#9ca3af',
    shadow: '#000000',
  },
  dark: {
    primary: '#818cf8',
    secondary: '#a78bfa',
    accent: '#22d3ee',
    background: '#111827',
    surface: '#1f2937',
    card: '#374151',
    text: '#f9fafb',
    subtext: '#d1d5db',
    border: '#374151',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    disabled: '#6b7280',
    placeholder: '#9ca3af',
    shadow: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof Colors.light;

export const getColors = (scheme: ColorScheme) => Colors[scheme];

export default Colors;
