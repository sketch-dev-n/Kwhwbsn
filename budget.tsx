import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, FlatList } from 'react-native';
import { Text, Card, Button, TextInput, ProgressBar, FAB, Snackbar, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useThemeStore } from '../../store/useThemeStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { expenseService } from '../../services/expenseService';
import { Budget, EXPENSE_CATEGORIES } from '../../types';
import { getCurrentMonth, getDateRangeForMonth } from '../../utils/csvExport';
import { useCurrencyStore } from '../../store/useCurrencyStore';

export default function BudgetScreen() {
  const { theme } = useThemeStore();
  const { expenses, budgets, setBudgets, addBudget, updateBudget } = useExpenseStore();
  const { formatAmount } = useCurrencyStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const loadBudgets = useCallback(async () => {
    try {
      const data = await expenseService.getBudgets();
      setBudgets(data);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  }, [setBudgets]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const getCurrentMonthSpending = useCallback((category: string) => {
    const currentMonth = getCurrentMonth();
    const { start, end } = getDateRangeForMonth(currentMonth);
    
    return expenses
      .filter(expense => 
        expense.category === category &&
        expense.date >= start &&
        expense.date <= end
      )
      .reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  const getBudgetStatus = useCallback((budget: Budget) => {
    const spent = getCurrentMonthSpending(budget.category) || 0;
    const remaining = budget.monthlyLimit - spent;
    const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
    
    let color = theme.success;
    if (percentage >= 100) {
      color = theme.error;
    } else if (percentage >= 80) {
      color = theme.warning;
    }
    
    return { 
      spent: Number(spent.toFixed(2)), 
      percentage: Number(percentage.toFixed(1)), 
      remaining: Number(remaining.toFixed(2)), 
      color 
    };
  }, [theme, getCurrentMonthSpending]);

  const handleAddBudget = async () => {
    if (!newBudgetCategory || !newBudgetAmount || parseFloat(newBudgetAmount) <= 0) {
      showSnackbar('Please select a category and enter a valid amount');
      return;
    }

    const currentMonth = getCurrentMonth();
    const existingBudget = budgets.find(
      b => b.category === newBudgetCategory && b.month === currentMonth
    );

    if (existingBudget) {
      showSnackbar('A budget for this category already exists this month');
      return;
    }

    setIsLoading(true);
    
    try {
      const budget: Omit<Budget, 'id'> = {
        category: newBudgetCategory,
        monthlyLimit: parseFloat(newBudgetAmount),
        month: currentMonth,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budgetId = await expenseService.addBudget(budget);
      addBudget({ ...budget, id: budgetId });

      setNewBudgetCategory('');
      setNewBudgetAmount('');
      setShowAddBudget(false);
      
      showSnackbar('Budget added successfully!');
    } catch (error) {
      showSnackbar('Failed to add budget. Please try again.');
      console.error('Error adding budget:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBudget = async () => {
    if (!editingBudget || !newBudgetAmount || parseFloat(newBudgetAmount) <= 0) {
      showSnackbar('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    
    try {
      if (editingBudget.id === 'total') {
        // Handle total budget editing by updating all budgets proportionally
        const newTotalBudget = parseFloat(newBudgetAmount);
        const currentTotalBudget = budgets.reduce((sum, budget) => sum + budget.monthlyLimit, 0);
        
        if (currentTotalBudget > 0) {
          const ratio = newTotalBudget / currentTotalBudget;
          
          // Update all budgets proportionally
          for (const budget of budgets) {
            const newLimit = budget.monthlyLimit * ratio;
            const updatedBudget = {
              monthlyLimit: newLimit,
              updatedAt: new Date(),
            };
            
            await expenseService.updateBudget(budget.id, updatedBudget);
            updateBudget(budget.id, updatedBudget);
          }
        }
        
        showSnackbar('Total budget updated successfully!');
      } else {
        // Handle individual budget editing
        const updatedBudget = {
          monthlyLimit: parseFloat(newBudgetAmount),
          updatedAt: new Date(),
        };

        await expenseService.updateBudget(editingBudget.id, updatedBudget);
        updateBudget(editingBudget.id, updatedBudget);
        
        showSnackbar('Budget updated successfully!');
      }

      setEditingBudget(null);
      setNewBudgetAmount('');
      setShowEditBudget(false);
    } catch (error) {
      showSnackbar('Failed to update budget. Please try again.');
      console.error('Error updating budget:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setNewBudgetAmount(budget.monthlyLimit.toString());
    setShowEditBudget(true);
  };

  const availableCategories = EXPENSE_CATEGORIES.filter(
    category => !budgets.some(budget => budget.category === category && budget.month === getCurrentMonth())
  );

  const getTotalBudgetStatus = useCallback(() => {
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.monthlyLimit, 0);
    const currentMonth = getCurrentMonth();
    const { start, end } = getDateRangeForMonth(currentMonth);
    
    const totalSpent = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= start && expenseDate <= end;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    const remaining = totalBudget - totalSpent;
    const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    let color = theme.success;
    
    if (percentage >= 100) {
      color = theme.error;
    } else if (percentage >= 80) {
      color = theme.warning;
    }

    return { 
      spent: Number(totalSpent.toFixed(2)), 
      percentage: Number(percentage.toFixed(1)), 
      remaining: Number(remaining.toFixed(2)), 
      color, 
      totalBudget: Number(totalBudget.toFixed(2)) 
    };
  }, [budgets, expenses, theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Budget</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            Manage your monthly spending limits
          </Text>
        </View>
        
        <View style={styles.content}>
          {/* Total Budget Card */}
          {budgets.length > 0 && (() => {
            const { spent, percentage, remaining, color, totalBudget } = getTotalBudgetStatus();
          
          return (
            <Card style={[styles.budgetCard, styles.totalBudgetCard, { backgroundColor: theme.card, borderLeftColor: color }]}>
              <Card.Content>
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetTitleSection}>
                    <Text style={[styles.totalBudgetTitle, { color: theme.text }]}>
                      Total Budget
                    </Text>
                    <Text style={[styles.budgetLimit, { color: theme.subtext }]}>
                      {formatAmount(totalBudget)}
                    </Text>
                  </View>
                  <View style={styles.totalBudgetActions}>
                    <View style={[styles.totalBudgetBadge, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.totalBudgetPercentage, { color: color }]}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                    <TouchableRipple
                      onPress={() => {
                        setNewBudgetAmount(totalBudget.toString());
                        setEditingBudget({ id: 'total', category: 'Total Budget', monthlyLimit: totalBudget, month: getCurrentMonth(), createdAt: new Date(), updatedAt: new Date() });
                        setShowEditBudget(true);
                      }}
                      style={[
                        styles.totalBudgetEditButton,
                        {
                          backgroundColor: theme.primary + '15',
                          borderColor: theme.primary,
                          borderWidth: 1,
                          borderRadius: 16,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          minWidth: 50,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }
                      ]}
                      rippleColor={theme.primary + '30'}
                    >
                      <Text style={[
                        styles.editButtonText,
                        {
                          color: theme.primary,
                          fontSize: 12,
                          fontWeight: '600',
                          textAlign: 'center'
                        }
                      ]}>
                        Edit
                      </Text>
                    </TouchableRipple>
                  </View>
                </View>
                
                <ProgressBar 
                  progress={Math.min(percentage / 100, 1)} 
                  color={color} 
                  style={[styles.progressBar, { height: 6, borderRadius: 3 }]} 
                />
                
                <View style={styles.budgetStats}>
                  <View style={styles.budgetStat}>
                    <Text style={[styles.budgetStatLabel, { color: theme.subtext }]}>Spent</Text>
                    <Text style={[styles.budgetStatValue, { color: theme.text }]}>
                      {formatAmount(spent)}
                    </Text>
                  </View>
                  <View style={styles.budgetStat}>
                    <Text style={[styles.budgetStatLabel, { color: theme.subtext }]}>
                      {remaining >= 0 ? 'Remaining' : 'Over'}
                    </Text>
                    <Text style={[styles.budgetStatValue, { color: remaining >= 0 ? theme.success : theme.error }]}>
                      {formatAmount(Math.abs(remaining))}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        })()}

        {budgets.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Card.Content style={styles.emptyContent}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No budgets set
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
                Set monthly spending limits to track your budget
              </Text>
            </Card.Content>
          </Card>
        ) : (
          budgets.map((budget) => {
            const { spent, percentage, remaining, color } = getBudgetStatus(budget);
            
            return (
              <Card style={[styles.budgetCard, { backgroundColor: theme.card }]} key={budget.id}>
                <Card.Content>
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetTitleSection}>
                      <Text style={[styles.budgetCategory, { color: theme.text }]}>
                        {budget.category}
                      </Text>
                      <Text style={[styles.budgetLimit, { color: theme.subtext }]}>
                        {formatAmount(budget.monthlyLimit)}
                      </Text>
                    </View>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => startEditBudget(budget)}
                      style={[styles.editButton, { borderColor: theme.border }]}
                    >
                      Edit
                    </Button>
                  </View>
                  
                  <ProgressBar 
                    progress={Math.min(percentage / 100, 1)} 
                    color={color} 
                    style={styles.progressBar} 
                  />
                  
                  <View style={styles.budgetStats}>
                    <View style={styles.budgetStat}>
                      <Text style={[styles.budgetStatLabel, { color: theme.subtext }]}>Spent</Text>
                      <Text style={[styles.budgetStatValue, { color: theme.text }]}>
                        {formatAmount(spent)}
                      </Text>
                    </View>
                    <View style={styles.budgetStat}>
                      <Text style={[styles.budgetStatLabel, { color: theme.subtext }]}>
                        {remaining >= 0 ? 'Remaining' : 'Overspent'}
                      </Text>
                      <Text style={[styles.budgetStatValue, { color: remaining >= 0 ? theme.text : theme.error }]}>
                        {formatAmount(Math.abs(remaining))}
                      </Text>
                    </View>
                    <View style={styles.budgetStat}>
                      <Text style={[styles.budgetStatLabel, { color: theme.subtext }]}>Progress</Text>
                      <Text style={[styles.budgetStatValue, { color: theme.text }]}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}

        {/* Add Budget Modal */}
        <Modal
          visible={showAddBudget}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddBudget(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={[styles.budgetModal, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Budget</Text>
                
                <View style={styles.modalForm}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                    <View style={[styles.categoryButton, { borderColor: theme.border }]}>
                      <TouchableRipple
                        onPress={() => setCategoryMenuVisible(true)}
                        style={styles.categoryButtonInner}
                      >
                        <View style={styles.categoryButtonInner}>
                          <Text style={[styles.categoryButtonText, { color: newBudgetCategory ? theme.text : theme.subtext }]}>
                            {newBudgetCategory || 'Select Category'}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color={theme.subtext} />
                        </View>
                      </TouchableRipple>
                    </View>

                    <Modal
                      visible={categoryMenuVisible}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setCategoryMenuVisible(false)}
                    >
                      <TouchableRipple
                        style={styles.modalOverlay}
                        onPress={() => setCategoryMenuVisible(false)}
                      >
                        <View style={styles.modalContainer}>
                          <View style={[styles.dropdownModal, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
                            <FlatList
                              data={availableCategories}
                              keyExtractor={(item) => item}
                              renderItem={({ item }) => (
                                <TouchableRipple
                                  onPress={() => {
                                    setNewBudgetCategory(item);
                                    setCategoryMenuVisible(false);
                                  }}
                                  style={[styles.categoryItem, { borderBottomColor: theme.border }]}
                                >
                                  <Text style={[styles.categoryItemText, { color: theme.text }]}>
                                    {item}
                                  </Text>
                                </TouchableRipple>
                              )}
                            />
                          </View>
                        </View>
                      </TouchableRipple>
                    </Modal>
                  </View>

                  <TextInput
                    mode="outlined"
                    label="Monthly Limit"
                    value={newBudgetAmount}
                    onChangeText={setNewBudgetAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                    style={styles.input}
                    theme={{
                      colors: {
                        primary: theme.primary,
                        background: theme.surface,
                        text: theme.text,
                        placeholder: theme.subtext,
                        outline: theme.border,
                      }
                    }}
                    left={<TextInput.Icon icon="currency-usd" />}
                  />

                  <View style={styles.buttonRow}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowAddBudget(false);
                        setNewBudgetCategory('');
                        setNewBudgetAmount('');
                      }}
                      style={[styles.cancelButton, { borderColor: theme.border }]}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleAddBudget}
                      loading={isLoading}
                      disabled={isLoading}
                      style={[styles.addButton, { backgroundColor: theme.primary }]}
                    >
                      Add Budget
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Budget Modal */}
        <Modal
          visible={showEditBudget}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditBudget(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={[styles.budgetModal, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Budget</Text>
                
                <View style={styles.modalForm}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                    <View style={[styles.categoryButton, { borderColor: theme.border, backgroundColor: theme.card }]}>
                      <View style={styles.categoryButtonInner}>
                        <Text style={[styles.categoryButtonText, { color: theme.text }]}>
                          {editingBudget?.category}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TextInput
                    mode="outlined"
                    label="Monthly Limit"
                    value={newBudgetAmount}
                    onChangeText={setNewBudgetAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                    style={styles.input}
                    theme={{
                      colors: {
                        primary: theme.primary,
                        background: theme.surface,
                        text: theme.text,
                        placeholder: theme.subtext,
                        outline: theme.border,
                      }
                    }}
                    left={<TextInput.Icon icon="currency-usd" />}
                  />

                  <View style={styles.buttonRow}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowEditBudget(false);
                        setEditingBudget(null);
                        setNewBudgetAmount('');
                      }}
                      style={[styles.cancelButton, { borderColor: theme.border }]}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleEditBudget}
                      loading={isLoading}
                      disabled={isLoading}
                      style={[styles.addButton, { backgroundColor: theme.primary }]}
                    >
                      Update Budget
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>
        </View>
      </ScrollView>

      {availableCategories.length > 0 && (
        <FAB
          icon="plus"
          onPress={() => setShowAddBudget(!showAddBudget)}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: theme.surface }]}
        theme={{
          colors: {
            surface: theme.surface,
            onSurface: theme.text,
          }
        }}
      >
        <Text style={{ color: theme.text }}>{snackbarMessage}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 4,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 0,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyCard: {
    borderRadius: 16,
    elevation: 4,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  budgetCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalBudgetCard: {
    borderLeftWidth: 4,
    marginBottom: 24,
    marginHorizontal: 0,
  },
  totalBudgetTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  totalBudgetBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalBudgetPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalBudgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalBudgetEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
    minWidth: 60,
    height: 32,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetTitleSection: {
    flex: 1,
  },
  editButton: {
    borderRadius: 8,
    minWidth: 60,
  },
  budgetCategory: {
    fontSize: 18,
    fontWeight: '600',
  },
  budgetLimit: {
    fontSize: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetStat: {
    alignItems: 'center',
  },
  budgetStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  budgetStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  addBudgetCard: {
    marginBottom: 100,
    borderRadius: 16,
    elevation: 4,
  },
  addBudgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  addBudgetForm: {
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    paddingTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  addButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryButton: {
    borderRadius: 12,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
  },
  categoryButtonInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  categoryButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  budgetModal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalForm: {
    marginTop: 20,
  },
  dropdownModal: {
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryItem: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  categoryItemText: {
    fontSize: 16,
  },
  snackbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 76, // 60 (tab bar) + 16 margin
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
  },
});
