import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, UserPlus, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import useStore from '../store/useStore';
import { useNavigation } from '@react-navigation/native';

const WALK_IN = { id: 'other', name: 'Other / Walk-in', image: 'https://via.placeholder.com/150/f1f5f9/64748b?text=Other' };

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newImage, setNewImage] = useState(null);
  const { customers, addCustomer, setActiveCustomer, isDarkMode, fontSizeScale, thumbnailScale } = useStore();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const displayList = search.trim() === '' ? [WALK_IN, ...filteredCustomers] : filteredCustomers;

  const handleSelectCustomer = (customer) => {
    setActiveCustomer(customer);
    navigation.navigate('Checkout');
  };

  const pickImage = async (useCamera = false) => {
    let result;
    if (useCamera) {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    }
    if (!result.canceled) {
      setNewImage(result.assets[0].uri);
    }
  };

  const handleAddCustomer = () => {
    const name = newName.trim();
    if (!name) return;
    addCustomer({
      name,
      due: parseFloat(newDue) || 0,
      image: newImage || 'https://via.placeholder.com/150/f1f5f9/64748b?text=' + encodeURIComponent(name.charAt(0).toUpperCase()),
    });
    setNewName('');
    setNewDue('');
    setNewImage(null);
    setShowAddModal(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      className={`flex-1 m-2 rounded-2xl shadow-sm border overflow-hidden ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
      }`}
      onPress={() => handleSelectCustomer(item)}
      style={{ transform: [{ scale: thumbnailScale }] }}
    >
      <Image
        source={{ uri: item.image }}
        className="w-full aspect-square"
      />
      <View className="p-3 flex-row justify-between items-center">
        <Text
          className={`font-bold flex-1 mr-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
          style={{ fontSize: 14 * fontSizeScale }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.due > 0 && (
          <Text
            className="text-red-500 font-bold"
            style={{ fontSize: 12 * fontSizeScale }}
          >
            Rs. {item.due}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className={`flex-1 p-4 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      <View className={`flex-row items-center border rounded-2xl px-4 py-2 mb-4 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <Search size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        <TextInput
          className={`flex-1 ml-3 text-base ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
          style={{ outlineStyle: 'none' }}
          placeholder="Filter by name..."
          placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={displayList}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        className="absolute bottom-40 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowAddModal(true)}
      >
        <UserPlus size={28} color="white" />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/80 justify-end">
          <View className={`rounded-t-3xl p-6 max-h-[90%] ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>New Customer</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => pickImage(false)}
              className={`w-full aspect-square rounded-2xl border-2 border-dashed items-center justify-center mb-4 overflow-hidden ${
                isDarkMode ? 'bg-black border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {newImage ? (
                <Image source={{ uri: newImage }} className="w-full h-full" />
              ) : (
                <View className="items-center">
                  <Camera size={48} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                  <Text className={`text-sm mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <View className="flex-row gap-3 mb-5">
              <TouchableOpacity
                onPress={() => pickImage(true)}
                className={`flex-1 flex-row p-3 rounded-xl items-center justify-center ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                }`}
              >
                <Camera size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                <Text className={`font-bold ml-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pickImage(false)}
                className={`flex-1 flex-row p-3 rounded-xl items-center justify-center ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                }`}
              >
                <ImageIcon size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                <Text className={`font-bold ml-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Name</Text>
            <TextInput
              className={`p-4 rounded-xl border mb-4 ${
                isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
              style={{ outlineStyle: 'none' }}
              placeholder="e.g. Mike Smith"
              placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
              value={newName}
              onChangeText={setNewName}
            />

            <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Due (Rs., if any)</Text>
            <TextInput
              className={`p-4 rounded-xl border mb-8 ${
                isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
              style={{ outlineStyle: 'none' }}
              placeholder="0"
              placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
              keyboardType="numeric"
              value={newDue}
              onChangeText={setNewDue}
            />

            <TouchableOpacity
              onPress={handleAddCustomer}
              className="bg-blue-600 p-5 rounded-2xl items-center shadow-lg"
            >
              <Text className="text-white font-bold text-xl">Add Customer</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}