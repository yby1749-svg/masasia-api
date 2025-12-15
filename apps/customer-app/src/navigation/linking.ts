import {LinkingOptions} from '@react-navigation/native';
import type {RootStackParamList} from './RootNavigator';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['masasia://', 'https://masasia.app'],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: {
            screens: {
              PaymentCallback: {
                path: 'payment/callback',
                parse: {
                  status: (status: string) => status,
                  payment_intent_id: (id: string) => id,
                  booking_id: (id: string) => id,
                },
              },
            },
          },
        },
      },
    },
  },
};
