import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { authService } from '../services/authService';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingScreen from '../components/LoadingScreen';

export default function RootLayout() {
  const { theme, isHydrated: themeHydrated } = useThemeStore();
  const { isHydrated: currencyHydrated } = useCurrencyStore();
  const { setUser, setGuest, setLoading, isLoading } = useAuthStore();
  const { loadExpenses, loadBudgets } = useExpenseStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const user = await authService.getCurrentUser();
        
        if (user) {
          if (user.uid.startsWith('guest-')) {
            setGuest(true);
          } else {
            setUser(user);
          }
          
          // Load data after authentication
          await Promise.all([loadExpenses(), loadBudgets()]);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (themeHydrated && currencyHydrated) {
      initializeAuth();
    }
  }, [themeHydrated, currencyHydrated, setUser, setGuest, setLoading, loadExpenses, loadBudgets]);

  if (!themeHydrated || !currencyHydrated || isLoading) {
    return <LoadingScreen />;
  }

  const paperTheme = {
    colors: {
      primary: theme.primary,
      secondary: theme.secondary,
      background: theme.background,
      surface: theme.surface,
      text: theme.text,
      onSurface: theme.text,
      outline: theme.border,
    },
  };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <StatusBar style={theme.background === '#0f172a' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}