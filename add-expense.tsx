import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, FlatList, KeyboardAvoidingView, Platform, Animated, StatusBar } from 'react-native';
import { Text, TextInput, Button, Card, Snackbar, TouchableRipple } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, MotiText } from 'moti';
import { useThemeStore } from '../../store/useThemeStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { expenseService } from '../../services/expenseService';
import { EXPENSE_CATEGORIES, Expense } from '../../types';
import { AnimatedPressable, AnimatedCard } from '../../components/animated/AnimatedComponents';
import { ANIMATION_DURATION, EASING } from '../../utils/animations';

// Helper to get readable text color based on background
function getContrastText(bg: string) {
  if (!bg) return '#000';
  // Simple luminance check
  const c = bg.charAt(0) === '#' ? bg.substring(1, 7) : bg;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#222' : '#fff';
}

// Helper to get status bar style based on theme
function getStatusBarStyle(theme: any) {
  if (!theme) return 'dark-content';
  // Check if background is dark
  const bg = theme.background;
  if (!bg) return 'dark-content';
  const c = bg.charAt(0) === '#' ? bg.substring(1, 7) : bg;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'dark-content' : 'light-content';
}

// Helper to get overlay color based on theme
function getOverlayColor(theme: any) {
  if (!theme) return 'rgba(0,0,0,0.4)';
  const isDark = theme.background === '#000000' || theme.background === '#121212';
  return isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';
}

export default function AddExpenseScreen() {
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  
  // State declarations - must come before useEffect that uses them
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Other');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const { theme } = useThemeStore();
  const { addExpense } = useExpenseStore();

  // Animation effect - now categoryMenuVisible is properly declared above
  useEffect(() => {
    if (categoryMenuVisible) {
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [categoryMenuVisible, dropdownAnim]);

  // Ensure theme is loaded before rendering
  if (!theme) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    setIsLoading(true);
    
    try {
      const expense: Omit<Expense, 'id'> = {
        amount: parseFloat(amount),
        category,
        notes: notes.trim() || undefined,
        date,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expenseId = await expenseService.addExpense(expense);
      addExpense({ ...expense, id: expenseId });

      // Reset form
      setAmount('');
      setCategory('Other');
      setNotes('');
      setDate(new Date());

      // Show success snackbar
      setSnackbarVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense. Please try again.');
      console.error('Error adding expense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView 
          style={[styles.container, { backgroundColor: theme.background }]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
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
              from={{ opacity: 0, translateX: -30 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: ANIMATION_DURATION.NORMAL,
                delay: 100,
                easing: EASING.EASE_OUT,
              }}
              style={[styles.headerTitle, { color: theme.text }]}
            >
              Add Expense
            </MotiText>
            <MotiText
              from={{ opacity: 0, translateX: -30 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: ANIMATION_DURATION.NORMAL,
                delay: 150,
                easing: EASING.EASE_OUT,
              }}
              style={[styles.headerSubtitle, { color: theme.subtext }]}
            >
              Track your spending
            </MotiText>
          </MotiView>

          <AnimatedCard delay={200} from="bottom" style={[styles.formCard, { backgroundColor: theme.surface }]}>
            <Card.Content style={styles.formContent}>
              {/* Amount Input */}
              <MotiView
                from={{ opacity: 0, translateX: -30 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: 'timing',
                  duration: ANIMATION_DURATION.NORMAL,
                  delay: 300,
                  easing: EASING.EASE_OUT,
                }}
                style={styles.inputGroup}
              >
                <MotiText
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 350 }}
                  style={[styles.label, { color: theme.text }]}
                >
                  Amount *
                </MotiText>
                <MotiView
                  animate={{
                    scale: amount ? 1.02 : 1,
                  }}
                  transition={{
                    type: 'spring',
                    damping: 20,
                    stiffness: 150,
                  }}
                >
                  <TextInput
                    mode="outlined"
                    value={amount}
                    onChangeText={setAmount}
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
                </MotiView>
              </MotiView>

              {/* Category Picker */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Category *</Text>
                <View>
                  <TouchableRipple
                    onPress={() => setCategoryMenuVisible(true)}
                    style={[styles.categoryButton, { borderColor: theme.border }]}
                  >
                    <View style={styles.categoryButtonInner}>
                      <Text style={[styles.categoryButtonText, { color: theme.text }]}>
                        {category}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={theme.subtext} />
                    </View>
                  </TouchableRipple>
                </View>
              </View>

              {/* Date Picker */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Date *</Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.dateButton, { borderColor: theme.border }]}
                  contentStyle={styles.dateButtonContent}
                >
                  <View style={styles.dateButtonInner}>
                    <Ionicons name="calendar" size={20} color={theme.primary} />
                    <Text style={[styles.dateButtonText, { color: theme.text }]}>
                      {date.toLocaleDateString()}
                    </Text>
                  </View>
                </Button>
              </View>

              {/* Notes Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Notes (Optional)</Text>
                <TextInput
                  mode="outlined"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about this expense..."
                  multiline
                  numberOfLines={3}
                  style={styles.notesInput}
                  theme={{
                    colors: {
                      primary: theme.primary,
                      background: theme.surface,
                      text: theme.text,
                      placeholder: theme.subtext,
                      outline: theme.border,
                    }
                  }}
                />
              </View>

              {/* Submit Button */}
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  delay: 600,
                  damping: 20,
                  stiffness: 150,
                }}
              >
                <AnimatedPressable
                  onPress={handleSubmit}
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: isLoading ? theme.primary + '80' : theme.primary,
                      opacity: isLoading ? 0.7 : 1,
                    },
                  ]}
                  disabled={isLoading}
                >
                  <View style={styles.submitButtonContent}>
                    {isLoading ? (
                      <MotiView
                        from={{ rotate: '0deg' }}
                        animate={{ rotate: '360deg' }}
                        transition={{
                          type: 'timing',
                          duration: 1000,
                          loop: true,
                        }}
                      >
                        <Ionicons name="refresh" size={20} color="white" />
                      </MotiView>
                    ) : (
                      <MotiText
                        style={{
                          color: 'white',
                          fontSize: 16,
                          fontWeight: '600',
                        }}
                      >
                        Add Expense
                      </MotiText>
                    )}
                  </View>
                </AnimatedPressable>
              </MotiView>
            </Card.Content>
          </AnimatedCard>

          {/* Category Modal */}
          {categoryMenuVisible && (
            <Modal
              visible={categoryMenuVisible}
              transparent
              animationType="none"
              onRequestClose={() => setCategoryMenuVisible(false)}
            >
              <StatusBar 
                barStyle={getStatusBarStyle(theme)} 
                backgroundColor={getOverlayColor(theme)} 
                translucent 
              />
              <Animated.View
                style={[
                  styles.animatedOverlay,
                  { 
                    opacity: dropdownAnim, 
                    backgroundColor: getOverlayColor(theme)
                  }
                ]}
              >
                <BlurView 
                  intensity={Platform.OS === 'ios' ? 50 : 30} 
                  tint={theme.background === '#000000' || theme.background === '#121212' ? 'dark' : 'light'} 
                  style={StyleSheet.absoluteFill} 
                />
                <TouchableRipple
                  style={styles.modalOverlay}
                  onPress={() => setCategoryMenuVisible(false)}
                  borderless={true}
                  rippleColor="rgba(0,0,0,0.1)"
                >
                  <Animated.View
                    style={[
                      styles.modalContainer,
                      {
                        transform: [
                          { 
                            translateY: dropdownAnim.interpolate({ 
                              inputRange: [0, 1], 
                              outputRange: [50, 0] // Slide up animation
                            })
                          },
                          {
                            scale: dropdownAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.9, 1] // Scale animation
                            })
                          }
                        ],
                        opacity: dropdownAnim,
                      },
                    ]}
                  >
                    <View style={[
                      styles.dropdownModal,
                      {
                        backgroundColor: theme.surface,
                        shadowColor: theme.background === '#000000' ? '#ffffff' : '#000000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: theme.background === '#000000' ? 0.3 : 0.15,
                        shadowRadius: 20,
                        elevation: 20,
                        borderRadius: 20,
                        padding: 24,
                        borderWidth: theme.background === '#000000' ? 0 : 1,
                        borderColor: theme.border,
                      },
                    ]}>
                      <View style={styles.modalHeader}>
                        <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                        <Text style={[
                          styles.modalTitle,
                          { color: getContrastText(theme.surface) },
                        ]}>
                          Select Category
                        </Text>
                      </View>
                      <FlatList
                        data={EXPENSE_CATEGORIES}
                        keyExtractor={(item) => item}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item, index }) => (
                          <TouchableRipple
                            onPress={() => {
                              setCategory(item);
                              setCategoryMenuVisible(false);
                            }}
                            style={[
                              styles.categoryItem,
                              { 
                                borderBottomColor: theme.border,
                                borderBottomWidth: index === EXPENSE_CATEGORIES.length - 1 ? 0 : 1,
                                backgroundColor: category === item ? `${theme.primary}20` : 'transparent',
                              },
                            ]}
                            rippleColor={`${theme.primary}30`}
                          >
                            <View style={styles.categoryItemContent}>
                              <Text
                                style={[
                                  styles.categoryItemText,
                                  { 
                                    color: category === item ? theme.primary : getContrastText(theme.surface),
                                    fontWeight: category === item ? '600' : '400',
                                  },
                                ]}
                              >
                                {item}
                              </Text>
                              {category === item && (
                                <Ionicons 
                                  name="checkmark-circle" 
                                  size={20} 
                                  color={theme.primary} 
                                />
                              )}
                            </View>
                          </TouchableRipple>
                        )}
                      />
                    </View>
                  </Animated.View>
                </TouchableRipple>
              </Animated.View>
            </Modal>
          )}

          {/* Date Picker Modal */}
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
          
          {/* Success Snackbar */}
          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}
            style={[styles.snackbar, { backgroundColor: theme.success }]}
          >
            <Text style={[styles.snackbarText, { color: '#ffffff' }]}>
              Expense added successfully!
            </Text>
          </Snackbar>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  animatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 0,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  formCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    elevation: 4,
  },
  formContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
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
  dateButton: {
    borderRadius: 12,
    borderWidth: 1,
  },
  dateButtonContent: {
    height: 56,
    justifyContent: 'flex-start',
  },
  dateButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
  notesInput: {
    backgroundColor: 'transparent',
    minHeight: 100,
  },
  submitButton: {
    borderRadius: 12,
    marginTop: 16,
  },
  submitButtonContent: {
    height: 56,
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
  snackbarText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxHeight: '60%',
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
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    opacity: 0.3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  categoryItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 2,
  },
  categoryItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryItemText: {
    fontSize: 16,
    flex: 1,
  },
});
