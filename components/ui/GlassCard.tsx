import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  goldBorder?: boolean;
  cyanBorder?: boolean;
  limeBorder?: boolean;
  noPad?: boolean;
}

export default function GlassCard({
  children,
  style,
  intensity = 20,
  goldBorder = false,
  cyanBorder = false,
  limeBorder = false,
  noPad = false,
}: GlassCardProps) {
  const borderStyle = limeBorder
    ? styles.limeBorder
    : cyanBorder
    ? styles.cyanBorder
    : goldBorder
    ? styles.tertiaryBorder
    : null;

  return (
    <View style={[styles.wrapper, borderStyle, style]}>
      <BlurView intensity={intensity} tint="dark" style={[styles.blur, noPad && styles.noPad]}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.glass,
    overflow: 'hidden',
    backgroundColor: Colors.bg.card,
  },
  tertiaryBorder: {
    borderColor: Colors.border.tertiary,
  },
  cyanBorder: {
    borderColor: Colors.border.cyan,
  },
  limeBorder: {
    borderColor: Colors.border.lime,
  },
  blur: {
    padding: 16,
  },
  noPad: {
    padding: 0,
  },
});
