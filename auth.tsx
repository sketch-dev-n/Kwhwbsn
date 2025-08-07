import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { authService } from '../services/authService';

export default function AuthScreen() {
  const { isAuthenticated, isLoading, setLoading } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await authService.signInWithGoogle();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google. Please try again.';
      
      // Show more helpful error message with guidance
      Alert.alert(
        'Google Sign-In Not Available', 
        errorMessage + '\n\nTip: You can use "Continue as Guest" to start using the app immediately!',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Continue as Guest', 
            style: 'default',
            onPress: handleContinueAsGuest
          }
        ]
      );
      console.error('Google sign-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    try {
      await authService.continueAsGuest();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Guest login error:', error);
      Alert.alert('Error', 'Failed to continue as guest. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[theme.primary, theme.secondary]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/210600/pexels-photo-210600.jpeg?auto=compress&cs=tinysrgb&w=400' }}
            style={styles.logo}
          />
          <Text style={[styles.title, { color: '#FFFFFF' }]}>
            Advanced Expense Tracker
          </Text>
          <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
            Take control of your finances
          </Text>
        </View>

        <Card style={[styles.authCard, { backgroundColor: theme.surface }]}>
          <Card.Content style={styles.cardContent}>
            <Button
              mode="contained"
              onPress={handleGoogleSignIn}
              style={[styles.button, { backgroundColor: theme.primary }]}
              contentStyle={styles.buttonContent}
              disabled={isLoading}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                Sign in with Google
              </Text>
            </Button>

            <Button
              mode="outlined"
              onPress={handleContinueAsGuest}
              style={[styles.button, { borderColor: theme.primary }]}
              contentStyle={styles.buttonContent}
              disabled={isLoading}
            >
              <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>
                Continue as Guest
              </Text>
            </Button>

            <Text style={[styles.disclaimer, { color: theme.subtext }]}>
              Guest mode stores data locally. Sign in to sync across devices.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  authCard: {
    elevation: 8,
    borderRadius: 16,
  },
  cardContent: {
    padding: 24,
  },
  button: {
    marginBottom: 16,
    borderRadius: 12,
  },
  buttonContent: {
    height: 48,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
  },
});