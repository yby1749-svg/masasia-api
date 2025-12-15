import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import {useAuthStore} from '@store';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {ProfileStackParamList} from '@navigation';

type NavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'Profile'
>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {user, logout} = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', style: 'destructive', onPress: logout},
    ]);
  };

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {icon: 'location-outline', label: 'Saved Addresses', onPress: () => {}},
    {icon: 'card-outline', label: 'Payment Methods', onPress: () => {}},
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => navigation.navigate('Notifications'),
    },
    {icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {}},
    {
      icon: 'document-text-outline',
      label: 'Terms & Conditions',
      onPress: () => {},
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacy Policy',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Icon name="person" size={48} color={colors.textLight} />
          </View>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}>
              <Icon name={item.icon} size={22} color={colors.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  menu: {
    padding: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '10',
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  version: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
});
