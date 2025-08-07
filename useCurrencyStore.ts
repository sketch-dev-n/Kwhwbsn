import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency, SUPPORTED_CURRENCIES } from '../types/currency';

interface CurrencyState {
  defaultCurrency: Currency;
  isHydrated: boolean;
  setDefaultCurrency: (currency: Currency) => void;
  formatAmount: (amount: number) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      defaultCurrency: SUPPORTED_CURRENCIES[0], // USD as default
      isHydrated: false,
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      formatAmount: (amount) => {
        const { defaultCurrency } = get();
        if (!defaultCurrency) return amount.toString();
        const formattedAmount = amount.toFixed(defaultCurrency.decimalPlaces);
        const [integer, decimal] = formattedAmount.split('.');
        
        // Add thousands separator
        const integerWithSeparator = integer.replace(/\B(?=(\d{3})+(?!\d))/g, defaultCurrency.thousandsSeparator);
        
        const finalAmount = decimal ? `${integerWithSeparator}${defaultCurrency.decimalSeparator}${decimal}` : integerWithSeparator;
        
        return defaultCurrency.symbolPosition === 'before' 
          ? `${defaultCurrency.symbol}${finalAmount}`
          : `${finalAmount}${defaultCurrency.symbol}`;
      },
    }),
    {
      name: 'currency-storage',
      storage: {
        getItem: async (name) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('Currency storage getItem error:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Currency storage setItem error:', error);
          }
        },
        removeItem: (name) => AsyncStorage.removeItem(name),
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          // Ensure currency is valid
          if (!state.defaultCurrency) {
            state.defaultCurrency = SUPPORTED_CURRENCIES[0];
          }
        }
      },
    }
  )
);
