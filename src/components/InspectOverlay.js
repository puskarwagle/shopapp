import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Copy, Check, X } from 'lucide-react-native';
import useStore from '../store/useStore';

export default function InspectOverlay() {
  const { isDarkMode, inspectTarget, inspectInfo, inspectCopied, clearInspectTarget } = useStore();
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (inspectTarget) {
      setVisible(true);
      setCopied(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 3000);
    } else if (inspectCopied) {
      setVisible(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 1500);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 1500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [inspectTarget, inspectCopied]);

  if (!visible) return null;

  const isCopied = inspectCopied || copied;

  const handleCopy = async () => {
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(inspectTarget);
    } else {
      try { require('expo-clipboard').setStringAsync(inspectTarget); } catch (_) {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const componentName = inspectInfo?.componentName || inspectTarget;
  const location = inspectInfo?.file && inspectInfo?.line
    ? `${inspectInfo.file}:${inspectInfo.line}`
    : inspectInfo?.file || '';

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', bottom: 102, right: 64, zIndex: 9998 }}
    >
      <View
        pointerEvents="auto"
        className={`px-3 py-1.5 rounded-full flex-row items-center gap-2 ${
          isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'
        }`}
        style={{ elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4 }}
      >
        <View>
          <Text className={`font-bold text-xs ${isCopied ? 'text-green-500' : 'text-blue-500'}`} numberOfLines={1}>
            {isCopied ? 'copied' : componentName}
          </Text>
          {location ? (
            <Text className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} numberOfLines={1}>
              {location}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={handleCopy} hitSlop={8}>
          {isCopied ? (
            <Check size={14} color="#22c55e" />
          ) : (
            <Copy size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          )}
        </Pressable>
        <Pressable onPress={clearInspectTarget} hitSlop={8}>
          <X size={14} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        </Pressable>
      </View>
    </View>
  );
}