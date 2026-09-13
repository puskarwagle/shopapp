import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Switch, Pressable, ScrollView, Platform, ActivityIndicator, Modal } from 'react-native';
import Slider from '@react-native-community/slider';
import { Moon, Sun, Type, Image as ImageIcon, LayoutList, Store, Copy, RotateCw, LogOut, Archive, X, ChevronRight } from 'lucide-react-native';
import { FlatList, TouchableOpacity, Image } from 'react-native';
import useStore from '../store/useStore';
import Inspect from '../components/Inspect';

let QRCode = null;
if (Platform.OS !== 'web') {
  try { QRCode = require('react-native-qrcode-svg').default; } catch (_) {}
}

const SettingsScreen = () => {
  const [remaining, setRemaining] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const timerRef = useRef(null);
  const {
    isDarkMode, toggleDarkMode,
    fontSizeScale, setFontSizeScale,
    thumbnailScale, setThumbnailScale,
    customerView, setCustomerView,
    customers, restoreCustomer,
    logout,
    user,
    shopName,
    shopInviteCode,
    inviteExpiresAt,
    generateInvite,
  } = useStore();

  const calcRemaining = () => {
    if (!inviteExpiresAt) return 0;
    const diff = Math.floor((new Date(inviteExpiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  useEffect(() => {
    setRemaining(calcRemaining());
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r <= 0 && timerRef.current) clearInterval(timerRef.current);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [inviteExpiresAt]);

  const handleGenerate = async () => {
    setGenerating(true);
    await generateInvite();
    setGenerating(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      className={`flex-1 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
    >
      <Inspect id="settings-dark-mode-toggle">
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center gap-3">
            {isDarkMode ? <Moon size={20} color="white" /> : <Sun size={20} color="#0f172a" />}
            <Text className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
            thumbColor="#fff"
            ios_backgroundColor="#cbd5e1"
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </View>
      </Inspect>

      <Inspect id="settings-font-slider">
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-2">
            <Type size={20} color={isDarkMode ? 'white' : '#0f172a'} />
            <Text className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Typography</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 32 }}
            minimumValue={0.8}
            maximumValue={1.5}
            value={fontSizeScale}
            onValueChange={setFontSizeScale}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor={isDarkMode ? '#334155' : '#e2e8f0'}
            thumbTintColor="#3b82f6"
          />
        </View>
      </Inspect>

      <Inspect id="settings-thumbnail-slider">
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-2">
            <ImageIcon size={20} color={isDarkMode ? 'white' : '#0f172a'} />
            <Text className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Thumbnails</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 32 }}
            minimumValue={0.5}
            maximumValue={1.5}
            value={thumbnailScale}
            onValueChange={setThumbnailScale}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor={isDarkMode ? '#334155' : '#e2e8f0'}
            thumbTintColor="#3b82f6"
          />
        </View>
      </Inspect>

      <Inspect id="settings-customer-view">
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center gap-3">
            <LayoutList size={20} color={isDarkMode ? 'white' : '#0f172a'} />
            <Text className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Customers Layout</Text>
          </View>
          <View className={`flex-row rounded-xl p-1 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
            {['list', 'grid'].map(v => (
              <Pressable
                key={v}
                onPress={() => setCustomerView(v)}
                className={`px-4 py-2 rounded-lg ${customerView === v ? 'bg-blue-600' : ''}`}
              >
                <Text className={`font-bold capitalize ${customerView === v ? 'text-white' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                  {v}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Inspect>

      <Inspect id="settings-archived-customers">
        <TouchableOpacity
          onPress={() => setShowArchived(true)}
          className={`flex-row justify-between items-center mb-6 px-4 py-3 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <View className="flex-row items-center gap-3">
            <Archive size={20} color={isDarkMode ? 'white' : '#0f172a'} />
            <Text className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Archived Customers</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>
              {customers.filter(c => c.is_deleted).length}
            </Text>
            <ChevronRight size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </View>
        </TouchableOpacity>
      </Inspect>

      <Inspect id="settings-invite-panel">
        <View className={`p-4 rounded-2xl border mb-4 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <View className="flex-row items-center gap-2 mb-3">
            <Store size={16} color="#3b82f6" />
            <Text className="font-bold text-blue-500">Invite Employees</Text>
          </View>
          {shopName && (
            <Text className={`mb-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Shop: {shopName}</Text>
          )}

          {remaining > 0 && shopInviteCode ? (
            <>
              <View className="items-center mb-3">
                {QRCode ? (
                  <QRCode value={shopInviteCode} size={140} backgroundColor="transparent" />
                ) : (
                  <Text className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>QR works on phone only</Text>
                )}
              </View>
              <Text className={`text-center text-xs mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Share this code or scan the QR
              </Text>
              <View className={`flex-row items-center justify-center gap-2 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                <Text className="text-xl font-bold tracking-widest text-blue-500">{shopInviteCode}</Text>
                {Platform.OS !== 'web' && (
                  <Inspect id="settings-copy-btn">
                    <Pressable onPress={() => {
                      try { require('expo-clipboard').setStringAsync(shopInviteCode); } catch (_) {}
                    }}>
                      <Copy size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                    </Pressable>
                  </Inspect>
                )}
              </View>
              <View className="flex-row items-center justify-between mt-3">
                <Text className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Expires in {formatTime(remaining)}
                </Text>
                <Inspect id="settings-refresh-btn">
                  <Pressable
                    onPress={handleGenerate}
                    disabled={generating}
                    className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10"
                  >
                    <RotateCw size={14} color="#3b82f6" />
                    <Text className="text-blue-500 text-xs font-bold">Refresh</Text>
                  </Pressable>
                </Inspect>
              </View>
            </>
          ) : (
            <View className="items-center py-4">
              <Text className={`text-sm mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {shopInviteCode ? 'Code expired' : 'No active invite code'}
              </Text>
              <Inspect id="settings-generate-btn">
                <Pressable
                  onPress={handleGenerate}
                  disabled={generating}
                  className="flex-row items-center gap-2 px-5 py-3 rounded-xl bg-blue-600"
                >
                  {generating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <RotateCw size={16} color="white" />
                  )}
                  <Text className="text-white font-bold">Generate New Code</Text>
                </Pressable>
              </Inspect>
            </View>
          )}
        </View>
      </Inspect>

      <Inspect id="settings-logout-btn">
        <Pressable
          onPress={logout}
          className="mt-6 flex-row items-center justify-center gap-2 p-4 rounded-2xl border active:opacity-70"
          style={{ borderColor: 'rgba(239,68,68,0.3)' }}
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="font-bold text-red-500">Log Out</Text>
        </Pressable>
      </Inspect>

      <Modal visible={showArchived} animationType="slide" transparent>
        <View className="flex-1 bg-black/80 justify-end">
          <View className={`rounded-t-3xl flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingBottom: 20 }}>
            <View className={`flex-row justify-between items-center px-6 pt-6 pb-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Archived Customers</Text>
              <TouchableOpacity onPress={() => setShowArchived(false)}>
                <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={customers.filter(c => c.is_deleted)}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View className="items-center pt-12">
                  <Text className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>No archived customers</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View className={`flex-row items-center px-4 py-3 mb-2 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <Image source={{ uri: item.image }} className="w-10 h-10 rounded-full mr-3" />
                  <View className="flex-1">
                    <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} numberOfLines={1}>{item.name}</Text>
                    {item.due > 0 && <Text className="text-red-500 text-xs font-bold">Rs. {item.due}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => { restoreCustomer(item.id); }}
                    className="bg-blue-600 px-4 py-2 rounded-xl"
                  >
                    <Text className="text-white font-bold text-sm">Restore</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default SettingsScreen;
