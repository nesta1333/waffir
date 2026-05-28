import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * Thin banner that appears at the top of the screen when the device goes offline.
 * Renders nothing when online — zero overhead.
 */
export default function NetworkBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;

  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.banner}>
      <Text style={styles.text}>⚠ لا يوجد اتصال · تعرض بيانات محفوظة</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.accent.redLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent.red,
    paddingVertical: 9,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  text: {
    color: Colors.accent.red,
    fontSize: 12,
    fontFamily: 'Almarai_700Bold',
    letterSpacing: 0.2,
  },
});
