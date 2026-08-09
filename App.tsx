import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider } from './src/context/ExpenseContext';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { MainScreen } from './src/screens/MainScreen';
import { EnvelopeDetailScreen } from './src/screens/EnvelopeDetailScreen';
import { CreateEnvelopeScreen } from './src/screens/CreateEnvelopeScreen';
import { CreateTransactionScreen } from './src/screens/CreateTransactionScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { CurrencySettingsScreen } from './src/screens/CurrencySettingsScreen';
import { PaymentMethodsSettingsScreen } from './src/screens/PaymentMethodsSettingsScreen';
import { CategoriesSettingsScreen } from './src/screens/CategoriesSettingsScreen';
import { CutoffSettingsScreen } from './src/screens/CutoffSettingsScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';

type RootStackParamList = {
  Main: undefined;
  EnvelopeDetail: undefined;
  CreateEnvelope: undefined;
  CreateTransaction: undefined;
  Settings: undefined;
  CurrencySettings: undefined;
  PaymentMethodsSettings: undefined;
  CategoriesSettings: undefined;
  CutoffSettings: undefined;
  Reports: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#092230" />
      <KeyboardProvider>
        <AppProvider>
          <NavigationContainer>
            <Stack.Navigator id="root" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#092230' } }}>
              <Stack.Screen name="Main" component={MainScreen} />
              <Stack.Screen name="EnvelopeDetail" component={EnvelopeDetailScreen} />
              <Stack.Screen name="CreateEnvelope" component={CreateEnvelopeScreen} />
              <Stack.Screen name="CreateTransaction" component={CreateTransactionScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="CurrencySettings" component={CurrencySettingsScreen} />
              <Stack.Screen name="PaymentMethodsSettings" component={PaymentMethodsSettingsScreen} />
              <Stack.Screen name="CategoriesSettings" component={CategoriesSettingsScreen} />
              <Stack.Screen name="CutoffSettings" component={CutoffSettingsScreen} />
              <Stack.Screen name="Reports" component={ReportsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
