import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ProfileScreen} from '@screens/profile/ProfileScreen';
import {ServicesScreen} from '@screens/profile/ServicesScreen';
import {SettingsScreen} from '@screens/profile/SettingsScreen';
import {MyShopScreen, ShopInvitationsScreen} from '@screens/shop';
import type {ProfileStackParamList} from '@types';
import {colors} from '@config/theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
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
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{title: 'My Services'}}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
      <Stack.Screen
        name="MyShop"
        component={MyShopScreen}
        options={{title: 'My Shop'}}
      />
      <Stack.Screen
        name="ShopInvitations"
        component={ShopInvitationsScreen}
        options={{title: 'Shop Invitations'}}
      />
    </Stack.Navigator>
  );
}
