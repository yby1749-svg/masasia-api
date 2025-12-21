import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import {DashboardNavigator} from './DashboardNavigator';
import {ScheduleNavigator} from './ScheduleNavigator';
import {EarningsNavigator} from './EarningsNavigator';
import {ProfileNavigator} from './ProfileNavigator';
import {useAuthStore, useNotificationStore} from '@store';
import type {MainTabParamList} from '@types';
import {colors, typography} from '@config/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Schedule tab icon with notification badge
function ScheduleTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  const {unreadCount} = useNotificationStore();

  return (
    <View style={tabStyles.iconContainer}>
      <Icon
        name={focused ? 'calendar' : 'calendar-outline'}
        size={size}
        color={color}
      />
      {unreadCount > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

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
          tabBarIcon: ({focused, color, size}) => (
            <ScheduleTabIcon focused={focused} color={color} size={size} />
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

const tabStyles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
