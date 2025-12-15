import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import {format} from 'date-fns';

import {bookingsApi, paymentsApi} from '@api';
import {Button} from '@components';
import {useUIStore} from '@store';
import type {PaymentMethodType} from '@types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {BookingsStackParamList} from '@navigation';

type RouteProps = RouteProp<BookingsStackParamList, 'BookingDetail'>;
type NavigationProps = NativeStackNavigationProp<
  BookingsStackParamList,
  'BookingDetail'
>;

export function BookingDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const {bookingId} = route.params;
  const queryClient = useQueryClient();
  const {showSuccess, showError} = useUIStore();

  const {data: booking, isLoading} = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await bookingsApi.getBooking(bookingId);
      return response.data.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      await bookingsApi.cancelBooking(bookingId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['booking', bookingId]});
      queryClient.invalidateQueries({queryKey: ['bookings']});
      showSuccess('Booking Cancelled', 'Your booking has been cancelled');
    },
    onError: () => {
      showError('Cancellation Failed', 'Unable to cancel booking');
    },
  });

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () =>
            cancelMutation.mutate('Customer requested cancellation'),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status);
  const canReview =
    booking.status === 'COMPLETED' && !booking.review && booking.provider;
  const canPay =
    ['PENDING', 'CONFIRMED'].includes(booking.status) &&
    booking.payment?.status !== 'PAID' &&
    booking.payment?.method !== 'CASH';

  const paymentMutation = useMutation({
    mutationFn: async () => {
      // Create a new payment intent for online payment
      const method: PaymentMethodType = booking.payment?.method || 'CARD';
      const response = await paymentsApi.createIntent(booking.id, method);
      return response.data.data;
    },
    onSuccess: paymentIntent => {
      if (paymentIntent.checkoutUrl) {
        // Navigate to payment WebView
        navigation.getParent()?.navigate('HomeTab', {
          screen: 'PaymentWebView',
          params: {
            bookingId: booking.id,
            paymentIntentId: paymentIntent.id,
            checkoutUrl: paymentIntent.checkoutUrl,
          },
        });
      } else {
        showError('Payment Error', 'Unable to initiate payment');
      }
    },
    onError: () => {
      showError('Payment Error', 'Failed to initiate payment. Please try again.');
    },
  });

  const handlePayNow = () => {
    paymentMutation.mutate();
  };

  const handleWriteReview = () => {
    if (booking.provider) {
      navigation.navigate('WriteReview', {
        bookingId: booking.id,
        providerId: booking.provider.id,
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service</Text>
        <View style={styles.card}>
          <Text style={styles.serviceName}>{booking.service.name}</Text>
          <Text style={styles.duration}>
            {booking.duration} minutes session
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon
              name="calendar-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.rowText}>
              {format(new Date(booking.scheduledAt), 'EEEE, MMMM d, yyyy')}
            </Text>
          </View>
          <View style={styles.row}>
            <Icon name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.rowText}>
              {format(new Date(booking.scheduledAt), 'h:mm a')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon
              name="location-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.rowText}>{booking.addressText}</Text>
          </View>
        </View>
      </View>

      {booking.provider && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provider</Text>
          <View style={styles.card}>
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <Icon name="person" size={24} color={colors.textLight} />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>
                  {booking.provider.displayName}
                </Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color={colors.warning} />
                  <Text style={styles.rating}>
                    {booking.provider.rating.toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service</Text>
            <Text style={styles.priceValue}>
              ₱{booking.serviceAmount?.toFixed(2) || '0.00'}
            </Text>
          </View>
          {booking.travelFee > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Travel Fee</Text>
              <Text style={styles.priceValue}>
                ₱{booking.travelFee.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              ₱{booking.totalAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Payment Status:</Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color:
                    booking.payment?.status === 'PAID'
                      ? colors.success
                      : colors.warning,
                },
              ]}>
              {booking.payment?.status || 'PENDING'}
            </Text>
          </View>
        </View>
      </View>

      {(canCancel || canReview || canPay) && (
        <View style={styles.footer}>
          {canPay && (
            <Button
              title="Pay Now"
              onPress={handlePayNow}
              loading={paymentMutation.isPending}
              style={styles.payButton}
            />
          )}
          {canReview && (
            <Button
              title="Write Review"
              onPress={handleWriteReview}
              style={styles.reviewButton}
            />
          )}
          {canCancel && (
            <Button
              title="Cancel Booking"
              variant="outline"
              onPress={handleCancel}
              loading={cancelMutation.isPending}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  sectionTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  serviceName: {
    ...typography.h3,
    color: colors.text,
  },
  duration: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    marginLeft: spacing.md,
  },
  providerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rating: {
    ...typography.bodySmall,
    color: colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.body,
    color: colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    ...typography.h3,
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  statusLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statusValue: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  payButton: {
    marginBottom: 0,
  },
  reviewButton: {
    marginBottom: 0,
  },
});
