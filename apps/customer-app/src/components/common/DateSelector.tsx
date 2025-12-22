import React from 'react';
import {Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {format, addDays, isSameDay, parseISO} from 'date-fns';

import {colors, spacing, typography, borderRadius} from '@config/theme';

interface DateSelectorProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  daysToShow?: number;
}

export function DateSelector({
  selectedDate,
  onDateSelect,
  daysToShow = 14,
}: DateSelectorProps) {
  const today = new Date();
  const dates = Array.from({length: daysToShow}, (_, i) =>
    addDays(today, i),
  );

  const isSelected = (date: Date) => {
    if (!selectedDate) {
      return false;
    }
    return isSameDay(date, parseISO(selectedDate));
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {dates.map(date => {
        const selected = isSelected(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayName = format(date, 'EEE');
        const dayNum = format(date, 'd');
        const month = format(date, 'MMM');

        return (
          <TouchableOpacity
            key={dateStr}
            style={[styles.dateCard, selected && styles.dateCardSelected]}
            onPress={() => onDateSelect(dateStr)}
            activeOpacity={0.7}>
            <Text style={[styles.dayName, selected && styles.textSelected]}>
              {dayName}
            </Text>
            <Text style={[styles.dayNum, selected && styles.textSelected]}>
              {dayNum}
            </Text>
            <Text style={[styles.month, selected && styles.textSelected]}>
              {month}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dateCard: {
    width: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  dayName: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayNum: {
    ...typography.h3,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  month: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  textSelected: {
    color: colors.textInverse,
  },
});
