import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Surface } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { MotiView, MotiText } from 'moti';
import { useThemeStore } from '../../store/useThemeStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { AnimatedCard, AnimatedPressable, AnimatedCounter } from '../../components/animated/AnimatedComponents';
import { ANIMATION_DURATION, SPRING_CONFIG, EASING } from '../../utils/animations';

import { router } from 'expo-router';



export default function DashboardScreen() {
  const { theme } = useThemeStore();
  const { expenses, subscribeToFirestoreExpenses, unsubscribeFromFirestoreExpenses } = useExpenseStore();
  const { formatAmount } = useCurrencyStore();



  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');

  // Removed unused screenWidth

  useEffect(() => {
    subscribeToFirestoreExpenses();
    return () => {
      unsubscribeFromFirestoreExpenses();
    };
  }, [subscribeToFirestoreExpenses, unsubscribeFromFirestoreExpenses]);

  const getCurrentPeriodExpenses = () => {
    console.log('🔍 Filtering expenses for period:', selectedPeriod);
    console.log('📊 Total expenses:', expenses.length);

    if (!expenses || expenses.length === 0) {
      console.log('⚠️ No expenses found');
      return [];
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (selectedPeriod === 'today') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      console.log('📅 Today filter - Start:', startDate.toISOString(), 'End:', endDate.toISOString());
    } else if (selectedPeriod === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      console.log('📅 Week filter - Start:', startDate.toISOString(), 'End:', endDate.toISOString());
    } else {
      // Always cover 1st to last day of the current month (local time)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      console.log('📅 Month filter - Start:', startDate.toISOString(), 'End:', endDate.toISOString());
    }

    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);

      if (isNaN(expenseDate.getTime())) {
        console.log('❌ Invalid expense date:', expense.date);
        return false;
      }

      console.log('💰 Checking expense - Date:', expenseDate.toISOString(), 'Amount:', expense.amount, 'Category:', expense.category);

      if (selectedPeriod === 'today') {
        const isInRange = expenseDate >= startDate && expenseDate <= endDate;
        console.log('✅ Today check:', isInRange, 'for date:', expenseDate.toISOString());
        return isInRange;
      }
      const isInRange = expenseDate >= startDate && expenseDate <= endDate;
      console.log('✅ Period check:', isInRange, 'for date:', expenseDate.toISOString());
      return isInRange;
    });

    console.log('🎯 Filtered expenses count:', filteredExpenses.length);
    console.log('🎯 Filtered expenses:', filteredExpenses.map(e => ({ date: e.date, amount: e.amount, category: e.category })));
    return filteredExpenses;
  };

  const currentPeriodExpenses = getCurrentPeriodExpenses();
  const totalSpent = currentPeriodExpenses.reduce((total, expense) => total + expense.amount, 0);
  
  // Responsive chart dimensions - 90% of screen width
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth * 0.9; // 90% of screen width
  const chartHeight = Math.min(chartWidth * 0.8, 300); // Maintain aspect ratio

  // Helper function to get emoji for category
  const getCategoryEmoji = (category: string): string => {
    const emojiMap: Record<string, string> = {
      'Food & Dining': '🍽️',
      'Transportation': '🚗',
      'Shopping': '🛍️',
      'Entertainment': '🎬',
      'Bills & Utilities': '💡',
      'Healthcare': '🏥',
      'Education': '📚',
      'Travel': '✈️',
      'Groceries': '🛒',
      'Other': '📦'
    };
    
    // Try exact match first
    if (emojiMap[category]) return emojiMap[category];
    
    // Try partial match (remove emoji if present)
    const cleanCategory = category.replace(/^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (key.toLowerCase().includes(cleanCategory.toLowerCase()) || cleanCategory.toLowerCase().includes(key.toLowerCase())) {
        return emoji;
      }
    }
    
    // Default fallback
    return '📦';
  };
  
  // Get all categories from current period expenses (not limited to predefined ones)
  const categoryTotals: Record<string, number> = {};
  currentPeriodExpenses.forEach(expense => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
  });
  
  // Show ALL categories, not limited to 8
  const categoryData = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      x: category,
      y: amount,
      emoji: getCategoryEmoji(category),
    }))
    .sort((a, b) => b.y - a.y);

  console.log('📈 Final calculations - Total:', totalSpent, 'Categories:', categoryData.length);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Animated Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: ANIMATION_DURATION.NORMAL,
          easing: EASING.EASE_OUT,
        }}
        style={[styles.header, { backgroundColor: theme.background }]}
      >
        <MotiText
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            ...SPRING_CONFIG.GENTLE,
            delay: 100,
          }}
          style={[styles.headerTitle, { color: theme.text }]}
        >
          Dashboard
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
          style={[styles.headerSubtitle, { color: theme.subtext }]}
        >
          {expenses.length} {expenses.length === 1 ? 'transaction' : 'transactions'}
        </MotiText>
      </MotiView>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Animated Segmented Control for Period Filter */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            ...SPRING_CONFIG.GENTLE,
            delay: 300,
          }}
          style={[styles.segmentedControl, { backgroundColor: theme.surface }]}
        >
          {(['today', 'week', 'month'] as const).map((period, index) => (
            <AnimatedPressable
              key={period}
              onPress={() => setSelectedPeriod(period)}
              style={[
                styles.segmentButton,
                selectedPeriod === period && [
                  styles.segmentButtonActive,
                  { backgroundColor: theme.primary }
                ]
              ]}
              scaleValue={0.98}
            >
              <MotiText
                animate={{
                  scale: selectedPeriod === period ? 1.05 : 1,
                }}
                transition={{
                  type: 'timing',
                  duration: ANIMATION_DURATION.FAST,
                }}
                style={[
                  styles.segmentText,
                  { color: selectedPeriod === period ? '#FFFFFF' : theme.text }
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </MotiText>
            </AnimatedPressable>
          ))}
        </MotiView>

        {/* Animated Chart Section - Perfectly Centered Design */}
        {categoryData.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'spring',
              ...SPRING_CONFIG.GENTLE,
              delay: 400,
            }}
            style={styles.chartSection}
          >
            <MotiText
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                ...SPRING_CONFIG.GENTLE,
                delay: 500,
              }}
              style={[styles.sectionTitle, { color: theme.text }]}
            >
              💰 Expense Summary
            </MotiText>
            
            <AnimatedCard
              delay={600}
              from="bottom"
              style={[styles.chartCard, { backgroundColor: theme.surface, elevation: 4 }]}
            >
              <View style={[styles.chartWrapper, { width: chartWidth, alignSelf: 'center' }]}>
                <View style={[styles.doughnutContainer, { width: chartWidth, height: chartHeight }]}>
                  <PieChart
                    key={`${selectedPeriod}-${categoryData.length}-${totalSpent}-${currentPeriodExpenses.length}`}
                    data={categoryData.map((item: { x: string; y: number; emoji: string }, index: number) => {
                      const modernColors = [
                        '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', 
                        '#EF4444', '#EC4899', '#6366F1', '#84CC16',
                        '#F97316', '#14B8A6', '#8B5A2B', '#6B7280'
                      ];
                      const percentage = ((item.y / totalSpent) * 100).toFixed(1);
                      return {
                        name: `${item.emoji} ${percentage}%`,
                        population: item.y,
                        color: modernColors[index % modernColors.length],
                        legendFontColor: 'transparent',
                        legendFontSize: 0,
                      };
                    })}
                    width={chartWidth}
                    height={chartHeight}
                    chartConfig={{
                      backgroundColor: 'transparent',
                      backgroundGradientFrom: 'transparent',
                      backgroundGradientTo: 'transparent',
                      color: (opacity = 1) => 'transparent',
                      labelColor: (opacity = 1) => 'transparent',
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    center={[chartWidth / 4.1, chartHeight / 11]}
                    absolute
                    hasLegend={false}
                    avoidFalseZero={true}
                    style={{
                      alignSelf: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </View>
                
                {/* Emoji-Only Legend */}
                <View style={styles.emojiLegend}>
                  {categoryData.map((item: { x: string; y: number; emoji: string }, index: number) => {
                    const modernColors = [
                      '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', 
                      '#EF4444', '#EC4899', '#6366F1', '#84CC16',
                      '#F97316', '#14B8A6', '#8B5A2B', '#6B7280'
                    ];
                    return (
                      <View key={item.x} style={[styles.emojiItem, { backgroundColor: modernColors[index % modernColors.length] + '30' }]}>
                        <Text style={styles.emojiIcon}>
                          {item.emoji}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </AnimatedCard>
          </MotiView>
        )}

        {/* Animated Period Total Card - Matching Chart Width */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            ...SPRING_CONFIG.GENTLE,
            delay: 700,
          }}
          style={styles.totalSection}
        >
          <AnimatedCard
            delay={800}
            from="scale"
            style={[styles.totalCard, { backgroundColor: theme.surface, elevation: 4 }]}
          >
            <View style={styles.totalContent}>
              <View style={styles.totalHeader}>
                <MotiText
                  from={{ opacity: 0, translateX: -10 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{
                    type: 'timing',
                    duration: ANIMATION_DURATION.NORMAL,
                    delay: 900,
                    easing: EASING.EASE_OUT,
                  }}
                  style={[styles.totalLabel, { color: theme.subtext }]}
                >
                  Period Total
                </MotiText>
                <MotiView
                  from={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: 'spring',
                    ...SPRING_CONFIG.SNAPPY,
                    delay: 1000,
                  }}
                  style={[styles.periodBadge, { backgroundColor: theme.primary + '20' }]}
                >
                  <Text style={[styles.periodText, { color: theme.primary }]}>
                    {selectedPeriod.toUpperCase()}
                  </Text>
                </MotiView>
              </View>
              <AnimatedCounter
                value={totalSpent}
                duration={ANIMATION_DURATION.SLOW}
                prefix={formatAmount(0).replace('0', '').replace('.00', '')}
                style={styles.totalAmount}
                textStyle={[styles.totalAmount, { color: theme.primary }]}
              />
              <MotiText
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: 'timing',
                  duration: ANIMATION_DURATION.NORMAL,
                  delay: 1200,
                  easing: EASING.EASE_OUT,
                }}
                style={[styles.totalCount, { color: theme.subtext }]}
              >
                {currentPeriodExpenses.length} {currentPeriodExpenses.length === 1 ? 'transaction' : 'transactions'}
              </MotiText>
            </View>
          </AnimatedCard>
        </MotiView>

        {/* Category Breakdown - Clean Design */}
        {categoryData.length > 0 && (
          <View style={styles.breakdownSection}>
            <Text style={[styles.breakdownTitle, { color: theme.text }]}>Expense Breakdown</Text>
            <Surface style={[styles.breakdownCard, { backgroundColor: theme.surface }]} elevation={1}>
              <View style={styles.categoryContent}>
                {categoryData.map((item: any, index: number) => {
                  const percentage = ((item.y / totalSpent) * 100).toFixed(1);
                  return (
                    <View key={item.x} style={styles.categoryItem}>
                      <View style={styles.categoryInfo}>
                        <Text style={[styles.categoryName, { color: theme.text }]}>
                          {item.x}
                        </Text>
                        <Text style={[styles.categoryPercentage, { color: theme.subtext }]}>
                          {percentage}%
                        </Text>
                      </View>
                      <Text style={[styles.categoryAmount, { color: theme.text }]}>
                        {formatAmount(item.y)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Surface>
          </View>
        )}

        {/* Empty State */}
        {expenses.length === 0 && (
          <Card style={[styles.emptyCard, { backgroundColor: theme.surface }]} elevation={3}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No expenses yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
                Start tracking your expenses to see beautiful insights and charts here
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push('/(tabs)/add-expense')}
                style={[styles.emptyButton, { backgroundColor: theme.primary }]}
                contentStyle={styles.emptyButtonContent}
                icon="plus"
              >
                Add Your First Expense
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
      

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
  totalSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  totalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  totalContent: {
    padding: 24,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  periodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  totalCount: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  // Removed duplicate summaryLabel
  // Removed duplicate summaryAmount
  quickAddButton: {
    borderRadius: 12,
  },
  quickAddContent: {
    height: 48,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  toggleChip: {
    borderRadius: 20,
  },
  chartCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  chartButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chartContainer: {
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
  },
  donutCenterText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  donutCenterAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modernLegend: {
    width: '100%',
    paddingHorizontal: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  legendPercentage: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 45,
    textAlign: 'right',
  },
  chartPlaceholder: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  chartPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  chartPlaceholderSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  breakdownSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  breakdownCard: {
    borderRadius: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLeft: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryPercentage: {
    fontSize: 12,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    elevation: 4,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 12,
  },
  emptyButtonContent: {
    height: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  // Header styles
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Filter styles
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
  },
  // Summary styles - removed duplicate
  summarySubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Chart styles - consolidated
  chartPlaceholderTextNew: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  // Quick Add styles - updated to avoid duplicates
  quickAddCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
  },
  quickAddContentNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAddText: {
    flex: 1,
  },
  quickAddTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickAddSubtitle: {
    fontSize: 14,
  },
  quickAddButtonNew: {
    borderRadius: 12,
  },
  quickAddButtonContent: {
    height: 48,
  },
  // Floating button styles
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonContent: {
    height: 56,
    paddingHorizontal: 24,
  },
  // Modern Dashboard Styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating button
  },
  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    // Active styles applied via backgroundColor prop
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Summary Section
  summarySection: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryPeriod: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Removed duplicate summaryCount
  // Chart Section - Modern Design
  chartSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Removed duplicate chartCard - using the one defined above
  chartWrapper: {
    padding: 24,
    alignItems: 'center',
  },
  doughnutContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 32,
  },
  doughnutHole: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  doughnutInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 1000, // Large value to ensure circular shape
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerAmount: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  centerCount: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  categoryContent: {
    padding: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryInfo: {
    flex: 1,
  },
  // Emoji Legend Styles
  emojiLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  emojiItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 4,
  },
  emojiIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  // Emoji Percentage Style
  emojiPercentage: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 2,
  },
});