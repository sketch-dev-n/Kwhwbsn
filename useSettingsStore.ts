import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  reminderTime: string;
  setBiometricEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      biometricEnabled: false,
      notificationsEnabled: false,
      reminderTime: '20:00',
      setBiometricEnabled: (enabled: boolean) => set({ biometricEnabled: enabled }),
      setNotificationsEnabled: (enabled: boolean) => set({ notificationsEnabled: enabled }),
      setReminderTime: (time: string) => set({ reminderTime: time }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        biometricEnabled: state.biometricEnabled,
        notificationsEnabled: state.notificationsEnabled,
        reminderTime: state.reminderTime,
      }),
    }
  )
);
