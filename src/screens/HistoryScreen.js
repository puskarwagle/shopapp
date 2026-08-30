import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Calendar, User, CreditCard, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import useStore from '../store/useStore';

export default function HistoryScreen() {
  const { history, isDarkMode, fontSizeScale } = useStore();
  const navigation = useNavigation();

  const renderHistoryItem = ({ item }) => (
    <View 
      className={`m-4 p-5 rounded-3xl border shadow-sm ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerProfile', { customerId: item.customerId, customerName: item.customerName })}
            className="flex-row items-center gap-2 mb-1"
          >
            <User size={14} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            <Text className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 18 * fontSizeScale }}>
              {item.customerName}
            </Text>
            <ChevronRight size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
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

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20">
            <Text className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: 16 * fontSizeScale }}>
              No transactions yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}
