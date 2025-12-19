import React from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {useNotificationStore} from '@store';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {Notification} from '@types';

export function InboxScreen() {
  const {notifications, markAsRead} = useNotificationStore();

  const renderNotification = ({item}: {item: Notification}) => (
    <View
      style={[styles.notificationCard, !item.isRead && styles.unread]}
      onTouchEnd={() => !item.isRead && markAsRead(item.id)}>
      <View
        style={[styles.iconContainer, {backgroundColor: getIconBg(item.type)}]}>
        <Icon
          name={getIcon(item.type)}
          size={20}
          color={getIconColor(item.type)}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
      </View>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="mail-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const getIcon = (type: string) => {
  switch (type) {
    case 'BOOKING_CONFIRMED':
      return 'checkmark-circle-outline';
    case 'PROVIDER_ASSIGNED':
      return 'person-outline';
    case 'PROVIDER_EN_ROUTE':
      return 'navigate-outline';
    case 'BOOKING_COMPLETED':
      return 'star-outline';
    case 'PAYMENT':
      return 'card-outline';
    default:
      return 'notifications-outline';
  }
};

const getIconBg = (type: string) => {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_COMPLETED':
      return colors.success + '20';
    case 'PAYMENT':
      return colors.warning + '20';
    default:
      return colors.primary + '20';
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_COMPLETED':
      return colors.success;
    case 'PAYMENT':
      return colors.warning;
    default:
      return colors.primary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  unread: {
    backgroundColor: colors.primaryLight + '10',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
    marginTop: spacing.xs,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
