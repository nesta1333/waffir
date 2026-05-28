import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PLATFORMS } from '../../constants/platforms';

interface PlatformBadgeProps {
  platformId: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const INITIALS: Record<string, string> = {
  amazon: 'Az',
  noon: 'N',
  namshi: 'Na',
  aliexpress: 'AE',
  temu: 'T',
  google: 'G',
};

export default function PlatformBadge({ platformId, size = 'md', showName = false }: PlatformBadgeProps) {
  const platform = PLATFORMS[platformId];
  if (!platform) return null;

  const sizeMap = { sm: 28, md: 36, lg: 48 };
  const fontMap = { sm: 10, md: 12, lg: 16 };
  const dim = sizeMap[size];
  const fontSize = fontMap[size];

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.badge,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 3,
            backgroundColor: `${platform.color}20`,
            borderColor: `${platform.color}50`,
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize, color: platform.color }]}>
          {INITIALS[platformId] ?? platformId[0].toUpperCase()}
        </Text>
      </View>
      {showName && (
        <Text style={[styles.name, { color: platform.color }]}>{platform.nameAr}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  initial: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  name: {
    fontFamily: 'Almarai_700Bold',
    fontSize: 13,
  },
});
