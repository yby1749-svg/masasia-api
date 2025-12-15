import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMutation} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import {format, parseISO} from 'date-fns';

import {bookingsApi, paymentsApi} from '@api';
import {Button} from '@components';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@config/theme';
import {useBookingStore} from '@store/bookingStore';
import type {HomeStackParamList} from '@navigation';

type NavigationProps = NativeStackNavigationProp<HomeStackParamList>;

const PAYMENT_METHOD_LABELS: Record<string, {name: string; icon: string}> = {
  GCASH: {name: 'GCash', icon: 'wallet-outline'},
  PAYMAYA: {name: 'PayMaya', icon: 'card-outline'},
  CARD: {name: 'Credit/Debit Card', icon: 'card-outline'},
  CASH: {name: 'Cash', icon: 'cash-outline'},
};

export function BookingSummaryStep() {
  const navigation = useNavigation<NavigationProps>();
  const {draft, setDraft, prevStep, clearDraft, calculatePrice} =
    useBookingStore();
  const [notes, setNotes] = useState(draft.notes || '');

  const price = calculatePrice();
  const isCashPayment = draft.paymentMethod === 'CASH';
  const paymentInfo = draft.paymentMethod
    ? PAYMENT_METHOD_LABELS[draft.paymentMethod]
    : null;

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (
        !draft.provider ||
        !draft.service ||
        !draft.duration ||
        !draft.scheduledDate ||
        !draft.scheduledTime ||
        !draft.address ||
        !draft.paymentMethod
      ) {
        throw new Error('Missing booking information');
      }

      // Create the booking
      const bookingResponse = await bookingsApi.createBooking({
        providerId: draft.provider.id,
        serviceId: draft.service.id,
        duration: draft.duration,
        scheduledDate: draft.scheduledDate,
        scheduledTime: draft.scheduledTime,
        address: draft.address.address,
        latitude: draft.address.latitude,
        longitude: draft.address.longitude,
        notes: notes.trim() || undefined,
      });

      const booking = bookingResponse.data.data;

      // For cash payments, return booking directly
      if (isCashPayment) {
        return {booking, requiresOnlinePayment: false};
      }

      // For online payments, create payment intent
      const paymentResponse = await paymentsApi.createIntent(
        booking.id,
        draft.paymentMethod,
      );

      return {
        booking,
        paymentIntent: paymentResponse.data.data,
        requiresOnlinePayment: true,
      };
    },
    onSuccess: result => {
      if (!result.requiresOnlinePayment) {
        // Cash payment - go directly to booking detail
        clearDraft();
        Alert.alert(
          'Booking Confirmed!',
          'Your booking has been submitted. Please prepare payment for service day.',
          [
            {
              text: 'View Booking',
              onPress: () => {
                navigation.getParent()?.navigate('BookingsTab', {
                  screen: 'BookingDetail',
                  params: {bookingId: result.booking.id},
                });
              },
            },
          ],
        );
      } else {
        // Online payment - navigate to payment WebView
        const checkoutUrl = result.paymentIntent?.checkoutUrl;
        if (checkoutUrl) {
          navigation.navigate('PaymentWebView', {
            bookingId: result.booking.id,
            paymentIntentId: result.paymentIntent!.id,
            checkoutUrl,
          });
        } else {
          // If no checkout URL, show error
          Alert.alert(
            'Payment Error',
            'Unable to initiate payment. Please try again.',
          );
        }
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error ||
        'Failed to create booking. Please try again.';
      Alert.alert('Booking Failed', message);
    },
  });

  const handleConfirm = () => {
    setDraft({notes: notes.trim()});
    createBookingMutation.mutate();
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (!draft.provider || !draft.service || !draft.address || !draft.paymentMethod) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Missing booking information</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Review Your Booking</Text>

        {/* Provider Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="person-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Provider</Text>
          </View>
          <Text style={styles.cardValue}>{draft.provider.displayName}</Text>
          <View style={styles.ratingRow}>
            <Icon name="star" size={14} color={colors.warning} />
            <Text style={styles.ratingText}>
              {draft.provider.rating?.toFixed(1) || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Service Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="sparkles-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Service</Text>
          </View>
          <Text style={styles.cardValue}>{draft.service.name}</Text>
          <Text style={styles.cardSubvalue}>{draft.duration} minutes</Text>
        </View>

        {/* Schedule Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Schedule</Text>
          </View>
          <Text style={styles.cardValue}>
            {draft.scheduledDate && formatDate(draft.scheduledDate)}
          </Text>
          <Text style={styles.cardSubvalue}>{draft.scheduledTime}</Text>
        </View>

        {/* Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Location</Text>
          </View>
          <Text style={styles.cardValue}>{draft.address.label}</Text>
          <Text style={styles.cardSubvalue}>{draft.address.address}</Text>
        </View>

        {/* Payment Method Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon
              name={paymentInfo?.icon || 'card-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>
          <Text style={styles.cardValue}>{paymentInfo?.name}</Text>
          {isCashPayment && (
            <Text style={styles.cardSubvalue}>Pay on service day</Text>
          )}
        </View>

        {/* Notes Input */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes for Provider (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special requests or instructions..."
            placeholderTextColor={colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
          <Text style={styles.notesCount}>{notes.length}/500</Text>
        </View>

        {/* Price Summary */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Service ({draft.duration} min)
            </Text>
            <Text style={styles.priceValue}>₱{price.toLocaleString()}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{price.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <Button
            title="Back"
            variant="outline"
            onPress={prevStep}
            style={styles.backButton}
            disabled={createBookingMutation.isPending}
          />
          <Button
            title={isCashPayment ? 'Confirm Booking' : 'Confirm & Pay'}
            onPress={handleConfirm}
            loading={createBookingMutation.isPending}
            style={styles.confirmButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  cardValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubvalue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ratingText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  notesSection: {
    marginTop: spacing.md,
  },
  notesLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesCount: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  priceCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.body,
    color: colors.text,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    ...typography.h3,
    color: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
});
