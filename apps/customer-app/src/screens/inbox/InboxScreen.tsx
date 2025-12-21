import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import {useNotificationStore} from '@store';
import {notificationsApi} from '@api';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {Notification} from '@types';

export function InboxScreen() {
  const navigation = useNavigation<any>();
  const {notifications, markAsRead, setNotifications} = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch fresh notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const fetchNotifications = async () => {
    try {
      const response = await notificationsApi.getNotifications({limit: 50});
      if (response.data.data) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.log('[Inbox] Failed to fetch notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (item: Notification) => {
    // Mark as read
    if (!item.isRead) {
      markAsRead(item.id);
    }

    const bookingId = item.data?.bookingId as string | undefined;
    if (bookingId) {
      // For message notifications, go directly to chat
      if (item.type === 'SYSTEM' || item.title?.toLowerCase().includes('message')) {
        navigation.navigate('BookingsTab', {
          screen: 'Chat',
          params: {bookingId},
        });
      } else {
        // For other notifications, go to booking detail
        navigation.navigate('BookingsTab', {
          screen: 'BookingDetail',
          params: {bookingId},
        });
      }
    }
  };

  const renderNotification = ({item}: {item: Notification}) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}>
      <View
        style={[styles.iconContainer, {backgroundColor: getIconBg(item.type, item.title)}]}>
        <Icon
          name={getIcon(item.type, item.title)}
          size={20}
          color={getIconColor(item.type, item.title)}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
      <Icon name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
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

const getIcon = (type: string, title?: string) => {
  // Check if it's a message notification
  if (type === 'SYSTEM' || title?.toLowerCase().includes('message')) {
    return 'chatbubble';
  }
  switch (type) {
    case 'BOOKING_ACCEPTED':
    case 'BOOKING_CONFIRMED':
      return 'checkmark-circle-outline';
    case 'BOOKING_REQUEST':
      return 'calendar-outline';
    case 'PROVIDER_ASSIGNED':
      return 'person-outline';
    case 'PROVIDER_EN_ROUTE':
      return 'navigate-outline';
    case 'PROVIDER_ARRIVED':
      return 'location-outline';
    case 'SERVICE_STARTED':
      return 'play-circle-outline';
    case 'SERVICE_COMPLETED':
    case 'BOOKING_COMPLETED':
      return 'star-outline';
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT':
      return 'card-outline';
    case 'PROMOTION':
      return 'gift-outline';
    default:
      return 'notifications-outline';
  }
};

const getIconBg = (type: string, title?: string) => {
  if (type === 'SYSTEM' || title?.toLowerCase().includes('message')) {
    return '#9333EA20'; // Purple for chat
  }
  switch (type) {
    case 'BOOKING_ACCEPTED':
    case 'BOOKING_CONFIRMED':
    case 'SERVICE_COMPLETED':
    case 'BOOKING_COMPLETED':
      return colors.success + '20';
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT':
      return colors.warning + '20';
    case 'PROMOTION':
      return '#F59E0B20'; // Amber
    default:
      return colors.primary + '20';
  }
};

const getIconColor = (type: string, title?: string) => {
  if (type === 'SYSTEM' || title?.toLowerCase().includes('message')) {
    return '#9333EA'; // Purple for chat
  }
  switch (type) {
    case 'BOOKING_ACCEPTED':
    case 'BOOKING_CONFIRMED':
    case 'SERVICE_COMPLETED':
    case 'BOOKING_COMPLETED':
      return colors.success;
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT':
      return colors.warning;
    case 'PROMOTION':
      return '#F59E0B'; // Amber
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
    alignItems: 'center',
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
