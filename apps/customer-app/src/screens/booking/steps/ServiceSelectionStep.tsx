import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {Button} from '@components';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@config/theme';
import {useBookingStore} from '@store/bookingStore';
import type {ProviderService} from '@types';

export function ServiceSelectionStep() {
  const {draft, setDraft, nextStep, calculatePrice} = useBookingStore();
  const provider = draft.provider;

  const handleServiceSelect = (service: ProviderService) => {
    setDraft({service: service.service});
  };

  const handleDurationSelect = (duration: 90 | 120) => {
    setDraft({duration});
  };

  const canContinue = draft.service && draft.duration;
  const price = calculatePrice();

  if (!provider) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Services Section */}
        <Text style={styles.sectionTitle}>Select a Service</Text>
        {provider.services?.map((ps: ProviderService) => (
          <TouchableOpacity
            key={ps.id}
            style={[
              styles.serviceCard,
              draft.service?.id === ps.service.id && styles.serviceCardSelected,
            ]}
            onPress={() => handleServiceSelect(ps)}
            activeOpacity={0.7}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{ps.service.name}</Text>
              <Text style={styles.serviceDesc} numberOfLines={2}>
                {ps.service.description}
              </Text>
            </View>
            <View style={styles.serviceCheck}>
              {draft.service?.id === ps.service.id && (
                <Icon
                  name="checkmark-circle"
                  size={24}
                  color={colors.primary}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Duration Section */}
        <View style={[styles.durationHeader, styles.sectionMargin]}>
          <Icon name="notifications" size={24} color={colors.primary} />
          <Text style={styles.durationTitle}>Select Duration</Text>
        </View>
        <View style={styles.durationContainer}>
          <TouchableOpacity
            style={[
              styles.durationButton,
              draft.duration === 90 && styles.durationButtonSelected,
            ]}
            onPress={() => handleDurationSelect(90)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.durationText,
                draft.duration === 90 && styles.durationTextSelected,
              ]}>
              90 min
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.durationButton,
              draft.duration === 120 && styles.durationButtonSelected,
            ]}
            onPress={() => handleDurationSelect(120)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.durationText,
                draft.duration === 120 && styles.durationTextSelected,
              ]}>
              120 min
            </Text>
          </TouchableOpacity>
        </View>

        {/* Price Display */}
        {canContinue && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Estimated Price</Text>
            <Text style={styles.priceValue}>₱{price.toLocaleString()}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button title="Continue" onPress={nextStep} disabled={!canContinue} />
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
    marginBottom: spacing.md,
  },
  sectionMargin: {
    marginTop: spacing.xl,
  },
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  durationTitle: {
    ...typography.h3,
    color: colors.text,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  serviceDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  serviceCheck: {
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  durationContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  durationButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  durationButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  durationText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationTextSelected: {
    color: colors.primary,
  },
  priceContainer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  priceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.h2,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
