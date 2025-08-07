import { create } from 'zustand';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from './useAuthStore';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Budget } from '../types';

interface ExpenseState {
  expenses: Expense[];
  budgets: Budget[];
  isLoading: boolean;
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  setLoading: (loading: boolean) => void;
  clearAllData: () => void;
  subscribeToFirestoreExpenses: () => void;
  unsubscribeFromFirestoreExpenses: () => void;
}

let unsubscribeExpenses: (() => void) | null = null;

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],
      budgets: [],
      isLoading: false,
      setExpenses: (expenses) => set({ expenses }),
      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      updateExpense: (id, updatedExpense) =>
        set((state) => ({
          expenses: state.expenses.map((expense) =>
            expense.id === id ? { ...expense, ...updatedExpense, updatedAt: new Date() } : expense
          ),
        })),
      deleteExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
        })),
      setBudgets: (budgets) => set({ budgets }),
      addBudget: (budget) => set((state) => ({ budgets: [...state.budgets, budget] })),
      updateBudget: (id, updatedBudget) =>
        set((state) => ({
          budgets: state.budgets.map((budget) =>
            budget.id === id ? { ...budget, ...updatedBudget, updatedAt: new Date() } : budget
          ),
        })),
      deleteBudget: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((budget) => budget.id !== id),
        })),
      setLoading: (isLoading) => set({ isLoading }),
      clearAllData: () => set({ expenses: [], budgets: [] }),

      subscribeToFirestoreExpenses: () => {
        // Clean up previous listener if any
        if (unsubscribeExpenses) unsubscribeExpenses();
        const { user, isGuest } = useAuthStore.getState();
        if (isGuest || !user) return;
        const expensesRef = collection(db, 'users', user.uid, 'expenses');
        const q = query(expensesRef, orderBy('date', 'desc'));
        unsubscribeExpenses = onSnapshot(q, (snapshot) => {
          const expenses = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              amount: data.amount,
              category: data.category,
              notes: data.notes,
              date: data.date.toDate(),
              createdAt: data.createdAt.toDate(),
              updatedAt: data.updatedAt.toDate(),
            };
          });
          set({ expenses });
        });
      },
      unsubscribeFromFirestoreExpenses: () => {
        if (unsubscribeExpenses) {
          unsubscribeExpenses();
          unsubscribeExpenses = null;
        }
      },
    }),
    {
      name: 'expense-storage',
      storage: {
        getItem: async (name) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('Expense storage getItem error:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Expense storage setItem error:', error);
          }
        },
        removeItem: (name) => AsyncStorage.removeItem(name),
      },
    }
  )
);