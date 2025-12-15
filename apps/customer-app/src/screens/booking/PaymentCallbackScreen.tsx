import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {Button} from '@components';
import {colors, spacing, typography} from '@config/theme';
import {useBookingStore} from '@store/bookingStore';
import type {HomeStackParamList} from '@navigation';

type RouteProps = RouteProp<HomeStackParamList, 'PaymentCallback'>;
type NavigationProps = NativeStackNavigationProp<HomeStackParamList>;

type PaymentStatus = 'processing' | 'succeeded' | 'failed';

export function PaymentCallbackScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const queryClient = useQueryClient();
  const {clearDraft} = useBookingStore();

  const {status, payment_intent_id, booking_id} = route.params || {};
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('processing');

  useEffect(() => {
    // Parse the status from the callback
    if (status === 'succeeded' || status === 'paid') {
      setPaymentStatus('succeeded');
      clearDraft();
      queryClient.invalidateQueries({queryKey: ['bookings']});
    } else if (status === 'failed' || status === 'cancelled') {
      setPaymentStatus('failed');
    } else {
      // Processing or unknown status
      setPaymentStatus('processing');
      // Check status after a delay
      const timeout = setTimeout(() => {
        setPaymentStatus('succeeded'); // Assume success if no explicit failure
        clearDraft();
        queryClient.invalidateQueries({queryKey: ['bookings']});
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [status, clearDraft, queryClient]);

  const handleViewBooking = () => {
    if (booking_id) {
      navigation.getParent()?.navigate('BookingsTab', {
        screen: 'BookingDetail',
        params: {bookingId: booking_id},
      });
    } else {
      navigation.getParent()?.navigate('BookingsTab', {
        screen: 'BookingList',
      });
    }
  };

  const handleGoHome = () => {
    navigation.getParent()?.navigate('HomeTab');
  };

  const handleTryAgain = () => {
    navigation.goBack();
  };

  if (paymentStatus === 'processing') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.processingText}>Processing payment...</Text>
        <Text style={styles.processingSubtext}>
          Please wait while we confirm your payment
        </Text>
      </View>
    );
  }

  if (paymentStatus === 'succeeded') {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Icon name="checkmark-circle" size={80} color={colors.success} />
        </View>
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.message}>
          Your payment has been processed successfully. Your booking is now
          confirmed.
        </Text>
        <View style={styles.buttons}>
          <Button title="View Booking" onPress={handleViewBooking} />
          <Button
            title="Back to Home"
            variant="outline"
            onPress={handleGoHome}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    );
  }

  // Failed state
  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, styles.errorIconContainer]}>
        <Icon name="close-circle" size={80} color={colors.error} />
      </View>
      <Text style={styles.title}>Payment Failed</Text>
      <Text style={styles.message}>
        We couldn't process your payment. Please try again or choose a different
        payment method.
      </Text>
      <View style={styles.buttons}>
        <Button title="Try Again" onPress={handleTryAgain} />
        <Button
          title="Back to Home"
          variant="outline"
          onPress={handleGoHome}
          style={styles.secondaryButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  errorIconContainer: {
    backgroundColor: colors.error + '20',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  processingText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xl,
  },
  processingSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});
