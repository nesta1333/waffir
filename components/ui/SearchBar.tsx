import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'ابحث عن أي منتج...',
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);
  const scaleValue = useSharedValue(1);

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 250 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
  };

  const handleSubmit = () => {
    if (value.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      scaleValue.value = withSpring(0.97, {}, () => {
        scaleValue.value = withSpring(1);
      });
      onSubmit(value.trim());
    }
  };

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [Colors.border.glass, Colors.border.focus]
    ),
    transform: [{ scale: scaleValue.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value * 0.4,
  }));

  return (
    <View style={styles.wrapper}>
      {/* Purple neon glow on focus */}
      <Animated.View style={[styles.glow, glowStyle]} />

      <Animated.View style={[styles.container, containerStyle]}>
        <BlurView intensity={30} tint="dark" style={styles.blur}>
          <Text style={styles.icon}>🔍</Text>

          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.muted}
            style={styles.input}
            returnKeyType="search"
            textAlign="right"
            autoFocus={autoFocus}
          />

          {value.length > 0 && (
            <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.searchBtn} onPress={handleSubmit}>
            <View style={styles.searchBtnInner}>
              <Text style={styles.searchBtnText}>بحث</Text>
            </View>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    inset: -10,
    borderRadius: 40,
    backgroundColor: Colors.accent.primary,
    ...Platform.select({
      ios: { shadowColor: Colors.accent.primary, shadowRadius: 24, shadowOpacity: 1 },
    }),
  },
  container: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    borderColor: Colors.border.glass,
  },
  blur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: Colors.bg.card,
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 16,
    fontFamily: 'Almarai_400Regular',
    textAlignVertical: 'center',
  },
  clearBtn: {
    padding: 6,
    marginRight: 6,
  },
  clearText: {
    color: Colors.text.muted,
    fontSize: 14,
  },
  searchBtn: {
    marginLeft: 8,
  },
  searchBtnInner: {
    backgroundColor: Colors.accent.cyan,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  searchBtnText: {
    color: Colors.bg.secondary,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
  },
});
