import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Minus, X, CheckCircle2, ChevronLeft, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import useStore, { uid } from '../store/useStore';
import Inspect from '../components/Inspect';

export default function CheckoutScreen() {
  const { user, activeCustomer, setActiveCustomer, cart, addToCart, removeFromCart, clearCart, addToHistory, pushTransaction, addToCustomerDue, isDarkMode, fontSizeScale, thumbnailScale, products } = useStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [showSummary, setShowSummary] = useState(false);
  const [dueAmount, setDueAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const amountRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus?.(), 100);
    return () => clearTimeout(t);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const dueValue = parseFloat(dueAmount) || 0;
  const effectiveTotal = (cartTotal > 0 ? cartTotal : dueValue).toFixed(2);
  const canCheckout = cart.length > 0 || dueValue > 0;

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const handleSearchSubmit = () => {
    if (filteredProducts.length > 0) {
      addToCart(filteredProducts[0]);
      setSearchQuery('');
    }
  };

  const getItemQuantity = (id) => {
    const item = cart.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  const handleFinishCheckout = () => {
    if (!activeCustomer || !canCheckout) return;
    const customerId = activeCustomer.id;
    const customerName = activeCustomer.name;
    const now = new Date().toISOString();
    const order = {
      id: uid(),
      customerId,
      customerName,
      total: parseFloat(effectiveTotal) || 0,
      dueAmount: dueValue,
      items: cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
      processedBy: user?.email || 'Unknown',
      timestamp: now,
    };
    addToHistory(order);
    pushTransaction(order);
    if (dueValue > 0) addToCustomerDue(customerId, dueValue);

    setShowSummary(false);
    setDueAmount('');
    setSearchQuery('');
    navigation.navigate('Main');
    setActiveCustomer(null);
    clearCart();
  };

  if (!activeCustomer) {
    return (
      <View className={`flex-1 items-center justify-center p-6 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
        <Text className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 18 * fontSizeScale }}>
          No customer selected
        </Text>
        <Text className={`text-center mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontSize: 14 * fontSizeScale }}>
          Pick a customer from the store to start a checkout.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Main')}
          className="bg-blue-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold text-lg" style={{ fontSize: 18 * fontSizeScale }}>Back to Store</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderProduct = ({ item }) => {
    const qty = getItemQuantity(item.id);
    return (
      <Inspect id="checkout-product-card">
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
            <Inspect id="checkout-remove-btn">
            <TouchableOpacity 
              onPress={() => removeFromCart(item.id)}
              className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 items-center justify-center border border-red-500 shadow-sm z-10"
            >
              <Minus size={18} color="#ef4444" />
            </TouchableOpacity>
            </Inspect>
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
      </Inspect>
    );
  };


  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      {/* Active Session Bar */}
      <View className={`border-b px-4 pb-3 flex-row items-center gap-3 ${
        isDarkMode ? 'bg-black border-slate-900' : 'bg-white border-slate-200'
      }`} style={{ paddingTop: insets.top + 12 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`w-12 h-12 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}
        >
          <ChevronLeft size={24} color={isDarkMode ? 'white' : '#0f172a'} />
        </TouchableOpacity>
        <Inspect id="checkout-customer-card">
        <TouchableOpacity
          onPress={() => navigation.navigate('CustomerProfile', { customerId: activeCustomer.id, customerName: activeCustomer.name })}
          className="flex-1 flex-row items-center justify-end gap-2"
        >
          <Image
            source={{ uri: activeCustomer.image || 'https://via.placeholder.com/150/f1f5f9/64748b?text=' + encodeURIComponent(activeCustomer.name.charAt(0).toUpperCase()) }}
            className="w-10 h-10 rounded-full"
          />
          <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 16 * fontSizeScale }}>{activeCustomer.name}</Text>
        </TouchableOpacity>
        </Inspect>
      </View>

      <View className={`px-4 pt-3 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
        <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`} style={{ fontSize: 14 * fontSizeScale }}>Amount Due / Total (Rs.)</Text>
        <View className={`flex-row items-center rounded-xl px-4 border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <Text className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontSize: 18 * fontSizeScale }}>Rs.</Text>
          <TextInput
            ref={amountRef}
            autoFocus={true}
            className={`flex-1 p-3 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
            style={{ fontSize: 20 * fontSizeScale, outlineStyle: 'none' }}
            placeholder="0"
            placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
            keyboardType="numeric"
            returnKeyType="next"
            value={dueAmount}
            onChangeText={setDueAmount}
            onSubmitEditing={() => searchRef.current?.focus?.()}
          />
          {dueAmount.length > 0 && (
            <TouchableOpacity onPress={() => setDueAmount('')}>
              <X size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className={`px-4 pt-3 pb-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
        <View className={`flex-row items-center rounded-xl px-3 py-2.5 border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          <TextInput
            ref={searchRef}
            className={`flex-1 ml-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
            style={{ fontSize: 14 * fontSizeScale, outlineStyle: 'none' }}
            placeholder="Search products..."
            placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View className="items-center pt-24">
            <Text className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: 16 * fontSizeScale }}>
              {searchQuery ? 'No products match your search.' : 'No products yet.'}
            </Text>
          </View>
        }
      />

      {/* Floating Total Bar */}
      {canCheckout && (
        <View className={`absolute bottom-24 left-6 right-6 rounded-2xl p-4 flex-row justify-between items-center shadow-2xl ${
          isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'
        }`}>
          <View>
            <Text className={isDarkMode ? 'text-slate-500 text-xs uppercase font-bold tracking-widest' : 'text-slate-400 text-xs uppercase font-bold tracking-widest'} style={{ fontSize: 10 * fontSizeScale }}>Total</Text>
            <Text className={isDarkMode ? 'text-white text-2xl font-bold' : 'text-slate-900 text-2xl font-bold'} style={{ fontSize: 24 * fontSizeScale }}>Rs. {effectiveTotal}</Text>
          </View>
          <Inspect id="checkout-confirm-btn">
          <TouchableOpacity 
            onPress={() => setShowSummary(true)}
            className="bg-blue-600 px-6 py-3 rounded-xl flex-row items-center"
          >
            <Text className="text-white font-bold text-lg mr-2" style={{ fontSize: 18 * fontSizeScale }}>Checkout</Text>
            <CheckCircle2 size={20} color="white" />
          </TouchableOpacity>
          </Inspect>
        </View>
      )}

      {/* Checkout Summary Modal */}
      <Modal visible={showSummary} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/80 justify-end">
          <Inspect id="checkout-summary-modal">
          <View className={`rounded-t-3xl p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingBottom: insets.bottom + 24 }}>
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
                <Text className="text-xl font-bold text-blue-500" style={{ fontSize: 20 * fontSizeScale }}>Rs. {effectiveTotal}</Text>
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
                placeholder="0"
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
          </Inspect>
        </View>
      </Modal>
    </View>
  );
}
