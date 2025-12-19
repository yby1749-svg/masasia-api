import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
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
import {InboxScreen} from '@screens/inbox/InboxScreen';
import {ProfileScreen} from '@screens/profile/ProfileScreen';
import {EditProfileScreen} from '@screens/profile/EditProfileScreen';
import {NotificationsScreen} from '@screens/notifications';
import {colors} from '@config/theme';

export type HomeStackParamList = {
  Home: undefined;
  ProviderList: {serviceId?: string};
  ProviderDetail: {providerId: string};
  BookingFlow: {providerId: string};
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
  BookingList: undefined;
  BookingDetail: {bookingId: string};
  TrackProvider: {bookingId: string};
  WriteReview: {bookingId: string; providerId: string};
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
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
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
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsStackNavigator}
        options={{tabBarLabel: 'Bookings'}}
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
      />
    </Tab.Navigator>
  );
}
