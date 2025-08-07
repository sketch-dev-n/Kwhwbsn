import * as FileSystem from 'expo-file-system';
import { Platform, ToastAndroid } from 'react-native';
import { Expense } from '../types';

export const exportExpensesToCSV = async (
  expenses: Expense[],
  startDate: Date,
  endDate: Date,
  showToast?: (msg: string) => void
): Promise<void> => {
  try {
    // Filter expenses by date range
    // Parse all expense dates as Date objects for robust filtering
    const filteredExpenses = expenses.filter((expense) => {
      const expenseDate = typeof expense.date === 'string' ? new Date(expense.date) : expense.date;
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    // Create CSV content
    const csvHeader = 'Date,Category,Amount,Notes\n';
    const csvContent = filteredExpenses
      .map((expense) => {
        const expenseDate = typeof expense.date === 'string' ? new Date(expense.date) : expense.date;
        const dateStr = expenseDate.toISOString().split('T')[0];
        const category = expense.category;
        const amount = expense.amount.toString();
        const notes = (expense.notes || '').replace(/,/g, ';');
        return `${dateStr},${category},${amount},"${notes}"`;
      })
      .join(filteredExpenses.length ? '\n' : '');

    // Remove emojis from category names for export
    const stripEmoji = (str: string) => str.replace(/^\p{Emoji_Presentation}+\s*/u, '').replace(/^\p{Extended_Pictographic}+\s*/u, '').replace(/^\p{So}+\s*/u, '').replace(/^\W+/u, '').trim();
    const csvRows = filteredExpenses.map((expense) => {
      const expenseDate = typeof expense.date === 'string' ? new Date(expense.date) : expense.date;
      const dateStr = expenseDate.toISOString().split('T')[0];
      const category = stripEmoji(expense.category);
      const amount = expense.amount.toString();
      const notes = (expense.notes || '').replace(/,/g, ';');
      return `${dateStr},${category},${amount},"${notes}"`;
    });
    // Add total row
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    csvRows.push(`,,${total},`);
    // Prepend UTF-8 BOM for Excel compatibility with emojis and non-ASCII
    const fullCSV = '\uFEFF' + csvHeader + (csvRows.length ? csvRows.join('\n') : '');
    if (filteredExpenses.length === 0 && showToast) showToast('No expenses found for selected dates.');

    // Format filename
    const fromDateStr = startDate.toISOString().split('T')[0];
    const toDateStr = endDate.toISOString().split('T')[0];
    const fileName = `expenses_${fromDateStr}_${toDateStr}.csv`;

    // Android: Save to public Documents, iOS: Save to app's document directory
    let fileUri = '';
    // Only request permission once per session
    let cachedDirUri: string | null = (global as any).CSV_EXPORT_DIR_URI || null;
    if (Platform.OS === 'android') {
      try {
        if (!cachedDirUri) {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (!permissions.granted) {
            const msg = 'Permission to access Documents was denied.';
            if (showToast) showToast(msg);
            else ToastAndroid.show(msg, ToastAndroid.LONG);
            throw new Error(msg);
          }
          cachedDirUri = permissions.directoryUri;
          (global as any).CSV_EXPORT_DIR_URI = cachedDirUri;
        }
        fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          cachedDirUri!,
          fileName,
          'text/csv'
        );
        await FileSystem.writeAsStringAsync(fileUri, fullCSV, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } catch (err) {
        const msg = 'Failed to save CSV to Documents.';
        if (showToast) showToast(msg);
        else ToastAndroid.show(msg, ToastAndroid.LONG);
        console.error('Error exporting CSV:', err);
        throw err;
      }
    } else {
      fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, fullCSV, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    // Show toast
    const successMsg = 'CSV exported to Documents folder.';
    if (showToast) showToast(successMsg);
    else if (Platform.OS === 'android') ToastAndroid.show(successMsg, ToastAndroid.LONG);

    // Log full path
    console.log('CSV file saved to:', fileUri);
  } catch (error: any) {
    const errMsg = 'Failed to export CSV.';
    if (showToast) showToast(errMsg);
    else if (Platform.OS === 'android') ToastAndroid.show(errMsg, ToastAndroid.LONG);
    console.error('Error exporting CSV:', error);
    throw error;
  }
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getDateRangeForMonth = (month: string): { start: Date; end: Date } => {
  const [year, monthNum] = month.split('-').map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 0, 23, 59, 59);
  return { start, end };
};