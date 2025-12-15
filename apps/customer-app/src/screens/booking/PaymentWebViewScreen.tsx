import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {WebView, WebViewNavigation} from 'react-native-webview';
import {useQueryClient} from '@tanstack/react-query';

import {Button} from '@components';
import {colors, spacing, typography} from '@config/theme';
import {useBookingStore} from '@store/bookingStore';
import type {HomeStackParamList} from '@navigation';

type RouteProps = RouteProp<HomeStackParamList, 'PaymentWebView'>;
type NavigationProps = NativeStackNavigationProp<HomeStackParamList>;

export function PaymentWebViewScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const queryClient = useQueryClient();
  const {clearDraft} = useBookingStore();
  const webViewRef = useRef<WebView>(null);

  const {bookingId, checkoutUrl} = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const {url} = navState;

    // Check for success callback
    if (url.includes('payment/callback') || url.includes('status=succeeded')) {
      handlePaymentSuccess();
      return;
    }

    // Check for failure callback
    if (url.includes('status=failed') || url.includes('status=cancelled')) {
      handlePaymentFailure();
      return;
    }
  };

  const handlePaymentSuccess = () => {
    clearDraft();
    queryClient.invalidateQueries({queryKey: ['bookings']});

    Alert.alert(
      'Payment Successful!',
      'Your payment has been processed successfully.',
      [
        {
          text: 'View Booking',
          onPress: () => {
            navigation.getParent()?.navigate('BookingsTab', {
              screen: 'BookingDetail',
              params: {bookingId},
            });
          },
        },
      ],
    );
  };

  const handlePaymentFailure = () => {
    Alert.alert(
      'Payment Failed',
      'Your payment could not be processed. Please try again.',
      [
        {
          text: 'Try Again',
          onPress: () => webViewRef.current?.reload(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const handleWebViewError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Payment</Text>
          <Text style={styles.errorMessage}>
            There was a problem loading the payment page. Please check your
            internet connection and try again.
          </Text>
          <View style={styles.errorButtons}>
            <Button
              title="Try Again"
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
                webViewRef.current?.reload();
              }}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{uri: checkoutUrl}}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleWebViewError}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        scalesPageToFit
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorButtons: {
    width: '100%',
    gap: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
});
