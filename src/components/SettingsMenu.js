import React from 'react';
import { View, Text, Switch, StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { Moon, Sun, Type, Image as ImageIcon } from 'lucide-react-native';
import useStore from '../store/useStore';

const SettingsMenu = ({ isOpen, onClose }) => {
  const { 
    isDarkMode, toggleDarkMode, 
    fontSizeScale, setFontSizeScale, 
    thumbnailScale, setThumbnailScale 
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
        {/* Stop propagation to prevent closing while interacting with sliders */}
        <Pressable 
          onPress={(e) => e && e.stopPropagation && e.stopPropagation()} 
          onStartShouldSetResponder={() => true}
          style={styles.innerContent}
        >
          {/* Dark Mode Toggle */}
          <View className="flex-row justify-between items-center mb-8">
            <View className="flex-row items-center gap-4">
              {isDarkMode ? <Moon size={22} color="white" /> : <Sun size={22} color="#0f172a" />}
              <Text className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
              thumbColor="#fff"
              ios_backgroundColor="#cbd5e1"
            />
          </View>

          {/* Font Size Slider */}
          <View className="mb-8">
            <View className="flex-row items-center gap-4 mb-4">
              <Type size={22} color={isDarkMode ? 'white' : '#0f172a'} />
              <Text className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Typography</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
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
            <View className="flex-row items-center gap-4 mb-4">
              <ImageIcon size={22} color={isDarkMode ? 'white' : '#0f172a'} />
              <Text className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Thumbnails</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0.5}
              maximumValue={1.5}
              value={thumbnailScale}
              onValueChange={setThumbnailScale}
              minimumTrackTintColor="#3b82f6"
              maximumTrackTintColor={isDarkMode ? '#334155' : '#e2e8f0'}
              thumbTintColor="#3b82f6"
            />
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
    padding: 40,
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
