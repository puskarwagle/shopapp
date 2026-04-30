import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, TextInput, ScrollView } from 'react-native';
import { Plus, Camera, Image as ImageIcon, X, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import useStore from '../store/useStore';

const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Milk', price: 2.5, stock: 20, image: 'https://images.unsplash.com/photo-1563636619-e9107da5a165?w=200&h=200&fit=crop' },
  { id: 'p2', name: 'Bread', price: 1.8, stock: 15, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop' },
];

export default function InventoryScreen() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '', image: null });
  const { isDarkMode, fontSizeScale, thumbnailScale } = useStore();

  const pickImage = async (useCamera = false) => {
    let result;
    if (useCamera) {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
    }

    if (!result.canceled) {
      setNewProduct({ ...newProduct, image: result.assets[0].uri });
    }
  };

  const handleAddProduct = () => {
    const product = {
      ...newProduct,
      id: Date.now().toString(),
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock),
      image: newProduct.image || 'https://via.placeholder.com/150/f1f5f9/64748b?text=Product'
    };
    setProducts([product, ...products]);
    setShowAddModal(false);
    setNewProduct({ name: '', price: '', stock: '', image: null });
  };

  const renderProduct = ({ item }) => (
    <View 
      className={`flex-1 m-2 rounded-2xl shadow-sm border overflow-hidden ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
      }`}
      style={{ transform: [{ scale: thumbnailScale }] }}
    >
      <Image source={{ uri: item.image }} className="w-full aspect-square" />
      <View className="p-3">
        <Text 
          className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} 
          style={{ fontSize: 14 * fontSizeScale }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View className="flex-row justify-between items-center mt-1">
          <Text className="text-blue-500 font-semibold" style={{ fontSize: 13 * fontSizeScale }}>Rs. {item.price.toFixed(2)}</Text>
          <Text className={isDarkMode ? 'text-slate-500 text-xs' : 'text-slate-400 text-xs'}>Stock: {item.stock}</Text>
        </View>
        <TouchableOpacity className="mt-2 items-end">
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
      />

      <TouchableOpacity 
        className="absolute bottom-40 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/80 justify-end">
          <View className={`rounded-t-3xl p-6 h-[85%] ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Add Product</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                onPress={() => pickImage(false)}
                className={`w-full aspect-square rounded-2xl border-2 border-dashed items-center justify-center mb-6 overflow-hidden ${
                  isDarkMode ? 'bg-black border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {newProduct.image ? (
                  <Image source={{ uri: newProduct.image }} className="w-full h-full" />
                ) : (
                  <View className="items-center">
                    <ImageIcon size={48} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                    <Text className="text-slate-400 mt-2">Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View className="flex-row gap-4 mb-6">
                <TouchableOpacity 
                  onPress={() => pickImage(true)}
                  className={`flex-1 flex-row p-4 rounded-xl items-center justify-center ${
                    isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                  }`}
                >
                  <Camera size={20} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                  <Text className={`font-bold ml-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => pickImage(false)}
                  className={`flex-1 flex-row p-4 rounded-xl items-center justify-center ${
                    isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                  }`}
                >
                  <ImageIcon size={20} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                  <Text className={`font-bold ml-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Gallery</Text>
                </TouchableOpacity>
              </View>

              <View className="space-y-4">
                <View className="mb-4">
                  <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Product Name</Text>
                  <TextInput
                    className={`p-4 rounded-xl border ${
                      isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    style={{ outlineStyle: 'none' }}
                    placeholder="e.g. Fresh Milk"
                    placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                    value={newProduct.name}
                    onChangeText={(t) => setNewProduct({...newProduct, name: t})}
                  />
                </View>

                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1">
                    <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Price (Rs.)</Text>
                    <TextInput
                      className={`p-4 rounded-xl border ${
                        isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                      style={{ outlineStyle: 'none' }}
                      placeholder="0"
                      placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                      keyboardType="numeric"
                      value={newProduct.price}
                      onChangeText={(t) => setNewProduct({...newProduct, price: t})}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Stock</Text>
                    <TextInput
                      className={`p-4 rounded-xl border ${
                        isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                      style={{ outlineStyle: 'none' }}
                      placeholder="0"
                      placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                      keyboardType="numeric"
                      value={newProduct.stock}
                      onChangeText={(t) => setNewProduct({...newProduct, stock: t})}
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={handleAddProduct}
                  className="bg-blue-600 p-5 rounded-2xl items-center shadow-lg mt-6"
                >
                  <Text className="text-white font-bold text-xl">Save Product</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
