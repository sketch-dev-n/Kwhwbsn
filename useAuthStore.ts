import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setGuest: (isGuest: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isGuest: false,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isGuest: false }),
      setGuest: (isGuest) => set({ isGuest, isAuthenticated: isGuest, user: null }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isGuest: false, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: async (name) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('Auth storage getItem error:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Auth storage setItem error:', error);
          }
        },
        removeItem: (name) => AsyncStorage.removeItem(name),
      },
    }
  )
);