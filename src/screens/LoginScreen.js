import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import useStore from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { deriveRole } from '../lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, isDarkMode } = useStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Fallback for local dev without keys: any credentials, role from email
        setUser({ email, role: deriveRole(email) });
        return;
      }
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message || 'Invalid credentials.');
        return;
      }
      const signedInEmail = data?.user?.email || email;
      setUser({ email: signedInEmail, role: deriveRole(signedInEmail) });
    } catch (e) {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 justify-center px-8 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}
    >
      <View className="mb-10">
        <Text className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Shop App</Text>
        <Text className={isDarkMode ? 'text-slate-400 mt-2' : 'text-slate-500 mt-2'}>Sign in to continue</Text>
      </View>

      <View className="space-y-4">
        <View className="mb-4">
          <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Email Address</Text>
          <TextInput
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
            style={{ outlineStyle: 'none' }}
            placeholder="email@example.com"
            placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View className="mb-6">
          <Text className={`font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Password</Text>
          <TextInput
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
            style={{ outlineStyle: 'none' }}
            placeholder="••••••••"
            placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error !== '' && (
          <Text className="text-red-500 text-center mb-2">{error}</Text>
        )}

        <TouchableOpacity
          className="bg-blue-600 p-4 rounded-xl mt-4 active:bg-blue-700 shadow-lg"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}