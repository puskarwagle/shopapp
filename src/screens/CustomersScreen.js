import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { Search, UserPlus } from 'lucide-react-native';
import useStore from '../store/useStore';
import { useNavigation } from '@react-navigation/native';

const MOCK_CUSTOMERS = [
  { id: 'other', name: 'Other / Walk-in', image: 'https://via.placeholder.com/150/f1f5f9/64748b?text=Other' },
  { id: '1', name: 'John Doe', image: 'https://i.pravatar.cc/150?u=1', due: 50 },
  { id: '2', name: 'Jane Smith', image: 'https://i.pravatar.cc/150?u=2', due: 0 },
  { id: '3', name: 'Bob Wilson', image: 'https://i.pravatar.cc/150?u=3', due: 120 },
  { id: '4', name: 'Alice Brown', image: 'https://i.pravatar.cc/150?u=4', due: 0 },
  { id: '5', name: 'Charlie Davis', image: 'https://i.pravatar.cc/150?u=5', due: 15 },
];

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const { setActiveCustomer, isDarkMode, fontSizeScale, thumbnailScale } = useStore();
  const navigation = useNavigation();

  const filteredCustomers = MOCK_CUSTOMERS.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCustomer = (customer) => {
    setActiveCustomer(customer);
    navigation.navigate('Checkout');
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
          placeholder="Filter by name..."
          placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
      
      <TouchableOpacity 
        className="absolute bottom-40 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => {/* Add customer logic */}}
      >
        <UserPlus size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
