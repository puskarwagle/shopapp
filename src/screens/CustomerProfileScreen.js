import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, CreditCard, Camera, Image as ImageIcon, Pencil, Trash2, Check, Wallet } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import useStore from '../store/useStore';

export default function CustomerProfileScreen() {
  const { customers, history, updateCustomer, deleteCustomer, isDarkMode, fontSizeScale } = useStore();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { customerId, customerName } = route.params || {};
  const customer = customers.find(c => c.id === customerId);
  const name = customer?.name || customerName || 'Customer';
  const isRealCustomer = !!customer;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDue, setEditDue] = useState(customer?.due != null ? String(customer.due) : '');
  const [editImage, setEditImage] = useState(customer?.image || null);

  const customerHistory = history.filter(h => h.customerId === customerId);
  const totalSpent = customerHistory.reduce((sum, h) => sum + (h.total || 0), 0);
  const due = customer?.due || customerHistory.reduce((sum, h) => sum + (h.dueAmount || 0), 0);

  const startEditing = () => {
    setEditName(customer?.name || customerName || '');
    setEditDue(customer?.due != null ? String(customer.due) : '');
    setEditImage(customer?.image || null);
    setEditing(true);
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
      setEditImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    const n = editName.trim();
    if (!n) return;
    updateCustomer(customerId, {
      name: n,
      due: parseFloat(editDue) || 0,
      image: editImage || customer?.image || 'https://via.placeholder.com/150/f1f5f9/64748b?text=' + encodeURIComponent(n.charAt(0).toUpperCase()),
    });
    setEditing(false);
  };

  const doDelete = () => {
    deleteCustomer(customerId);
    navigation.goBack();
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${name}"? This cannot be undone.`)) doDelete();
      return;
    }
    Alert.alert('Delete Customer', `Remove "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const renderHistoryItem = ({ item }) => (
    <View
      className={`m-4 p-5 rounded-3xl border shadow-sm ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Calendar size={14} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            <Text className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} style={{ fontSize: 12 * fontSizeScale }}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <CreditCard size={14} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            <Text className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} style={{ fontSize: 11 * fontSizeScale }}>
              Processed by: {item.processedBy}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-blue-500 font-bold text-xl" style={{ fontSize: 20 * fontSizeScale }}>
            Rs. {item.total.toFixed(2)}
          </Text>
          {item.dueAmount > 0 && (
            <Text className="text-red-500 text-xs font-medium" style={{ fontSize: 10 * fontSizeScale }}>
              Due: Rs. {item.dueAmount.toFixed(2)}
            </Text>
          )}
        </View>
      </View>

      <View className={`h-px mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`} />

      <View className="space-y-2">
        {item.items.map((prod, idx) => (
          <View key={idx} className="flex-row justify-between items-center">
            <Text className={isDarkMode ? 'text-slate-400' : 'text-slate-600'} style={{ fontSize: 14 * fontSizeScale }}>
              {prod.name} x {prod.quantity}
            </Text>
            <Text className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} style={{ fontSize: 13 * fontSizeScale }}>
              Rs. {(prod.price * prod.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const cardClass = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      <View
        className={`px-6 pb-6 flex-row items-center justify-between ${
          isDarkMode ? 'bg-black' : 'bg-white'
        }`}
        style={{ paddingTop: insets.top + 12 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`w-12 h-12 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}
        >
          <ChevronLeft size={24} color={isDarkMode ? 'white' : '#0f172a'} />
        </TouchableOpacity>
        <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 20 * fontSizeScale }}>
          Customer Profile
        </Text>
        {isRealCustomer ? (
          <TouchableOpacity
            onPress={editing ? handleSave : startEditing}
            className={`w-12 h-12 items-center justify-center rounded-2xl ${editing ? 'bg-blue-600' : (isDarkMode ? 'bg-slate-900' : 'bg-slate-50')}`}
          >
            {editing ? (
              <Check size={24} color="white" />
            ) : (
              <Pencil size={22} color={isDarkMode ? '#cbd5e1' : '#0f172a'} />
            )}
          </TouchableOpacity>
        ) : (
          <View className="w-12 h-12" />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {editing ? (
          <View className={`mx-4 mt-4 p-6 rounded-3xl border shadow-sm ${cardClass}`}>
            <TouchableOpacity
              onPress={() => pickImage(false)}
              className="self-center w-24 h-24 rounded-full border-2 border-dashed items-center justify-center overflow-hidden mb-4 mt-2"
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
              className={`p-3 rounded-xl border mb-4 ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              style={{ outlineStyle: 'none' }}
              value={editName}
              onChangeText={setEditName}
            />

            <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Due (Rs.)</Text>
            <TextInput
              className={`p-3 rounded-xl border mb-6 ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              style={{ outlineStyle: 'none' }}
              keyboardType="numeric"
              value={editDue}
              onChangeText={setEditDue}
            />

            <TouchableOpacity
              onPress={handleSave}
              className="bg-blue-600 py-4 rounded-2xl items-center shadow-lg mb-3"
            >
              <Text className="text-white font-bold text-lg" style={{ fontSize: 18 * fontSizeScale }}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={confirmDelete}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border active:opacity-70"
              style={{ borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <Trash2 size={18} color="#ef4444" />
              <Text className="font-bold text-red-500" style={{ fontSize: 16 * fontSizeScale }}>Delete Customer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className={`mx-4 mt-4 px-6 py-6 rounded-3xl border shadow-sm ${cardClass}`}>
              <View className="flex-row items-center">
                <Image
                  source={{ uri: customer?.image || 'https://via.placeholder.com/150/f1f5f9/64748b?text=' + encodeURIComponent(name.charAt(0).toUpperCase()) }}
                  className="w-20 h-20 rounded-full"
                />
                <View className="flex-1 ml-4 justify-center">
                  <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 22 * fontSizeScale }} numberOfLines={1}>
                    {name}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-1">
                    <Wallet size={14} color={due > 0 ? '#ef4444' : (isDarkMode ? '#64748b' : '#94a3b8')} />
                    <Text className={`${due > 0 ? 'text-red-500 font-medium' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`} style={{ fontSize: 14 * fontSizeScale }}>
                      Due: Rs. {Number(due).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              <View className={`mt-6 pt-5 flex-row gap-10 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <View>
                  <Text className={`uppercase font-bold tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} style={{ fontSize: 10 * fontSizeScale }}>
                    Transactions
                  </Text>
                  <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 20 * fontSizeScale }}>
                    {customerHistory.length}
                  </Text>
                </View>
                <View>
                  <Text className={`uppercase font-bold tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} style={{ fontSize: 10 * fontSizeScale }}>
                    Total Spent
                  </Text>
                  <Text className="font-bold text-blue-500" style={{ fontSize: 20 * fontSizeScale }}>
                    Rs. {totalSpent.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {customerHistory.map(item => renderHistoryItem({ item }))}
          </>
        )}
      </ScrollView>
    </View>
  );
}