import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { Minus, X, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useStore from '../store/useStore';

const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Milk', price: 2.5, stock: 20, image: 'https://images.unsplash.com/photo-1563636619-e9107da5a165?w=200&h=200&fit=crop' },
  { id: 'p2', name: 'Bread', price: 1.8, stock: 15, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop' },
  { id: 'p3', name: 'Eggs (12pc)', price: 4.5, stock: 10, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop' },
  { id: 'p4', name: 'Butter', price: 3.2, stock: 8, image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&h=200&fit=crop' },
];

export default function CheckoutScreen() {
  const { user, activeCustomer, setActiveCustomer, cart, addToCart, removeFromCart, clearCart, clearSession, addToHistory, isDarkMode, fontSizeScale, thumbnailScale } = useStore();
  const [showSummary, setShowSummary] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dueAmount, setDueAmount] = useState('0');

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);

  const getItemQuantity = (id) => {
    const item = cart.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  const handleFinishCheckout = () => {
    // Add to history
    addToHistory({
      customerName: activeCustomer.name,
      total: parseFloat(total),
      dueAmount: parseFloat(dueAmount) || 0,
      items: cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
      processedBy: user?.email || 'Unknown',
    });

    setShowSuccess(true);
    clearCart();
    setShowSummary(false);
    setDueAmount('0');
  };

  if (!activeCustomer) {
    return (
      <View className={`flex-1 items-center justify-center p-8 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
        <Text className={`text-center text-lg ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} style={{ fontSize: 18 * fontSizeScale }}>
          Please select a customer from the Customers tab first.
        </Text>
      </View>
    );
  }

  const renderProduct = ({ item }) => {
    const qty = getItemQuantity(item.id);
    return (
      <View 
        className={`flex-1 m-2 rounded-2xl shadow-sm overflow-hidden border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}
        style={{ transform: [{ scale: thumbnailScale }] }}
      >
        <TouchableOpacity activeOpacity={0.8} onPress={() => addToCart(item)}>
          <Image source={{ uri: item.image }} className="w-full aspect-square" />
          
          {/* Top left red minus overlay */}
          {qty > 0 && (
            <TouchableOpacity 
              onPress={() => removeFromCart(item.id)}
              className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 items-center justify-center border border-red-500 shadow-sm z-10"
            >
              <Minus size={18} color="#ef4444" />
            </TouchableOpacity>
          )}

          {/* Quantity Badge */}
          {qty > 0 && (
            <View className="absolute top-2 right-2 bg-blue-600 px-2 py-1 rounded-lg z-10">
              <Text 
                className="text-white font-bold" 
                style={{ fontSize: 12 * fontSizeScale }}
              >
                {qty}
              </Text>
            </View>
          )}

          {/* Bottom Text Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            className="absolute bottom-0 left-0 right-0 p-3 pt-8"
          >
            <View className="flex-row justify-between items-center">
              <Text 
                className="text-white font-bold flex-1 mr-1" 
                style={{ fontSize: 14 * fontSizeScale }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text 
                className="text-blue-300 font-bold"
                style={{ fontSize: 13 * fontSizeScale }}
              >
                Rs. {item.price.toFixed(2)}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };


  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      {/* Active Session Bar */}
      <View className={`border-b px-4 py-3 flex-row justify-between items-center ${
        isDarkMode ? 'bg-black border-slate-900' : 'bg-white border-slate-200'
      }`}>
        <View>
          <Text className={isDarkMode ? 'text-slate-600 text-xs' : 'text-slate-500 text-xs'} style={{ fontSize: 10 * fontSizeScale }}>Customer</Text>
          <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 16 * fontSizeScale }}>{activeCustomer.name}</Text>
        </View>
        <TouchableOpacity onPress={clearSession}>
          <X size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_PRODUCTS}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8, paddingBottom: 140 }}
      />

      {/* Floating Total Bar */}
      {total > 0 && (
        <View className={`absolute bottom-24 left-6 right-6 rounded-2xl p-4 flex-row justify-between items-center shadow-2xl ${
          isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'
        }`}>
          <View>
            <Text className={isDarkMode ? 'text-slate-500 text-xs uppercase font-bold tracking-widest' : 'text-slate-400 text-xs uppercase font-bold tracking-widest'} style={{ fontSize: 10 * fontSizeScale }}>Total</Text>
            <Text className={isDarkMode ? 'text-white text-2xl font-bold' : 'text-slate-900 text-2xl font-bold'} style={{ fontSize: 24 * fontSizeScale }}>Rs. {total}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowSummary(true)}
            className="bg-blue-600 px-6 py-3 rounded-xl flex-row items-center"
          >
            <Text className="text-white font-bold text-lg mr-2" style={{ fontSize: 18 * fontSizeScale }}>Checkout</Text>
            <CheckCircle2 size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Checkout Summary Modal */}
      <Modal visible={showSummary} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/80 justify-end">
          <View className={`rounded-t-3xl p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 24 * fontSizeScale }}>Summary</Text>
              <TouchableOpacity onPress={() => setShowSummary(false)}>
                <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <View className="space-y-4 mb-6">
              {cart.map(item => (
                <View key={item.id} className="flex-row justify-between mb-2">
                  <Text className={isDarkMode ? 'text-slate-400' : 'text-slate-600'} style={{ fontSize: 16 * fontSizeScale }}>
                    {item.name} x {item.quantity}
                  </Text>
                  <Text className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 16 * fontSizeScale }}>
                    Rs. {(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View className={`h-px my-3 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
              <View className="flex-row justify-between">
                <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 20 * fontSizeScale }}>Total</Text>
                <Text className="text-xl font-bold text-blue-500" style={{ fontSize: 20 * fontSizeScale }}>Rs. {total}</Text>
              </View>
            </View>

            <View className="mb-8">
              <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`} style={{ fontSize: 14 * fontSizeScale }}>Due Amount (if any)</Text>
              <TextInput
                className={`p-4 rounded-xl text-lg border ${
                  isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
                style={{ outlineStyle: 'none' }}
                keyboardType="numeric"
                value={dueAmount}
                onChangeText={setDueAmount}
              />
            </View>

            <TouchableOpacity 
              onPress={handleFinishCheckout}
              className="bg-blue-600 p-5 rounded-2xl items-center shadow-lg"
            >
              <Text className="text-white font-bold text-xl" style={{ fontSize: 20 * fontSizeScale }}>Confirm Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccess} animationType="fade" transparent={true}>
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className={`w-full max-w-sm rounded-3xl p-8 items-center shadow-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <CheckCircle2 size={48} color="#22c55e" />
            </View>
            <Text className={`text-2xl font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Checkout Complete!
            </Text>
            <Text className={`text-center mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Order has been processed successfully.
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setShowSuccess(false);
                setActiveCustomer(null);
              }}
              className="bg-blue-600 w-full p-4 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-lg">Back to Store</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
