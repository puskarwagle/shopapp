import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import useStore from '../store/useStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { googleSignIn } from '../lib/auth';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isDarkMode } = useStore();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const { error: googleError } = await googleSignIn();
    if (googleError) setError(googleError);
    setLoading(false);
  };

  return (
    <View className={`flex-1 justify-center items-center px-8 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      <View className="items-center mb-12">
        <Text className={`text-5xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Shop App</Text>
        <Text className={`text-lg mt-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Manage your shop effortlessly
        </Text>
      </View>

      {error !== '' && (
        <Text className="text-red-500 text-center mb-4">{error}</Text>
      )}

      <TouchableOpacity
        className={`w-full max-w-sm flex-row items-center justify-center gap-3 p-4 rounded-xl border ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-lg'
        }`}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={isDarkMode ? '#fff' : '#333'} />
        ) : (
          <>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>G</Text>
            <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Sign in with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      {!isSupabaseConfigured && (
        <Text className={`text-sm mt-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Supabase not configured — offline mode
        </Text>
      )}
    </View>
  );
}
