import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {Button} from '@components';
import {colors, spacing, typography, borderRadius} from '@config/theme';
import {useBookingStore} from '@store/bookingStore';
import {useLocationStore} from '@store/locationStore';

export function AddressSelectionStep() {
  const {draft, setDraft, nextStep, prevStep} = useBookingStore();
  const {latitude, longitude} = useLocationStore();

  const [location, setLocation] = useState(draft.addressText || '');
  const [details, setDetails] = useState(draft.addressNotes || '');

  // Use this location - no API call, just store locally
  const handleUseLocation = () => {
    if (!location.trim()) {
      return;
    }

    // Store directly in booking draft - no database needed
    setDraft({
      addressText: location.trim(),
      addressNotes: details.trim() || undefined,
      latitude: latitude || 14.5995,
      longitude: longitude || 120.9842,
    });
  };

  // Check if we have a valid address (either from input or already in draft)
  const hasAddress = !!draft.addressText || !!location.trim();
  const canContinue = !!draft.addressText;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Where should we come?</Text>
        <Text style={styles.sectionSubtitle}>
          Enter your hotel, condo, or home location
        </Text>

        {/* Location Form - Simple, no API needed */}
        <View style={styles.addForm}>
          <View style={styles.formHeader}>
            <Icon name="location" size={20} color={colors.primary} />
            <Text style={styles.formTitle}>Your Location</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Hotel or building name"
            placeholderTextColor={colors.textLight}
            value={location}
            onChangeText={setLocation}
            onBlur={handleUseLocation}
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="words"
          />

          <TextInput
            style={[styles.input, styles.inputDetails]}
            placeholder="Room number, registered name (optional)"
            placeholderTextColor={colors.textLight}
            value={details}
            onChangeText={text => {
              setDetails(text);
            }}
            onBlur={handleUseLocation}
            multiline
            numberOfLines={2}
            autoCorrect={false}
            spellCheck={false}
          />

          <Text style={styles.hint}>
            Provider will message you if they need more details
          </Text>

          {/* Show confirmation when address is set */}
          {draft.addressText && (
            <View style={styles.confirmBadge}>
              <Icon name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.confirmText}>Location saved</Text>
            </View>
          )}
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
          />
          <Button
            title="Continue"
            onPress={() => {
              // Save before continuing if not already saved
              if (location.trim() && !draft.addressText) {
                handleUseLocation();
              }
              if (location.trim()) {
                nextStep();
              }
            }}
            disabled={!location.trim()}
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
  addForm: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputDetails: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  hint: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
  },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '500',
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
