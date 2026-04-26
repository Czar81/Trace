import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider } from './src/context/ExpenseContext';

import { MainScreen } from './src/screens/MainScreen';
import { EnvelopeDetailScreen } from './src/screens/EnvelopeDetailScreen';
import { CreateEnvelopeScreen } from './src/screens/CreateEnvelopeScreen';
import { CreateTransactionScreen } from './src/screens/CreateTransactionScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#092230" />
      <AppProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#092230' } }}>
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="EnvelopeDetail" component={EnvelopeDetailScreen} />
            <Stack.Screen name="CreateEnvelope" component={CreateEnvelopeScreen} />
            <Stack.Screen name="CreateTransaction" component={CreateTransactionScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
