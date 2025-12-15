import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';

import {Button} from '@components';
import {PaymentMethodCard} from '@components/payment/PaymentMethodCard';
import {colors, spacing, typography, borderRadius} from '@config/theme';
import {useBookingStore} from '@store/bookingStore';
import type {PaymentMethodType} from '@types';

interface PaymentMethodOption {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'GCASH',
    name: 'GCash',
    description: 'Pay with your GCash e-wallet',
    icon: 'wallet-outline',
  },
  {
    id: 'PAYMAYA',
    name: 'PayMaya',
    description: 'Pay with your PayMaya account',
    icon: 'card-outline',
  },
  {
    id: 'CARD',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, and more',
    icon: 'card-outline',
  },
  {
    id: 'CASH',
    name: 'Cash',
    description: 'Pay on service day',
    icon: 'cash-outline',
  },
];

export function PaymentMethodStep() {
  const {draft, setDraft, nextStep, prevStep, calculatePrice} =
    useBookingStore();

  const price = calculatePrice();

  const handleMethodSelect = (method: PaymentMethodType) => {
    setDraft({paymentMethod: method});
  };

  const canContinue = !!draft.paymentMethod;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <Text style={styles.sectionSubtitle}>
          Choose how you'd like to pay for your booking
        </Text>

        {/* Price Display */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Total Amount</Text>
          <Text style={styles.priceValue}>₱{price.toLocaleString()}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsContainer}>
          {PAYMENT_METHODS.map(method => (
            <PaymentMethodCard
              key={method.id}
              method={method.id}
              name={method.name}
              description={method.description}
              icon={method.icon}
              selected={draft.paymentMethod === method.id}
              onSelect={() => handleMethodSelect(method.id)}
            />
          ))}
        </View>

        {/* Cash Notice */}
        {draft.paymentMethod === 'CASH' && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Please prepare the exact amount. Payment will be collected by the
              service provider after the session is completed.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <Button
            title="Back"
            variant="outline"
            onPress={prevStep}
            style={styles.backButton}
          />
          <Button
            title="Continue"
            onPress={nextStep}
            disabled={!canContinue}
            style={styles.continueButton}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  priceCard: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  priceLabel: {
    ...typography.bodySmall,
    color: colors.textInverse,
    opacity: 0.9,
  },
  priceValue: {
    ...typography.h1,
    color: colors.textInverse,
    marginTop: spacing.xs,
  },
  methodsContainer: {
    gap: spacing.sm,
  },
  noticeCard: {
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  noticeText: {
    ...typography.bodySmall,
    color: colors.text,
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
  continueButton: {
    flex: 2,
  },
});
