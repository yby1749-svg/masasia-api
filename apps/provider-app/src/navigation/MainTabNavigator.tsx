import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import {DashboardNavigator} from './DashboardNavigator';
import {ScheduleNavigator} from './ScheduleNavigator';
import {EarningsNavigator} from './EarningsNavigator';
import {ProfileNavigator} from './ProfileNavigator';
import {useAuthStore} from '@store';
import type {MainTabParamList} from '@types';
import {colors, typography} from '@config/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const {provider} = useAuthStore();

  // Check if provider belongs to a shop
  const belongsToShop = !!provider?.shopId;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: {
          ...typography.caption,
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.divider,
          paddingTop: 8,
          height: 60,
        },
      }}>
      <Tab.Screen
        name="DashboardTab"
        component={DashboardNavigator}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({color, size}) => (
            <Icon name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleNavigator}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({color, size}) => (
            <Icon name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Only show Earnings tab for independent providers (not belonging to a shop) */}
      {!belongsToShop && (
        <Tab.Screen
          name="EarningsTab"
          component={EarningsNavigator}
          options={{
            tabBarLabel: 'Earnings',
            tabBarIcon: ({color, size}) => (
              <Icon name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, size}) => (
            <Icon name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
