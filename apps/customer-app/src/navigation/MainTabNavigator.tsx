import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {getFocusedRouteNameFromRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import {HomeScreen} from '@screens/home/HomeScreen';
import {ProviderListScreen} from '@screens/home/ProviderListScreen';
import {ProviderDetailScreen} from '@screens/home/ProviderDetailScreen';
import {BookingListScreen} from '@screens/booking/BookingListScreen';
import {BookingDetailScreen} from '@screens/booking/BookingDetailScreen';
import {BookingFlowScreen} from '@screens/booking/BookingFlowScreen';
import {PaymentWebViewScreen} from '@screens/booking/PaymentWebViewScreen';
import {PaymentCallbackScreen} from '@screens/booking/PaymentCallbackScreen';
import {WriteReviewScreen} from '@screens/booking/WriteReviewScreen';
import {TrackProviderScreen} from '@screens/booking/TrackProviderScreen';
import {ChatScreen} from '@screens/booking/ChatScreen';
import {InboxScreen} from '@screens/inbox/InboxScreen';
import {ProfileScreen} from '@screens/profile/ProfileScreen';
import {EditProfileScreen} from '@screens/profile/EditProfileScreen';
import {NotificationsScreen} from '@screens/notifications';
import {useNotificationStore} from '@store';
import {colors} from '@config/theme';

export type HomeStackParamList = {
  Home: undefined;
  ProviderList: {serviceId?: string};
  ProviderDetail: {providerId: string};
  BookingFlow: {
    providerId: string;
    serviceId?: string;
    serviceName?: string;
    price90?: number;
    price120?: number;
  };
  PaymentWebView: {
    bookingId: string;
    paymentIntentId: string;
    checkoutUrl: string;
  };
  PaymentCallback: {
    status?: string;
    payment_intent_id?: string;
    booking_id?: string;
  };
};

export type BookingsStackParamList = {
  BookingList: {tab?: 'active' | 'history'} | undefined;
  BookingDetail: {bookingId: string};
  TrackProvider: {bookingId: string};
  WriteReview: {bookingId: string; providerId: string};
  Chat: {bookingId: string; providerName?: string};
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  AddressList: undefined;
  AddAddress: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />
      <HomeStack.Screen
        name="ProviderList"
        component={ProviderListScreen}
        options={{title: 'Find Providers'}}
      />
      <HomeStack.Screen
        name="ProviderDetail"
        component={ProviderDetailScreen}
        options={{title: 'Provider'}}
      />
      <HomeStack.Screen
        name="BookingFlow"
        component={BookingFlowScreen}
        options={{title: 'Book Appointment'}}
      />
      <HomeStack.Screen
        name="PaymentWebView"
        component={PaymentWebViewScreen}
        options={{title: 'Complete Payment'}}
      />
      <HomeStack.Screen
        name="PaymentCallback"
        component={PaymentCallbackScreen}
        options={{headerShown: false}}
      />
    </HomeStack.Navigator>
  );
}

function BookingsStackNavigator() {
  return (
    <BookingsStack.Navigator>
      <BookingsStack.Screen
        name="BookingList"
        component={BookingListScreen}
        options={{title: 'My Bookings'}}
      />
      <BookingsStack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{title: 'Booking Details'}}
      />
      <BookingsStack.Screen
        name="TrackProvider"
        component={TrackProviderScreen}
        options={{title: 'Track Therapist'}}
      />
      <BookingsStack.Screen
        name="WriteReview"
        component={WriteReviewScreen}
        options={{title: 'Write Review'}}
      />
      <BookingsStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{title: 'Chat'}}
      />
    </BookingsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{headerShown: false}}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{title: 'Edit Profile'}}
      />
      <ProfileStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{headerShown: false}}
      />
    </ProfileStack.Navigator>
  );
}

// Inbox tab icon with badge
function InboxTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  const {unreadCount} = useNotificationStore();

  return (
    <View style={tabStyles.iconContainer}>
      <Icon
        name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
        size={size}
        color={color}
      />
      {unreadCount > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'BookingsTab':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'InboxTab':
              // Handled by custom component
              return <InboxTabIcon focused={focused} color={color} size={size} />;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
      })}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{tabBarLabel: 'Home'}}
        listeners={({navigation, route}) => ({
          tabPress: (e) => {
            // Get the current route name in the Home stack
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';

            // If not on Home screen, reset to Home when tab is pressed
            if (routeName !== 'Home') {
              e.preventDefault();
              navigation.navigate('HomeTab', {screen: 'Home'});
            }
          },
        })}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsStackNavigator}
        options={{tabBarLabel: 'Bookings'}}
        listeners={({navigation, route}) => ({
          tabPress: (e) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'BookingList';
            if (routeName !== 'BookingList') {
              e.preventDefault();
              navigation.navigate('BookingsTab', {screen: 'BookingList'});
            }
          },
        })}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxScreen}
        options={{tabBarLabel: 'Inbox'}}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{tabBarLabel: 'Profile'}}
        listeners={({navigation, route}) => ({
          tabPress: (e) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'Profile';
            if (routeName !== 'Profile') {
              e.preventDefault();
              navigation.navigate('ProfileTab', {screen: 'Profile'});
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
