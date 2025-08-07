import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, FlatList } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Switch, List, Divider, TouchableRipple, Snackbar, Portal, Modal } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useThemeStore } from '../../store/useThemeStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SUPPORTED_CURRENCIES } from '../../types/currency';
import { authService } from '../../services/authService';
import { expenseService } from '../../services/expenseService';
import { notificationService } from '../../services/notificationService';
import { exportExpensesToCSV } from '../../utils/csvExport';
import { useRouter } from 'expo-router';

// Helper to get readable text color based on background
function getContrastText(bg: string) {
  if (!bg) return '#000';
  const c = bg.charAt(0) === '#' ? bg.substring(1, 7) : bg;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#222' : '#fff';
}



export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuthStore();
  const { theme, currentTheme, setTheme } = useThemeStore();
  const { defaultCurrency, setDefaultCurrency } = useCurrencyStore();
  const { expenses, clearAllData } = useExpenseStore();
  const router = useRouter();
  
  // All hooks must be called before any early returns
  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const { biometricEnabled, setBiometricEnabled, notificationsEnabled, setNotificationsEnabled } = useSettingsStore();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [exportEndDate, setExportEndDate] = useState(new Date());
  const [showExportStartPicker, setShowExportStartPicker] = useState(false);
  const [showExportEndPicker, setShowExportEndPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Show snackbar message
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Define biometric availability check function BEFORE useEffect
  const checkBiometricAvailability = async () => {
    if (Platform.OS === 'web') {
      setBiometricAvailable(false);
      return;
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Biometric check timeout')), 5000)
      );
      
      const biometricPromise = Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync()
      ]);
      
      const [hasHardware, isEnrolled] = await Promise.race([
        biometricPromise,
        timeoutPromise
      ]) as [boolean, boolean];
      
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.warn('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  useEffect(() => {
    // Delay biometric check to avoid render cycle conflicts
    const timer = setTimeout(() => {
      checkBiometricAvailability();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Ensure theme and currency are loaded before rendering
  if (!theme || !defaultCurrency) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!enabled) {
      setBiometricEnabled(false);
      showSnackbar('Biometric authentication disabled');
      return;
    }

    // Check if biometric hardware is available before enabling
    if (!biometricAvailable) {
      showSnackbar('Biometric authentication is not available on this device');
      return;
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout')), 30000)
      );
      
      const authPromise = LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      
      const result = await Promise.race([authPromise, timeoutPromise]) as any;

      if (result && result.success) {
        setBiometricEnabled(true);
        showSnackbar('Biometric authentication enabled successfully!');
      } else if (result && result.error) {
        console.warn('Biometric authentication failed:', result.error);
        showSnackbar('Biometric authentication failed');
      } else {
        showSnackbar('Biometric authentication was cancelled');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      showSnackbar('Failed to enable biometric authentication');
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const hasPermission = await notificationService.requestPermissions();
        if (!hasPermission) {
          showSnackbar('Please enable notifications in your device settings');
          return;
        }
        
        await notificationService.scheduleDailyReminder(
          notificationTime.getHours(),
          notificationTime.getMinutes()
        );
        showSnackbar('Daily reminders enabled successfully');
      } else {
        await notificationService.cancelDailyReminder();
        showSnackbar('Daily reminders disabled');
      }
      
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Error toggling notifications:', error);
      showSnackbar('Failed to update notification settings');
    }
  };

  const handleNotificationTimeChange = async (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setNotificationTime(selectedTime);
      if (notificationsEnabled) {
        try {
          await notificationService.scheduleDailyReminder(
            selectedTime.getHours(),
            selectedTime.getMinutes()
          );
          showSnackbar('Notification time updated successfully');
        } catch (error) {
          console.error('Error updating notification time:', error);
          showSnackbar('Failed to update notification time');
        }
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      if (expenses.length === 0) {
        showSnackbar('No expenses to export');
        return;
      }

      await exportExpensesToCSV(expenses, exportStartDate, exportEndDate);
      showSnackbar('Expenses exported successfully!');
    } catch (error) {
      showSnackbar('Failed to export expenses. Please try again.');
      console.error('Export error:', error);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your expenses and budgets. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseService.clearAllData();
              clearAllData();
              showSnackbar('All data has been cleared successfully');
            } catch (error) {
              showSnackbar('Failed to clear data. Please try again.');
              console.error('Clear data error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await authService.signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const themes = [
    { key: 'light', name: 'Light Mode' },
    { key: 'dark', name: 'Dark Mode' },
    { key: 'blue', name: 'Blue Theme' },
    { key: 'purple', name: 'Purple Theme' },
    { key: 'green', name: 'Green Theme' },
  ] as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
          Customize your experience
        </Text>
      </View>

      {/* Account Section */}
      <Card style={[styles.card, { backgroundColor: theme.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          <List.Item
            title={isGuest ? "Guest User" : user?.email || "Unknown"}
            description={isGuest ? "Data stored locally" : "Synced to cloud"}
            left={(props) => <List.Icon {...props} icon="account" color={theme.primary} />}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.subtext }}
          />
          <Divider style={{ backgroundColor: theme.border }} />
          <List.Item
            title={isGuest ? "Sign In" : "Sign Out"}
            description={isGuest ? "Sync your data across devices" : "Switch accounts or go offline"}
            left={(props) => (
              <List.Icon 
                {...props} 
                icon={isGuest ? "login" : "logout"} 
                color={theme.primary} 
              />
            )}
            onPress={isGuest ? () => router.replace('/auth') : handleSignOut}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.subtext }}
          />
        </Card.Content>
      </Card>

      {/* Theme Section */}
      <Card style={[styles.card, { backgroundColor: theme.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
          <Text style={[styles.sectionDescription, { color: theme.subtext }]}>
            Choose your preferred theme
          </Text>
          
          <TouchableRipple
            onPress={() => setThemeMenuVisible(true)}
            style={[styles.dropdownButton, { borderColor: theme.border }]}
          >
            <View style={styles.dropdownContent}>
              <Text style={[styles.dropdownText, { color: theme.text }]}>
                {themes.find(t => t.key === currentTheme)?.name || 'Select Theme'}
              </Text>
              <List.Icon icon="chevron-down" color={theme.subtext} />
            </View>
          </TouchableRipple>
          
          <Portal>
            <Modal
              visible={themeMenuVisible}
              onDismiss={() => setThemeMenuVisible(false)}
              contentContainerStyle={[
                styles.modalContainer, 
                { 
                  backgroundColor: theme.surface,
                  shadowColor: theme.background === '#000000' ? '#ffffff' : '#000000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: theme.background === '#000000' ? 0.3 : 0.15,
                  shadowRadius: 20,
                  elevation: 20,
                  borderWidth: theme.background === '#000000' ? 0 : 1,
                  borderColor: theme.border,
                }
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                <Text style={[styles.modalTitle, { color: getContrastText(theme.surface) }]}>Select Theme</Text>
              </View>
              <FlatList
                data={themes}
                keyExtractor={(item) => item.key}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <TouchableRipple
                    onPress={() => {
                      setTheme(item.key);
                      setThemeMenuVisible(false);
                    }}
                    style={[
                      styles.modalItem, 
                      { 
                        borderBottomColor: theme.border,
                        borderBottomWidth: index === themes.length - 1 ? 0 : 1,
                        backgroundColor: currentTheme === item.key ? `${theme.primary}20` : 'transparent',
                      }
                    ]}
                    rippleColor={`${theme.primary}30`}
                  >
                    <View style={styles.modalItemContent}>
                      <Text style={[
                        styles.modalItemText, 
                        { 
                          color: currentTheme === item.key ? theme.primary : getContrastText(theme.surface),
                          fontWeight: currentTheme === item.key ? '600' : '400',
                        }
                      ]}>
                        {item.name}
                      </Text>
                      {currentTheme === item.key && (
                        <List.Icon icon="check-circle" color={theme.primary} />
                      )}
                    </View>
                  </TouchableRipple>
                )}
              />
            </Modal>
          </Portal>
        </Card.Content>
      </Card>

      {/* Currency Section */}
      <Card style={[styles.card, { backgroundColor: theme.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Currency</Text>
          <Text style={[styles.sectionDescription, { color: theme.subtext }]}>
            Set your default currency for expenses
          </Text>
          
          <TouchableRipple
            onPress={() => setCurrencyMenuVisible(true)}
            style={[styles.dropdownButton, { borderColor: theme.border }]}
          >
            <View style={styles.dropdownContent}>
              <Text style={[styles.dropdownText, { color: theme.text }]}>
                {defaultCurrency.code}
              </Text>
              <List.Icon icon="chevron-down" color={theme.subtext} />
            </View>
          </TouchableRipple>
          
          <Portal>
            <Modal
              visible={currencyMenuVisible}
              onDismiss={() => setCurrencyMenuVisible(false)}
              contentContainerStyle={[
                styles.modalContainer, 
                { 
                  backgroundColor: theme.surface,
                  shadowColor: theme.background === '#000000' ? '#ffffff' : '#000000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: theme.background === '#000000' ? 0.3 : 0.15,
                  shadowRadius: 20,
                  elevation: 20,
                  borderWidth: theme.background === '#000000' ? 0 : 1,
                  borderColor: theme.border,
                }
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                <Text style={[styles.modalTitle, { color: getContrastText(theme.surface) }]}>Select Currency</Text>
              </View>
              <FlatList
                data={SUPPORTED_CURRENCIES}
                keyExtractor={(item) => item.code}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <TouchableRipple
                    onPress={() => {
                      setDefaultCurrency(item);
                      setCurrencyMenuVisible(false);
                    }}
                    style={[
                      styles.modalItem, 
                      { 
                        borderBottomColor: theme.border,
                        borderBottomWidth: index === SUPPORTED_CURRENCIES.length - 1 ? 0 : 1,
                        backgroundColor: defaultCurrency.code === item.code ? `${theme.primary}20` : 'transparent',
                      }
                    ]}
                    rippleColor={`${theme.primary}30`}
                  >
                    <View style={styles.modalItemContent}>
                      <View style={styles.currencyInfo}>
                        <Text style={[
                          styles.currencyCode, 
                          { 
                            color: defaultCurrency.code === item.code ? theme.primary : getContrastText(theme.surface),
                            fontWeight: defaultCurrency.code === item.code ? '700' : '600',
                          }
                        ]}>
                          {item.code}
                        </Text>
                        <Text style={[
                          styles.currencyName, 
                          { 
                            color: defaultCurrency.code === item.code ? theme.primary : theme.subtext,
                            opacity: defaultCurrency.code === item.code ? 0.8 : 0.6,
                          }
                        ]}>
                          {item.name}
                        </Text>
                      </View>
                      {defaultCurrency.code === item.code && (
                        <List.Icon icon="check-circle" color={theme.primary} />
                      )}
                    </View>
                  </TouchableRipple>
                )}
              />
            </Modal>
          </Portal>
        </Card.Content>
      </Card>

      {/* Security Section */}
      {biometricAvailable && (
        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Security</Text>
            <List.Item
              title="Biometric Lock"
              description="Secure app access with Face ID or Fingerprint"
              left={(props) => <List.Icon {...props} icon="fingerprint" color={theme.primary} />}
              right={() => (
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  color={theme.primary}
                />
              )}
              onPress={() => handleBiometricToggle(!biometricEnabled)}
              titleStyle={{ color: theme.text }}
              descriptionStyle={{ color: theme.subtext }}
            />
          </Card.Content>
        </Card>
      )}

      {/* Notifications Section */}
      {Platform.OS !== 'web' && (
        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
            <List.Item
              title="Daily Reminders"
              description="Get reminded to track your expenses"
              left={(props) => <List.Icon {...props} icon="bell" color={theme.primary} />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  color={theme.primary}
                />
              )}
              onPress={() => handleNotificationToggle(!notificationsEnabled)}
              titleStyle={{ color: theme.text }}
              descriptionStyle={{ color: theme.subtext }}
            />
            {notificationsEnabled && (
              <>
                <Divider style={{ backgroundColor: theme.border }} />
                <List.Item
                  title="Reminder Time"
                  description={notificationTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  left={(props) => <List.Icon {...props} icon="clock" color={theme.primary} />}
                  onPress={() => setShowTimePicker(true)}
                  titleStyle={{ color: theme.text }}
                  descriptionStyle={{ color: theme.subtext }}
                />
              </>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Export Section */}
      <Card style={[styles.card, { backgroundColor: theme.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Export Data</Text>
          <Text style={[styles.sectionDescription, { color: theme.subtext }]}>
            Export your expenses as CSV file
          </Text>
          
          <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets?.bottom ? insets.bottom + 80 : 0 }}>
            <View style={styles.exportControls}>
              <View style={styles.datePickerRow}>
                <Button
                  mode="outlined"
                  onPress={() => setShowExportStartPicker(true)}
                  style={[styles.exportDateButton, { borderColor: theme.border }]}
                >
                  From: {exportStartDate.toLocaleDateString()}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setShowExportEndPicker(true)}
                  style={[styles.exportDateButton, { borderColor: theme.border }]}
                >
                  To: {exportEndDate.toLocaleDateString()}
                </Button>
              </View>
              
              <Button
                mode="contained"
                onPress={handleExportCSV}
                style={[styles.exportButton, { backgroundColor: theme.primary }]}
                icon="download"
              >
                Export CSV
              </Button>
            </View>
          </ScrollView>
        </Card.Content>
      </Card>

      {/* Danger Zone */}
      <Card style={[styles.card, styles.dangerCard, { backgroundColor: theme.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.error }]}>Danger Zone</Text>
          <Text style={[styles.sectionDescription, { color: theme.subtext }]}>
            Permanent actions that cannot be undone
          </Text>
          
          <Button
            mode="outlined"
            onPress={handleClearAllData}
            style={[styles.dangerButton, { borderColor: theme.error }]}
            icon="delete-forever"
          >
            <Text style={{ color: theme.error }}>Clear All Data</Text>
          </Button>
        </Card.Content>
      </Card>

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={notificationTime}
          mode="time"
          display="default"
          onChange={handleNotificationTimeChange}
        />
      )}

      {/* Export Date Pickers */}
      {showExportStartPicker && (
        <DateTimePicker
          value={exportStartDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowExportStartPicker(false);
            if (selectedDate) {
              setExportStartDate(selectedDate);
            }
          }}
          maximumDate={new Date()}
        />
      )}

      {showExportEndPicker && (
        <DateTimePicker
          value={exportEndDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowExportEndPicker(false);
            if (selectedDate) {
              setExportEndDate(selectedDate);
            }
          }}
          maximumDate={new Date()}
          minimumDate={exportStartDate}
        />
      )}
      
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
          bottom: insets?.bottom ? insets.bottom + 76 : 76,
          alignItems: 'center',
          zIndex: 20000,
        }}
        theme={{ colors: { surface: theme?.surface || '#222', onSurface: theme?.text || '#fff' } }}
      >
        {snackbarMessage}
      </Snackbar>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
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
  card: {
    marginHorizontal: 24,
    marginVertical: 12,
    borderRadius: 16,
    elevation: 4,
  },
  dangerCard: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  exportControls: {
    gap: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportDateButton: {
    flex: 1,
    borderRadius: 12,
  },
  exportButton: {
    borderRadius: 12,
  },
  dangerButton: {
    borderRadius: 12,
    borderWidth: 2,
  },
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
  },
  snackbar: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 8,
  },
  snackbarText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    maxHeight: '70%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
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
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginVertical: 2,
  },
  modalItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    flex: 1,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 14,
    opacity: 0.8,
  },
});