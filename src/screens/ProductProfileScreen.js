import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import useStore from '../store/useStore';
import Inspect from '../components/Inspect';

export default function ProductProfileScreen() {
  const { products, updateProduct, deleteProduct, isDarkMode, fontSizeScale } = useStore();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { productId } = route.params || {};
  const product = products.find(p => p.id === productId);

  const [editName, setEditName] = useState(product?.name || '');
  const [editPrice, setEditPrice] = useState(product?.price != null ? String(product.price) : '');
  const [editStock, setEditStock] = useState(product?.stock != null ? String(product.stock) : '');
  const [editImage, setEditImage] = useState(product?.image || null);

  useEffect(() => {
    setEditName(product?.name || '');
    setEditPrice(product?.price != null ? String(product.price) : '');
    setEditStock(product?.stock != null ? String(product.stock) : '');
    setEditImage(product?.image || null);
  }, [productId]);

  if (!product) {
    return (
      <View className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
        <Text className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Product not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-blue-600 px-6 py-3 rounded-2xl mt-4">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickImage = async (useCamera = false) => {
    let result;
    if (useCamera) {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    }
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setEditImage(uri);
      updateProduct(productId, { image: uri });
    }
  };

  const handleNameDone = () => {
    const n = editName.trim();
    if (n && n !== product.name) updateProduct(productId, { name: n });
    else setEditName(product.name || '');
  };

  const handlePriceDone = () => {
    const v = parseFloat(editPrice) || 0;
    if (v !== Number(product.price)) updateProduct(productId, { price: v });
    setEditPrice(String(v));
  };

  const handleStockDone = () => {
    const v = parseInt(editStock) || 0;
    if (v !== Number(product.stock)) updateProduct(productId, { stock: v });
    setEditStock(String(v));
  };

  const doDelete = () => {
    deleteProduct(productId);
    navigation.goBack();
  };

  const confirmDelete = () => {
    const msg = `Delete "${product.name}"? This removes it from inventory.`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
      return;
    }
    Alert.alert('Delete Product', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const cardClass = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const inputClass = isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800';
  const stockValue = (parseFloat(editPrice) || 0) * (parseInt(editStock) || 0);

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      <View
        className={`px-6 pb-6 flex-row items-center justify-between ${
          isDarkMode ? 'bg-black' : 'bg-white'
        }`}
        style={{ paddingTop: insets.top + 12 }}
      >
        <Inspect id="product-back-btn">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className={`w-12 h-12 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}
          >
            <ChevronLeft size={24} color={isDarkMode ? 'white' : '#0f172a'} />
          </TouchableOpacity>
        </Inspect>
        <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 20 * fontSizeScale }}>
          Product
        </Text>
        <View className="w-12 h-12" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Inspect id="product-edit-form">
          <View className={`mx-4 mt-4 p-6 rounded-3xl border shadow-sm ${cardClass}`}>
            <TouchableOpacity
              onPress={() => pickImage(false)}
              className="self-center w-24 h-24 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden mb-4 mt-2"
              style={{ borderColor: isDarkMode ? '#334155' : '#cbd5e1' }}
            >
              {editImage ? (
                <Image source={{ uri: editImage }} className="w-full h-full" />
              ) : (
                <Camera size={32} color={isDarkMode ? '#64748b' : '#94a3b8'} />
              )}
            </TouchableOpacity>

            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => pickImage(true)}
                className={`flex-1 flex-row p-3 rounded-xl items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}
              >
                <Camera size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                <Text className={`font-bold ml-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pickImage(false)}
                className={`flex-1 flex-row p-3 rounded-xl items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}
              >
                <ImageIcon size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                <Text className={`font-bold ml-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Name</Text>
            <TextInput
              className={`p-3 rounded-xl border mb-4 ${inputClass}`}
              style={{ outlineStyle: 'none' }}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleNameDone}
              onSubmitEditing={handleNameDone}
              returnKeyType="done"
            />

            <View className="flex-row gap-3 mb-2">
              <View className="flex-1">
                <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Price (Rs.)</Text>
                <TextInput
                  className={`p-3 rounded-xl border ${inputClass}`}
                  style={{ outlineStyle: 'none' }}
                  keyboardType="numeric"
                  value={editPrice}
                  onChangeText={setEditPrice}
                  onBlur={handlePriceDone}
                  onSubmitEditing={handlePriceDone}
                  returnKeyType="done"
                />
              </View>
              <View className="flex-1">
                <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Stock</Text>
                <TextInput
                  className={`p-3 rounded-xl border ${inputClass}`}
                  style={{ outlineStyle: 'none' }}
                  keyboardType="numeric"
                  value={editStock}
                  onChangeText={setEditStock}
                  onBlur={handleStockDone}
                  onSubmitEditing={handleStockDone}
                  returnKeyType="done"
                />
              </View>
            </View>

            <Text className={`mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} style={{ fontSize: 13 * fontSizeScale }}>
              Stock value: Rs. {stockValue.toFixed(2)}
            </Text>

            <Inspect id="product-delete-btn">
              <TouchableOpacity
                onPress={confirmDelete}
                className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border active:opacity-70"
                style={{ borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <Trash2 size={18} color="#ef4444" />
                <Text className="font-bold text-red-500" style={{ fontSize: 16 * fontSizeScale }}>Delete Product</Text>
              </TouchableOpacity>
            </Inspect>
          </View>
        </Inspect>
      </ScrollView>
    </View>
  );
}
