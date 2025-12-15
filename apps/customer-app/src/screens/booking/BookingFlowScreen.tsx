import React, {useEffect} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Text,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';

import {providersApi} from '@api';
import {StepIndicator} from '@components/common/StepIndicator';
import {colors, typography} from '@config/theme';
import {useBookingStore} from '@store/bookingStore';
import type {HomeStackParamList} from '@navigation';

import {
  ServiceSelectionStep,
  DateTimeSelectionStep,
  AddressSelectionStep,
  PaymentMethodStep,
  BookingSummaryStep,
} from './steps';

type RouteProps = RouteProp<HomeStackParamList, 'BookingFlow'>;
type NavigationProps = NativeStackNavigationProp<
  HomeStackParamList,
  'BookingFlow'
>;

const STEP_LABELS = [
  'Select Service',
  'Choose Time',
  'Your Address',
  'Payment',
  'Confirm',
];
const TOTAL_STEPS = 5;

export function BookingFlowScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const {providerId} = route.params;

  const {currentStep, setDraft, clearDraft, prevStep} = useBookingStore();

  const {
    data: provider,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      const response = await providersApi.getProvider(providerId);
      return response.data.data;
    },
  });

  // Initialize draft with provider data
  useEffect(() => {
    if (provider) {
      setDraft({provider});
    }
  }, [provider, setDraft]);

  // Clear draft on unmount
  useEffect(() => {
    return () => {
      clearDraft();
    };
  }, [clearDraft]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (currentStep > 0) {
          prevStep();
          return true;
        }
        return false;
      },
    );

    return () => backHandler.remove();
  }, [currentStep, prevStep]);

  // Update header with back action
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null, // Will use custom back handling
      title: 'Book Appointment',
    });
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !provider) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load provider</Text>
      </View>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <ServiceSelectionStep />;
      case 1:
        return <DateTimeSelectionStep providerId={providerId} />;
      case 2:
        return <AddressSelectionStep />;
      case 3:
        return <PaymentMethodStep />;
      case 4:
        return <BookingSummaryStep />;
      default:
        return <ServiceSelectionStep />;
    }
  };

  return (
    <View style={styles.container}>
      <StepIndicator
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        labels={STEP_LABELS}
      />
      <View style={styles.content}>{renderStep()}</View>
    </View>
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
  content: {
    flex: 1,
  },
});
