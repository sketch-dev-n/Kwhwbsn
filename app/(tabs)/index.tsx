@@ .. @@
 export default function DashboardScreen() {
   const { theme } = useThemeStore();
-  const { expenses, subscribeToFirestoreExpenses, unsubscribeFromFirestoreExpenses } = useExpenseStore();
+  const { expenses, loadExpenses } = useExpenseStore();
   const { formatAmount } = useCurrencyStore();

@@ .. @@
   const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');

   // Removed unused screenWidth

   useEffect(() => {
-    subscribeToFirestoreExpenses();
-    return () => {
-      unsubscribeFromFirestoreExpenses();
-    };
-  }, [subscribeToFirestoreExpenses, unsubscribeFromFirestoreExpenses]);
+    loadExpenses();
+  }, [loadExpenses]);