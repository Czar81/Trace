import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider } from './src/context/ExpenseContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { MainScreen } from './src/screens/MainScreen';
import { EnvelopeDetailScreen } from './src/screens/EnvelopeDetailScreen';
import { CreateEnvelopeScreen } from './src/screens/CreateEnvelopeScreen';
import { CreateTransactionScreen } from './src/screens/CreateTransactionScreen';
import { CreateTransferScreen } from './src/screens/CreateTransferScreen';
import { AssignIncomeScreen } from './src/screens/AssignIncomeScreen';
import { DebtPayoffPlanScreen } from './src/screens/DebtPayoffPlanScreen';
import { ImportBankCsvScreen } from './src/screens/ImportBankCsvScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { CurrencySettingsScreen } from './src/screens/CurrencySettingsScreen';
import { PaymentMethodsSettingsScreen } from './src/screens/PaymentMethodsSettingsScreen';
import { CategoriesSettingsScreen } from './src/screens/CategoriesSettingsScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SearchTransactionsScreen } from './src/screens/SearchTransactionsScreen';
import { RecurringTransactionsScreen } from './src/screens/RecurringTransactionsScreen';
import { CreateRecurringTransactionScreen } from './src/screens/CreateRecurringTransactionScreen';
import { AppearanceSettingsScreen } from './src/screens/AppearanceSettingsScreen';
import { AppLockGate } from './src/components/AppLockGate';
import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function ThemedNavigator() {
  const { colors, isLight } = useTheme();
  return (
    <>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={colors.bg} />
      <NavigationContainer>
        <Stack.Navigator id="root" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="EnvelopeDetail" component={EnvelopeDetailScreen} />
          <Stack.Screen name="CreateEnvelope" component={CreateEnvelopeScreen} />
          <Stack.Screen name="CreateTransaction" component={CreateTransactionScreen} />
          <Stack.Screen name="CreateTransfer" component={CreateTransferScreen} />
          <Stack.Screen name="AssignIncome" component={AssignIncomeScreen} />
          <Stack.Screen name="DebtPayoffPlan" component={DebtPayoffPlanScreen} />
          <Stack.Screen name="ImportBankCsv" component={ImportBankCsvScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="AppearanceSettings" component={AppearanceSettingsScreen} />
          <Stack.Screen name="CurrencySettings" component={CurrencySettingsScreen} />
          <Stack.Screen name="PaymentMethodsSettings" component={PaymentMethodsSettingsScreen} />
          <Stack.Screen name="CategoriesSettings" component={CategoriesSettingsScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Search" component={SearchTransactionsScreen} />
          <Stack.Screen name="Recurring" component={RecurringTransactionsScreen} />
          <Stack.Screen name="CreateRecurringTransaction" component={CreateRecurringTransactionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <LanguageProvider>
            <AppProvider>
              <ThemeProvider>
                <AppLockGate>
                  <ThemedNavigator />
                </AppLockGate>
              </ThemeProvider>
            </AppProvider>
          </LanguageProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
