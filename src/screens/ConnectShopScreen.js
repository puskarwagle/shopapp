import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert } from 'react-native';
import { QrCode, KeyRound, Store } from 'lucide-react-native';
import useStore from '../store/useStore';

// QR scanning only works on native devices — not web
let CameraView = null;
let useCameraPermissions = null;
if (Platform.OS !== 'web') {
  try {
    CameraView = require('expo-camera').CameraView;
    useCameraPermissions = require('expo-camera').useCameraPermissions;
  } catch (_) {}
}

export default function ConnectShopScreen() {
  const { joinShop, createShop, shopId, isDarkMode, logout } = useStore();
  const [tab, setTab] = useState('join'); // 'join' | 'create'
  const [manualCode, setManualCode] = useState('');
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [permission, requestPermission] = useCameraPermissions?.() || [null, () => null];
  const [scanning, setScanning] = useState(false);

  const inputClass = `p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`;

  const doJoin = async (code) => {
    setError('');
    setLoading(true);
    const res = await joinShop(code);
    if (!res.ok) setError(res.error);
    setLoading(false);
  };

  const doCreate = async () => {
    if (!shopName.trim()) { setError('Enter a shop name.'); return; }
    setError('');
    setLoading(true);
    const res = await createShop(shopName);
    if (!res.ok) setError(res.error);
    setLoading(false);
  };

  const handleBarcode = (event) => {
    if (!event?.data || loading) return;
    setScanning(false);
    doJoin(event.data);
  };

  if (shopId) return null;

  const header = tab === 'join' ? 'Connect to your shop' : 'Create a new shop';
  const subtext = tab === 'join'
    ? 'Scan the QR code or enter the invite code shared by the shop owner.'
    : 'You\'ll become the owner of this shop. Employees scan your QR to join.';

  return (
    <View className={`flex-1 px-8 pt-20 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      <View className="mb-8">
        <Text className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{header}</Text>
        <Text className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{subtext}</Text>
      </View>

      <View className={`flex-row p-1 rounded-2xl mb-8 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <TouchableOpacity onPress={() => { setTab('join'); setError(''); setScanning(false); }}
          className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${tab === 'join' ? 'bg-blue-600' : ''}`}>
          <QrCode size={16} color={tab === 'join' ? 'white' : isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text className={`font-bold ${tab === 'join' ? 'text-white' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Join</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setTab('create'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${tab === 'create' ? 'bg-blue-600' : ''}`}>
          <Store size={16} color={tab === 'create' ? 'white' : isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text className={`font-bold ${tab === 'create' ? 'text-white' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Create</Text>
        </TouchableOpacity>
      </View>

      {tab === 'join' ? (
        <View>
          {/* QR Scan button — native only */}
          {Platform.OS !== 'web' && permission?.granted !== false && (
            <TouchableOpacity
              onPress={() => setScanning(true)}
              className="bg-blue-600 p-4 rounded-xl flex-row items-center justify-center gap-2 mb-4"
            >
              <QrCode size={20} color="white" />
              <Text className="text-white font-bold text-lg">Scan QR Code</Text>
            </TouchableOpacity>
          )}

          {Platform.OS !== 'web' && scanning && permission?.granted && CameraView && (
            <View className="mb-4 rounded-2xl overflow-hidden" style={{ height: 280 }}>
              <CameraView
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcode}
                style={{ flex: 1 }}
              />
              <TouchableOpacity
                onPress={() => setScanning(false)}
                className="absolute bottom-3 left-0 right-0 mx-16 bg-black/60 py-3 rounded-xl items-center"
              >
                <Text className="text-white font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="items-center gap-3 mb-6 flex-row">
            <View className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <Text className={isDarkMode ? 'text-slate-500 text-sm' : 'text-slate-400 text-sm'}>or enter code</Text>
            <View className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
          </View>

          <View className="mb-4 flex-row items-center gap-3">
            <KeyRound size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <Text className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Invite Code</Text>
          </View>
          <TextInput
            className={`${inputClass} mb-4 text-center tracking-widest uppercase`}
            placeholder="e.g. KD4TQP"
            placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
            value={manualCode}
            onChangeText={(t) => setManualCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity
            className="bg-slate-800 p-4 rounded-xl mb-4"
            onPress={() => doJoin(manualCode)}
            disabled={loading || manualCode.length < 4}
          >
            <Text className="text-white font-bold text-center">Join with Code</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View className="mb-4 flex-row items-center gap-3">
            <Store size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <Text className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Shop Name</Text>
          </View>
          <TextInput
            className={`${inputClass} mb-6`}
            placeholder="e.g. Wagle Store"
            placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
            value={shopName}
            onChangeText={setShopName}
          />
          <TouchableOpacity
            className="bg-blue-600 p-4 rounded-xl"
            onPress={doCreate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text className="text-white font-bold text-center text-lg">Create Shop</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error !== '' && (
        <Text className="text-red-500 text-center mt-4">{error}</Text>
      )}

      <TouchableOpacity onPress={logout} className="mt-8 items-center py-3">
        <Text className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}