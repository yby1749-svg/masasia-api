import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '@config/theme';
import type {
  ShopOwnerTabParamList,
  ShopDashboardStackParamList,
  ShopTherapistsStackParamList,
  ShopEarningsStackParamList,
  ShopProfileStackParamList,
} from '@types';

// Import screens
import {ShopDashboardScreen} from '../screens/shop-owner/ShopDashboardScreen';
import {ShopTherapistsScreen} from '../screens/shop-owner/ShopTherapistsScreen';
import {ShopEarningsScreen} from '../screens/shop-owner/ShopEarningsScreen';
import {ShopPayoutRequestScreen} from '../screens/shop-owner/ShopPayoutRequestScreen';
import {ShopWalletScreen} from '../screens/shop-owner/ShopWalletScreen';
import {ShopProfileScreen} from '../screens/shop-owner/ShopProfileScreen';
import {SendInvitationScreen} from '../screens/shop-owner/SendInvitationScreen';
import {TherapistMapScreen} from '../screens/shop-owner/TherapistMapScreen';
import {TherapistActivityScreen} from '../screens/shop-owner/TherapistActivityScreen';
import {NotificationsScreen} from '../screens/notifications/NotificationsScreen';

const Tab = createBottomTabNavigator<ShopOwnerTabParamList>();
const DashboardStack = createNativeStackNavigator<ShopDashboardStackParamList>();
const TherapistsStack = createNativeStackNavigator<ShopTherapistsStackParamList>();
const EarningsStack = createNativeStackNavigator<ShopEarningsStackParamList>();
const ProfileStack = createNativeStackNavigator<ShopProfileStackParamList>();

// Tab Icons
function TabIcon({name, focused}: {name: string; focused: boolean}) {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    Therapists: '👥',
    Earnings: '💰',
    Profile: '⚙️',
  };
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

// Stack Navigators
function ShopDashboardNavigator() {
  return (
    <DashboardStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.background},
        headerTintColor: colors.text,
      }}>
      <DashboardStack.Screen
        name="ShopDashboard"
        component={ShopDashboardScreen}
        options={{headerShown: false}}
      />
      <DashboardStack.Screen
        name="TherapistMap"
        component={TherapistMapScreen}
        options={{title: 'Therapist Locations'}}
      />
      <DashboardStack.Screen
        name="TherapistActivity"
        component={TherapistActivityScreen}
        options={{title: 'Therapist Activity'}}
      />
    </DashboardStack.Navigator>
  );
}

function ShopTherapistsNavigator() {
  return (
    <TherapistsStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.background},
        headerTintColor: colors.text,
      }}>
      <TherapistsStack.Screen
        name="ShopTherapists"
        component={ShopTherapistsScreen}
        options={{title: 'Therapists'}}
      />
      <TherapistsStack.Screen
        name="SendInvitation"
        component={SendInvitationScreen}
        options={{title: 'Invite Therapist'}}
      />
    </TherapistsStack.Navigator>
  );
}

function ShopEarningsNavigator() {
  return (
    <EarningsStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.background},
        headerTintColor: colors.text,
      }}>
      <EarningsStack.Screen
        name="ShopEarnings"
        component={ShopEarningsScreen}
        options={{title: 'Earnings'}}
      />
      <EarningsStack.Screen
        name="ShopWallet"
        component={ShopWalletScreen}
        options={{title: 'Shop Wallet'}}
      />
      <EarningsStack.Screen
        name="ShopPayoutRequest"
        component={ShopPayoutRequestScreen}
        options={{title: 'Request Payout'}}
      />
    </EarningsStack.Navigator>
  );
}

function ShopProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.background},
        headerTintColor: colors.text,
      }}>
      <ProfileStack.Screen
        name="ShopProfile"
        component={ShopProfileScreen}
        options={{title: 'Shop Profile'}}
      />
      <ProfileStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </ProfileStack.Navigator>
  );
}

export function ShopOwnerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tab.Screen
        name="ShopDashboardTab"
        component={ShopDashboardNavigator}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({focused}) => <TabIcon name="Dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ShopTherapistsTab"
        component={ShopTherapistsNavigator}
        options={{
          tabBarLabel: 'Therapists',
          tabBarIcon: ({focused}) => <TabIcon name="Therapists" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ShopEarningsTab"
        component={ShopEarningsNavigator}
        options={{
          tabBarLabel: 'Earnings',
          tabBarIcon: ({focused}) => <TabIcon name="Earnings" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ShopProfileTab"
        component={ShopProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({focused}) => <TabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
});
