import React, { useEffect, useState } from 'react';
import "./global.css";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Package, History, Settings } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import InventoryScreen from './src/screens/InventoryScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import JournalCheckoutScreen from './src/screens/JournalCheckoutScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import ConnectShopScreen from './src/screens/ConnectShopScreen';
import useStore from './src/store/useStore';
import { supabase, isSupabaseConfigured } from './src/lib/supabase';
import { ensureProfile, deriveRole, configureGoogleSignIn } from './src/lib/auth';
import withInspect from './src/components/withInspect';
import InspectFab from './src/components/InspectFab';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const InspectableCustomers = withInspect(CustomersScreen);
const InspectableInventory = withInspect(InventoryScreen);
const InspectableHistory = withInspect(HistoryScreen);
const InspectableSettings = withInspect(SettingsScreen);
const InspectableCheckout = withInspect(CheckoutScreen);
const InspectableJournalCheckout = withInspect(JournalCheckoutScreen);
const InspectableCustomerProfile = withInspect(CustomerProfileScreen);

function MainTabs() {
  const { user, isDarkMode } = useStore();
  const isAdmin = user?.role === 'admin';
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: isDarkMode ? '#64748b' : '#94a3b8',
        headerStyle: {
          backgroundColor: isDarkMode ? '#020617' : '#fff',
          elevation: 0,
          boxShadow: 'none',
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
        },
        headerTintColor: isDarkMode ? '#fff' : '#0f172a',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#020617' : '#fff',
          borderTopWidth: 1.5,
          borderTopColor: isDarkMode ? '#1e293b' : '#f1f5f9',
          height: 70 + insets.bottom,
          paddingBottom: Math.max(12, insets.bottom),
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          boxShadow: 'none',
        },
      }}
    >
      <Tab.Screen
        name="Customers"
        component={InspectableCustomers}
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />

      {isAdmin && (
        <Tab.Screen
          name="Inventory"
          component={InspectableInventory}
          options={{
            tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
          }}
        />
      )}

      <Tab.Screen
        name="History"
        component={InspectableHistory}
        options={{
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Settings"
        component={InspectableSettings}
        options={{
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, shopId, isDarkMode, setUser, setShopId, pullAll } = useStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setBooting(false);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setBooting(false);
      const u = session?.user;
      if (!u) {
        setUser(null);
        setShopId(null, null);
        return;
      }
      ensureProfile(u.id, u.email).then((prof) => {
        setUser({ id: u.id, email: u.email, role: prof?.role || deriveRole(u.email) });
        setShopId(prof?.shop_id || null, null);
      });
    });
    return () => subscription.unsubscribe();
  }, [setUser, setShopId]);

  useEffect(() => {
    if (user?.email && shopId && shopId !== 'local') pullAll();
  }, [user?.email, shopId]);

  if (booting) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : !shopId ? (
              <Stack.Screen name="Connect" component={ConnectShopScreen} />
            ) : (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="Checkout" component={InspectableCheckout} options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="JournalCheckout" component={InspectableJournalCheckout} options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="CustomerProfile" component={InspectableCustomerProfile} options={{ animation: 'slide_from_bottom' }} />
              </>
            )}
          </Stack.Navigator>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        </NavigationContainer>
        <InspectFab />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}