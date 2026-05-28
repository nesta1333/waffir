import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { PLATFORMS } from '../../constants/platforms';
import { formatPrice } from '../../utils/currency';

interface TrendingItem {
  id: string;
  nameAr: string;
  name: string;
  imageUrl: string;
  bestPrice: number;
  bestPlatformId: string;
  savingsPct: number;
  currency: 'AED' | 'SAR';
}

interface TrendingCardProps {
  item: TrendingItem;
  index: number;
  onPress: () => void;
}

export default function TrendingCard({ item, index, onPress }: TrendingCardProps) {
  const platform = PLATFORMS[item.bestPlatformId];
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).springify()}
      style={[styles.wrapper, animStyle]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        activeOpacity={1}
        style={styles.touch}
      >
        {/* Product image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          {/* Savings badge — Neon Lime */}
          {item.savingsPct > 0 && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>وفّر {item.savingsPct}%</Text>
            </View>
          )}
        </View>

        {/* Bottom gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(20,18,24,0.95)']}
          style={styles.gradient}
        />

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>{item.nameAr}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(item.bestPrice, item.currency)}</Text>
            <View style={[styles.platformDot, { backgroundColor: platform?.color ?? '#fff' }]} />
          </View>
          <Text style={styles.platformName}>{platform?.nameAr ?? item.bestPlatformId}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 180,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: Colors.border.cyan,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent.cyan,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  touch: {
    flex: 1,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: Colors.bg.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  savingsBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.accent.lime,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savingsText: {
    color: '#0f0d13',
    fontSize: 11,
    fontFamily: 'Almarai_700Bold',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  content: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    right: 12,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 13,
    fontFamily: 'Almarai_700Bold',
    lineHeight: 19,
    marginBottom: 8,
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    color: Colors.accent.tertiary,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  platformName: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontFamily: 'Almarai_400Regular',
    textAlign: 'right',
  },
});
