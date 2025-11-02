import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Auth screens
import PhoneScreen from '../screens/auth/PhoneScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import ProfileCreationScreen from '../screens/auth/ProfileCreationScreen';

// Main screens
import MapScreen from '../screens/map/MapScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import HistoryScreen from '../screens/profile/HistoryScreen';
import FAQScreen from '../screens/faq/FAQScreen';

// Detail screens
import TrailerDetailScreen from '../screens/trailer/TrailerDetailScreen';
import ReservationScreen from '../screens/reservation/ReservationScreen';
import PaymentScreen from '../screens/payment/PaymentScreen';
import ActiveRentalScreen from '../screens/rental/ActiveRentalScreen';
import CheckInScreen from '../screens/rental/CheckInScreen';
import CheckOutScreen from '../screens/rental/CheckOutScreen';

// Loading screen
import LoadingScreen from '../components/LoadingScreen';

import { RootStackParamList, MainTabParamList } from '@shared/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Map':
              iconName = 'map';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            case 'History':
              iconName = 'history';
              break;
            case 'FAQ':
              iconName = 'help';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Mapa' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Historie' }}
      />
      <Tab.Screen
        name="FAQ"
        component={FAQScreen}
        options={{ title: 'FAQ' }}
      />
    </Tab.Navigator>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="PhoneAuth" component={PhoneScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="ProfileCreation" component={ProfileCreationScreen} />
    </Stack.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="TrailerDetail"
            component={TrailerDetailScreen}
            options={{
              headerShown: true,
              title: 'Detail přívěsu',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="Reservation"
            component={ReservationScreen}
            options={{
              headerShown: true,
              title: 'Rezervace',
            }}
          />
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{
              headerShown: true,
              title: 'Platba',
            }}
          />
          <Stack.Screen
            name="ActiveRental"
            component={ActiveRentalScreen}
            options={{
              headerShown: true,
              title: 'Aktivní pronájem',
            }}
          />
          <Stack.Screen
            name="CheckIn"
            component={CheckInScreen}
            options={{
              headerShown: true,
              title: 'Převzetí',
            }}
          />
          <Stack.Screen
            name="CheckOut"
            component={CheckOutScreen}
            options={{
              headerShown: true,
              title: 'Vrácení',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;