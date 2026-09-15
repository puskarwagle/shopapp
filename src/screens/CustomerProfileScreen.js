import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, CreditCard, Trash2, Check, Wallet, Banknote, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import useStore from '../store/useStore';
import Inspect from '../components/Inspect';

export default function CustomerProfileScreen() {
  const { user, customers, history, updateCustomer, updateHistory, deleteCustomer, restoreCustomer, receivePayment, activeCustomer, setActiveCustomer, clearCart, isDarkMode, fontSizeScale } = useStore();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { customerId, customerName } = route.params || {};
  const customer = customers.find(c => c.id === customerId);
  const name = customer?.name || customerName || 'Customer';
  const isRealCustomer = !!customer;
  const isArchived = !!customer?.is_deleted;

  const [editingField, setEditingField] = useState(null);
  const [inlineName, setInlineName] = useState(name);
  const [inlineDue, setInlineDue] = useState(customer?.due != null ? String(customer.due) : '');
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editHistoryTotal, setEditHistoryTotal] = useState('');
  const [editHistoryDue, setEditHistoryDue] = useState('');
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  const customerHistory = history.filter(h => h.customerId === customerId);
  const totalSpent = customerHistory.reduce((sum, h) => sum + (h.total || 0), 0);
  const due = customer ? (Number(customer.due) || 0) : customerHistory.reduce((sum, h) => sum + (h.dueAmount || 0), 0);
  const isPayment = (item) => (Number(item.dueAmount) || 0) < 0;

  const handleReceivePayment = () => {
    const value = parseFloat(payAmount) || 0;
    if (value <= 0) return;
    receivePayment(customerId, name, value, user?.email);
    setPayAmount('');
    setShowPay(false);
  };

  const doDelete = () => {
    deleteCustomer(customerId);
    if (activeCustomer?.id === customerId) {
      setActiveCustomer(null);
      clearCart();
      navigation.navigate('Main');
    } else {
      navigation.goBack();
    }
  };

  const handleRestore = () => {
    restoreCustomer(customerId);
  };

  const saveInlineName = () => {
    const n = inlineName.trim();
    if (!n || n === name) { setEditingField(null); return; }
    updateCustomer(customerId, {
      name: n,
      due: Number(customer?.due) || 0,
      image: customer?.image || null,
    });
    setEditingField(null);
  };

  const saveInlineDue = () => {
    const d = parseFloat(inlineDue) || 0;
    if (d === (Number(customer?.due) || 0)) { setEditingField(null); return; }
    updateCustomer(customerId, {
      name: customer?.name || name,
      due: d,
      image: customer?.image || null,
    });
    setEditingField(null);
  };

  const handleImagePickDirect = async (useCamera = false) => {
    let result;
    if (useCamera) {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    }
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      updateCustomer(customerId, {
        name: customer?.name || name,
        due: Number(customer?.due) || 0,
        image: uri,
      });
    }
  };

  const confirmImagePick = () => {
    if (Platform.OS === 'web') {
      handleImagePickDirect(false);
      return;
    }
    Alert.alert('Change Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => handleImagePickDirect(true) },
      { text: 'Gallery', onPress: () => handleImagePickDirect(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const startEditHistory = (item) => {
    setEditingHistoryId(item.id);
    if (isPayment(item)) {
      setEditHistoryTotal(String((-item.dueAmount) || 0));
    } else {
      setEditHistoryTotal(String(item.total || 0));
      setEditHistoryDue(String(item.dueAmount || 0));
    }
  };

  const saveEditHistory = (item) => {
    if (isPayment(item)) {
      const amt = parseFloat(editHistoryTotal) || 0;
      if (amt > 0) {
        updateHistory(item.id, {
          dueAmount: -amt,
          items: [{ name: 'Payment received', quantity: 1, price: -amt }],
        });
      }
    } else {
      const tot = parseFloat(editHistoryTotal) || 0;
      const d = parseFloat(editHistoryDue) || 0;
      updateHistory(item.id, { total: tot, dueAmount: d });
    }
    setEditingHistoryId(null);
  };

  const renderHistoryItem = ({ item }) => {
    const editing = editingHistoryId === item.id;
    const payment = isPayment(item);
    const meta = (
      <View className="flex-row items-center gap-4 mt-3">
        <View className="flex-row items-center gap-1.5">
          <Calendar size={12} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          <Text className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} style={{ fontSize: 11 * fontSizeScale }}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <CreditCard size={12} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          <Text className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} style={{ fontSize: 11 * fontSizeScale }}>
            {item.processedBy}
          </Text>
        </View>
      </View>
    );

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={isRealCustomer && !editing ? () => startEditHistory(item) : undefined}
        delayLongPress={400}
        className={`mx-4 my-2 p-5 rounded-3xl border shadow-sm ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}
      >
        {payment ? (
          editing ? (
            <View>
              <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`} style={{ fontSize: 13 * fontSizeScale }}>
                Amount received (Rs.)
              </Text>
              <TextInput
                autoFocus
                className={`p-3 rounded-xl border ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                style={{ outlineStyle: 'none', fontSize: 22 * fontSizeScale }}
                keyboardType="numeric"
                value={editHistoryTotal}
                onChangeText={setEditHistoryTotal}
                onBlur={() => saveEditHistory(item)}
                onSubmitEditing={() => saveEditHistory(item)}
                returnKeyType="done"
              />
              {meta}
            </View>
          ) : (
            <View>
              <Text className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} style={{ fontSize: 22 * fontSizeScale }}>
                Payment received: Rs. {(-item.dueAmount).toFixed(2)}
              </Text>
              {meta}
            </View>
          )
        ) : (
          editing ? (
            <View>
              <View className="mb-3">
                <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`} style={{ fontSize: 13 * fontSizeScale }}>
                  Total (Rs.)
                </Text>
                <TextInput
                  autoFocus
                  className={`p-3 rounded-xl border ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  style={{ outlineStyle: 'none' }}
                  keyboardType="numeric"
                  value={editHistoryTotal}
                  onChangeText={setEditHistoryTotal}
                />
              </View>
              <View className="mb-3">
                <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`} style={{ fontSize: 13 * fontSizeScale }}>
                  Due (Rs.)
                </Text>
                <TextInput
                  className={`p-3 rounded-xl border ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  style={{ outlineStyle: 'none' }}
                  keyboardType="numeric"
                  value={editHistoryDue}
                  onChangeText={setEditHistoryDue}
                  onBlur={() => saveEditHistory(item)}
                  onSubmitEditing={() => saveEditHistory(item)}
                  returnKeyType="done"
                />
              </View>
              {item.items.length > 0 && (
                <View className="mb-1">
                  {item.items.map((prod, idx) => (
                    <View key={idx} className="flex-row py-1.5" style={{ borderBottomWidth: idx < item.items.length - 1 ? 1 : 0, borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9' }}>
                      <Text className={`flex-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontSize: 13 * fontSizeScale }} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text className={`w-12 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontSize: 13 * fontSizeScale }}>
                        x{prod.quantity}
                      </Text>
                      <Text className={`w-24 text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontSize: 13 * fontSizeScale }}>
                        Rs. {(prod.price * prod.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {meta}
            </View>
          ) : (
            <View>
              {item.items.length > 0 && (
                <View className="mb-1">
                  {item.items.map((prod, idx) => (
                    <View key={idx} className="flex-row py-1.5" style={{ borderBottomWidth: idx < item.items.length - 1 ? 1 : 0, borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9' }}>
                      <Text className={`flex-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} style={{ fontSize: 14 * fontSizeScale }} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text className={`w-12 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontSize: 14 * fontSizeScale }}>
                        x{prod.quantity}
                      </Text>
                      <Text className={`w-24 text-right font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} style={{ fontSize: 14 * fontSizeScale }}>
                        Rs. {(prod.price * prod.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <View className="flex-row justify-between items-center mt-2 pt-3" style={{ borderTopWidth: 1, borderTopColor: isDarkMode ? '#1e293b' : '#f1f5f9' }}>
                {item.dueAmount > 0 && (
                  <Text className="text-red-500 font-medium" style={{ fontSize: 13 * fontSizeScale }}>
                    Due: Rs. {item.dueAmount.toFixed(2)}
                  </Text>
                )}
                <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 16 * fontSizeScale }}>
                  Total: Rs. {item.total.toFixed(2)}
                </Text>
              </View>
              {meta}
            </View>
          )
        )}
      </TouchableOpacity>
    );
  };

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
        {isRealCustomer && !isArchived ? (
          <TouchableOpacity
            onPress={() => setShowArchiveConfirm(true)}
            className={`w-12 h-12 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}
          >
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <View className="w-12 h-12" />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className={`mx-4 mt-4 px-6 py-6 rounded-3xl border shadow-sm ${cardClass}`}>
          {isArchived && (
            <View className={`mb-4 px-3 py-2 rounded-xl self-start ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Text className={`font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontSize: 11 * fontSizeScale }}>
                Archived — history kept
              </Text>
            </View>
          )}
          {showArchiveConfirm && (
            <View className={`mb-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-red-50 border-red-100'}`}>
              <Text className={`font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 15 * fontSizeScale }}>
                Archive "{name}"?
              </Text>
              <Text className={`mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontSize: 13 * fontSizeScale }}>
                Sales history and balance are kept and it can be restored later.
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowArchiveConfirm(false)}
                  className={`flex-1 py-3 rounded-xl items-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                >
                  <Text className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} style={{ fontSize: 14 * fontSizeScale }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowArchiveConfirm(false); doDelete(); }}
                  className="flex-1 py-3 rounded-xl items-center bg-red-500"
                >
                  <Text className="text-white font-bold" style={{ fontSize: 14 * fontSizeScale }}>Archive</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
              <View className="flex-row items-center">
                <TouchableOpacity onPress={isRealCustomer && !isArchived ? confirmImagePick : undefined} activeOpacity={0.7}>
                  <Image
                    source={{ uri: customer?.image || 'https://via.placeholder.com/150/f1f5f9/64748b?text=' + encodeURIComponent(name.charAt(0).toUpperCase()) }}
                    className="w-20 h-20 rounded-full"
                  />
                </TouchableOpacity>
                <View className="flex-1 ml-4 justify-center">
                  {editingField === 'name' ? (
                    <TextInput
                      autoFocus
                      className={`font-bold ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'} rounded-lg px-2 py-1`}
                      style={{ fontSize: 22 * fontSizeScale }}
                      value={inlineName}
                      onChangeText={setInlineName}
                      onBlur={saveInlineName}
                      onSubmitEditing={saveInlineName}
                      returnKeyType="done"
                    />
                  ) : (
                    <TouchableOpacity
                      onLongPress={isRealCustomer && !isArchived ? () => { setInlineName(name); setEditingField('name'); } : undefined}
                      activeOpacity={0.7}
                      delayLongPress={400}
                    >
                      <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 22 * fontSizeScale }} numberOfLines={1}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {editingField === 'due' ? (
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <Wallet size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
                      <TextInput
                        autoFocus
                        className={`font-bold ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'} rounded-lg px-2 py-1`}
                        style={{ fontSize: 22 * fontSizeScale }}
                        keyboardType="numeric"
                        value={inlineDue}
                        onChangeText={setInlineDue}
                        onBlur={saveInlineDue}
                        onSubmitEditing={saveInlineDue}
                        returnKeyType="done"
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onLongPress={isRealCustomer && !isArchived ? () => { setInlineDue(customer?.due != null ? String(customer.due) : ''); setEditingField('due'); } : undefined}
                      activeOpacity={0.7}
                      delayLongPress={400}
                    >
                      <View className="flex-row items-center gap-1.5 mt-1">
                        <Wallet size={20} color={due > 0 ? '#ef4444' : (isDarkMode ? '#64748b' : '#94a3b8')} />
                        <Text className={`${due > 0 ? 'text-red-500' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`} style={{ fontSize: 22 * fontSizeScale, fontWeight: '900' }}>
                          Due: Rs. {Number(due).toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
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

              {isRealCustomer && !isArchived && due > 0 && (
                <TouchableOpacity
                  onPress={() => setShowPay(true)}
                  className="mt-4 flex-row items-center justify-center gap-2 bg-green-600 py-4 rounded-2xl shadow-lg active:opacity-80"
                >
                  <Banknote size={18} color="white" />
                  <Text className="text-white font-bold text-lg" style={{ fontSize: 18 * fontSizeScale }}>Receive Payment</Text>
                </TouchableOpacity>
              )}
              {isArchived && (
                <TouchableOpacity
                  onPress={handleRestore}
                  className="mt-4 flex-row items-center justify-center gap-2 bg-blue-600 py-4 rounded-2xl shadow-lg active:opacity-80"
                >
                  <Check size={18} color="white" />
                  <Text className="text-white font-bold text-lg" style={{ fontSize: 18 * fontSizeScale }}>Restore Customer</Text>
                </TouchableOpacity>
              )}
            </View>

            {customerHistory.map(item => renderHistoryItem({ item }))}
      </ScrollView>

      <Modal visible={showPay} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/80 justify-end">
          <View className={`rounded-t-3xl p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row justify-between items-center mb-2">
              <Text className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 24 * fontSizeScale }}>Receive Payment</Text>
              <TouchableOpacity onPress={() => { setShowPay(false); setPayAmount(''); }}>
                <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <Text className={`mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ fontSize: 14 * fontSizeScale }}>
              Outstanding due: Rs. {Number(due).toFixed(2)}
            </Text>
            <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`} style={{ fontSize: 14 * fontSizeScale }}>Amount received (Rs.)</Text>
            <TextInput
              autoFocus={true}
              className={`p-4 rounded-xl text-lg border mb-6 ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              style={{ outlineStyle: 'none' }}
              placeholder="0"
              placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
              keyboardType="numeric"
              returnKeyType="done"
              value={payAmount}
              onChangeText={setPayAmount}
              onSubmitEditing={handleReceivePayment}
            />
            <TouchableOpacity
              onPress={handleReceivePayment}
              className="bg-green-600 p-5 rounded-2xl items-center shadow-lg"
            >
              <Text className="text-white font-bold text-xl" style={{ fontSize: 20 * fontSizeScale }}>Confirm Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
