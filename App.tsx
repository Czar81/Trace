import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider, useAppData } from './src/context/ExpenseContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { MainScreen } from './src/screens/envelopes/MainScreen';
import { EnvelopeDetailScreen } from './src/screens/envelopes/EnvelopeDetailScreen';
import { CreateEnvelopeScreen } from './src/screens/envelopes/CreateEnvelopeScreen';
import { CreateTransactionScreen } from './src/screens/transactions/CreateTransactionScreen';
import { CreateTransferScreen } from './src/screens/transactions/CreateTransferScreen';
import { AssignIncomeScreen } from './src/screens/envelopes/AssignIncomeScreen';
import { DebtPayoffPlanScreen } from './src/screens/envelopes/DebtPayoffPlanScreen';
import { ImportBankCsvScreen } from './src/screens/transactions/ImportBankCsvScreen';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';
import { PaymentMethodsSettingsScreen } from './src/screens/settings/PaymentMethodsSettingsScreen';
import { CategoriesSettingsScreen } from './src/screens/settings/CategoriesSettingsScreen';
import { ReportsScreen } from './src/screens/reports/ReportsScreen';
import { SearchTransactionsScreen } from './src/screens/transactions/SearchTransactionsScreen';
import { RecurringTransactionsScreen } from './src/screens/transactions/RecurringTransactionsScreen';
import { CreateRecurringTransactionScreen } from './src/screens/transactions/CreateRecurringTransactionScreen';
import { BackupSettingsScreen } from './src/screens/settings/BackupSettingsScreen';
import { AppearanceSettingsScreen } from './src/screens/settings/AppearanceSettingsScreen';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { loadOnboardingSeen, saveOnboardingSeen } from './src/services/storage/storage';
import { AppLockGate } from './src/components/layout/AppLockGate';
import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type OnboardingGate = 'checking' | 'show' | 'done';

/**
 * Decides whether to show the first-run tutorial. It is skipped for anyone who
 * already has data (e.g. restored from a backup or updating from an older version).
 */
function useOnboardingGate(): [OnboardingGate, () => void] {
  const { isLoaded, envelopes, transactions } = useAppData();
  const [gate, setGate] = useState<OnboardingGate>('checking');
  const hasData = envelopes.length > 0 || transactions.length > 0;

  useEffect(() => {
    if (!isLoaded || gate !== 'checking') return;
    let cancelled = false;
    loadOnboardingSeen().then(seen => {
      if (cancelled) return;
      if (seen === null) setGate('done');
      else if (seen) setGate('done');
      else if (hasData) {
        saveOnboardingSeen();
        setGate('done');
      } else setGate('show');
    });
    return () => { cancelled = true; };
  }, [isLoaded, gate, hasData]);

  const finish = () => {
    saveOnboardingSeen();
    setGate('done');
  };
  return [gate, finish];
}

function OnboardingRoute({ navigation }: { navigation: { goBack: () => void } }) {
  return <OnboardingScreen onFinish={navigation.goBack} />;
}

function ThemedNavigator() {
  const { colors, isLight } = useTheme();
  const [gate, finishOnboarding] = useOnboardingGate();
  if (gate === 'checking') return null;
  if (gate === 'show') return <OnboardingScreen onFinish={finishOnboarding} />;
  return (
    <>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={colors.bg} />
      <NavigationContainer>
        <Stack.Navigator id="root" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="EnvelopeDetail" component={EnvelopeDetailScreen} />
          <Stack.Screen name="CreateEnvelope" component={CreateEnvelopeScreen} options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="CreateTransaction" component={CreateTransactionScreen} options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="CreateTransfer" component={CreateTransferScreen} options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="AssignIncome" component={AssignIncomeScreen} options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="DebtPayoffPlan" component={DebtPayoffPlanScreen} />
          <Stack.Screen name="ImportBankCsv" component={ImportBankCsvScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingRoute} options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="AppearanceSettings" component={AppearanceSettingsScreen} />
          <Stack.Screen name="PaymentMethodsSettings" component={PaymentMethodsSettingsScreen} />
          <Stack.Screen name="CategoriesSettings" component={CategoriesSettingsScreen} />
          <Stack.Screen name="BackupSettings" component={BackupSettingsScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Search" component={SearchTransactionsScreen} />
          <Stack.Screen name="Recurring" component={RecurringTransactionsScreen} />
          <Stack.Screen name="CreateRecurringTransaction" component={CreateRecurringTransactionScreen} options={{ animation: 'fade_from_bottom' }} />
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
