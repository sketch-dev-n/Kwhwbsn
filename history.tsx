import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, IconButton, Snackbar, Portal, Modal, TextInput, Chip } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MotiView, MotiText } from 'moti';
import { AnimatedCard, AnimatedListItem } from '../../components/animated/AnimatedComponents';
import { ANIMATION_DURATION, SPRING_CONFIG, EASING } from '../../utils/animations';

import { useThemeStore } from '../../store/useThemeStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { expenseService } from '../../services/expenseService';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { exportExpensesToCSV } from '../../utils/csvExport';
import { useCurrencyStore } from '../../store/useCurrencyStore';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const { expenses } = useExpenseStore();
  const { formatAmount } = useCurrencyStore();

  // Create safe theme with fallbacks
  const safeTheme = theme ? {
    ...theme,
    background: theme.background || '#ffffff',
    surface: theme.surface || '#f5f5f5',
    text: theme.text || '#000000',
    subtext: theme.subtext || '#666666',
    primary: theme.primary || '#007AFF',
    error: theme.error || '#FF3B30'
  } : {
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#000000',
    subtext: '#666666',
    primary: '#007AFF',
    error: '#FF3B30'
  };
  
  // UI state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState<Date | null>(null);
  const [dateToFilter, setDateToFilter] = useState<Date | null>(null);
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCategoryDropdownVisible, setEditCategoryDropdownVisible] = useState(false);
  
  // Get unique categories from expenses (emoji categories only)
  const uniqueCategories = [...new Set(expenses.map(expense => expense.category))];
  // Filter to only include emoji categories and remove duplicates
  const allCategories = [...new Set([...EXPENSE_CATEGORIES, ...uniqueCategories.filter(cat => EXPENSE_CATEGORIES.includes(cat as any))])].sort();

  // Show snackbar message
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Load expenses from storage
  const loadExpensesData = useCallback(async () => {
    try {
      await expenseService.getExpenses();
    } catch (error) {
      console.error('Error loading expenses:', error);
      showSnackbar('Failed to load expenses');
    }
  }, []);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExpensesData();
    setRefreshing(false);
  }, [loadExpensesData]);

  // Handle delete expense with confirmation
  const handleDeleteExpense = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this expense?\n\nAmount: ${formatAmount(expense.amount)}\nCategory: ${expense.category}\nNotes: ${expense.notes || 'No notes'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseService.deleteExpense(expense.id);
useExpenseStore.getState().deleteExpense(expense.id); // Remove from local state instantly
showSnackbar('Expense deleted successfully');
            } catch (error) {
              console.error('Error deleting expense:', error);
              showSnackbar('Failed to delete expense');
            }
          },
        },
      ]
    );
  };
  
  // Handle edit expense
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditAmount(expense.amount.toString());
    setEditNotes(expense.notes || '');
    setEditCategory(expense.category);
    setEditModalVisible(true);
  };
  
  // Save edited expense
  const handleSaveEditedExpense = async () => {
    if (!editingExpense || !editAmount || parseFloat(editAmount) <= 0) {
      showSnackbar('Please enter a valid amount');
      return;
    }
    
    try {
      const updatedExpense: Expense = {
        ...editingExpense,
        amount: parseFloat(editAmount),
        notes: editNotes,
        category: editCategory,
      };
      
      await expenseService.updateExpense(editingExpense.id, updatedExpense);
      // Update local store immediately for instant UI feedback
      useExpenseStore.getState().updateExpense(editingExpense.id, updatedExpense);
      await loadExpensesData();
      setEditModalVisible(false);
      setEditingExpense(null);
      showSnackbar('Expense updated successfully');
    } catch (error) {
      console.error('Error updating expense:', error);
      showSnackbar('Failed to update expense');
    }
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setDateFromFilter(null);
    setDateToFilter(null);
  };
  
  // Export filtered expenses to CSV
  const handleExportCSV = async () => {
    try {
      const filteredExpenses = getFilteredExpenses();
      const startDate = dateFromFilter || new Date(Math.min(...expenses.map(e => new Date(e.date).getTime())));
      const endDate = dateToFilter || new Date(Math.max(...expenses.map(e => new Date(e.date).getTime())));
      await exportExpensesToCSV(filteredExpenses, startDate, endDate, showSnackbar);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      // Error toast is handled by exportExpensesToCSV
    }
  };

  useEffect(() => {
    loadExpensesData();
  }, [loadExpensesData]);

  // Ensure theme is loaded before rendering
  if (!safeTheme.background || !safeTheme.text || !safeTheme.primary) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#ffffff' }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#000000' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Filter and sort expenses
  const getFilteredExpenses = () => {
    let filtered = [...expenses];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(expense => 
        (expense.notes?.toLowerCase().includes(query)) ||
        expense.amount.toString().includes(query) ||
        expense.category.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }
    
    // Apply date range filter
    if (dateFromFilter) {
      filtered = filtered.filter(expense => new Date(expense.date) >= dateFromFilter);
    }
    if (dateToFilter) {
      filtered = filtered.filter(expense => new Date(expense.date) <= dateToFilter);
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  
  const filteredExpenses = getFilteredExpenses();
  const hasActiveFilters = searchQuery.trim() || categoryFilter || dateFromFilter || dateToFilter;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.background }]} edges={['top']}>
      {/* Animated Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: ANIMATION_DURATION.NORMAL,
          easing: EASING.EASE_OUT,
        }}
        style={styles.header}
      >
        <MotiText
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            ...SPRING_CONFIG.GENTLE,
            delay: 100,
          }}
          style={[styles.headerTitle, { color: safeTheme.text }]}
        >
          History
        </MotiText>
        <MotiText
          from={{ opacity: 0, translateX: -10 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{
            type: 'timing',
            duration: ANIMATION_DURATION.NORMAL,
            delay: 200,
            easing: EASING.EASE_OUT,
          }}
          style={[styles.headerSubtitle, { color: safeTheme.subtext }]}
        >
          View and manage your expenses
        </MotiText>
      </MotiView>

      {/* Animated Search and Filters */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'spring',
          ...SPRING_CONFIG.GENTLE,
          delay: 300,
        }}
        style={styles.filtersContainer}
      >
        <AnimatedCard
          delay={400}
          from="scale"
          style={[styles.searchContainer, { backgroundColor: safeTheme.surface }]}
        >
          <Ionicons 
            name="search" 
            size={20} 
            color={safeTheme.subtext} 
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search expenses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            mode="flat"
            dense
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            contentStyle={{ backgroundColor: 'transparent' }}
          />
          {searchQuery.length > 0 && (
            <IconButton
              icon="close"
              size={18}
              iconColor={safeTheme.subtext}
              onPress={() => setSearchQuery('')}
              style={styles.searchClearButton}
            />
          )}
        </AnimatedCard>
        
        <View style={styles.filterRow}>
          {/* Category Filter */}
          <Button
            mode="outlined"
            onPress={() => setCategoryDropdownVisible(true)}
            style={[styles.filterButton, { borderColor: safeTheme.primary }]}
            labelStyle={{ color: safeTheme.primary }}
          >
            {categoryFilter || 'All Categories'}
          </Button>
          
          {/* Date Range Filters */}
          <Button
            mode="contained-tonal"
            onPress={() => setShowDateFromPicker(true)}
            style={[styles.dateButton, { backgroundColor: safeTheme.primary + '15' }]}
            labelStyle={{ color: safeTheme.primary, fontSize: 12, fontWeight: '500' }}
            buttonColor={safeTheme.primary + '15'}
            textColor={safeTheme.primary}
          >
            {dateFromFilter ? dateFromFilter.toLocaleDateString() : 'From Date'}
          </Button>
          
          <Button
            mode="contained-tonal"
            onPress={() => setShowDateToPicker(true)}
            style={[styles.dateButton, { backgroundColor: safeTheme.primary + '15' }]}
            labelStyle={{ color: safeTheme.primary, fontSize: 12, fontWeight: '500' }}
            buttonColor={safeTheme.primary + '15'}
            textColor={safeTheme.primary}
          >
            {dateToFilter ? dateToFilter.toLocaleDateString() : 'To Date'}
          </Button>
        </View>
        
        {/* Active Filters and Actions */}
        {hasActiveFilters && (
          <View style={styles.activeFiltersRow}>
            <View style={styles.activeFilters}>
              {searchQuery.trim() && (
                <Chip
                  onClose={() => setSearchQuery('')}
                  style={[styles.filterChip, { backgroundColor: safeTheme.primary + '20' }]}
                  textStyle={{ color: safeTheme.primary }}
                >
                  Search: {searchQuery}
                </Chip>
              )}
              {categoryFilter && (
                <Chip
                  onClose={() => setCategoryFilter('')}
                  style={[styles.filterChip, { backgroundColor: safeTheme.primary + '20' }]}
                  textStyle={{ color: safeTheme.primary }}
                >
                  {categoryFilter}
                </Chip>
              )}
              {dateFromFilter && (
                <Chip
                  onClose={() => setDateFromFilter(null)}
                  style={[styles.filterChip, { backgroundColor: safeTheme.primary + '20' }]}
                  textStyle={{ color: safeTheme.primary }}
                >
                  From: {dateFromFilter.toLocaleDateString()}
                </Chip>
              )}
              {dateToFilter && (
                <Chip
                  onClose={() => setDateToFilter(null)}
                  style={[styles.filterChip, { backgroundColor: safeTheme.primary + '20' }]}
                  textStyle={{ color: safeTheme.primary }}
                >
                  To: {dateToFilter.toLocaleDateString()}
                </Chip>
              )}
            </View>
            <View style={styles.filterActions}>
              <Button
                mode="text"
                onPress={clearAllFilters}
                labelStyle={{ color: safeTheme.primary, fontSize: 12 }}
              >
                Clear All
              </Button>
              <Button
                mode="text"
                onPress={handleExportCSV}
                labelStyle={{ color: safeTheme.primary, fontSize: 12 }}
              >
                Export CSV
              </Button>
            </View>
          </View>
        )}
      </MotiView>
      
      {/* Animated Expense List */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AnimatedListItem
            index={index}
            style={[styles.expenseCard, { backgroundColor: safeTheme.surface }]}
          >
            <Card style={{ backgroundColor: 'transparent', elevation: 0 }}>
              <Card.Content>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseDescription, { color: safeTheme.text }]}>
                    {item.notes || 'No description'}
                  </Text>
                  <Text style={[styles.expenseCategory, { color: safeTheme.primary }]}>
                    {item.category}
                  </Text>
                  <Text style={[styles.expenseDate, { color: safeTheme.subtext }]}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.expenseActions}>
                  <Text style={[styles.expenseAmount, { color: safeTheme.text }]}>
                    {formatAmount(item.amount)}
                  </Text>
                  <View style={styles.actionButtons}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      iconColor={safeTheme.primary}
                      onPress={() => handleEditExpense(item)}
                      style={styles.actionButton}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor={safeTheme.error}
                      onPress={() => handleDeleteExpense(item)}
                      style={styles.actionButton}
                    />
                  </View>
                </View>
              </View>
              </Card.Content>
            </Card>
          </AnimatedListItem>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[safeTheme.primary]}
            tintColor={safeTheme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={hasActiveFilters ? "search-outline" : "receipt-outline"}
              size={64}
              color={safeTheme.subtext}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyText, { color: safeTheme.subtext }]}>
              {hasActiveFilters ? 'No expenses match your filters' : 'No expenses recorded yet'}
            </Text>
            {hasActiveFilters && (
              <Button
                mode="outlined"
                onPress={clearAllFilters}
                style={styles.clearFiltersButton}
                labelStyle={{ color: safeTheme.primary }}
              >
                Clear Filters
              </Button>
            )}
          </View>
        }
      />
      
      {/* Date Pickers */}
      {showDateFromPicker && (
        <DateTimePicker
          value={dateFromFilter || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDateFromPicker(false);
            if (selectedDate) {
              setDateFromFilter(selectedDate);
            }
          }}
        />
      )}
      
      {showDateToPicker && (
        <DateTimePicker
          value={dateToFilter || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDateToPicker(false);
            if (selectedDate) {
              setDateToFilter(selectedDate);
            }
          }}
        />
      )}
      
      {/* Edit Expense Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: safeTheme.surface }]}
        >
          <Text style={[styles.modalTitle, { color: safeTheme.text }]}>Edit Expense</Text>
          
          <TextInput
            label="Amount"
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="numeric"
            style={styles.modalInput}
            mode="outlined"
          />
          
          <TextInput
            label="Notes (Optional)"
            value={editNotes}
            onChangeText={setEditNotes}
            style={styles.modalInput}
            mode="outlined"
            multiline
          />
          
          <Button
            mode="outlined"
            onPress={() => setEditCategoryDropdownVisible(true)}
            style={styles.modalCategoryButton}
          >
            {editCategory || 'Select Category'}
          </Button>
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setEditModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveEditedExpense}
              style={styles.modalButton}
            >
              Save Changes
            </Button>
          </View>
        </Modal>
      </Portal>
      
      {/* Category Filter Dropdown Modal */}
      <Portal>
        <Modal
          visible={categoryDropdownVisible}
          onDismiss={() => setCategoryDropdownVisible(false)}
          contentContainerStyle={[styles.dropdownModal, { backgroundColor: safeTheme.surface }]}
        >
          <Text style={[styles.dropdownTitle, { color: safeTheme.text }]}>Select Category</Text>
          <FlatList
            data={['All Categories', ...allCategories]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Button
                mode="text"
                onPress={() => {
                  setCategoryFilter(item === 'All Categories' ? '' : item);
                  setCategoryDropdownVisible(false);
                }}
                style={styles.dropdownItem}
                labelStyle={{ color: safeTheme.text, textAlign: 'left' }}
                contentStyle={{ justifyContent: 'flex-start' }}
              >
                {item}
              </Button>
            )}
            style={styles.dropdownList}
          />
        </Modal>
      </Portal>
      
      {/* Edit Category Dropdown Modal */}
      <Portal>
        <Modal
          visible={editCategoryDropdownVisible}
          onDismiss={() => setEditCategoryDropdownVisible(false)}
          contentContainerStyle={[styles.dropdownModal, { backgroundColor: safeTheme.surface }]}
        >
          <Text style={[styles.dropdownTitle, { color: safeTheme.text }]}>Select Category</Text>
          <FlatList
            data={allCategories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Button
                mode="text"
                onPress={() => {
                  setEditCategory(item);
                  setEditCategoryDropdownVisible(false);
                }}
                style={styles.dropdownItem}
                labelStyle={{ color: safeTheme.text, textAlign: 'left' }}
                contentStyle={{ justifyContent: 'flex-start' }}
              >
                {item}
              </Button>
            )}
            style={styles.dropdownList}
          />
        </Modal>
      </Portal>

      {/* Snackbar for feedback messages */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
        wrapperStyle={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + 76,
          alignItems: 'center',
          zIndex: 20000,
        }}
        theme={{ colors: { surface: safeTheme.surface, onSurface: safeTheme.text } }}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '400',
    opacity: 0.7,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  searchClearButton: {
    margin: 0,
    marginLeft: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    minWidth: 100,
    borderRadius: 8,
  },
  dateButton: {
    minWidth: 100,
    borderRadius: 12,
    elevation: 0,
    shadowOpacity: 0,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: 6,
  },
  filterChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 4,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  expenseCard: {
    marginBottom: 12,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  expenseActions: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  clearFiltersButton: {
    marginTop: 12,
  },
  modalContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 16,
  },
  modalCategoryButton: {
    marginBottom: 20,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
  },
  snackbar: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    // bottom will be set dynamically using insets
    alignSelf: 'center',
    borderRadius: 12,
    zIndex: 20000,
    elevation: 20,
    minWidth: 200,
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    backgroundColor: '#222', // fallback, will be overridden by theme
  },
  dropdownModal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 5,
    maxHeight: '60%',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    marginBottom: 4,
    borderRadius: 8,
  },
});
