import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/useAuthStore';
import { User } from '../types';

class AuthService {
  async signInWithGoogle(): Promise<void> {
    // Simulate Google sign-in for Expo Go
    throw new Error('Google Sign-In requires a development build. Please use "Continue as Guest" to try the app.');
  }

  async continueAsGuest(): Promise<void> {
    try {
      const guestUser: User = {
        uid: 'guest-' + Date.now(),
        email: 'guest@example.com',
        displayName: 'Guest User',
        photoURL: null,
      };

      await AsyncStorage.setItem('guest-user', JSON.stringify(guestUser));
      useAuthStore.getState().setGuest(true);
    } catch (error) {
      console.error('Guest login error:', error);
      throw new Error('Failed to continue as guest');
    }
  }

  async signOut(): Promise<void> {
    try {
      await AsyncStorage.removeItem('guest-user');
      useAuthStore.getState().logout();
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const guestData = await AsyncStorage.getItem('guest-user');
      if (guestData) {
        return JSON.parse(guestData);
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}

export const authService = new AuthService();