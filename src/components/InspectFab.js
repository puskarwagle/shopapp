import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import useStore from '../store/useStore';

export default function InspectFab() {
  if (!__DEV__) return null;

  const { inspectMode, toggleInspectMode, isDarkMode } = useStore();

  return (
    <Pressable
      onPress={toggleInspectMode}
      style={[
        styles.fab,
        {
          backgroundColor: inspectMode ? '#3b82f6' : (isDarkMode ? '#334155' : '#cbd5e1'),
          borderColor: inspectMode ? '#2563eb' : (isDarkMode ? '#475569' : '#94a3b8'),
        },
      ]}
    >
      {inspectMode ? (
        <Eye size={20} color="white" />
      ) : (
        <EyeOff size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
