import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import useStore, { uid } from '../store/useStore';
import Inspect from '../components/Inspect';

const freshRow = () => ({ key: uid(), productId: null, query: '', rate: '', qty: '1' });

export default function JournalCheckoutScreen() {
  const { user, activeCustomer, setActiveCustomer, customers, products, addToHistory, pushTransaction, addToCustomerDue, receivePayment, isDarkMode, fontSizeScale } = useStore();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [deposit, setDeposit] = useState('');
  const [rows, setRows] = useState(() => [freshRow(), freshRow(), freshRow(), freshRow(), freshRow()]);
  const [focusKey, setFocusKey] = useState(null);

  const customer = customers.find(c => c.id === activeCustomer?.id);
  const oldDue = Number(customer?.due) || 0;

  const patchRow = (key, patch) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const pickProduct = (key, product) =>
    setRows(prev => prev.map(r =>
      r.key === key
        ? { ...r, productId: product.id, query: product.name, rate: String(product.price) }
        : r
    ));

  const computed = useMemo(() => rows.map(r => {
    const q = r.query.trim().toLowerCase();
    const exact = products.find(p => (p.name || '').toLowerCase() === q);
    const rate = parseFloat(r.rate) || 0;
    const qty = parseFloat(r.qty) || 0;
    return { ...r, exact, rate, qty, amount: rate * qty };
  }), [rows, products]);

  const suggestionsFor = (row) => {
    const q = row.query.trim().toLowerCase();
    if (!q || row.exact) return [];
    return products
      .filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  };

  const total = computed.reduce((s, r) => s + r.amount, 0);
  const depositVal = parseFloat(deposit) || 0;
  const balance = total - depositVal;
  const newDue = oldDue + balance;
  const canSave = total > 0 || depositVal > 0;

  const handleSave = () => {
    if (!activeCustomer || !canSave) return;
    const now = new Date().toISOString();
    if (total > 0) {
      const items = computed
        .filter(r => r.amount > 0)
        .map(r => ({
          name: r.exact ? r.exact.name : r.query.trim() || '?',
          quantity: r.qty,
          price: r.rate,
        }));
      const order = {
        id: uid(),
        customerId: activeCustomer.id,
        customerName: activeCustomer.name,
        total,
        dueAmount: total,
        items,
        processedBy: user?.email || 'Unknown',
        timestamp: now,
      };
      addToHistory(order);
      pushTransaction(order);
      addToCustomerDue(activeCustomer.id, total);
    }
    if (depositVal > 0) receivePayment(activeCustomer.id, activeCustomer.name, depositVal, user?.email);
    setDeposit('');
    setRows([freshRow(), freshRow(), freshRow(), freshRow(), freshRow()]);
    navigation.navigate('Main');
    setActiveCustomer(null);
  };

  if (!activeCustomer) {
    return (
      <View className={`flex-1 items-center justify-center p-6 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
        <Text className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 18 * fontSizeScale }}>
          No customer selected
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} className="bg-blue-600 px-6 py-3 rounded-xl">
          <Text className="text-white font-bold text-lg" style={{ fontSize: 18 * fontSizeScale }}>Back to Store</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const cellText = isDarkMode ? 'text-white' : 'text-slate-900';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      <View className={`border-b px-4 pb-3 flex-row items-center gap-3 ${isDarkMode ? 'bg-black border-slate-900' : 'bg-white border-slate-200'}`} style={{ paddingTop: insets.top + 12 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`w-12 h-12 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}
        >
          <ChevronLeft size={24} color={isDarkMode ? 'white' : '#0f172a'} />
        </TouchableOpacity>
        <Inspect id="journal-customer-card">
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerProfile', { customerId: activeCustomer.id, customerName: activeCustomer.name })}
            className="flex-1 items-end"
          >
            <Text className={`font-bold ${cellText}`} style={{ fontSize: 16 * fontSizeScale }} numberOfLines={1}>{activeCustomer.name}</Text>
            <Text className={oldDue > 0 ? 'text-red-500 font-semibold' : muted} style={{ fontSize: 12 * fontSizeScale }}>
              Old due: Rs. {oldDue.toFixed(2)}
            </Text>
          </TouchableOpacity>
        </Inspect>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 220 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Inspect id="journal-deposit-input">
          <View className={`mx-4 mt-4 rounded-2xl border px-4 py-3 flex-row items-center ${card}`}>
            <Text className={`font-bold flex-1 ${cellText}`} style={{ fontSize: 16 * fontSizeScale }}>Deposit</Text>
            <Text className={`font-bold mr-1 ${muted}`} style={{ fontSize: 16 * fontSizeScale }}>Rs.</Text>
            <TextInput
              className={`w-32 text-right font-bold ${cellText}`}
              style={{ fontSize: 18 * fontSizeScale, outlineStyle: 'none' }}
              placeholder="0"
              placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
              keyboardType="numeric"
              returnKeyType="next"
              value={deposit}
              onChangeText={setDeposit}
            />
            {deposit.length > 0 && (
              <TouchableOpacity onPress={() => setDeposit('')} className="ml-2">
                <X size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
              </TouchableOpacity>
            )}
          </View>
        </Inspect>

        <View className={`mx-4 mt-3 rounded-2xl border overflow-hidden ${card}`}>
          <View className={`flex-row py-2.5 border-b ${isDarkMode ? 'border-slate-800 bg-black/40' : 'border-slate-100 bg-slate-50'}`}>
            <Text className={`font-bold text-center ${muted}`} style={{ width: 30, fontSize: 11 * fontSizeScale }}>SN</Text>
            <View style={{ width: 1 }} className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <Text className={`font-bold flex-1 pl-2 ${muted}`} style={{ fontSize: 11 * fontSizeScale }}>Name</Text>
            <View style={{ width: 1 }} className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <Text className={`font-bold text-center ${muted}`} style={{ width: 62, fontSize: 11 * fontSizeScale }}>Rate</Text>
            <View style={{ width: 1 }} className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <Text className={`font-bold text-center ${muted}`} style={{ width: 46, fontSize: 11 * fontSizeScale }}>Qty</Text>
            <View style={{ width: 1 }} className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <Text className={`font-bold text-center ${muted}`} style={{ width: 68, fontSize: 11 * fontSizeScale }}>Amount</Text>
            <View style={{ width: 30 }} />
          </View>

          {computed.map((r, idx) => {
            const noMatch = r.query.trim().length > 0 && !r.exact;
            const sugg = focusKey === r.key ? suggestionsFor(r) : [];
            const isDefaultRate = r.rate === '' || r.rate === '0';
            const isDefaultQty = r.qty === '1';
            return (
              <View key={r.key} className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <Inspect id="journal-row">
                  <View className="flex-row py-1 items-center">
                    <Text className={`text-center ${muted}`} style={{ width: 30, fontSize: 14 * fontSizeScale }}>{idx + 1}</Text>
                    <View style={{ width: 1, alignSelf: 'stretch' }} className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <View className="flex-1 pl-2 mr-1">
                      <TextInput
                        className={cellText}
                        style={{ fontSize: 14 * fontSizeScale, outlineStyle: 'none' }}
                        placeholder="Type item name"
                        placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                        value={r.query}
                        onChangeText={(t) => patchRow(r.key, { query: t, productId: null })}
                        onFocus={() => setFocusKey(r.key)}
                        onBlur={() => setFocusKey(null)}
                        returnKeyType="next"
                      />
                    </View>
                    <View style={{ width: 1, alignSelf: 'stretch' }} className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    {noMatch && isDefaultRate ? (
                      <View style={{ width: 62 }} className="items-center justify-center">
                        <Text className={muted} style={{ fontSize: 16 * fontSizeScale, opacity: 0.5 }}>?</Text>
                      </View>
                    ) : (
                      <TextInput
                        className={`${cellText} text-center`}
                        style={{ width: 62, fontSize: 14 * fontSizeScale, outlineStyle: 'none', opacity: isDefaultRate ? 0.3 : 1 }}
                        placeholder="0"
                        placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                        keyboardType="numeric"
                        value={r.rate}
                        onChangeText={(t) => patchRow(r.key, { rate: t })}
                        onFocus={() => setFocusKey(null)}
                      />
                    )}
                    <View style={{ width: 1, alignSelf: 'stretch' }} className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <TextInput
                      className={`${cellText} text-center`}
                      style={{ width: 46, fontSize: 14 * fontSizeScale, outlineStyle: 'none', opacity: isDefaultQty ? 0.3 : 1 }}
                      placeholder="1"
                      placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                      keyboardType="numeric"
                      value={r.qty}
                      onChangeText={(t) => patchRow(r.key, { qty: t })}
                      onFocus={() => setFocusKey(null)}
                    />
                    <View style={{ width: 1, alignSelf: 'stretch' }} className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <Text className={`text-center font-semibold ${cellText}`} style={{ width: 68, fontSize: 13 * fontSizeScale }}>
                      {r.amount > 0 ? r.amount.toFixed(2) : ''}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setRows(prev => (prev.length > 1 ? prev.filter(x => x.key !== r.key) : [freshRow()]))}
                      className="items-center justify-center"
                      style={{ width: 30 }}
                    >
                      <X size={14} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                    </TouchableOpacity>
                  </View>
                </Inspect>
                {sugg.length > 0 && (
                  <View className={`ml-2 mr-1 mb-2 rounded-xl overflow-hidden border ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    {sugg.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => pickProduct(r.key, p)}
                        className={`flex-row justify-between px-3 py-2 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}
                      >
                        <Text className={cellText} style={{ fontSize: 14 * fontSizeScale }} numberOfLines={1}>{p.name}</Text>
                        <Text className="text-blue-500 font-bold" style={{ fontSize: 13 * fontSizeScale }}>Rs. {Number(p.price).toFixed(2)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            onPress={() => setRows(prev => [...prev, freshRow()])}
            className="flex-row items-center justify-center gap-1 py-3"
          >
            <Plus size={16} color="#3b82f6" />
            <Text className="text-blue-500 font-bold" style={{ fontSize: 14 * fontSizeScale }}>Add line</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Checkout')} className="mx-4 mt-3 self-start">
          <Text className="text-blue-500 font-semibold" style={{ fontSize: 13 * fontSizeScale }}>Prefer photos? Open thumbnail checkout →</Text>
        </TouchableOpacity>
      </ScrollView>

      <View className={`absolute bottom-0 left-0 right-0 border-t px-6 pt-4 ${isDarkMode ? 'bg-black border-slate-900' : 'bg-white border-slate-200'}`} style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row justify-between mb-1">
          <Text className={muted} style={{ fontSize: 14 * fontSizeScale }}>Total</Text>
          <Text className={`font-bold ${cellText}`} style={{ fontSize: 16 * fontSizeScale }}>Rs. {total.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between mb-1">
          <Text className={muted} style={{ fontSize: 14 * fontSizeScale }}>Deposit</Text>
          <Text className="font-bold text-green-600" style={{ fontSize: 16 * fontSizeScale }}>Rs. {depositVal.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between mb-4">
          <Text className={`font-bold ${cellText}`} style={{ fontSize: 16 * fontSizeScale }}>New due (old + total − deposit)</Text>
          <Text className={`font-bold ${newDue > 0 ? 'text-red-500' : 'text-green-600'}`} style={{ fontSize: 18 * fontSizeScale }}>Rs. {newDue.toFixed(2)}</Text>
        </View>
        <Inspect id="journal-save-btn">
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            className={`p-5 rounded-2xl items-center shadow-lg ${canSave ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <Text className="text-white font-bold text-xl" style={{ fontSize: 20 * fontSizeScale }}>Save Journal</Text>
          </TouchableOpacity>
        </Inspect>
      </View>
    </View>
  );
}
