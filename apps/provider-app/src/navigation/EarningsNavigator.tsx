import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {EarningsScreen} from '@screens/earnings/EarningsScreen';
import {WalletScreen} from '@screens/earnings/WalletScreen';
import {PayoutRequestScreen} from '@screens/earnings/PayoutRequestScreen';
import type {EarningsStackParamList} from '@types';
import {colors} from '@config/theme';

const Stack = createNativeStackNavigator<EarningsStackParamList>();

export function EarningsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{title: 'Earnings'}}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{title: 'My Wallet'}}
      />
      <Stack.Screen
        name="PayoutRequest"
        component={PayoutRequestScreen}
        options={{title: 'Request Payout'}}
      />
    </Stack.Navigator>
  );
}
