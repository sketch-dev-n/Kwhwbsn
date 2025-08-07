import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const { user, isGuest, isLoading } = useAuthStore();

  useEffect(() => {
    // This ensures the auth state is properly initialized
  }, []);

  if (isLoading) {
    return null; // Or a loading screen
  }

  if (user || isGuest) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth" />;
}
