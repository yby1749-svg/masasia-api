import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@config/theme';
import type {PaymentMethodType} from '@types';

interface PaymentMethodCardProps {
  method: PaymentMethodType;
  name: string;
  description: string;
  icon: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function PaymentMethodCard({
  method,
  name,
  description,
  icon,
  selected,
  onSelect,
  disabled = false,
}: PaymentMethodCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
      disabled={disabled}>
      <View
        style={[
          styles.iconContainer,
          selected && styles.iconContainerSelected,
        ]}>
        <Icon
          name={icon}
          size={24}
          color={selected ? colors.primary : colors.textSecondary}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, disabled && styles.textDisabled]}>
          {name}
        </Text>
        <Text style={[styles.description, disabled && styles.textDisabled]}>
          {description}
        </Text>
      </View>
      <View style={styles.checkContainer}>
        <Icon
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={selected ? colors.primary : colors.border}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerSelected: {
    backgroundColor: colors.primaryLight + '20',
  },
  content: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  textDisabled: {
    color: colors.textLight,
  },
  checkContainer: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
});
