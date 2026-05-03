import React, { useEffect, useState } from 'react';
import "./global.css";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Pressable, StyleSheet } from 'react-native';
import { ShoppingCart, Users, Package, Menu, X } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import InventoryScreen from './src/screens/InventoryScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LoginScreen from './src/screens/LoginScreen';
import useStore from './src/store/useStore';
import SettingsMenu from './src/components/SettingsMenu';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { user, isDarkMode } = useStore();
  const isAdmin = user?.role === 'admin';
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
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
            height: 70,
            paddingBottom: 12,
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
          component={CustomersScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        
        <Tab.Screen
          name="Menu"
          component={View} // Dummy component
          options={{
            tabBarButton: () => (
              <View className="flex-1 items-center justify-center">
                <Pressable
                  onPress={() => setIsMenuOpen(!isMenuOpen)}
                  className={`w-14 h-14 rounded-full items-center justify-center shadow-lg -mt-8 ${
                    isMenuOpen ? (isDarkMode ? 'bg-slate-800' : 'bg-slate-900') : 'bg-blue-600'
                  }`}
                  style={styles.menuButton}
                >
                  {isMenuOpen ? (
                    <X color="white" size={30} />
                  ) : (
                    <Menu color="white" size={30} />
                  )}
                </Pressable>
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{
            tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          }}
        />
        
        {isAdmin && (
          <Tab.Screen
            name="Inventory"
            component={InventoryScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
            }}
          />
        )}
      </Tab.Navigator>
      
      <SettingsMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    elevation: 8,
    zIndex: 1001,
  }
});

export default function App() {
  const { user, isDarkMode } = useStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="History" component={HistoryScreen} options={{ animation: 'slide_from_bottom' }} />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
