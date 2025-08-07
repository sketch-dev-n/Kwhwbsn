import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Budget } from '../types';

class ExpenseService {
  private readonly EXPENSES_KEY = 'expenses';
  private readonly BUDGETS_KEY = 'budgets';

  async getExpenses(): Promise<Expense[]> {
    try {
      const data = await AsyncStorage.getItem(this.EXPENSES_KEY);
      if (!data) return [];
      
      const expenses = JSON.parse(data);
      return expenses.map((expense: any) => ({
        ...expense,
        date: new Date(expense.date),
        createdAt: new Date(expense.createdAt),
        updatedAt: new Date(expense.updatedAt),
      }));
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }

  async addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
    try {
      const expenses = await this.getExpenses();
      const newExpense: Expense = {
        ...expense,
        id: Date.now().toString(),
      };
      
      expenses.push(newExpense);
      await AsyncStorage.setItem(this.EXPENSES_KEY, JSON.stringify(expenses));
      return newExpense.id;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw new Error('Failed to add expense');
    }
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
    try {
      const expenses = await this.getExpenses();
      const index = expenses.findIndex(expense => expense.id === id);
      
      if (index === -1) {
        throw new Error('Expense not found');
      }
      
      expenses[index] = { ...expenses[index], ...updates, updatedAt: new Date() };
      await AsyncStorage.setItem(this.EXPENSES_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error updating expense:', error);
      throw new Error('Failed to update expense');
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      const expenses = await this.getExpenses();
      const filteredExpenses = expenses.filter(expense => expense.id !== id);
      await AsyncStorage.setItem(this.EXPENSES_KEY, JSON.stringify(filteredExpenses));
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw new Error('Failed to delete expense');
    }
  }

  async getBudgets(): Promise<Budget[]> {
    try {
      const data = await AsyncStorage.getItem(this.BUDGETS_KEY);
      if (!data) return [];
      
      const budgets = JSON.parse(data);
      return budgets.map((budget: any) => ({
        ...budget,
        createdAt: new Date(budget.createdAt),
        updatedAt: new Date(budget.updatedAt),
      }));
    } catch (error) {
      console.error('Error getting budgets:', error);
      return [];
    }
  }

  async addBudget(budget: Omit<Budget, 'id'>): Promise<string> {
    try {
      const budgets = await this.getBudgets();
      const newBudget: Budget = {
        ...budget,
        id: Date.now().toString(),
      };
      
      budgets.push(newBudget);
      await AsyncStorage.setItem(this.BUDGETS_KEY, JSON.stringify(budgets));
      return newBudget.id;
    } catch (error) {
      console.error('Error adding budget:', error);
      throw new Error('Failed to add budget');
    }
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<void> {
    try {
      const budgets = await this.getBudgets();
      const index = budgets.findIndex(budget => budget.id === id);
      
      if (index === -1) {
        throw new Error('Budget not found');
      }
      
      budgets[index] = { ...budgets[index], ...updates, updatedAt: new Date() };
      await AsyncStorage.setItem(this.BUDGETS_KEY, JSON.stringify(budgets));
    } catch (error) {
      console.error('Error updating budget:', error);
      throw new Error('Failed to update budget');
    }
  }

  async deleteBudget(id: string): Promise<void> {
    try {
      const budgets = await this.getBudgets();
      const filteredBudgets = budgets.filter(budget => budget.id !== id);
      await AsyncStorage.setItem(this.BUDGETS_KEY, JSON.stringify(filteredBudgets));
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw new Error('Failed to delete budget');
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.EXPENSES_KEY, this.BUDGETS_KEY]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear data');
    }
  }
}

export const expenseService = new ExpenseService();