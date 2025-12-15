import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, Switch} from 'react-native';
import Toast from 'react-native-toast-message';

import {Button, Card, TimePicker} from '@components';
import {useAvailabilityStore} from '@store';
import {colors, typography, spacing, borderRadius} from '@config/theme';
import {DAYS_OF_WEEK} from '@config/constants';
import type {WeeklySchedule} from '@types';

export function AvailabilityScreen() {
  const {
    weeklySchedule,
    isLoading,
    fetchAvailability,
    updateAvailability,
    toggleDayAvailability,
    updateDaySlots,
  } = useAvailabilityStore();

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleSave = async () => {
    try {
      await updateAvailability(weeklySchedule);
      Toast.show({
        type: 'success',
        text1: 'Availability Updated',
        text2: 'Your schedule has been saved',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update availability',
      });
    }
  };

  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const handleTimeChange = (
    day: keyof WeeklySchedule,
    slotIndex: number,
    field: 'start' | 'end',
    time: string,
  ) => {
    const daySchedule = weeklySchedule[day] || {isAvailable: false, slots: []};
    const newSlots = daySchedule.slots.map((slot, index) => {
      if (index === slotIndex) {
        return {...slot, [field]: time};
      }
      return slot;
    });
    updateDaySlots(day, newSlots);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Set Your Weekly Availability</Text>
          <Text style={styles.subtitle}>
            Toggle the days you're available to work
          </Text>
        </View>

        {DAYS_OF_WEEK.map(day => {
          const daySchedule = weeklySchedule[day as keyof WeeklySchedule] || {
            isAvailable: false,
            slots: [],
          };

          return (
            <Card key={day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{formatDayName(day)}</Text>
                <Switch
                  value={daySchedule.isAvailable}
                  onValueChange={() =>
                    toggleDayAvailability(day as keyof WeeklySchedule)
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.success + '80',
                  }}
                  thumbColor={
                    daySchedule.isAvailable ? colors.success : colors.textLight
                  }
                />
              </View>

              {daySchedule.isAvailable && (
                <View style={styles.slotsContainer}>
                  {daySchedule.slots.map((slot, index) => (
                    <View key={index} style={styles.slotRow}>
                      <View style={styles.timeInput}>
                        <TimePicker
                          value={slot.start}
                          onChange={(time) =>
                            handleTimeChange(
                              day as keyof WeeklySchedule,
                              index,
                              'start',
                              time,
                            )
                          }
                          label="From"
                        />
                      </View>
                      <Text style={styles.timeSeparator}>-</Text>
                      <View style={styles.timeInput}>
                        <TimePicker
                          value={slot.end}
                          onChange={(time) =>
                            handleTimeChange(
                              day as keyof WeeklySchedule,
                              index,
                              'end',
                              time,
                            )
                          }
                          label="To"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {!daySchedule.isAvailable && (
                <Text style={styles.unavailableText}>Not available</Text>
              )}
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Save Availability"
          onPress={handleSave}
          loading={isLoading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dayCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  slotsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    ...typography.body,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  unavailableText: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
