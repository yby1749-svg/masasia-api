import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import {Card} from '@components';
import {useAuthStore} from '@store';
import {colors, typography, spacing, borderRadius} from '@config/theme';
import type {ProfileStackParamList} from '@types';

type NavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'Profile'
>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {provider, logout} = useAuthStore();

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      screen: 'EditProfile' as const,
    },
    {
      icon: 'trending-up-outline',
      label: 'Boost Visibility',
      screen: 'Promotion' as const,
      badge: provider?.promotionBid && provider.promotionBid > 0 ? `₱${provider.promotionBid}/day` : null,
    },
    {
      icon: 'storefront-outline',
      label: 'My Shop',
      screen: 'MyShop' as const,
    },
    {
      icon: 'briefcase-outline',
      label: 'My Services',
      screen: 'Services' as const,
    },
    {
      icon: 'star-outline',
      label: 'My Reviews',
      screen: 'Reviews' as const,
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      screen: 'Notifications' as const,
    },
    {
      icon: 'settings-outline',
      label: 'Settings',
      screen: 'Settings' as const,
    },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        {provider?.photoUrl ? (
          <Image
            source={{uri: provider.photoUrl}}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Icon name="person" size={48} color={colors.textLight} />
          </View>
        )}
        <Text style={styles.name}>{provider?.displayName}</Text>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={18} color={colors.warning} />
          <Text style={styles.rating}>
            {provider?.rating?.toFixed(1) || '0.0'}
          </Text>
          <Text style={styles.reviews}>
            ({provider?.totalReviews || 0} reviews)
          </Text>
        </View>
        {provider?.bio && <Text style={styles.bio}>{provider.bio}</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{provider?.totalReviews || 0}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {provider?.rating?.toFixed(1) || '0.0'}
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {provider?.services?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Services</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.label}
            onPress={() => navigation.navigate(item.screen)}>
            <Card style={styles.menuItem}>
              <Icon name={item.icon} size={24} color={colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              {(item as any).badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{(item as any).badge}</Text>
                </View>
              )}
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </Card>
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout}>
          <Card style={styles.menuItem}>
            <Icon name="log-out-outline" size={24} color={colors.error} />
            <Text style={[styles.menuLabel, styles.logoutLabel]}>Logout</Text>
          </Card>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
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
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  rating: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  reviews: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.lg,
    backgroundColor: colors.card,
    marginTop: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
  },
  menuContainer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  logoutLabel: {
    color: colors.error,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
});
