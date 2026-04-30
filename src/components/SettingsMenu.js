import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { Moon, Sun, Type, Image as ImageIcon, History, Settings, ChevronRight, ExternalLink } from 'lucide-react-native';
import useStore from '../store/useStore';
import { useNavigation } from '@react-navigation/native';

const SettingsMenu = ({ isOpen, onClose }) => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'menu'
  const { 
    isDarkMode, toggleDarkMode, 
    fontSizeScale, setFontSizeScale, 
    thumbnailScale, setThumbnailScale,
    history 
  } = useStore();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withTiming(isOpen ? 1 : 0, { duration: 250 }) },
        { translateY: withTiming(isOpen ? 0 : 120, { duration: 250 }) }
      ],
      opacity: withTiming(isOpen ? 1 : 0, { duration: 200 }),
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isOpen ? 1 : 0, { duration: 200 }),
    };
  });

  const handleFullHistory = () => {
    onClose();
    navigation.navigate('History');
  };

  return (
    <>
      {isOpen && (
        <Pressable 
          onPress={onClose}
          style={styles.overlayWrapper}
        >
          <Animated.View style={[styles.overlay, overlayStyle]} />
        </Pressable>
      )}
      <Animated.View 
        style={[
          styles.container, 
          isDarkMode ? styles.darkContainer : styles.lightContainer,
          animatedStyle,
          { pointerEvents: isOpen ? 'auto' : 'none' }
        ]}
      >
        {/* Tab Switcher */}
        <View className={`flex-row mx-6 mt-6 p-1 rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          <Pressable 
            onPress={() => setActiveTab('history')}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-2 ${activeTab === 'history' ? (isDarkMode ? 'bg-slate-800' : 'bg-white shadow-sm') : ''}`}
          >
            <History size={16} color={activeTab === 'history' ? (isDarkMode ? 'white' : '#3b82f6') : (isDarkMode ? '#64748b' : '#94a3b8')} />
            <Text className={`font-semibold ${activeTab === 'history' ? (isDarkMode ? 'text-white' : 'text-slate-900') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>History</Text>
          </Pressable>
          <Pressable 
            onPress={() => setActiveTab('menu')}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-2 ${activeTab === 'menu' ? (isDarkMode ? 'bg-slate-800' : 'bg-white shadow-sm') : ''}`}
          >
            <Settings size={16} color={activeTab === 'menu' ? (isDarkMode ? 'white' : '#3b82f6') : (isDarkMode ? '#64748b' : '#94a3b8')} />
            <Text className={`font-semibold ${activeTab === 'menu' ? (isDarkMode ? 'text-white' : 'text-slate-900') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>Settings</Text>
          </Pressable>
        </View>

        {/* Stop propagation to prevent closing while interacting with sliders */}
        <Pressable 
          onPress={(e) => e && e.stopPropagation && e.stopPropagation()} 
          onStartShouldSetResponder={() => true}
          style={styles.innerContent}
        >
          <View style={{ height: 240 }}>
            {activeTab === 'history' ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {history.length > 0 ? (
                  history.slice(0, 5).map((item) => (
                    <Pressable 
                      key={item.id} 
                      onPress={handleFullHistory}
                      className={`p-4 mb-3 rounded-2xl border active:opacity-70 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}
                    >
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                          {item.customerName}
                        </Text>
                        <Text className="text-blue-500 font-bold">Rs. {item.total.toFixed(2)}</Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <Text className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {item.items.length} items
                          </Text>
                          <ChevronRight size={12} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                        </View>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View className="items-center py-8">
                    <Text className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>No recent transactions</Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                {/* Dark Mode Toggle */}
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

                {/* Spacer to push sliders to the bottom */}
                <View style={{ flex: 1 }} />

                {/* Font Size Slider */}
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

                {/* Thumbnail Size Slider */}
                <View className="mb-2">
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
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Animated.View>

    </>
  );
};

const styles = StyleSheet.create({
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    position: 'absolute',
    bottom: 84,
    left: 20,
    right: 20,
    zIndex: 1000,
    elevation: 24,
    borderRadius: 48,
    // Modern shadow approach for RN/Web
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  innerContent: {
    padding: 24,
    width: '100%',
  },
  lightContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  darkContainer: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
});

export default SettingsMenu;
