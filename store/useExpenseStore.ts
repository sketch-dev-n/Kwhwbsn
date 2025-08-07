@@ .. @@
 import { create } from 'zustand';
-import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
-import { db } from '../services/firebase';
-import { useAuthStore } from './useAuthStore';
 import { persist } from 'zustand/middleware';
 import AsyncStorage from '@react-native-async-storage/async-storage';
 import { Expense, Budget } from '../types';
+import { expenseService } from '../services/expenseService';

 interface ExpenseState {
   expenses: Expense[];
@@ .. @@
   setLoading: (loading: boolean) => void;
   clearAllData: () => void;
-  subscribeToFirestoreExpenses: () => void;
-  unsubscribeFromFirestoreExpenses: () => void;
+  loadExpenses: () => Promise<void>;
+  loadBudgets: () => Promise<void>;
 }

-let unsubscribeExpenses: (() => void) | null = null;
-
 export const useExpenseStore = create<ExpenseState>()(
   persist(
     (set, get) => ({
@@ .. @@
       setLoading: (isLoading) => set({ isLoading }),
       clearAllData: () => set({ expenses: [], budgets: [] }),

-      subscribeToFirestoreExpenses: () => {
-        // Clean up previous listener if any
-        if (unsubscribeExpenses) unsubscribeExpenses();
-        const { user, isGuest } = useAuthStore.getState();
-        if (isGuest || !user) return;
-        const expensesRef = collection(db, 'users', user.uid, 'expenses');
-        const q = query(expensesRef, orderBy('date', 'desc'));
-        unsubscribeExpenses = onSnapshot(q, (snapshot) => {
-          const expenses = snapshot.docs.map((doc) => {
-            const data = doc.data();
-            return {
-              id: doc.id,
-              amount: data.amount,
-              category: data.category,
-              notes: data.notes,
-              date: data.date.toDate(),
-              createdAt: data.createdAt.toDate(),
-              updatedAt: data.updatedAt.toDate(),
-            };
-          });
-          set({ expenses });
-        });
+      loadExpenses: async () => {
+        try {
+          set({ isLoading: true });
+          const expenses = await expenseService.getExpenses();
+          set({ expenses });
+        } catch (error) {
+          console.error('Error loading expenses:', error);
+        } finally {
+          set({ isLoading: false });
+        }
       },
-      unsubscribeFromFirestoreExpenses: () => {
-        if (unsubscribeExpenses) {
-          unsubscribeExpenses();
-          unsubscribeExpenses = null;
+      
+      loadBudgets: async () => {
+        try {
+          const budgets = await expenseService.getBudgets();
+          set({ budgets });
+        } catch (error) {
+          console.error('Error loading budgets:', error);
         }
       },
     }),